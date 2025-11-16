import { Test, TestingModule } from '@nestjs/testing';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from '../services/treasury.service';

describe('TreasuryController', () => {
  let controller: TreasuryController;
  let service: TreasuryService;

  const mockTreasuryService = {
    getBalance: jest.fn(),
    getFundingHistory: jest.fn(),
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
});
