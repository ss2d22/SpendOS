import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { SpendRequest } from '../spend-requests/entities/spend-request.entity';
import { SpendAccount } from '../spend-accounts/entities/spend-account.entity';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpendRequest, SpendAccount]),
    TreasuryModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
