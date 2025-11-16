import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsService } from './alerts.service';
import { Alert } from '../entities/alert.entity';
import { AlertType, AlertSeverity } from '../../common/enums';

describe('AlertsService', () => {
  let service: AlertsService;
  let repository: Repository<Alert>;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockAlertRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertRepository,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    repository = module.get<Repository<Alert>>(getRepositoryToken(Alert));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlert', () => {
    it('should create and save an alert with all parameters', async () => {
      const mockAlert = {
        id: 'uuid-123',
        type: AlertType.BUDGET_THRESHOLD,
        message: 'Budget threshold exceeded',
        severity: AlertSeverity.WARNING,
        accountId: 1,
        metadata: { amount: '1000000000' },
        acknowledged: false,
        acknowledgedAt: null,
        createdAt: new Date(),
      };

      mockAlertRepository.create.mockReturnValue(mockAlert);
      mockAlertRepository.save.mockResolvedValue(mockAlert);

      const result = await service.createAlert(
        AlertType.BUDGET_THRESHOLD,
        'Budget threshold exceeded',
        AlertSeverity.WARNING,
        1,
        { amount: '1000000000' },
      );

      expect(mockAlertRepository.create).toHaveBeenCalledWith({
        type: AlertType.BUDGET_THRESHOLD,
        message: 'Budget threshold exceeded',
        severity: AlertSeverity.WARNING,
        accountId: 1,
        metadata: { amount: '1000000000' },
      });
      expect(mockAlertRepository.save).toHaveBeenCalledWith(mockAlert);
      expect(result).toEqual(mockAlert);
    });

    it('should create alert without optional accountId and metadata', async () => {
      const mockAlert = {
        id: 'uuid-456',
        type: AlertType.CONTRACT_PAUSED,
        message: 'Contract paused',
        severity: AlertSeverity.CRITICAL,
        accountId: undefined,
        metadata: undefined,
        acknowledged: false,
        acknowledgedAt: null,
        createdAt: new Date(),
      };

      mockAlertRepository.create.mockReturnValue(mockAlert);
      mockAlertRepository.save.mockResolvedValue(mockAlert);

      const result = await service.createAlert(
        AlertType.CONTRACT_PAUSED,
        'Contract paused',
        AlertSeverity.CRITICAL,
      );

      expect(mockAlertRepository.create).toHaveBeenCalledWith({
        type: AlertType.CONTRACT_PAUSED,
        message: 'Contract paused',
        severity: AlertSeverity.CRITICAL,
        accountId: undefined,
        metadata: undefined,
      });
      expect(result).toEqual(mockAlert);
    });

    it('should create different severity levels correctly', async () => {
      const criticalAlert = {
        id: 'critical',
        type: AlertType.ADMIN_TRANSFERRED,
        message: 'Admin changed',
        severity: AlertSeverity.CRITICAL,
        acknowledged: false,
        acknowledgedAt: null,
        createdAt: new Date(),
      };

      mockAlertRepository.create.mockReturnValue(criticalAlert);
      mockAlertRepository.save.mockResolvedValue(criticalAlert);

      const result = await service.createAlert(
        AlertType.ADMIN_TRANSFERRED,
        'Admin changed',
        AlertSeverity.CRITICAL,
      );

      expect(result.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('findAll', () => {
    it('should find all alerts without filters', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: AlertType.BUDGET_THRESHOLD,
          severity: AlertSeverity.WARNING,
          acknowledged: false,
        },
        {
          id: '2',
          type: AlertType.LOW_TREASURY_BALANCE,
          severity: AlertSeverity.INFO,
          acknowledged: false,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await service.findAll();

      expect(mockAlertRepository.createQueryBuilder).toHaveBeenCalledWith(
        'alert',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'alert.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockAlerts);
    });

    it('should filter by alert type', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: AlertType.BUDGET_THRESHOLD,
          severity: AlertSeverity.WARNING,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await service.findAll(AlertType.BUDGET_THRESHOLD);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.type = :type',
        { type: AlertType.BUDGET_THRESHOLD },
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should filter by severity', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: AlertType.CONTRACT_PAUSED,
          severity: AlertSeverity.CRITICAL,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await service.findAll(undefined, AlertSeverity.CRITICAL);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.severity = :severity',
        { severity: AlertSeverity.CRITICAL },
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should filter by acknowledged status', async () => {
      const mockAlerts = [
        {
          id: '1',
          acknowledged: false,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await service.findAll(undefined, undefined, false);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alert.acknowledged = :acknowledged',
        { acknowledged: false },
      );
      expect(result).toEqual(mockAlerts);
    });

    it('should apply all filters together', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: AlertType.BUDGET_THRESHOLD,
          severity: AlertSeverity.WARNING,
          acknowledged: false,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await service.findAll(
        AlertType.BUDGET_THRESHOLD,
        AlertSeverity.WARNING,
        false,
        50,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockAlerts);
    });

    it('should use default limit of 100', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should use custom limit when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(undefined, undefined, undefined, 25);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge an alert by id', async () => {
      const mockAlert = {
        id: 'uuid-123',
        type: AlertType.BUDGET_THRESHOLD,
        acknowledged: true,
        acknowledgedAt: new Date(),
      };

      mockAlertRepository.update.mockResolvedValue({ affected: 1 });
      mockAlertRepository.findOne.mockResolvedValue(mockAlert);

      const result = await service.acknowledge('uuid-123');

      expect(mockAlertRepository.update).toHaveBeenCalledWith('uuid-123', {
        acknowledged: true,
        acknowledgedAt: expect.any(Date),
      });
      expect(mockAlertRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
      expect(result).toEqual(mockAlert);
    });

    it('should return null if alert not found after update', async () => {
      mockAlertRepository.update.mockResolvedValue({ affected: 0 });
      mockAlertRepository.findOne.mockResolvedValue(null);

      const result = await service.acknowledge('non-existent-id');

      expect(result).toBeNull();
    });

    it('should set acknowledgedAt timestamp', async () => {
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      mockAlertRepository.update.mockResolvedValue({ affected: 1 });
      mockAlertRepository.findOne.mockResolvedValue({
        id: 'uuid-123',
        acknowledged: true,
        acknowledgedAt: now,
      });

      await service.acknowledge('uuid-123');

      expect(mockAlertRepository.update).toHaveBeenCalledWith('uuid-123', {
        acknowledged: true,
        acknowledgedAt: now,
      });

      jest.restoreAllMocks();
    });
  });
});
