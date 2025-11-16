import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpendExecutionProcessor } from './processors/spend-execution.processor';
import { StuckSpendsProcessor } from './processors/stuck-spends.processor';
import { SpendRequestsModule } from '../spend-requests/spend-requests.module';
import { SpendRequest } from '../spend-requests/entities/spend-request.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'spend-execution',
    }),
    TypeOrmModule.forFeature([SpendRequest]),
    SpendRequestsModule,
    BlockchainModule,
  ],
  providers: [SpendExecutionProcessor, StuckSpendsProcessor],
})
export class JobsModule {}
