import { Module, Global } from '@nestjs/common';
import { ArcProviderService } from './services/arc-provider.service';
import { TreasuryContractService } from './services/treasury-contract.service';
import { EventListenerService } from './services/event-listener.service';

@Global()
@Module({
  providers: [
    ArcProviderService,
    TreasuryContractService,
    EventListenerService,
  ],
  exports: [ArcProviderService, TreasuryContractService, EventListenerService],
})
export class BlockchainModule {}
