import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { FundingDirection } from '../../common/enums';

@Entity('funding_events')
export class FundingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: FundingDirection })
  direction: FundingDirection;

  @Column({ type: 'varchar', length: 78 })
  amount: string;

  @Column({ type: 'varchar', length: 100, name: 'gateway_tx_id' })
  gatewayTxId: string;

  @Column({ type: 'varchar', length: 66, name: 'tx_hash', nullable: true })
  txHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
