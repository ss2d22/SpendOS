import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AlertType, AlertSeverity } from '../../common/enums';

@Entity('alerts')
@Index(['type', 'createdAt'])
@Index(['severity', 'acknowledged'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'integer', name: 'account_id', nullable: true })
  accountId: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @Column({ type: 'boolean', default: false })
  acknowledged: boolean;

  @Column({ type: 'timestamp', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
