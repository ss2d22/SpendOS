import { Test, TestingModule } from '@nestjs/testing';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from '../services/treasury.service';

describe('TreasuryController', () => {
  let controller: TreasuryController;
  let service: TreasuryService;

  const mockTreasuryService = {
    getBalance: jest.fn(),
    getFundingHistory: jest.fn(),
    fundTreasury: jest.fn(),
    pauseContract: jest.fn(),
    unpauseContract: jest.fn(),
    transferAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreasuryController],
      providers: [
        {
          provide: TreasuryService,
          useValue: mockTreasuryService,
        },
      ],
    }).compile();

    controller = module.get<TreasuryController>(TreasuryController);
    service = module.get<TreasuryService>(TreasuryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return treasury balance information', async () => {
      const mockBalance = {
        unified: '10000000000',
        committed: '5000000000',
        available: '5000000000',
        lastSyncAt: '2024-01-15T12:00:00Z',
      };

      mockTreasuryService.getBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance();

      expect(service.getBalance).toHaveBeenCalled();
      expect(result).toEqual(mockBalance);
    });
  });

  describe('getFundingHistory', () => {
    it('should return funding history', async () => {
      const mockHistory = [
        {
          id: '1',
          direction: 'INBOUND',
          amount: '1000000000',
          gatewayTxId: 'gw-tx-1',
        },
        {
          id: '2',
          direction: 'INBOUND',
          amount: '500000000',
          gatewayTxId: 'gw-tx-2',
        },
      ];

      mockTreasuryService.getFundingHistory.mockResolvedValue(mockHistory);

      const result = await controller.getFundingHistory();

      expect(service.getFundingHistory).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });
  });

  // ==================== NEW WRITE OPERATIONS ====================

  describe('fundTreasury', () => {
    it('should fund treasury successfully', async () => {
      const fundDto = {
        amount: '1000000000',
        gatewayTxId: 'gw-tx-123',
      };

      mockTreasuryService.fundTreasury.mockResolvedValue('0xtxhash123');

      const result = await controller.fundTreasury(fundDto);

      expect(service.fundTreasury).toHaveBeenCalledWith(
        '1000000000',
        'gw-tx-123',
      );
      expect(result).toEqual({ transactionHash: '0xtxhash123' });
    });

    it('should handle different amounts and gateway transaction IDs', async () => {
      const fundDto = {
        amount: '500000000',
        gatewayTxId: 'gw-tx-456',
      };

      mockTreasuryService.fundTreasury.mockResolvedValue('0xtxhash456');

      const result = await controller.fundTreasury(fundDto);

      expect(service.fundTreasury).toHaveBeenCalledWith('500000000', 'gw-tx-456');
      expect(result).toEqual({ transactionHash: '0xtxhash456' });
    });

    it('should handle large amounts', async () => {
      const fundDto = {
        amount: '10000000000000',
        gatewayTxId: 'gw-tx-789',
      };

      mockTreasuryService.fundTreasury.mockResolvedValue('0xtxhash789');

      await controller.fundTreasury(fundDto);

      expect(service.fundTreasury).toHaveBeenCalledWith(
        '10000000000000',
        'gw-tx-789',
      );
    });
  });

  describe('pauseContract', () => {
    it('should pause contract successfully', async () => {
      mockTreasuryService.pauseContract.mockResolvedValue('0xtxhash101');

      const result = await controller.pauseContract();

      expect(service.pauseContract).toHaveBeenCalled();
      expect(result).toEqual({ transactionHash: '0xtxhash101' });
    });

    it('should return transaction hash on pause', async () => {
      mockTreasuryService.pauseContract.mockResolvedValue('0xtxhash202');

      const result = await controller.pauseContract();

      expect(result).toHaveProperty('transactionHash');
      expect(result.transactionHash).toBe('0xtxhash202');
    });
  });

  describe('unpauseContract', () => {
    it('should unpause contract successfully', async () => {
      mockTreasuryService.unpauseContract.mockResolvedValue('0xtxhash303');

      const result = await controller.unpauseContract();

      expect(service.unpauseContract).toHaveBeenCalled();
      expect(result).toEqual({ transactionHash: '0xtxhash303' });
    });

    it('should return transaction hash on unpause', async () => {
      mockTreasuryService.unpauseContract.mockResolvedValue('0xtxhash404');

      const result = await controller.unpauseContract();

      expect(result).toHaveProperty('transactionHash');
      expect(result.transactionHash).toBe('0xtxhash404');
    });
  });

  describe('transferAdmin', () => {
    it('should transfer admin rights successfully', async () => {
      const transferDto = {
        newAdmin: '0xNewAdmin',
      };

      mockTreasuryService.transferAdmin.mockResolvedValue('0xtxhash505');

      const result = await controller.transferAdmin(transferDto);

      expect(service.transferAdmin).toHaveBeenCalledWith('0xNewAdmin');
      expect(result).toEqual({ transactionHash: '0xtxhash505' });
    });

    it('should handle different admin addresses', async () => {
      const transferDto = {
        newAdmin: '0xAnotherAdmin',
      };

      mockTreasuryService.transferAdmin.mockResolvedValue('0xtxhash606');

      const result = await controller.transferAdmin(transferDto);

      expect(service.transferAdmin).toHaveBeenCalledWith('0xAnotherAdmin');
      expect(result).toEqual({ transactionHash: '0xtxhash606' });
    });

    it('should handle checksum addresses', async () => {
      const transferDto = {
        newAdmin: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      mockTreasuryService.transferAdmin.mockResolvedValue('0xtxhash707');

      const result = await controller.transferAdmin(transferDto);

      expect(service.transferAdmin).toHaveBeenCalledWith(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      );
      expect(result).toEqual({ transactionHash: '0xtxhash707' });
    });
  });
});
