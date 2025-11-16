# SpendOS Backend

A programmable treasury system for Arc blockchain that automates company spending with on-chain policies and cross-chain USDC transfers via Circle Gateway.

## What is SpendOS?

SpendOS helps manage crypto treasuries with smart policies. Admins create spend accounts with budgets and limits, team members request funds, and the system automatically handles approvals and cross-chain execution. All policies live on-chain while the backend handles event processing and USDC transfers.

**Key Features:**
- On-chain spend policies via Treasury smart contract
- Cross-chain USDC transfers using Circle Gateway
- Auto-approval for small requests, manager review for large ones
- Real-time blockchain event processing
- Analytics (burn rate, runway, department breakdown)
- Automated Gateway deposits to maintain unified balance

## Tech Stack

- **NestJS** - Backend framework with dependency injection
- **PostgreSQL** - Request and analytics storage
- **Redis** - Caching and job queues
- **TypeORM** - Database ORM
- **Bull** - Background job processing
- **ethers.js** - Blockchain interactions
- **Circle Gateway** - Cross-chain USDC transfers

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Arc Testnet RPC URL
- Admin wallet with USDC

### Setup

```bash
# Install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d postgres redis

# Run migrations
npm run migration:run

# Start app
npm run start:dev
```

### Access

- API: http://localhost:3001/api/v1
- Swagger Docs: http://localhost:3001/api/docs
- Health: http://localhost:3001/health/liveness

## Environment Variables

Key variables to set in `.env`:

```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=spendos
DATABASE_PASSWORD=your_password
DATABASE_NAME=spendos_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Arc Blockchain
ARC_RPC_URL=https://your-rpc-url
TREASURY_CONTRACT_ADDRESS=0x...

# Wallets
ADMIN_PRIVATE_KEY=0x...      # Admin wallet for Gateway operations
BACKEND_PRIVATE_KEY=0x...    # Backend wallet for contract updates

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=900s

# Gateway
GATEWAY_API_BASE_URL=https://gateway-api-testnet.circle.com/v1
```

## How It Works

### The Flow

1. **Spender** requests funds via Treasury contract
2. **Backend** detects `SpendRequested` event
3. **System** auto-approves if under threshold, otherwise waits for manager
4. **Manager** approves larger requests if needed
5. **Job Queue** processes approved spends
6. **Gateway** burns USDC on Arc, provides attestation
7. **Backend** mints USDC on destination chain
8. **Contract** marks spend executed

Total time: ~11 seconds from approval to funds delivered.

### Gateway Auto-Deposit

The system automatically deposits excess USDC from the admin wallet to Gateway every 10 minutes, keeping a 20 USDC reserve for gas. This maintains the unified cross-chain balance needed for spend execution.

**Manual deposit:**
```bash
POST /api/v1/gateway/deposit
```

### USDC Format

The API accepts amounts in two formats:
- **Decimal**: `"100.50"` or `"10,000.25"` (human-readable)
- **Micro USDC**: `"100500000"` (6 decimals)

Commas are automatically removed, and amounts under 1M are treated as decimal USDC.

## Project Structure

```
src/
├── auth/              # Wallet signature auth + JWT
├── treasury/          # Balance queries, Gateway deposits
├── spend-accounts/    # Budget management
├── spend-requests/    # Request lifecycle
├── gateway/           # Circle Gateway integration
│   ├── burn-intent.service.ts      # EIP-712 signing
│   ├── gateway-api.service.ts      # API client
│   ├── cross-chain-mint.service.ts # Destination minting
│   └── gateway-deposit.service.ts  # Auto-deposit
├── blockchain/        # Event listeners, providers
├── jobs/              # Background job processing
├── analytics/         # Runway, burn rate
└── alerts/            # System notifications
```

## API Endpoints

All endpoints are documented in Swagger at `/api/docs`. Key routes:

- **Auth**: `/auth/nonce`, `/auth/verify`, `/auth/me`
- **Treasury**: `/treasury/balance`, `/treasury/funding-history`
- **Gateway**: `/gateway/balances`, `/gateway/deposit`
- **Accounts**: `/spend-accounts`, `/spend-accounts/:id`
- **Requests**: `/spend-requests`, `/spend-requests/:id/approve`
- **Analytics**: `/analytics/runway`, `/analytics/burn-rate`

## Development

```bash
# Watch mode
npm run start:dev

# Linting
npm run lint

# Format code
npm run format

# Tests
npm run test
npm run test:e2e

# Database
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

## Deployment

```bash
# Build Docker image
docker build -t spendos-backend .

# Run
docker run -d -p 3001:3001 --env-file .env.production spendos-backend

# Or use docker-compose
docker-compose up -d
```

Set production env vars:
```env
NODE_ENV=production
JWT_SECRET=<strong-secret>
DATABASE_SSL=true
```

## Troubleshooting

**Database issues:**
```bash
docker-compose ps postgres
# Check DATABASE_* vars in .env
```

**Redis issues:**
```bash
docker-compose ps redis
redis-cli ping
```

**WebSocket disconnects:**
Use reliable RPC provider (QuickNode, Alchemy)

**Gateway errors:**
- Check wallet has USDC deposited in Gateway
- Verify amounts are sufficient (min 2.01 USDC per transfer)
- Check RPC rate limits (system has retry logic with backoff)

## Scripts

Located in `scripts/`:
- `check-admin.ts` - Verify admin wallet setup
- `check-balance-state.ts` - Check wallet and Gateway balances
- `sync-accounts.ts` - Sync accounts from blockchain
- `test-contract.ts` - Test contract interactions
le)
