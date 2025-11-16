import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TreasuryContractService } from './treasury-contract.service';
import { ArcProviderService } from './arc-provider.service';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);

  constructor(
    private readonly treasuryContractService: TreasuryContractService,
    private readonly arcProviderService: ArcProviderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting event listener...');
    await this.setupEventListeners();
  }

  private async setupEventListeners() {
    const contract = this.treasuryContractService.getContract();
    const provider = this.arcProviderService.getHttpProvider();
    const wsProvider = this.arcProviderService.getWsProvider();

    // Create a contract instance connected to WebSocket provider for event listening
    const wsContract = contract.connect(wsProvider);

    // Helper to add delay between subscriptions to avoid rate limiting
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // SpendRequested Event
    wsContract.on(
      contract.filters.SpendRequested,
      async (
        requestId,
        accountId,
        requester,
        amount,
        chainId,
        destinationAddress,
        event,
      ) => {
        this.logger.log(
          `SpendRequested event: requestId=${requestId}, accountId=${accountId}`,
        );
        if (!event) return;
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('spend.requested', {
          requestId: Number(requestId),
          accountId: Number(accountId),
          requesterAddress: requester,
          amount: amount.toString(),
          chainId: Number(chainId),
          destinationAddress,
          description: '',
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200); // 200ms delay between subscriptions

    // SpendApproved Event
    wsContract.on(
      contract.filters.SpendApproved,
      async (requestId, accountId, approver, amount, event) => {
        this.logger.log(
          `SpendApproved event: requestId=${requestId}, accountId=${accountId}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('spend.approved', {
          requestId: Number(requestId),
          accountId: Number(accountId),
          approverAddress: approver,
          amount: amount.toString(),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendRejected Event
    wsContract.on(
      contract.filters.SpendRejected,
      async (requestId, accountId, approver, reason, event) => {
        this.logger.log(
          `SpendRejected event: requestId=${requestId}, reason=${reason}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('spend.rejected', {
          requestId: Number(requestId),
          accountId: Number(accountId),
          approverAddress: approver,
          reason,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendExecuted Event
    wsContract.on(
      contract.filters.SpendExecuted,
      async (requestId, accountId, amount, gatewayTxId, event) => {
        this.logger.log(
          `SpendExecuted event: requestId=${requestId}, gatewayTxId=${gatewayTxId}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('spend.executed', {
          requestId: Number(requestId),
          accountId: Number(accountId),
          amount: amount.toString(),
          gatewayTxId,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendFailed Event
    wsContract.on(
      contract.filters.SpendFailed,
      async (requestId, accountId, reason, event) => {
        this.logger.log(
          `SpendFailed event: requestId=${requestId}, reason=${reason}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('spend.failed', {
          requestId: Number(requestId),
          accountId: Number(accountId),
          reason,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendAccountCreated Event
    wsContract.on(
      contract.filters.SpendAccountCreated,
      async (accountId, owner, label, budgetPerPeriod, event) => {
        this.logger.log(
          `SpendAccountCreated event: accountId=${accountId}, label=${label}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('account.created', {
          accountId: Number(accountId),
          ownerAddress: owner,
          label,
          budgetPerPeriod: budgetPerPeriod.toString(),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendAccountUpdated Event
    wsContract.on(
      contract.filters.SpendAccountUpdated,
      async (accountId, event) => {
        this.logger.log(`SpendAccountUpdated event: accountId=${accountId}`);
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('account.updated', {
          accountId: Number(accountId),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendAccountFrozen Event
    wsContract.on(
      contract.filters.SpendAccountFrozen,
      async (accountId, event) => {
        this.logger.log(`SpendAccountFrozen event: accountId=${accountId}`);
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('account.frozen', {
          accountId: Number(accountId),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendAccountUnfrozen Event
    wsContract.on(
      contract.filters.SpendAccountUnfrozen,
      async (accountId, event) => {
        this.logger.log(`SpendAccountUnfrozen event: accountId=${accountId}`);
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('account.unfrozen', {
          accountId: Number(accountId),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // SpendAccountClosed Event
    wsContract.on(
      contract.filters.SpendAccountClosed,
      async (accountId, event) => {
        this.logger.log(`SpendAccountClosed event: accountId=${accountId}`);
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('account.closed', {
          accountId: Number(accountId),
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // InboundFunding Event
    wsContract.on(
      contract.filters.InboundFunding,
      async (amount, gatewayTxId, timestamp, event) => {
        this.logger.log(
          `InboundFunding event: amount=${amount}, gatewayTxId=${gatewayTxId}`,
        );
        if (!event) return;
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('funding.inbound', {
          amount: amount.toString(),
          gatewayTxId,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000),
        });
      },
    );
    await delay(200);

    // AdminTransferred Event
    wsContract.on(
      contract.filters.AdminTransferred,
      async (previousAdmin, newAdmin, event) => {
        this.logger.log(
          `AdminTransferred event: ${previousAdmin} -> ${newAdmin}`,
        );
        const block = await provider.getBlock(event.blockNumber);
        this.eventEmitter.emit('admin.transferred', {
          previousAdmin,
          newAdmin,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: new Date(block!.timestamp * 1000),
        });
      },
    );
    await delay(200);

    // ContractPaused Event
    wsContract.on(contract.filters.ContractPaused, async (event) => {
      this.logger.log('ContractPaused event');
      const block = await provider.getBlock(event.blockNumber);
      this.eventEmitter.emit('contract.paused', {
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        timestamp: new Date(block!.timestamp * 1000),
      });
    });
    await delay(200);

    // ContractUnpaused Event
    wsContract.on(contract.filters.ContractUnpaused, async (event) => {
      this.logger.log('ContractUnpaused event');
      const block = await provider.getBlock(event.blockNumber);
      this.eventEmitter.emit('contract.unpaused', {
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        timestamp: new Date(block!.timestamp * 1000),
      });
    });

    this.logger.log(
      'Event listeners setup complete (WebSocket with staggered subscriptions)',
    );
  }
}
