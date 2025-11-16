import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifyMessage } from 'ethers';
import { RedisService } from '../redis/services/redis.service';
import { SpendAccount } from '../spend-accounts/entities/spend-account.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly NONCE_TTL = 300; // 5 minutes
  private readonly NONCE_PREFIX = 'auth:nonce:';
  private readonly ADMIN_KEY = 'contract:admin';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(SpendAccount)
    private readonly spendAccountRepository: Repository<SpendAccount>,
  ) {}

  async generateNonce(address: string): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    const key = `${this.NONCE_PREFIX}${address.toLowerCase()}`;
    await this.redisService.set(key, nonce, this.NONCE_TTL);
    return nonce;
  }

  async verifySignature(
    address: string,
    message: string,
    signature: string,
  ): Promise<{ accessToken: string; user: JwtPayload }> {
    // Verify nonce exists
    const key = `${this.NONCE_PREFIX}${address.toLowerCase()}`;
    const storedNonce = await this.redisService.get(key);

    if (!storedNonce) {
      throw new UnauthorizedException('Nonce not found or expired');
    }

    // Verify the message contains the nonce
    if (!message.includes(storedNonce)) {
      throw new UnauthorizedException('Invalid message format');
    }

    // Verify signature
    try {
      const recoveredAddress = verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new UnauthorizedException('Signature verification failed');
      }
    } catch (error) {
      this.logger.error('Signature verification error', error);
      throw new UnauthorizedException('Invalid signature');
    }

    // Delete nonce after successful verification
    await this.redisService.del(key);

    // Get user roles
    const roles = await this.getUserRoles(address);
    const { ownedAccountIds, approverAccountIds } =
      await this.getUserAccounts(address);

    const payload: JwtPayload = {
      sub: address.toLowerCase(),
      roles,
      ownedAccountIds,
      approverAccountIds,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: payload };
  }

  private async getUserRoles(
    address: string,
  ): Promise<('admin' | 'manager' | 'spender')[]> {
    const roles: ('admin' | 'manager' | 'spender')[] = [];
    const lowerAddress = address.toLowerCase();

    // Check if admin
    const adminAddress = await this.redisService.get(this.ADMIN_KEY);
    if (adminAddress && adminAddress.toLowerCase() === lowerAddress) {
      roles.push('admin');
    }

    // Check if manager (has any accounts where they are approver)
    const approverCount = await this.spendAccountRepository.count({
      where: { approverAddress: lowerAddress },
    });
    if (approverCount > 0) {
      roles.push('manager');
    }

    // Check if spender (has any accounts where they are owner)
    const ownerCount = await this.spendAccountRepository.count({
      where: { ownerAddress: lowerAddress },
    });
    if (ownerCount > 0) {
      roles.push('spender');
    }

    return roles;
  }

  private async getUserAccounts(
    address: string,
  ): Promise<{ ownedAccountIds: number[]; approverAccountIds: number[] }> {
    const lowerAddress = address.toLowerCase();

    const ownedAccounts = await this.spendAccountRepository.find({
      where: { ownerAddress: lowerAddress },
      select: ['accountId'],
    });

    const approverAccounts = await this.spendAccountRepository.find({
      where: { approverAddress: lowerAddress },
      select: ['accountId'],
    });

    return {
      ownedAccountIds: ownedAccounts.map((a) => a.accountId),
      approverAccountIds: approverAccounts.map((a) => a.accountId),
    };
  }

  async getCurrentUser(address: string): Promise<JwtPayload> {
    const roles = await this.getUserRoles(address);
    const { ownedAccountIds, approverAccountIds } =
      await this.getUserAccounts(address);

    return {
      sub: address.toLowerCase(),
      roles,
      ownedAccountIds,
      approverAccountIds,
    };
  }
}
