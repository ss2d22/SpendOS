import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from '../services/alerts.service';
import { AlertType, AlertSeverity } from '../../common/enums';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: AlertsService;

  const mockAlertsService = {
    findAll: jest.fn(),
    acknowledge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get<AlertsService>(AlertsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all alerts without filters', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: AlertType.BUDGET_THRESHOLD,
          severity: AlertSeverity.WARNING,
        },
        {
          id: '2',
          type: AlertType.ACCOUNT_FROZEN,
          severity: AlertSeverity.WARNING,
        },
      ];

      mockAlertsService.findAll.mockResolvedValue(mockAlerts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should filter by type', async () => {
      mockAlertsService.findAll.mockResolvedValue([]);

      await controller.findAll(AlertType.BUDGET_THRESHOLD);

      expect(service.findAll).toHaveBeenCalledWith(
        AlertType.BUDGET_THRESHOLD,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by severity', async () => {
      mockAlertsService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, AlertSeverity.CRITICAL);

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        AlertSeverity.CRITICAL,
        undefined,
        undefined,
      );
    });

    it('should filter by acknowledged status', async () => {
      mockAlertsService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, false);

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        false,
        undefined,
      );
    });

    it('should apply all filters and custom limit', async () => {
      mockAlertsService.findAll.mockResolvedValue([]);

      await controller.findAll(
        AlertType.CONTRACT_PAUSED,
        AlertSeverity.CRITICAL,
        false,
        50,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        AlertType.CONTRACT_PAUSED,
        AlertSeverity.CRITICAL,
        false,
        50,
      );
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge an alert when acknowledged is true', async () => {
      const mockAlert = {
        id: 'uuid-123',
        acknowledged: true,
        acknowledgedAt: new Date(),
      };

      mockAlertsService.acknowledge.mockResolvedValue(mockAlert);

      const result = await controller.acknowledge('uuid-123', {
        acknowledged: true,
      });

      expect(service.acknowledge).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(mockAlert);
    });

    it('should not acknowledge when acknowledged is false', async () => {
      const result = await controller.acknowledge('uuid-123', {
        acknowledged: false,
      });

      expect(service.acknowledge).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
