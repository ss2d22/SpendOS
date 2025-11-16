import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayApiService } from './services/gateway-api.service';
import { BurnIntentService } from './services/burn-intent.service';
import { CrossChainMintService } from './services/cross-chain-mint.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Global()
@Module({
  imports: [HttpModule, BlockchainModule],
  providers: [GatewayApiService, BurnIntentService, CrossChainMintService],
  exports: [GatewayApiService, BurnIntentService, CrossChainMintService],
})
export class GatewayModule {}
