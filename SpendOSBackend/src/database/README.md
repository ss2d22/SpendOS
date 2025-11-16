# Database Migrations

This directory contains TypeORM migrations for the Arc SpendOS backend database.

## Migration Commands

### Run Migrations
Apply all pending migrations to the database:
```bash
npm run migration:run
```

### Revert Migration
Revert the most recently applied migration:
```bash
npm run migration:revert
```

### Show Migrations
Show migration status (which migrations have been run):
```bash
npm run migration:show
```

### Generate Migration
Generate a new migration based on entity changes:
```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

## Initial Migration

The initial migration (`InitialSchema`) creates:

- **Enums:**
  - `spend_status`: PENDING_APPROVAL, APPROVED, REJECTED, EXECUTING, EXECUTED, FAILED
  - `alert_type`: HIGH_SPEND, LOW_BALANCE, ACCOUNT_FROZEN, ACCOUNT_CLOSED, ADMIN_TRANSFER, CONTRACT_PAUSED, EXECUTION_FAILED
  - `alert_severity`: INFO, WARNING, CRITICAL
  - `funding_direction`: INBOUND, OUTBOUND

- **Tables:**
  - `spend_accounts`: Store spend account configurations synced from on-chain
  - `spend_requests`: Track all spend requests through their lifecycle
  - `alerts`: System alerts for admins and managers
  - `funding_events`: Record inbound/outbound funding transactions

## Production Setup

For production deployments:

1. **Disable auto-sync**: Ensure `synchronize: false` in TypeORM config (already configured)
2. **Run migrations before starting**: Execute `npm run migration:run` as part of deployment
3. **Backup database**: Always backup before running migrations in production

## Development vs Production

- **Development**: Uses `synchronize: true` to auto-sync schema changes (see `typeorm.config.ts`)
- **Production**: Must use migrations (`synchronize: false`) for controlled schema changes

## Migration File Structure

Each migration file includes:
- `up()`: SQL to apply the migration
- `down()`: SQL to revert the migration
- Unique timestamp-based naming for ordering
