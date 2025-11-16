import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('spend_accounts')
@Index(['ownerAddress'])
@Index(['approverAddress'])
export class SpendAccount {
  @PrimaryColumn({ type: 'integer', name: 'account_id' })
  accountId: number;

  @Column({ name: 'owner_address', length: 42 })
  ownerAddress: string;

  @Column({ name: 'approver_address', length: 42 })
  approverAddress: string;

  @Column({ length: 64 })
  label: string;

  @Column({ type: 'varchar', length: 78, name: 'budget_per_period' })
  budgetPerPeriod: string;

  @Column({ type: 'integer', name: 'period_duration' })
  periodDuration: number;

  @Column({ type: 'varchar', length: 78, name: 'per_tx_limit' })
  perTxLimit: string;

  @Column({ type: 'varchar', length: 78, name: 'daily_limit' })
  dailyLimit: string;

  @Column({ type: 'varchar', length: 78, name: 'approval_threshold' })
  approvalThreshold: string;

  @Column({ type: 'varchar', length: 78, name: 'period_spent', default: '0' })
  periodSpent: string;

  @Column({
    type: 'varchar',
    length: 78,
    name: 'period_reserved',
    default: '0',
  })
  periodReserved: string;

  @Column({ type: 'varchar', length: 78, name: 'daily_spent', default: '0' })
  dailySpent: string;

  @Column({ type: 'varchar', length: 78, name: 'daily_reserved', default: '0' })
  dailyReserved: string;

  @Column({ type: 'timestamp', name: 'period_start', nullable: true })
  periodStart: Date;

  @Column({ type: 'timestamp', name: 'daily_reset_at', nullable: true })
  dailyResetAt: Date;

  @Column({ type: 'boolean', default: false })
  frozen: boolean;

  @Column({ type: 'boolean', default: false })
  closed: boolean;

  @Column({ type: 'simple-array', name: 'allowed_chains' })
  allowedChains: string[];

  @Column({
    type: 'varchar',
    length: 78,
    name: 'auto_topup_min_balance',
    nullable: true,
  })
  autoTopupMinBalance: string;

  @Column({
    type: 'varchar',
    length: 78,
    name: 'auto_topup_target_balance',
    nullable: true,
  })
  autoTopupTargetBalance: string;
}
