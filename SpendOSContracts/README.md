# Arc SpendOS - Smart Contracts

On-chain treasury management with programmable spend accounts, budgets, limits, approvals, and auto-topup. Built for Arc blockchain using Circle Gateway for cross-chain USDC.

## Quick Start

```bash
# Install
forge install
cp .env.example .env

# Edit .env with your keys
# - PRIVATE_KEY (deployer wallet)
# - BACKEND_WALLET_ADDRESS (for backend operator)
# - BLOCKSCOUT_API_KEY (from https://testnet.arcscan.app/account/api-key)

# Build and test
forge build
forge test

# Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast

# Save address to .env, then create demo accounts
forge script script/SetupDemo.s.sol:SetupDemoScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast
```

## What It Does

Create spend accounts with budgets, limits, and approval thresholds. Users request spends, managers approve them (or they auto-approve if small enough), backend executes via Circle Gateway.

**Example accounts created by demo script:**
- Marketing: 2000 USDC/month, auto-topup enabled
- Engineering: 5000 USDC/month
- Operations: 1000 USDC/week, auto-approve all requests

## Project Structure

```
.
├── src/
│   └── Treasury.sol              # Main contract
├── test/
│   └── Treasury.t.sol            # 49 tests
├── script/
│   ├── Deploy.s.sol              # Deployment script
│   └── SetupDemo.s.sol           # Demo account setup
└── .env.example                  # Environment template
```

## How It Works

### Roles

- **Admin**: Creates accounts, manages global settings, transfers admin rights
- **Manager**: Added by admin, can freeze accounts, configure auto-topup, sweep/reset periods
- **Account Approver**: Per-account role that approves spends for their account (doesn't need to be a manager)
- **Spender**: Account owner, requests spends
- **Backend Operator**: Marks spends as executed/failed after Gateway processes them

### Spend Accounts

Each account has:
- Budget per period (e.g., 2000 USDC/month)
- Per-transaction limit (max per spend)
- Daily limit (max per 24 hours, checked at approval time)
- Approval threshold (amounts above this need manual approval)
- Allowed chains (where funds can be sent)
- Auto-topup config (optional)

### Spend Flow

1. **Request**: Spender calls `requestSpend(accountId, amount, chainId, destination, description)`
2. **Auto-approve**: If amount ≤ approval threshold, instantly approved
3. **Manual approve**: Otherwise, approver calls `approveSpend(requestId)`
4. **Execute**: Backend processes via Gateway, calls `markSpendExecuted(requestId, gatewayTxId)`
5. **Or fail**: If Gateway fails, backend calls `markSpendFailed(requestId, reason)`

### Reservation System

When a spend is approved, the amount is "reserved" (added to `periodReserved` and `dailyReserved`). This prevents multiple pending spends from exceeding limits. When executed, it moves from reserved to spent. If it fails, it's released back to available budget.

### Auto-Topup

Managers can configure auto-topup with a min balance and target balance. When virtual balance (budgetPerPeriod - periodSpent - periodReserved) falls below min, call `autoTopup()` to increase the budget to target.

### Period Management

At period end, you can:
- **Reset**: Clears periodSpent, starts new period (requires no pending reservations)
- **Sweep**: Reclaims unspent budget back to treasury (allowed with reservations, only takes unallocated funds)

## Common Operations

### Create Account

```bash
cast send $TREASURY_CONTRACT_ADDRESS \
  "createSpendAccount(address,string,uint256,uint256,uint256,uint256,uint256,address,uint256[])" \
  $SPENDER_ADDRESS \
  "Marketing" \
  2000000000 \
  2592000 \
  500000000 \
  1000000000 \
  200000000 \
  $APPROVER_ADDRESS \
  "[5042002,84532]" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL
```

### Request Spend

```bash
cast send $TREASURY_CONTRACT_ADDRESS \
  "requestSpend(uint256,uint256,uint256,address,string)" \
  0 \
  150000000 \
  84532 \
  $DESTINATION_ADDRESS \
  "Marketing expense" \
  --private-key $SPENDER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL
```

### Approve Spend

```bash
cast send $TREASURY_CONTRACT_ADDRESS \
  "approveSpend(uint256)" \
  0 \
  --private-key $APPROVER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL
```

### View Account

```bash
cast call $TREASURY_CONTRACT_ADDRESS "getAccount(uint256)" 0 --rpc-url $ARC_TESTNET_RPC_URL
```

### Configure Auto-Topup

```bash
cast send $TREASURY_CONTRACT_ADDRESS \
  "setAutoTopupConfig(uint256,uint256,uint256)" \
  0 \
  500000000 \
  1500000000 \
  --private-key $MANAGER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL
```

## Key Functions

### Admin Only

- `createSpendAccount()` - Create new spend account
- `updateSpendAccount()` - Update limits/budget (validates that new budget >= existing allocations)
- `closeAccount()` - Close account (requires no pending reservations)
- `transferAdmin()` - Transfer admin to new address
- `updateAllowedChains()` - Change allowed chains for account
- `addManager()` / `removeManager()` - Manage managers
- `addBackendOperator()` - Add backend operator
- `setChainSupport()` - Enable/disable chains globally
- `pause()` / `unpause()` - Emergency pause

### Manager

- `approveSpend()` / `rejectSpend()` - Approve/reject spends (approver or admin only)
- `freezeAccount()` / `unfreezeAccount()` - Temporarily disable account
- `setAutoTopupConfig()` - Configure auto-topup thresholds
- `autoTopup()` - Execute auto-topup
- `resetPeriod()` - Reset budget period (requires no pending reservations)
- `sweepAccount()` - Reclaim unspent budget at period end

### Spender

- `requestSpend()` - Request new spend

### Backend Operator

- `markSpendExecuted()` - Mark spend as executed
- `markSpendFailed()` - Mark spend as failed
- `recordInboundFunding()` / `recordOutboundFunding()` - Track funding

### View Functions

- `getAccount()` - Get account details
- `getRequest()` - Get request details
- `getAccountCount()` / `getRequestCount()` - Get counts
- `isPeriodEnded()` - Check if period ended

## Important Details

### Validation

- `dailyLimit` must be 0 or >= `perTxLimit`
- `approvalThreshold` must be <= `perTxLimit`
- Auto-topup requires `minBalance > 0`, `targetBalance > 0`, and `targetBalance > minBalance`
- Can't reduce budget below `periodSpent + periodReserved` when updating
- Can't reset period or close account with pending reservations
- Sweeps are allowed with pending reservations (only reclaims unallocated budget)

### Edge Cases

- Pending requests to a chain can still be approved even if the chain is later removed from allowed/supported lists
- Daily limits are enforced at approval time, not execution time (if approved on Day 1 but executed on Day 2, Day 1's dailyReserved increases, Day 2's dailySpent increases)
- Updating dailyLimit doesn't validate against existing dailySpent + dailyReserved (you may appear over limit temporarily until daily reset)
- Reducing perTxLimit doesn't prevent existing pending requests from being approved

### Auto-Approval

Requests with amount <= approvalThreshold are auto-approved. The `SpendApproved` event will have `approver = address(this)` (the contract address) to indicate policy-based auto-approval.

### Pause Behavior

When paused:
- **Blocked**: createSpendAccount, requestSpend, approveSpend, markSpendExecuted
- **Allowed**: rejectSpend, markSpendFailed (cleanup operations)

## Supported Chains

Default testnet chains (configured by Deploy script):
- Arc Testnet (5042002)
- Base Sepolia (84532)
- Ethereum Sepolia (11155111)
- Avalanche Fuji (43113)

Demo script adds all Gateway-supported testnet chains (8 total).

Additional chains can be added via `setChainSupport()`.

## Security

- Access control for all sensitive operations
- ReentrancyGuard on critical state-changing functions
- Reservation system prevents race conditions
- Emergency pause capability
- Comprehensive input validation (string lengths, address checks, amount validation)
- No fund custody (Gateway handles funds, contract only tracks state)
- Invariant protection (budget >= allocations, can't close/reset with pending reservations)

## Testing

```bash
# Run all 49 tests
forge test

# Run specific test
forge test --match-test testCreateSpendAccount

# With gas report
forge test --gas-report

# With traces
forge test -vvv
```

Test coverage:
- Account lifecycle (create, update, freeze, close)
- Spend request flow (auto-approve, manual approve)
- Budget enforcement (period, daily, per-tx limits)
- Reservation system and race condition prevention
- Period management (reset, sweep)
- Access control and permissions
- Auto-topup functionality
- Chain management
- Pause behavior
- String length limits

## Integration

**Backend**: Listen for events, process approved spends via Circle Gateway, mark execution status.

**Frontend**: Read account state via view functions, submit spend requests, display real-time status by listening to events.

## Resources

- [Arc Documentation](https://docs.arc.network)
- [Circle Gateway Docs](https://developers.circle.com/gateway)
- [Foundry Book](https://book.getfoundry.sh)
- Full contract documentation: [CONTRACTS_README.md](CONTRACTS_README.md)
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Quick start: [QUICK_START.md](QUICK_START.md)
