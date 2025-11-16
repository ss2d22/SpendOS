import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../entities/alert.entity';
import { AlertType, AlertSeverity } from '../../common/enums';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {}

  async createAlert(
    type: AlertType,
    message: string,
    severity: AlertSeverity,
    accountId?: number,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    const alert = this.alertRepository.create({
      type,
      message,
      severity,
      accountId,
      metadata,
    });

    const savedAlert = await this.alertRepository.save(alert);
    this.logger.log(`Alert created: ${type} - ${message}`);
    return savedAlert;
  }

  async findAll(
    type?: AlertType,
    severity?: AlertSeverity,
    acknowledged?: boolean,
    limit: number = 100,
  ): Promise<Alert[]> {
    const query = this.alertRepository.createQueryBuilder('alert');

    if (type) {
      query.andWhere('alert.type = :type', { type });
    }

    if (severity) {
      query.andWhere('alert.severity = :severity', { severity });
    }

    if (acknowledged !== undefined) {
      query.andWhere('alert.acknowledged = :acknowledged', { acknowledged });
    }

    return query.orderBy('alert.createdAt', 'DESC').take(limit).getMany();
  }

  async acknowledge(id: string): Promise<Alert | null> {
    await this.alertRepository.update(id, {
      acknowledged: true,
      acknowledgedAt: new Date(),
    });

    return this.alertRepository.findOne({ where: { id } });
  }
}
