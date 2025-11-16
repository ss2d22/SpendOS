import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpendAccountsService } from './services/spend-accounts.service';
import { SpendAccountsController } from './controllers/spend-accounts.controller';
import { SpendAccount } from './entities/spend-account.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpendAccount]),
    BlockchainModule,
    AlertsModule,
  ],
  controllers: [SpendAccountsController],
  providers: [SpendAccountsService],
  exports: [SpendAccountsService],
})
export class SpendAccountsModule {}
