import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/services/redis.service';
import { SpendAccount } from '../spend-accounts/entities/spend-account.entity';
import { Repository } from 'typeorm';
import { Wallet } from 'ethers';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;
  let spendAccountRepository: Repository<SpendAccount>;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockSpendAccountRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: getRepositoryToken(SpendAccount),
          useValue: mockSpendAccountRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
    spendAccountRepository = module.get<Repository<SpendAccount>>(
      getRepositoryToken(SpendAccount),
    );

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateNonce', () => {
    it('should generate and store a nonce for an address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.generateNonce(address);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `auth:nonce:${address.toLowerCase()}`,
        expect.any(String),
        300,
      );
    });

    it('should use lowercase address for nonce storage', async () => {
      const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      mockRedisService.set.mockResolvedValue(undefined);

      await service.generateNonce(address);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `auth:nonce:${address.toLowerCase()}`,
        expect.any(String),
        300,
      );
    });
  });

  describe('verifySignature', () => {
    let wallet: Wallet;
    const testAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    beforeAll(() => {
      // Create a test wallet with known private key
      wallet = new Wallet(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      );
    });

    it('should verify a valid signature and return JWT token', async () => {
      const nonce = 'test-nonce-12345';
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${testAddress}`;

      // Sign the message
      const signature = await wallet.signMessage(message);

      mockRedisService.get.mockResolvedValue(nonce);
      mockRedisService.del.mockResolvedValue(undefined);
      mockRedisService.get
        .mockResolvedValueOnce(nonce)
        .mockResolvedValueOnce(null); // nonce, admin check
      mockSpendAccountRepository.count.mockResolvedValue(0); // No accounts
      mockSpendAccountRepository.find.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifySignature(
        wallet.address,
        message,
        signature,
      );

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.sub).toBe(wallet.address.toLowerCase());
      expect(mockRedisService.get).toHaveBeenCalledWith(
        `auth:nonce:${wallet.address.toLowerCase()}`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `auth:nonce:${wallet.address.toLowerCase()}`,
      );
    });

    it('should throw UnauthorizedException if nonce not found', async () => {
      const address = testAddress;
      const message = 'test message';
      const signature = '0xsignature';

      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.verifySignature(address, message, signature),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(address, message, signature),
      ).rejects.toThrow('Nonce not found or expired');
    });

    it('should throw UnauthorizedException if signature is invalid', async () => {
      const nonce = 'test-nonce';
      const address = testAddress;
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${address}`;
      const invalidSignature = '0xinvalidsignature';

      mockRedisService.get.mockResolvedValue(nonce);

      await expect(
        service.verifySignature(address, message, invalidSignature),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(address, message, invalidSignature),
      ).rejects.toThrow('Invalid signature');
    });

    it('should include owned account IDs in JWT payload', async () => {
      const nonce = 'test-nonce-12345';
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${testAddress}`;

      const signature = await wallet.signMessage(message);

      const mockOwnedAccounts = [
        { accountId: 1, ownerAddress: wallet.address.toLowerCase() },
        { accountId: 2, ownerAddress: wallet.address.toLowerCase() },
      ];

      mockRedisService.get
        .mockResolvedValueOnce(nonce)
        .mockResolvedValueOnce(null); // nonce, admin check
      mockRedisService.del.mockResolvedValue(undefined);
      mockSpendAccountRepository.count
        .mockResolvedValueOnce(0) // approver count
        .mockResolvedValueOnce(2); // owner count (spender role)
      mockSpendAccountRepository.find
        .mockResolvedValueOnce(mockOwnedAccounts) // owned accounts
        .mockResolvedValueOnce([]); // approver accounts
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifySignature(
        wallet.address,
        message,
        signature,
      );

      expect(result.user.ownedAccountIds).toEqual([1, 2]);
      expect(result.user.roles).toContain('spender');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: wallet.address.toLowerCase(),
        roles: ['spender'],
        ownedAccountIds: [1, 2],
        approverAccountIds: [],
      });
    });

    it('should include approver account IDs in JWT payload', async () => {
      const nonce = 'test-nonce-12345';
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${testAddress}`;

      const signature = await wallet.signMessage(message);

      const mockApproverAccounts = [
        { accountId: 3, approverAddress: wallet.address.toLowerCase() },
      ];

      mockRedisService.get
        .mockResolvedValueOnce(nonce)
        .mockResolvedValueOnce(null); // nonce, admin check
      mockRedisService.del.mockResolvedValue(undefined);
      mockSpendAccountRepository.count
        .mockResolvedValueOnce(1) // approver count (manager role)
        .mockResolvedValueOnce(0); // owner count
      mockSpendAccountRepository.find
        .mockResolvedValueOnce([]) // owned accounts
        .mockResolvedValueOnce(mockApproverAccounts); // approver accounts
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifySignature(
        wallet.address,
        message,
        signature,
      );

      expect(result.user.approverAccountIds).toEqual([3]);
      expect(result.user.roles).toContain('manager');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: wallet.address.toLowerCase(),
        roles: ['manager'],
        ownedAccountIds: [],
        approverAccountIds: [3],
      });
    });

    it('should delete nonce after successful verification', async () => {
      const nonce = 'test-nonce-12345';
      const message = `Sign this message to authenticate with Arc SpendOS\n\nNonce: ${nonce}\nAddress: ${testAddress}`;

      const signature = await wallet.signMessage(message);

      mockRedisService.get
        .mockResolvedValueOnce(nonce)
        .mockResolvedValueOnce(null); // nonce, admin check
      mockRedisService.del.mockResolvedValue(undefined);
      mockSpendAccountRepository.count.mockResolvedValue(0);
      mockSpendAccountRepository.find.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      await service.verifySignature(wallet.address, message, signature);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        `auth:nonce:${wallet.address.toLowerCase()}`,
      );
    });
  });
});
