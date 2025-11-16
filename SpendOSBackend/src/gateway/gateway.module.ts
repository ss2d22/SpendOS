import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayApiService } from './services/gateway-api.service';
import { BurnIntentService } from './services/burn-intent.service';
import { CrossChainMintService } from './services/cross-chain-mint.service';
import { GatewayDepositService } from './services/gateway-deposit.service';
import { GatewayDepositController } from './controllers/gateway-deposit.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Global()
@Module({
  imports: [HttpModule, BlockchainModule],
  controllers: [GatewayDepositController],
  providers: [
    GatewayApiService,
    BurnIntentService,
    CrossChainMintService,
    GatewayDepositService,
  ],
  exports: [
    GatewayApiService,
    BurnIntentService,
    CrossChainMintService,
    GatewayDepositService,
  ],
})
export class GatewayModule {}
