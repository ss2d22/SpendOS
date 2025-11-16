import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TreasuryContractService } from './treasury-contract.service';
import { ArcProviderService } from './arc-provider.service';

describe('TreasuryContractService', () => {
  let service: TreasuryContractService;

  const mockReceipt = {
    hash: '0xtxhash123',
    logs: [],
  };

  const mockContract = {
    createSpendAccount: jest.fn(),
    updateSpendAccount: jest.fn(),
    freezeAccount: jest.fn(),
    unfreezeAccount: jest.fn(),
    closeAccount: jest.fn(),
    updateAllowedChains: jest.fn(),
    setAutoTopupConfig: jest.fn(),
    autoTopup: jest.fn(),
    sweepAccount: jest.fn(),
    resetPeriod: jest.fn(),
    requestSpend: jest.fn(),
    approveSpend: jest.fn(),
    rejectSpend: jest.fn(),
    pause: jest.fn(),
    unpause: jest.fn(),
    transferAdmin: jest.fn(),
    markSpendExecuted: jest.fn(),
    markSpendFailed: jest.fn(),
    recordInboundFunding: jest.fn(),
    getAccount: jest.fn(),
    getRequest: jest.fn(),
    interface: {
      parseLog: jest.fn(),
    },
  };

  const mockWallet = {
    address: '0xBackendWallet',
  };

  const mockProvider = {};

  const mockArcProviderService = {
    getHttpProvider: jest.fn().mockReturnValue(mockProvider),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'arc.treasuryContractAddress') {
        return '0xTreasuryContract';
      }
      if (key === 'backend.privateKey') {
        return '0xprivatekey123';
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreasuryContractService,
        {
          provide: ArcProviderService,
          useValue: mockArcProviderService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TreasuryContractService>(TreasuryContractService);

    // Mock the contract and wallet on the service instance
    (service as any).contract = mockContract;
    (service as any).backendWallet = mockWallet;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContract', () => {
    it('should return the contract instance', () => {
      const contract = service.getContract();
      expect(contract).toBeDefined();
      expect(contract).toBe(mockContract);
    });
  });

  describe('getBackendWallet', () => {
    it('should return the backend wallet instance', () => {
      const wallet = service.getBackendWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toBe('0xBackendWallet');
    });
  });

  describe('createSpendAccount', () => {
    it('should create spend account and return accountId from event', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.createSpendAccount.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockImplementation((log: any) => {
        if (log === 'event-log') {
          return {
            name: 'SpendAccountCreated',
            args: { accountId: BigInt(5) },
          };
        }
        return null;
      });

      const receipt = { ...mockReceipt, logs: ['other-log', 'event-log'] };
      tx.wait.mockResolvedValue(receipt);

      const result = await service.createSpendAccount(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '200000000',
        '50000000',
        '0xApprover',
        [1, 137],
      );

      expect(mockContract.createSpendAccount).toHaveBeenCalledWith(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '200000000',
        '50000000',
        '0xApprover',
        [1, 137],
      );
      expect(result).toEqual({
        accountId: 5,
        transactionHash: '0xtxhash123',
      });
    });

    it('should handle errors during account creation', async () => {
      const error = new Error('Contract error');
      mockContract.createSpendAccount.mockRejectedValue(error);

      await expect(
        service.createSpendAccount(
          '0xOwner',
          'Engineering',
          '1000000000',
          2592000,
          '100000000',
          '200000000',
          '50000000',
          '0xApprover',
          [1, 137],
        ),
      ).rejects.toThrow('Contract error');
    });

    it('should return accountId 0 if event not found', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.createSpendAccount.mockResolvedValue(tx);
      mockContract.interface.parseLog.mockReturnValue(null);

      const result = await service.createSpendAccount(
        '0xOwner',
        'Engineering',
        '1000000000',
        2592000,
        '100000000',
        '200000000',
        '50000000',
        '0xApprover',
        [1],
      );

      expect(result.accountId).toBe(0);
    });
  });

  describe('updateSpendAccount', () => {
    it('should update spend account successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.updateSpendAccount.mockResolvedValue(tx);

      const result = await service.updateSpendAccount(
        1,
        '2000000000',
        '150000000',
        '300000000',
        '75000000',
        '0xNewApprover',
      );

      expect(mockContract.updateSpendAccount).toHaveBeenCalledWith(
        1,
        '2000000000',
        '150000000',
        '300000000',
        '75000000',
        '0xNewApprover',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle empty values with defaults', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.updateSpendAccount.mockResolvedValue(tx);

      await service.updateSpendAccount(1, '', '', '', '', '');

      expect(mockContract.updateSpendAccount).toHaveBeenCalledWith(
        1,
        '0',
        '0',
        '0',
        '0',
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('should handle errors during account update', async () => {
      mockContract.updateSpendAccount.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.updateSpendAccount(1, '2000000000', '', '', '', ''),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('freezeAccount', () => {
    it('should freeze account successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.freezeAccount.mockResolvedValue(tx);

      const result = await service.freezeAccount(1);

      expect(mockContract.freezeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during account freeze', async () => {
      mockContract.freezeAccount.mockRejectedValue(new Error('Freeze failed'));

      await expect(service.freezeAccount(1)).rejects.toThrow('Freeze failed');
    });
  });

  describe('unfreezeAccount', () => {
    it('should unfreeze account successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.unfreezeAccount.mockResolvedValue(tx);

      const result = await service.unfreezeAccount(1);

      expect(mockContract.unfreezeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during account unfreeze', async () => {
      mockContract.unfreezeAccount.mockRejectedValue(
        new Error('Unfreeze failed'),
      );

      await expect(service.unfreezeAccount(1)).rejects.toThrow(
        'Unfreeze failed',
      );
    });
  });

  describe('closeAccount', () => {
    it('should close account successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.closeAccount.mockResolvedValue(tx);

      const result = await service.closeAccount(1);

      expect(mockContract.closeAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during account close', async () => {
      mockContract.closeAccount.mockRejectedValue(new Error('Close failed'));

      await expect(service.closeAccount(1)).rejects.toThrow('Close failed');
    });
  });

  describe('updateAllowedChains', () => {
    it('should update allowed chains successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.updateAllowedChains.mockResolvedValue(tx);

      const result = await service.updateAllowedChains(1, [1, 137, 42161]);

      expect(mockContract.updateAllowedChains).toHaveBeenCalledWith(1, [
        1, 137, 42161,
      ]);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during chain update', async () => {
      mockContract.updateAllowedChains.mockRejectedValue(
        new Error('Chain update failed'),
      );

      await expect(service.updateAllowedChains(1, [1])).rejects.toThrow(
        'Chain update failed',
      );
    });
  });

  describe('setAutoTopupConfig', () => {
    it('should set auto-topup config successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.setAutoTopupConfig.mockResolvedValue(tx);

      const result = await service.setAutoTopupConfig(
        1,
        '10000000',
        '50000000',
      );

      expect(mockContract.setAutoTopupConfig).toHaveBeenCalledWith(
        1,
        '10000000',
        '50000000',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during config set', async () => {
      mockContract.setAutoTopupConfig.mockRejectedValue(
        new Error('Config failed'),
      );

      await expect(
        service.setAutoTopupConfig(1, '10000000', '50000000'),
      ).rejects.toThrow('Config failed');
    });
  });

  describe('autoTopup', () => {
    it('should execute auto-topup successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.autoTopup.mockResolvedValue(tx);

      const result = await service.autoTopup(1);

      expect(mockContract.autoTopup).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during auto-topup', async () => {
      mockContract.autoTopup.mockRejectedValue(new Error('Topup failed'));

      await expect(service.autoTopup(1)).rejects.toThrow('Topup failed');
    });
  });

  describe('sweepAccount', () => {
    it('should sweep account successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.sweepAccount.mockResolvedValue(tx);

      const result = await service.sweepAccount(1);

      expect(mockContract.sweepAccount).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during sweep', async () => {
      mockContract.sweepAccount.mockRejectedValue(new Error('Sweep failed'));

      await expect(service.sweepAccount(1)).rejects.toThrow('Sweep failed');
    });
  });

  describe('resetPeriod', () => {
    it('should reset period successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.resetPeriod.mockResolvedValue(tx);

      const result = await service.resetPeriod(1);

      expect(mockContract.resetPeriod).toHaveBeenCalledWith(1);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during period reset', async () => {
      mockContract.resetPeriod.mockRejectedValue(new Error('Reset failed'));

      await expect(service.resetPeriod(1)).rejects.toThrow('Reset failed');
    });
  });

  describe('requestSpend', () => {
    it('should request spend and return requestId from event', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.requestSpend.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockImplementation((log: any) => {
        if (log === 'spend-event-log') {
          return {
            name: 'SpendRequested',
            args: { requestId: BigInt(10) },
          };
        }
        return null;
      });

      const receipt = {
        ...mockReceipt,
        logs: ['other-log', 'spend-event-log'],
      };
      tx.wait.mockResolvedValue(receipt);

      const result = await service.requestSpend(
        1,
        '1000000',
        84532,
        '0xDestination',
        'Test spend',
      );

      expect(mockContract.requestSpend).toHaveBeenCalledWith(
        1,
        '1000000',
        84532,
        '0xDestination',
        'Test spend',
      );
      expect(result).toEqual({
        requestId: 10,
        transactionHash: '0xtxhash123',
      });
    });

    it('should handle errors during spend request', async () => {
      mockContract.requestSpend.mockRejectedValue(
        new Error('Request failed'),
      );

      await expect(
        service.requestSpend(1, '1000000', 84532, '0xDestination', 'Test'),
      ).rejects.toThrow('Request failed');
    });

    it('should return requestId 0 if event not found', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.requestSpend.mockResolvedValue(tx);
      mockContract.interface.parseLog.mockReturnValue(null);

      const result = await service.requestSpend(
        1,
        '1000000',
        84532,
        '0xDestination',
        'Test',
      );

      expect(result.requestId).toBe(0);
    });
  });

  describe('approveSpend', () => {
    it('should approve spend successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.approveSpend.mockResolvedValue(tx);

      const result = await service.approveSpend(10);

      expect(mockContract.approveSpend).toHaveBeenCalledWith(10);
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during spend approval', async () => {
      mockContract.approveSpend.mockRejectedValue(
        new Error('Approval failed'),
      );

      await expect(service.approveSpend(10)).rejects.toThrow('Approval failed');
    });
  });

  describe('rejectSpend', () => {
    it('should reject spend successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.rejectSpend.mockResolvedValue(tx);

      const result = await service.rejectSpend(10, 'Insufficient budget');

      expect(mockContract.rejectSpend).toHaveBeenCalledWith(
        10,
        'Insufficient budget',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during spend rejection', async () => {
      mockContract.rejectSpend.mockRejectedValue(
        new Error('Rejection failed'),
      );

      await expect(service.rejectSpend(10, 'reason')).rejects.toThrow(
        'Rejection failed',
      );
    });
  });

  describe('pause', () => {
    it('should pause contract successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.pause.mockResolvedValue(tx);

      const result = await service.pause();

      expect(mockContract.pause).toHaveBeenCalled();
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during pause', async () => {
      mockContract.pause.mockRejectedValue(new Error('Pause failed'));

      await expect(service.pause()).rejects.toThrow('Pause failed');
    });
  });

  describe('unpause', () => {
    it('should unpause contract successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.unpause.mockResolvedValue(tx);

      const result = await service.unpause();

      expect(mockContract.unpause).toHaveBeenCalled();
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during unpause', async () => {
      mockContract.unpause.mockRejectedValue(new Error('Unpause failed'));

      await expect(service.unpause()).rejects.toThrow('Unpause failed');
    });
  });

  describe('transferAdmin', () => {
    it('should transfer admin successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.transferAdmin.mockResolvedValue(tx);

      const result = await service.transferAdmin('0xNewAdmin');

      expect(mockContract.transferAdmin).toHaveBeenCalledWith('0xNewAdmin');
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during admin transfer', async () => {
      mockContract.transferAdmin.mockRejectedValue(
        new Error('Transfer failed'),
      );

      await expect(service.transferAdmin('0xNewAdmin')).rejects.toThrow(
        'Transfer failed',
      );
    });
  });

  describe('markSpendExecuted', () => {
    it('should mark spend as executed successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.markSpendExecuted.mockResolvedValue(tx);

      const result = await service.markSpendExecuted(10, 'gw-tx-123');

      expect(mockContract.markSpendExecuted).toHaveBeenCalledWith(
        10,
        'gw-tx-123',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors when marking spend executed', async () => {
      mockContract.markSpendExecuted.mockRejectedValue(
        new Error('Mark failed'),
      );

      await expect(service.markSpendExecuted(10, 'gw-tx-123')).rejects.toThrow(
        'Mark failed',
      );
    });
  });

  describe('markSpendFailed', () => {
    it('should mark spend as failed successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.markSpendFailed.mockResolvedValue(tx);

      const result = await service.markSpendFailed(10, 'Gateway timeout');

      expect(mockContract.markSpendFailed).toHaveBeenCalledWith(
        10,
        'Gateway timeout',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors when marking spend failed', async () => {
      mockContract.markSpendFailed.mockRejectedValue(
        new Error('Mark failed'),
      );

      await expect(service.markSpendFailed(10, 'reason')).rejects.toThrow(
        'Mark failed',
      );
    });
  });

  describe('recordInboundFunding', () => {
    it('should record inbound funding successfully', async () => {
      const tx = { wait: jest.fn().mockResolvedValue(mockReceipt) };
      mockContract.recordInboundFunding.mockResolvedValue(tx);

      const result = await service.recordInboundFunding(
        '1000000000',
        'gw-tx-456',
      );

      expect(mockContract.recordInboundFunding).toHaveBeenCalledWith(
        '1000000000',
        'gw-tx-456',
      );
      expect(result).toBe('0xtxhash123');
    });

    it('should handle errors during funding record', async () => {
      mockContract.recordInboundFunding.mockRejectedValue(
        new Error('Record failed'),
      );

      await expect(
        service.recordInboundFunding('1000000000', 'gw-tx-456'),
      ).rejects.toThrow('Record failed');
    });
  });

  describe('getAccount', () => {
    it('should get account data successfully', async () => {
      const mockAccountData = {
        owner: '0xOwner',
        approver: '0xApprover',
        label: 'Engineering',
        budgetPerPeriod: BigInt('1000000000'),
        frozen: false,
      };

      mockContract.getAccount.mockResolvedValue(mockAccountData);

      const result = await service.getAccount(1);

      expect(mockContract.getAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAccountData);
    });

    it('should handle errors when getting account', async () => {
      mockContract.getAccount.mockRejectedValue(new Error('Account not found'));

      await expect(service.getAccount(999)).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('getRequest', () => {
    it('should get request data successfully', async () => {
      const mockRequestData = {
        accountId: 1,
        amount: BigInt('1000000'),
        status: 2, // APPROVED
      };

      mockContract.getRequest.mockResolvedValue(mockRequestData);

      const result = await service.getRequest(10);

      expect(mockContract.getRequest).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockRequestData);
    });

    it('should handle errors when getting request', async () => {
      mockContract.getRequest.mockRejectedValue(
        new Error('Request not found'),
      );

      await expect(service.getRequest(999)).rejects.toThrow(
        'Request not found',
      );
    });
  });
});
