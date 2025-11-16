import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryService } from './services/treasury.service';
import { BalanceSyncService } from './services/balance-sync.service';
import { TreasuryController } from './controllers/treasury.controller';
import { FundingEvent } from './entities/funding-event.entity';
import { SpendAccount } from '../spend-accounts/entities/spend-account.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { RedisModule } from '../redis/redis.module';
import { AlertsModule } from '../alerts/alerts.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FundingEvent, SpendAccount]),
    GatewayModule,
    RedisModule,
    AlertsModule,
    BlockchainModule,
  ],
  controllers: [TreasuryController],
  providers: [TreasuryService, BalanceSyncService],
  exports: [TreasuryService, BalanceSyncService],
})
export class TreasuryModule {}
