import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, WebSocketProvider } from 'ethers';

@Injectable()
export class ArcProviderService implements OnModuleInit {
  private readonly logger = new Logger(ArcProviderService.name);
  private httpProvider: JsonRpcProvider;
  private wsProvider: WebSocketProvider;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const rpcUrl = this.configService.get<string>('arc.rpcUrl') as string;
    const wsUrl = this.configService.get<string>('arc.wsUrl') as string;

    this.httpProvider = new JsonRpcProvider(rpcUrl);
    this.wsProvider = new WebSocketProvider(wsUrl);

    this.logger.log('Arc providers initialized');

    // Test connection
    try {
      const blockNumber = await this.httpProvider.getBlockNumber();
      this.logger.log(`Connected to Arc Testnet at block ${blockNumber}`);
    } catch (error) {
      this.logger.error('Failed to connect to Arc Testnet', error);
    }
  }

  getHttpProvider(): JsonRpcProvider {
    return this.httpProvider;
  }

  getWsProvider(): WebSocketProvider {
    return this.wsProvider;
  }

  async getBlockNumber(): Promise<number> {
    return this.httpProvider.getBlockNumber();
  }

  async getBlock(blockNumber: number) {
    return this.httpProvider.getBlock(blockNumber);
  }
}
