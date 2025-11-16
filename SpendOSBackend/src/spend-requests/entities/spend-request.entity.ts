import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SpendStatus } from '../../common/enums';

@Entity('spend_requests')
@Index(['accountId', 'status'])
@Index(['status', 'createdAt'])
export class SpendRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', name: 'request_id', unique: true })
  requestId: number;

  @Column({ type: 'integer', name: 'account_id' })
  accountId: number;

  @Column({ type: 'varchar', length: 42, name: 'requester_address' })
  requesterAddress: string;

  @Column({ type: 'varchar', length: 78 })
  amount: string;

  @Column({ type: 'integer', name: 'chain_id' })
  chainId: number;

  @Column({ type: 'varchar', length: 42, name: 'destination_address' })
  destinationAddress: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SpendStatus,
    default: SpendStatus.PENDING_APPROVAL,
  })
  status: SpendStatus;

  @Column({ type: 'timestamp', name: 'requested_at' })
  requestedAt: Date;

  @Column({ type: 'timestamp', name: 'approved_at', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', name: 'executed_at', nullable: true })
  executedAt: Date;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'gateway_tx_id',
    nullable: true,
  })
  gatewayTxId: string;

  @Column({ type: 'varchar', length: 66, name: 'mint_tx_hash', nullable: true })
  mintTxHash: string;

  @Column({
    type: 'varchar',
    length: 66,
    name: 'treasury_tx_hash',
    nullable: true,
  })
  treasuryTxHash: string;

  @Column({ type: 'varchar', length: 128, name: 'transfer_id', nullable: true })
  transferId: string;

  @Column({ type: 'text', name: 'failure_reason', nullable: true })
  failureReason: string;

  @Column({ type: 'varchar', length: 66, name: 'tx_hash', nullable: true })
  txHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
