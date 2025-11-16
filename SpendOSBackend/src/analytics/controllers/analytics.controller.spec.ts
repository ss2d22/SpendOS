import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from '../services/analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    getRunway: jest.fn(),
    getBurnRate: jest.fn(),
    getDepartmentBreakdown: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRunway', () => {
    it('should return runway calculation', async () => {
      const mockRunway = {
        days: 120,
        amount: '5000000000',
      };

      mockAnalyticsService.getRunway.mockResolvedValue(mockRunway);

      const result = await controller.getRunway();

      expect(service.getRunway).toHaveBeenCalled();
      expect(result).toEqual(mockRunway);
    });
  });

  describe('getBurnRate', () => {
    it('should return burn rate with default 30 days', async () => {
      const mockBurnRate = {
        daily: '10000000',
        monthly: '300000000',
      };

      mockAnalyticsService.getBurnRate.mockResolvedValue(mockBurnRate);

      const result = await controller.getBurnRate();

      expect(service.getBurnRate).toHaveBeenCalledWith(30);
      expect(result).toEqual(mockBurnRate);
    });

    it('should return burn rate with custom days', async () => {
      mockAnalyticsService.getBurnRate.mockResolvedValue({
        daily: '20000000',
        monthly: '600000000',
      });

      await controller.getBurnRate(7);

      expect(service.getBurnRate).toHaveBeenCalledWith(7);
    });
  });

  describe('getDepartmentBreakdown', () => {
    it('should return spend breakdown by department', async () => {
      const mockBreakdown = [
        {
          accountId: 1,
          label: 'Engineering',
          spent: '100000000',
          budget: '500000000',
        },
        {
          accountId: 2,
          label: 'Marketing',
          spent: '50000000',
          budget: '200000000',
        },
      ];

      mockAnalyticsService.getDepartmentBreakdown.mockResolvedValue(
        mockBreakdown,
      );

      const result = await controller.getDepartmentBreakdown();

      expect(service.getDepartmentBreakdown).toHaveBeenCalled();
      expect(result).toEqual(mockBreakdown);
    });
  });
});
