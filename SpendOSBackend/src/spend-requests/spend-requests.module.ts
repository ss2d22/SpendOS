import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SpendRequestsService } from './services/spend-requests.service';
import { SpendExecutorService } from './services/spend-executor.service';
import { SpendRequestsController } from './controllers/spend-requests.controller';
import { SpendRequest } from './entities/spend-request.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpendRequest]),
    BullModule.registerQueue({
      name: 'spend-execution',
    }),
    GatewayModule,
    BlockchainModule,
  ],
  controllers: [SpendRequestsController],
  providers: [SpendRequestsService, SpendExecutorService],
  exports: [SpendRequestsService, SpendExecutorService],
})
export class SpendRequestsModule {}
