# Arc SpendOS Backend

**A programmable treasury management system built on Arc blockchain with Circle Gateway integration for seamless cross-chain USDC transfers.**

Arc SpendOS is a smart treasury that automates company spending with on-chain policies and cross-chain execution. Think of it as combining the best parts of traditional expense management (like Expensify) with the transparency and programmability of blockchain.

## Table of Contents

- [What is SpendOS?](#what-is-spendos)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Modules Overview](#modules-overview)
- [API Endpoints](#api-endpoints)
- [How It Works](#how-it-works)
- [Development](#development)
- [Deployment](#deployment)

---

## What is SpendOS?

SpendOS helps companies manage their crypto treasury with smart policies and automated execution:

- **Admins** deposit USDC into the treasury and create spend accounts for different teams
- **Spenders** request funds which are automatically approved if under threshold, otherwise sent to managers
- **Managers** approve larger requests that need oversight
- **Backend** automatically executes approved spends using Circle Gateway for cross-chain transfers

All spend policies live on-chain in the Treasury smart contract, while the backend handles event processing and execution.

## Tech Stack

| Technology     | Version | Purpose                                     |
| -------------- | ------- | ------------------------------------------- |
| Node.js        | 20+     | Runtime environment                         |
| NestJS         | 11.x    | Backend framework with dependency injection |
| TypeScript     | 5.7+    | Type-safe development                       |
| PostgreSQL     | 15+     | Primary database for requests/analytics     |
| TypeORM        | 0.3.x   | Database ORM and migrations                 |
| Redis          | 7+      | Cache and job queue                         |
| Bull           | 4.x     | Background job processing                   |
| ethers.js      | 6.x     | Blockchain interactions                     |
| Circle Gateway | -       | Cross-chain USDC transfers                  |
| JWT            | -       | Authentication tokens                       |
| Swagger        | -       | API documentation                           |

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20+** installed ([download here](https://nodejs.org))
- **PostgreSQL 15+** running locally or via Docker
- **Redis 7+** for caching and job queues
- **Arc Testnet RPC URL** (QuickNode recommended)
- **Circle Gateway-enabled wallet** with USDC deposited
- **Treasury contract deployed** on Arc Testnet

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=spendos

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Arc Blockchain
ARC_RPC_URL=https://your-arc-rpc-url
ARC_WS_URL=wss://your-arc-ws-url
TREASURY_ADDRESS=0x... # Your deployed Treasury contract

# Gateway
GATEWAY_API_BASE_URL=https://gateway-api-testnet.circle.com/v1
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis (if using Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run migration:run

# Start the application
npm run start:dev
```

### 4. Access the Application

Once running, you can access:

- **API**: http://localhost:3001/api/v1
- **Swagger Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health/liveness

---

## Project Structure

```
spend-os-backend/
├── src/
│   ├── alerts/                    # System alerts and notifications
│   │   ├── controllers/           # Alert API endpoints
│   │   ├── services/              # Alert business logic
│   │   └── entities/              # Alert database models
│   │
│   ├── analytics/                 # Treasury analytics and insights
│   │   ├── controllers/           # Analytics API endpoints
│   │   ├── services/              # Runway, burn rate calculations
│   │   └── dto/                   # Data transfer objects
│   │
│   ├── auth/                      # Authentication & authorization
│   │   ├── auth.controller.ts     # Login/logout endpoints
│   │   ├── auth.service.ts        # Signature verification
│   │   ├── strategies/            # JWT strategy
│   │   ├── guards/                # Auth & role guards
│   │   ├── decorators/            # Custom decorators (@User, @Roles)
│   │   └── dto/                   # Nonce & signature DTOs
│   │
│   ├── blockchain/                # Blockchain interaction layer
│   │   ├── services/
│   │   │   ├── arc-provider.service.ts      # Arc RPC providers
│   │   │   └── treasury-listener.service.ts # Event listeners
│   │   └── interfaces/            # Contract ABIs and types
│   │
│   ├── common/                    # Shared utilities
│   │   ├── enums/                 # Status enums (SpendStatus, AlertType, etc.)
│   │   ├── filters/               # HTTP exception filters
│   │   ├── interceptors/          # Logging interceptors
│   │   └── utils/                 # Helper functions
│   │
│   ├── config/                    # Configuration management
│   │   ├── configuration.ts       # Env variable mapping
│   │   └── validation.ts          # Env validation schema
│   │
│   ├── database/                  # Database configuration
│   │   ├── data-source.ts         # TypeORM data source
│   │   └── migrations/            # Database migrations
│   │
│   ├── gateway/                   # Circle Gateway integration
│   │   ├── services/
│   │   │   ├── burn-intent.service.ts       # EIP-712 burn intent signing
│   │   │   ├── gateway-api.service.ts       # Gateway API client
│   │   │   └── cross-chain-mint.service.ts  # Destination chain minting
│   │   └── interfaces/            # Gateway types and contracts
│   │
│   ├── health/                    # Health check endpoints
│   │   └── health.controller.ts   # Liveness & readiness probes
│   │
│   ├── jobs/                      # Background job processing
│   │   ├── processors/
│   │   │   └── spend-execution.processor.ts # Spend execution jobs
│   │   └── dto/                   # Job data transfer objects
│   │
│   ├── redis/                     # Redis service wrapper
│   │   └── services/
│   │       └── redis.service.ts   # Redis client
│   │
│   ├── spend-accounts/            # Spend account management
│   │   ├── controllers/           # Account API endpoints
│   │   ├── services/              # Account CRUD operations
│   │   └── entities/              # SpendAccount model
│   │
│   ├── spend-requests/            # Spend request tracking
│   │   ├── controllers/           # Request API endpoints
│   │   ├── services/              # Request lifecycle management
│   │   └── entities/              # SpendRequest model
│   │
│   ├── treasury/                  # Treasury contract interactions
│   │   ├── controllers/           # Treasury API endpoints
│   │   ├── services/              # Balance queries, funding history
│   │   └── dto/                   # Treasury DTOs
│   │
│   ├── app.module.ts              # Root application module
│   └── main.ts                    # Application entry point
│
├── typechain-types/               # Generated TypeScript contract types
├── test/                          # E2E tests
├── docker-compose.yml             # Local development services
├── Dockerfile                     # Production container
└── package.json                   # Dependencies and scripts
```

---

## Modules Overview

### 🔐 Authentication Module (`src/auth/`)

Handles wallet-based authentication using Sign-In With Ethereum (SIWE) pattern.

**What it does:**

- Generates unique nonces for wallet signature challenges
- Verifies signatures to authenticate users
- Issues JWT tokens stored in HTTP-only cookies
- Provides role-based access control (Admin, Manager, Spender)

**Key files:**

- `auth.controller.ts` - Login/logout endpoints
- `auth.service.ts` - Signature verification logic
- `jwt.strategy.ts` - JWT validation
- `jwt-auth.guard.ts` - Protects authenticated routes
- `roles.guard.ts` - Enforces role-based permissions

**How authentication works:**

1. Frontend requests nonce for user's wallet address
2. User signs message with nonce using MetaMask/wallet
3. Frontend sends signature to backend
4. Backend verifies signature matches address
5. Backend issues JWT token in HTTP-only cookie
6. Subsequent requests use JWT for authentication

---

### 💰 Treasury Module (`src/treasury/`)

Manages the main USDC treasury contract on Arc blockchain.

**What it does:**

- Queries current USDC balance in treasury
- Tracks deposit/funding history
- Provides balance information to admins and managers

**Key files:**

- `treasury.controller.ts` - Balance and history endpoints
- `treasury.service.ts` - Contract queries via ethers.js

**Endpoints:**

- `GET /treasury/balance` - Current USDC balance
- `GET /treasury/funding-history` - Deposit history (admin only)

---

### 📊 Spend Accounts Module (`src/spend-accounts/`)

Manages spend accounts (budget allocations for departments/teams).

**What it does:**

- Each spend account represents a budget for a team/department
- Has an owner (spender), approver (manager), and spend limits
- Auto-approval threshold determines when manager approval is needed
- Syncs with on-chain SpendAccount creation events

**Key files:**

- `spend-accounts.controller.ts` - Account query endpoints
- `spend-accounts.service.ts` - Account CRUD operations
- `spend-account.entity.ts` - Database model

**Endpoints:**

- `GET /spend-accounts` - All accounts (admin/manager)
- `GET /spend-accounts/mine` - User's owned/approved accounts
- `GET /spend-accounts/:id` - Specific account details

**Database fields:**

```typescript
{
  accountId: number,        // On-chain account ID
  owner: string,            // Spender's wallet address
  approver: string,         // Manager's wallet address
  spendLimit: string,       // Maximum total spend (USDC, 6 decimals)
  autoApproveLimit: string, // Auto-approve threshold
  active: boolean,          // Account enabled/disabled
  department: string,       // Team/department name
}
```

---

### 💸 Spend Requests Module (`src/spend-requests/`)

Tracks all spend requests from creation through execution.

**What it does:**

- Listens for on-chain `SpendRequested` events
- Tracks approval status changes
- Queues approved spends for execution
- Records execution results and transaction hashes

**Key files:**

- `spend-requests.controller.ts` - Request query endpoints
- `spend-requests.service.ts` - Request lifecycle management
- `spend-request.entity.ts` - Database model

**Endpoints:**

- `GET /spend-requests` - All requests with filters
- `GET /spend-requests/account/:accountId` - Requests by account
- `GET /spend-requests/:requestId` - Request details

**Request lifecycle:**

```
PENDING → APPROVED → EXECUTING → EXECUTED
                  ↘ REJECTED
                  ↘ FAILED
```

**Database fields:**

```typescript
{
  requestId: number,           // On-chain request ID
  accountId: number,           // Associated spend account
  amount: string,              // Amount in USDC (6 decimals)
  destinationChainId: number,  // Target blockchain (e.g., 84532 = Base Sepolia)
  destinationAddress: string,  // Recipient address
  status: SpendStatus,         // Current status
  reason: string,              // Request description
  createdAt: Date,
  approvedAt: Date,
  executedAt: Date,
  transactionHash: string,     // Mint transaction hash on destination chain
}
```

---

### ⛓️ Gateway Module (`src/gateway/`)

Integrates with Circle Gateway for cross-chain USDC transfers.

**What it does:**

- Creates EIP-712 signed burn intents
- Submits burn intents to Circle Gateway API
- Waits for attestation from Circle
- Executes mint on destination chain
- All addresses must be converted to bytes32 format for Gateway API

**Key files:**

- `burn-intent.service.ts` - Creates and signs burn intents using EIP-712
- `gateway-api.service.ts` - Gateway API client
- `cross-chain-mint.service.ts` - Mints USDC on destination chains

**How Gateway transfers work:**

1. Create burn intent with source/destination details
2. Sign burn intent using EIP-712 typed data
3. Submit to Gateway API at `/v1/transfer`
4. Gateway burns USDC on source (Arc) via smart contract
5. Gateway provides attestation after confirmation
6. Call `gatewayMint()` on destination chain with attestation
7. USDC minted to recipient on destination chain

**Important:** All addresses in burn intents must be bytes32 format (left-padded with zeros). The service automatically converts 20-byte addresses to 32-byte format.

---

### 🔔 Alerts Module (`src/alerts/`)

Generates and manages system alerts for important events.

**What it does:**

- Creates alerts for critical conditions (low balance, failed transactions)
- Categorizes alerts by type and severity
- Allows admins/managers to acknowledge alerts

**Alert types:**

- `LOW_BALANCE` - Treasury balance below threshold
- `FAILED_TRANSACTION` - Spend execution failed
- `SPEND_LIMIT_APPROACHING` - Account nearing spend limit

**Severity levels:**

- `LOW` - Informational
- `MEDIUM` - Should be reviewed
- `HIGH` - Requires attention
- `CRITICAL` - Immediate action needed

**Endpoints:**

- `GET /alerts` - Filter alerts by type/severity/status
- `PATCH /alerts/:id` - Acknowledge alert

---

### 📈 Analytics Module (`src/analytics/`)

Provides financial insights and forecasting.

**What it does:**

- Calculates treasury runway (days until funds depleted)
- Computes burn rate (average daily/weekly/monthly spending)
- Breaks down spending by department
- Helps admins understand spending patterns

**Endpoints:**

- `GET /analytics/runway` - Days of runway remaining
- `GET /analytics/burn-rate?days=30` - Spending rate over period
- `GET /analytics/department-breakdown` - Spending by department

**Example runway calculation:**

```
Current Balance: 1000 USDC
Daily Burn Rate: 5 USDC (calculated from last 30 days)
Runway: 200 days
Depletion Date: ~July 4, 2025
```

---

### ⚙️ Blockchain Module (`src/blockchain/`)

Handles all blockchain interactions with Arc Testnet.

**What it does:**

- Maintains HTTP and WebSocket providers for Arc
- Listens to Treasury contract events in real-time
- Provides contract instances for treasury operations

**Key services:**

- `arc-provider.service.ts` - Provider management
- `treasury-listener.service.ts` - Event listeners

**Events listened to:**

- `SpendAccountCreated` → Creates account in database
- `SpendRequested` → Creates request record
- `SpendApproved` → Queues execution job
- `SpendExecuted` → Updates request status
- `SpendRejected` → Marks request rejected

---

### 🔧 Jobs Module (`src/jobs/`)

Background job processing using Bull queue.

**What it does:**

- Processes approved spends asynchronously
- Retries failed executions
- Handles Gateway integration and cross-chain minting

**Job flow:**

```
SpendApproved event
  ↓
Queue job in Redis
  ↓
Processor picks up job
  ↓
1. Create burn intent
2. Submit to Gateway
3. Wait for attestation
4. Mint on destination
5. Mark executed on-chain
6. Update database
```

**Configuration:**

- Max retries: 3
- Backoff: Exponential
- Concurrency: 5 jobs at once

---

### 🏥 Health Module (`src/health/`)

Provides health check endpoints for monitoring and orchestration.

**Endpoints:**

- `GET /health/liveness` - Simple check that app is running
- `GET /health/readiness` - Checks database and Redis connectivity

**Used by:**

- Kubernetes liveness/readiness probes
- Docker health checks
- Monitoring systems (Datadog, New Relic, etc.)

---

## API Endpoints

All endpoints are prefixed with `/api/v1` and documented in Swagger at `/api/docs`.

### Authentication Endpoints

| Method | Endpoint       | Description                  | Auth Required | Roles |
| ------ | -------------- | ---------------------------- | ------------- | ----- |
| POST   | `/auth/nonce`  | Request authentication nonce | No            | -     |
| POST   | `/auth/verify` | Verify signature and login   | No            | -     |
| GET    | `/auth/me`     | Get current user info        | Yes           | All   |
| POST   | `/auth/logout` | Logout and clear cookie      | No            | -     |

**Authentication flow:**

```javascript
// 1. Request nonce
const { nonce } = await fetch('/api/v1/auth/nonce', {
  method: 'POST',
  body: JSON.stringify({ address: '0x...' }),
});

// 2. Sign message with wallet
const message = `Sign this message to authenticate with Arc SpendOS

Nonce: ${nonce}
Address: ${address}`;
const signature = await signer.signMessage(message);

// 3. Verify and login
await fetch('/api/v1/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ address, message, signature }),
});
// JWT token now set in HTTP-only cookie
```

---

### Treasury Endpoints

| Method | Endpoint                    | Description              | Auth Required | Roles          |
| ------ | --------------------------- | ------------------------ | ------------- | -------------- |
| GET    | `/treasury/balance`         | Get current USDC balance | Yes           | Admin, Manager |
| GET    | `/treasury/funding-history` | Get deposit history      | Yes           | Admin          |

---

### Spend Accounts Endpoints

| Method | Endpoint                     | Description            | Auth Required | Roles          |
| ------ | ---------------------------- | ---------------------- | ------------- | -------------- |
| GET    | `/spend-accounts`            | Get all spend accounts | Yes           | Admin, Manager |
| GET    | `/spend-accounts/mine`       | Get user's accounts    | Yes           | All            |
| GET    | `/spend-accounts/:accountId` | Get specific account   | Yes           | All            |

---

### Spend Requests Endpoints

| Method | Endpoint                             | Description                     | Auth Required | Roles |
| ------ | ------------------------------------ | ------------------------------- | ------------- | ----- |
| GET    | `/spend-requests`                    | Get all requests (with filters) | Yes           | All   |
| GET    | `/spend-requests/account/:accountId` | Get requests for account        | Yes           | All   |
| GET    | `/spend-requests/:requestId`         | Get specific request            | Yes           | All   |

**Query parameters:**

- `accountId` - Filter by account
- `status` - Filter by status (PENDING, APPROVED, EXECUTED, etc.)
- `limit` - Max number of results

---

### Analytics Endpoints

| Method | Endpoint                          | Description                | Auth Required | Roles          |
| ------ | --------------------------------- | -------------------------- | ------------- | -------------- |
| GET    | `/analytics/runway`               | Get treasury runway        | Yes           | Admin          |
| GET    | `/analytics/burn-rate`            | Get spending burn rate     | Yes           | Admin          |
| GET    | `/analytics/department-breakdown` | Get spending by department | Yes           | Admin, Manager |

---

### Alerts Endpoints

| Method | Endpoint      | Description       | Auth Required | Roles          |
| ------ | ------------- | ----------------- | ------------- | -------------- |
| GET    | `/alerts`     | Get system alerts | Yes           | Admin, Manager |
| PATCH  | `/alerts/:id` | Acknowledge alert | Yes           | Admin, Manager |

---

### Health Endpoints

| Method | Endpoint            | Description             | Auth Required | Roles |
| ------ | ------------------- | ----------------------- | ------------- | ----- |
| GET    | `/health/liveness`  | Check if app is running | No            | -     |
| GET    | `/health/readiness` | Check if app is ready   | No            | -     |

---

## How It Works

### Complete User Flow

Here's what happens when a spender requests funds:

#### 1. **Spender Creates Request (On-Chain)**

Spender calls `requestSpend()` on the Treasury contract:

```solidity
treasury.requestSpend(
  accountId: 1,
  amount: 1500000,  // 1.5 USDC (6 decimals)
  destinationChainId: 84532,  // Base Sepolia
  destinationAddress: "0x742d35Cc...",
  reason: "Cloud infrastructure costs"
)
```

#### 2. **Backend Detects Event**

The `TreasuryListener` service picks up the `SpendRequested` event via WebSocket:

```typescript
// Event detected
{
  requestId: 15,
  accountId: 1,
  amount: "1500000",
  destinationChainId: 84532,
  destinationAddress: "0x742d35Cc...",
  requester: "0xSpender..."
}
```

The backend creates a database record with status `PENDING`.

#### 3. **Auto-Approval (If Under Threshold)**

If amount < autoApproveLimit (e.g., 200 USDC), the contract auto-approves and emits `SpendApproved`.

Otherwise, the manager must approve via `approveSpend(requestId)`.

#### 4. **Execution Queue**

When `SpendApproved` event is detected:

```typescript
// Add job to Bull queue
await this.spendQueue.add('execute-spend', {
  requestId: 15,
  amount: '1500000',
  destinationChainId: 84532,
  destinationAddress: '0x742d35Cc...',
});
```

#### 5. **Burn Intent Creation**

The job processor creates an EIP-712 signed burn intent:

```typescript
const burnIntent = {
  maxBlockHeight: MaxUint256, // No expiry
  maxFee: '2010000', // 2.01 USDC minimum
  spec: {
    version: 1,
    sourceDomain: 26, // Arc Testnet
    destinationDomain: 6, // Base Sepolia
    sourceContract: '0x0077777d...', // Gateway Wallet (bytes32)
    destinationContract: '0x0022222A...', // Gateway Minter (bytes32)
    sourceToken: '0x36000000...', // USDC on Arc (bytes32)
    destinationToken: '0x036CbD53...', // USDC on Base (bytes32)
    sourceDepositor: '0x422d3C8f...', // Backend wallet (bytes32)
    destinationRecipient: '0x742d35Cc...', // Spender (bytes32)
    sourceSigner: '0x422d3C8f...', // Backend wallet (bytes32)
    destinationCaller: '0x00000000...', // Anyone can mint (bytes32)
    value: '1500000',
    salt: '0xrandom...',
    hookData: '0x',
  },
};

const signature = await wallet.signTypedData(domain, types, burnIntent);
```

#### 6. **Gateway Submission**

Submit to Circle Gateway API:

```typescript
POST https://gateway-api-testnet.circle.com/v1/transfer
[
  {
    burnIntent: { ... },
    signature: "0x..."
  }
]
```

Gateway response includes attestation and burn transaction hash.

#### 7. **Cross-Chain Mint**

After confirmation, mint on destination chain (Base Sepolia):

```typescript
const minterContract = new Contract(
  '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B', // Gateway Minter
  ['function gatewayMint(bytes attestation, bytes signature)'],
  wallet,
);

const tx = await minterContract.gatewayMint(attestation, signature);
await tx.wait();
// USDC now in recipient's wallet on Base Sepolia
```

#### 8. **Mark Executed**

Call back to Treasury contract:

```typescript
treasury.markSpendExecuted(
  requestId: 15,
  transactionHash: "0x8efc6811..."  // Mint tx hash
)
```

#### 9. **Database Update**

Update request record:

```typescript
{
  status: "EXECUTED",
  executedAt: new Date(),
  transactionHash: "0x8efc6811..."
}
```

**Total execution time:** ~11 seconds from approval to funds in recipient's wallet! 🚀

---

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start database and Redis
docker-compose up -d postgres redis

# Run migrations
npm run migration:run

# Start in watch mode
npm run start:dev
```

### Code Quality

```bash
# Linting
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

### Database Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Debugging

The application uses NestJS built-in logger with different log levels:

```typescript
// In your service
constructor(private readonly logger = new Logger(YourService.name)) {}

this.logger.log('Info message');
this.logger.debug('Debug details');
this.logger.warn('Warning');
this.logger.error('Error occurred', error.stack);
```

Set log level in `.env`:

```env
LOG_LEVEL=debug  # error, warn, log, debug, verbose
```

---

## Deployment

### Docker Deployment

```bash
# Build production image
docker build -t spendos-backend:latest .

# Run container
docker run -d \
  -p 3001:3001 \
  --env-file .env.production \
  --name spendos-backend \
  spendos-backend:latest
```

### Docker Compose (Production)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Environment Variables (Production)

Make sure to set these in production:

```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
DB_SSL=true
REDIS_TLS=true
```

### Health Checks

Configure your orchestrator (Kubernetes, ECS, etc.) to use:

- **Liveness probe**: `GET /health/liveness`
- **Readiness probe**: `GET /health/readiness`

Example Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## Architecture Decisions

### Why Circle Gateway?

Circle Gateway provides:

- **Unified USDC balance** across multiple chains
- **Trust-minimized bridging** (burn & mint, not lock & mint)
- **No bridge fees** besides network gas
- **Permissionless API** - no API keys needed
- **Native USDC** on destination chains (not wrapped)

### Why NestJS?

- Strong TypeScript support out of the box
- Excellent dependency injection
- Built-in support for WebSockets, queues, cron jobs
- Clear module structure scales well
- Great ecosystem (Swagger, testing, etc.)

### Why Bull Queue?

- Reliable Redis-backed job queue
- Automatic retries with backoff
- Job prioritization
- Dashboard for monitoring
- Works great with NestJS

### Why TypeORM?

- TypeScript-first ORM
- Migration system
- Supports PostgreSQL advanced features
- Active community

---

## Troubleshooting

### Common Issues

**Database connection fails:**

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection settings in .env
DB_HOST=localhost
DB_PORT=5432
```

**Redis connection fails:**

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli ping
```

**WebSocket disconnects:**

```bash
# Use reliable RPC provider (QuickNode, Alchemy)
# Enable auto-reconnect in arc-provider.service.ts
```

**Gateway API errors:**

```bash
# Ensure all addresses are bytes32 format
# Check wallet has USDC deposited in Gateway
# Verify Treasury contract has approved Gateway Wallet
```

**Jobs not processing:**

```bash
# Check Bull queue dashboard
# Verify Redis is accessible
# Check job processor logs
```

---

## Support

For issues or questions:

- Check the Swagger docs at `/api/docs`
- Review the codebase structure above
- Check logs for detailed error messages
- email me or discord dm me (info on my github profile)

---
