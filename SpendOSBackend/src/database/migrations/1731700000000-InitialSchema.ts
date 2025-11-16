import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1731700000000 implements MigrationInterface {
  name = 'InitialSchema1731700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create spend_status enum
    await queryRunner.query(`
      CREATE TYPE "spend_status" AS ENUM (
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'EXECUTING',
        'EXECUTED',
        'FAILED'
      )
    `);

    // Create alert_type enum
    await queryRunner.query(`
      CREATE TYPE "alert_type" AS ENUM (
        'HIGH_SPEND',
        'LOW_BALANCE',
        'ACCOUNT_FROZEN',
        'ACCOUNT_CLOSED',
        'ADMIN_TRANSFER',
        'CONTRACT_PAUSED',
        'EXECUTION_FAILED'
      )
    `);

    // Create alert_severity enum
    await queryRunner.query(`
      CREATE TYPE "alert_severity" AS ENUM (
        'INFO',
        'WARNING',
        'CRITICAL'
      )
    `);

    // Create funding_direction enum
    await queryRunner.query(`
      CREATE TYPE "funding_direction" AS ENUM (
        'INBOUND',
        'OUTBOUND'
      )
    `);

    // Create spend_accounts table
    await queryRunner.query(`
      CREATE TABLE "spend_accounts" (
        "account_id" integer PRIMARY KEY,
        "owner_address" varchar(42) NOT NULL,
        "approver_address" varchar(42) NOT NULL,
        "label" varchar(64) NOT NULL,
        "budget_per_period" varchar(78) NOT NULL,
        "period_duration" integer NOT NULL,
        "per_tx_limit" varchar(78) NOT NULL,
        "daily_limit" varchar(78) NOT NULL,
        "approval_threshold" varchar(78) NOT NULL,
        "period_spent" varchar(78) NOT NULL DEFAULT '0',
        "period_reserved" varchar(78) NOT NULL DEFAULT '0',
        "daily_spent" varchar(78) NOT NULL DEFAULT '0',
        "daily_reserved" varchar(78) NOT NULL DEFAULT '0',
        "period_start" timestamp NULL,
        "daily_reset_at" timestamp NULL,
        "frozen" boolean NOT NULL DEFAULT false,
        "closed" boolean NOT NULL DEFAULT false,
        "allowed_chains" text NOT NULL,
        "auto_topup_min_balance" varchar(78) NULL,
        "auto_topup_target_balance" varchar(78) NULL
      )
    `);

    // Create indexes for spend_accounts
    await queryRunner.query(`
      CREATE INDEX "IDX_spend_accounts_owner" ON "spend_accounts" ("owner_address")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_spend_accounts_approver" ON "spend_accounts" ("approver_address")
    `);

    // Create spend_requests table
    await queryRunner.query(`
      CREATE TABLE "spend_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "request_id" integer UNIQUE NOT NULL,
        "account_id" integer NOT NULL,
        "requester_address" varchar(42) NOT NULL,
        "amount" varchar(78) NOT NULL,
        "chain_id" integer NOT NULL,
        "destination_address" varchar(42) NOT NULL,
        "description" text NULL,
        "status" spend_status NOT NULL DEFAULT 'PENDING_APPROVAL',
        "requested_at" timestamp NOT NULL,
        "approved_at" timestamp NULL,
        "executed_at" timestamp NULL,
        "gateway_tx_id" varchar(100) NULL,
        "mint_tx_hash" varchar(66) NULL,
        "treasury_tx_hash" varchar(66) NULL,
        "transfer_id" varchar(128) NULL,
        "failure_reason" text NULL,
        "tx_hash" varchar(66) NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for spend_requests
    await queryRunner.query(`
      CREATE INDEX "IDX_spend_requests_account_status" ON "spend_requests" ("account_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_spend_requests_status_created" ON "spend_requests" ("status", "created_at")
    `);

    // Create alerts table
    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" alert_type NOT NULL,
        "account_id" integer NULL,
        "message" text NOT NULL,
        "severity" alert_severity NOT NULL,
        "acknowledged" boolean NOT NULL DEFAULT false,
        "acknowledged_at" timestamp NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for alerts
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_type_created" ON "alerts" ("type", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_severity_acknowledged" ON "alerts" ("severity", "acknowledged")
    `);

    // Create funding_events table
    await queryRunner.query(`
      CREATE TABLE "funding_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "direction" funding_direction NOT NULL,
        "amount" varchar(78) NOT NULL,
        "gateway_tx_id" varchar(100) NOT NULL,
        "tx_hash" varchar(66) NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE "funding_events"`);
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TABLE "spend_requests"`);
    await queryRunner.query(`DROP TABLE "spend_accounts"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "funding_direction"`);
    await queryRunner.query(`DROP TYPE "alert_severity"`);
    await queryRunner.query(`DROP TYPE "alert_type"`);
    await queryRunner.query(`DROP TYPE "spend_status"`);
  }
}
