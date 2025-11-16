import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SpendRequest } from '../spend-requests/entities/spend-request.entity';
import { SpendAccount } from '../spend-accounts/entities/spend-account.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { FundingEvent } from '../treasury/entities/funding-event.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'spendos',
  password: process.env.DATABASE_PASSWORD || 'spendos_password',
  database: process.env.DATABASE_NAME || 'spendos_db',
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [SpendRequest, SpendAccount, Alert, FundingEvent],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Never auto-sync in production
  logging: process.env.LOG_LEVEL === 'debug',
});
