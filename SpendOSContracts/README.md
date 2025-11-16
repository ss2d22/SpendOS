# Arc SpendOS - Smart Contracts

## Overview

The Arc SpendOS smart contracts provide on-chain programmable treasury management with spend accounts, budgets, limits, approvals, auto-topup, account sweeps, and full auditability on the Arc blockchain.

## Project Structure

```
.
├── src/
│   └── Treasury.sol              # Main treasury contract
├── test/
│   └── Treasury.t.sol            # Comprehensive test suite (49 tests)
├── script/
│   ├── Deploy.s.sol              # Main deployment script
│   └── SetupDemo.s.sol           # Demo account setup script
├── README.md                     # this file
├── foundry.toml                  # Foundry configuration
└── .env.example                  # Environment variables template
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Test USDC tokens

## Installation

```bash
# Install dependencies
forge install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# - Add your PRIVATE_KEY (deployer wallet)
# - Add BACKEND_WALLET_ADDRESS (for backend operator)
# - check GATEWAY_WALLET_ADDRESS is correct (if it changes in the future)
```

## Build

```bash
# Compile contracts
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Run tests with detailed traces
forge test -vvv
```

## Deployment

```bash
# 1. Setup environment
cp .env.example .env
nano .env  # Fill in PRIVATE_KEY, BACKEND_WALLET_ADDRESS, and BLOCKSCOUT_API_KEY
source .env

# 2. Get testnet USDC from https://faucet.circle.com

# 3. Get Blockscout API key from https://testnet.arcscan.app/account/api-key (for verification)

# 4. Deploy Treasury
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --broadcast

# 5. Save contract address to .env
echo "TREASURY_CONTRACT_ADDRESS=0x..." >> .env
source .env

# 6. (Optional) Create demo accounts
forge script script/SetupDemo.s.sol:SetupDemoScript \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --broadcast
```

**Deployment Script Features:**

- ✅ Deploys Treasury with admin and Gateway configuration
- ✅ Adds backend operator for spend execution
- ✅ Configures supported chains (Arc, Base Sepolia, Eth Sepolia, Avalanche Fuji)
- ✅ Outputs verification commands and next steps

**Demo Script Creates:**

- ✅ Marketing account (2000 USDC/month, auto-topup)
- ✅ Engineering account (5000 USDC/month)
- ✅ Operations account (1000 USDC/week, auto-approve all)

## Contract Interaction Examples

### Using Cast (Foundry)

```bash
# Get account count
cast call $TREASURY_CONTRACT_ADDRESS "getAccountCount()" --rpc-url $ARC_TESTNET_RPC_URL

# Get account details
cast call $TREASURY_CONTRACT_ADDRESS "getAccount(uint256)" 0 --rpc-url $ARC_TESTNET_RPC_URL

# Create spend account (as admin)
cast send $TREASURY_CONTRACT_ADDRESS \
  "createSpendAccount(address,string,uint256,uint256,uint256,uint256,uint256,address,uint256[])" \
  $SPENDER_ADDRESS \
  "Marketing" \
  2000000000 \
  2592000 \
  500000000 \
  1000000000 \
  200000000 \
  $MANAGER_ADDRESS \
  "[5042002,84532]" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Request spend (as spender)
cast send $TREASURY_CONTRACT_ADDRESS \
  "requestSpend(uint256,uint256,uint256,address,string)" \
  0 \
  150000000 \
  84532 \
  $DESTINATION_ADDRESS \
  "Marketing expense" \
  --private-key $SPENDER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Approve spend (as manager)
cast send $TREASURY_CONTRACT_ADDRESS \
  "approveSpend(uint256)" \
  0 \
  --private-key $MANAGER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Mark spend executed (as backend)
cast send $TREASURY_CONTRACT_ADDRESS \
  "markSpendExecuted(uint256,string)" \
  0 \
  "gateway-tx-123" \
  --private-key $BACKEND_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Configure auto-topup (as manager)
cast send $TREASURY_CONTRACT_ADDRESS \
  "setAutoTopupConfig(uint256,uint256,uint256)" \
  0 \
  500000000 \
  1500000000 \
  --private-key $MANAGER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Execute auto-topup (as manager)
cast send $TREASURY_CONTRACT_ADDRESS \
  "autoTopup(uint256)" \
  0 \
  --private-key $MANAGER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Sweep account at period end (as manager)
cast send $TREASURY_CONTRACT_ADDRESS \
  "sweepAccount(uint256)" \
  0 \
  --private-key $MANAGER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Update allowed chains (as admin)
cast send $TREASURY_CONTRACT_ADDRESS \
  "updateAllowedChains(uint256,uint256[])" \
  0 \
  "[5042002,84532,11155111]" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Close account (as admin)
cast send $TREASURY_CONTRACT_ADDRESS \
  "closeAccount(uint256)" \
  0 \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL
```

## API Reference

### Core Account Management Functions

#### `createSpendAccount()`

Creates a new spend account with configurable limits and permissions.

**Parameters:**

- `owner` - Address of the account owner (spender)
- `label` - Human-readable label (max 64 chars)
- `budgetPerPeriod` - Budget amount per period (USDC, 6 decimals)
- `periodDuration` - Duration of budget period in seconds (min 1 day)
- `perTxLimit` - Maximum amount per transaction
- `dailyLimit` - Maximum daily spending (0 = use perTxLimit, otherwise must be >= perTxLimit)
- `approvalThreshold` - Amounts above this require approval (must be <= perTxLimit)
- `approver` - Address who can approve spends for this account (can be a manager or any other address; does not need to be in the global managers[] mapping)
- `allowedChains` - Array of chain IDs where spends are allowed

**Validation:**

- `dailyLimit` must be 0 or >= `perTxLimit` to prevent impossible configurations
- `approvalThreshold` must be <= `perTxLimit`

**Access:** Admin only

#### `updateSpendAccount()`

Updates an existing spend account's configuration.

**Parameters:** Same as create, with 0 values keeping current settings

**Invariant Protection:**

- New budget must be >= existing `periodSpent + periodReserved`
- New `perTxLimit` must be >= existing `approvalThreshold` and <= existing `dailyLimit`
- New `dailyLimit` must be >= existing `perTxLimit`
- Cannot update closed accounts

**Edge Cases:**

- Does not validate that new `dailyLimit >= dailySpent + dailyReserved` - you may temporarily appear "over limit" until daily reset occurs
- Does not prevent reducing `perTxLimit` below amounts of existing pending requests - existing requests can still be approved
- Pending requests to a chain remain approvable even if the chain is later removed from `allowedChains` or `supportedChains`

**Access:** Admin only

#### `closeAccount(uint256 accountId)`

Permanently closes an account and reduces totalCommittedBudget.

**Validation:**

- Requires `periodReserved == 0` (no pending approved spends)
- Cannot close already closed accounts

**Access:** Admin only

#### `freezeAccount(uint256 accountId)` / `unfreezeAccount(uint256 accountId)`

Temporarily disable/enable an account without deletion.

**Access:** Manager (freeze), Admin (unfreeze)

#### `updateAllowedChains(uint256 accountId, uint256[] allowedChains)`

Updates the list of allowed destination chains for an account.

**Validation:**

- Cannot update chains for closed accounts

**Access:** Admin only

### Auto-Topup Functions

#### `setAutoTopupConfig(uint256 accountId, uint256 minBalance, uint256 targetBalance)`

Configures auto-topup thresholds for an account.

**Validation:**

- Both `minBalance` and `targetBalance` must be > 0
- `targetBalance` must be > `minBalance`

**Access:** Manager

#### `autoTopup(uint256 accountId)`

Executes auto-topup when virtual balance falls below minimum threshold.
Increases budgetPerPeriod and totalCommittedBudget.

**Calculation:**

- Virtual balance = `budgetPerPeriod - (periodSpent + periodReserved)`
- Accounts for both executed and pending approved spends

**Access:** Manager

### Spend Request Functions

#### `requestSpend(uint256 accountId, uint256 amount, uint256 chainId, address destinationAddress, string description)`

Creates a new spend request. Auto-approves if amount ≤ approvalThreshold.

**Validation:**

- Chain must be globally supported (in `supportedChains` mapping)
- Chain must be in account's `allowedChains` list
- Description must be ≤ 256 characters
- Amount must not exceed account limits (period budget, daily limit, per-tx limit)
- Account must be active (not frozen or closed)
- Contract must not be paused

**Reservation System:**

- If auto-approved, immediately reserves amount in `periodReserved` and `dailyReserved`
- Limits are enforced at approval time, accounting for existing reservations

**Auto-Approval:**

- Requests with `amount <= approvalThreshold` are automatically approved
- Auto-approved requests emit `SpendApproved` event with `approver = address(this)` (the contract address)
- Backend/indexer should recognize `address(this)` as indicating policy-based auto-approval

**Access:** Account owner only

#### `approveSpend(uint256 requestId)` / `rejectSpend(uint256 requestId, string reason)`

Approve or reject a pending spend request.

**approveSpend Validation:**

- Request must be in PendingApproval status
- Account must be active (not frozen or closed)
- Re-validates limits with current reservations (prevents race conditions)
- Reserves amount in `periodReserved` and `dailyReserved`
- Contract must not be paused
- **Note:** Does NOT re-validate chain constraints - if a chain is removed from `supportedChains` or `allowedChains` after request creation, pending requests can still be approved

**rejectSpend Validation:**

- Reason must be ≤ 256 characters
- Can be used when contract is paused (cleanup operation)

**Chain Policy Changes:**

- If admin changes `supportedChains` or account's `allowedChains` after a request is created, existing pending requests are NOT automatically rejected
- Admins/approvers should manually reject such requests if desired
- This allows flexibility to approve grandfathered requests if appropriate

**Access:** Account approver or admin

#### `markSpendExecuted(uint256 requestId, string gatewayTxId)`

Marks a spend as executed after Gateway processes it.

**Behavior:**

- Moves amount from `periodReserved`/`dailyReserved` to `periodSpent`/`dailySpent`
- gatewayTxId must be ≤ 128 characters
- Contract must not be paused

**Access:** Backend operator only

#### `markSpendFailed(uint256 requestId, string reason)`

Marks a spend as failed if Gateway execution fails.

**Behavior:**

- Releases amount from `periodReserved` and `dailyReserved` (returns to available budget)
- Reason must be ≤ 256 characters
- Can be used when contract is paused (cleanup operation)

**Access:** Backend operator only

### Period Management Functions

#### `resetPeriod(uint256 accountId)`

Resets the budget period for an account (clears periodSpent).

**Validation:**

- Period must have ended (block.timestamp >= periodStart + periodDuration)
- No pending reservations (`periodReserved == 0`)
- Cannot reset closed accounts

**Access:** Manager only

#### `sweepAccount(uint256 accountId)`

Sweeps unspent budget at period end, reducing both account budget and totalCommittedBudget.

**Calculation:**

- Unspent = `budgetPerPeriod - (periodSpent + periodReserved)`
- Accounts for pending approved spends
- Only reclaims truly unallocated budget; reserved amounts are still honored

**Validation:**

- Period must have ended
- Cannot sweep closed accounts
- **Allowed with pending reservations** - unlike `resetPeriod`, `sweepAccount` can run even when `periodReserved > 0`

**Behavior:**

- After sweep, `budgetPerPeriod = periodSpent + periodReserved` (exactly the allocated amount)
- Existing approved-but-not-executed spends remain fully funded

**Access:** Manager

### Admin Functions

#### `transferAdmin(address newAdmin)`

Transfer admin rights to a new address.

**Validation:**

- New admin cannot be zero address
- New admin cannot be current admin

**Access:** Admin only

**Event:** `AdminTransferred(previousAdmin, newAdmin)`

#### `pause()` / `unpause()`

Pause or unpause the contract for emergency use.

**Pause Behavior:**

- **Blocked when paused**: createSpendAccount, requestSpend, approveSpend, markSpendExecuted
- **Allowed when paused**: rejectSpend, markSpendFailed (cleanup operations)

**Access:** Admin only

**Events:** `ContractPaused`, `ContractUnpaused`

### View Functions

#### `getAccount(uint256 accountId)`

Returns full SpendAccount struct with all details.

#### `getRequest(uint256 requestId)`

Returns full SpendRequest struct with all details.

#### `getAccountCount()` / `getRequestCount()`

Returns total number of accounts/requests created.

#### `isPeriodEnded(uint256 accountId)`

Returns true if the account's current period has ended.

## Key Features

### Role-Based Access Control

- **Admin**: Can create accounts, add managers/operators, configure chains, close accounts, transfer admin rights
- **Manager**: Can approve/reject spends (for their assigned accounts), freeze accounts, configure auto-topup, sweep accounts, reset periods
- **Account Approver**: Each spend account has a designated approver who can approve/reject spends for that specific account. This approver does NOT need to be in the global managers[] mapping - it can be a "team lead" who has approval authority for their team's account without having broader manager permissions.
- **Spender**: Can request spends from their assigned account
- **Backend Operator**: Can mark spends as executed/failed, record funding transactions

### Spend Accounts

Each spend account has:

- **Budget per period**: Total amount available per period (e.g., monthly)
- **Per-transaction limit**: Maximum amount per single spend
- **Daily limit**: Maximum spending per 24-hour window (configurable, enforced at approval time)
- **Approval threshold**: Amounts above this require manager approval (must be ≤ perTxLimit)
- **Allowed chains**: Chains where spends are permitted (updateable, must also be globally supported)
- **Auto-topup settings**: Optional minimum and target balance for automatic budget replenishment
- **Account lifecycle**: Accounts can be Active, Frozen, or Closed
- **Reservation tracking**: `periodReserved` and `dailyReserved` track approved-but-not-executed amounts to prevent race conditions

### Automatic Approvals

Spend requests below the approval threshold are automatically approved, enabling fast execution while maintaining control over larger spends.

### Reservation System (Race Condition Prevention)

The contract implements a comprehensive reservation system to prevent race conditions where multiple pending/approved requests could exceed budget limits:

**The Problem:**

- In a naive implementation, `periodSpent` and `dailySpent` only update when spends are executed
- This allows multiple requests to pass validation simultaneously, then exceed limits when executed
- Example: Account has 1000 budget, 900 spent. Three 200 requests could all be approved (each sees 900 spent < 1000 budget), resulting in 1500 total spending

**The Solution:**

- Added `periodReserved` and `dailyReserved` fields to SpendAccount struct
- Track approved-but-not-executed amounts separately from executed amounts
- All limit validations check `spent + reserved` instead of just `spent`

**Reservation Lifecycle:**

1. **Request**: No reservation yet (validation uses existing spent + reserved)
2. **Approval**: Amount added to `periodReserved` and `dailyReserved`
3. **Execution**: Amount moved from reserved to spent (via `markSpendExecuted`)
4. **Failure**: Amount released from reserved, returned to available budget (via `markSpendFailed`)

**Validation Examples:**

- `requestSpend`: Checks `periodSpent + periodReserved + newAmount <= budgetPerPeriod`
- `approveSpend`: Re-validates with current reservations to prevent TOCTOU issues
- `autoTopup`: Uses virtual balance = `budgetPerPeriod - (periodSpent + periodReserved)`
- `sweepAccount`: Calculates unspent = `budgetPerPeriod - (periodSpent + periodReserved)`

**Safety Constraints:**

- `resetPeriod`: Requires `periodReserved == 0` (cannot reset with pending approvals)
- `closeAccount`: Requires `periodReserved == 0` (cannot close with pending spends)
- `updateSpendAccount`: Requires new budget >= `periodSpent + periodReserved`

**Daily Limit Semantics:**

- Daily limits are enforced at **approval time**, not execution time
- When a request is approved on Day 1 but executed on Day 2:
  - Day 1's `dailyReserved` is incremented (approval)
  - Day 2's `dailySpent` is incremented (execution)
  - This is by design: limit daily approval velocity, not execution velocity

### Auto-Topup Feature

Managers can configure automatic budget replenishment:

- **Minimum balance threshold**: Trigger for auto-topup when virtual balance falls below
- **Target balance**: Desired balance after topup
- **Virtual balance tracking**: Uses `budgetPerPeriod - (periodSpent + periodReserved)` to track available funds
- **Manual execution**: Managers trigger `autoTopup()` when conditions are met
- **Reservation-aware**: Properly accounts for approved-but-not-executed spends

### Account Sweeps

At the end of a budget period, managers can sweep unspent funds:

- **`sweepAccount()`**: Reclaims unspent budget back to treasury
- **Budget reduction**: Reduces both account budget and `totalCommittedBudget`
- **Period validation**: Requires period to have ended before execution

### Period Management

Budget periods automatically track spending and can be reset when the period ends. The contract supports:

- **Flexible period durations** (minimum 1 day)
- **Period reset**: Clears `periodSpent` and starts new period (requires no pending reservations)
- **Daily limit tracking**: Automatically resets every 24 hours (enforced at approval time, not execution)
- **End-of-period sweeps**: Optional cleanup of unspent budgets (accounts for reservations)
- **Reservation safety**: Cannot reset period while approved spends are pending; sweeps are allowed and only reclaim unallocated budget

### Account Lifecycle Management

Complete account lifecycle support:

- **Create**: Initialize new spend accounts with configurable limits (with invariant validation)
- **Update**: Modify budgets, limits, approvers, and allowed chains (protects existing allocations)
- **Freeze/Unfreeze**: Temporarily disable accounts without deletion
- **Close**: Permanently close accounts and reduce committed budget (requires no pending reservations)
- **Update chains**: Change allowed destination chains for existing accounts (requires active status)
- **Immutability**: Closed accounts cannot be modified or used for any operations

## Supported Chains (Testnet)

- Arc Testnet (5042002) - Default
- Base Sepolia (84532)
- Ethereum Sepolia (11155111)
- Avalanche Fuji (43113)

Additional chains can be added via `setChainSupport()`.

## Events

The contract emits comprehensive events for all state changes:

- **Account events**: `SpendAccountCreated`, `SpendAccountUpdated`, `SpendAccountFrozen`, `SpendAccountUnfrozen`, `SpendAccountClosed`
- **Spend events**: `SpendRequested`, `SpendApproved`, `SpendRejected`, `SpendExecuted`, `SpendFailed`
- **Funding events**: `InboundFunding`, `OutboundFunding`
- **Period events**: `PeriodReset`, `SweepExecuted`
- **Auto-topup events**: `AutoTopup`
- **Admin events**: `ManagerAdded`, `BackendOperatorAdded`, `ChainSupportUpdated`, etc.

## Security Features

- ✅ **Access Control**: Admin-only pattern (removed Ownable redundancy)
- ✅ **Reentrancy Protection**: ReentrancyGuard on critical state-changing functions (requestSpend, approveSpend, markSpendExecuted)
- ✅ **Input Validation**: Comprehensive validation on all parameters
  - String length limits (labels ≤64, descriptions/reasons ≤256, txIds ≤128)
  - Address validation (no zero addresses)
  - Amount validation (positive values, within limits)
  - Chain validation (globally supported + account allowlist)
- ✅ **Emergency Pause**: Blocks critical operations (create, request, approve, execute) while allowing cleanup (reject, markFailed)
- ✅ **Reservation System**: Prevents race conditions by tracking approved-but-not-executed amounts
  - `periodReserved` and `dailyReserved` fields track pending approvals
  - All limit checks account for `spent + reserved`
  - Reservations released on failure, moved to spent on execution
- ✅ **Invariant Protection**:
  - `budgetPerPeriod >= periodSpent + periodReserved` (always)
  - `approvalThreshold <= perTxLimit` (always)
  - Cannot close or reset period with pending reservations
  - Sweeps are allowed with reservations (only reclaim unallocated budget)
  - Cannot update budget below existing allocations
- ✅ **Status Checks**: All operations validate account status (active/frozen/closed)
- ✅ **No Fund Custody**: Gateway handles all funds, contract only tracks state
- ✅ **Comprehensive Event Logging**: Full auditability of all state changes
- ✅ **DOS Protection**: String length limits prevent gas exhaustion attacks

## Gas Optimization

- Compiled with `via-ir` for optimal bytecode
- Optimizer enabled (200 runs)
- Wrapped modifiers for gas savings
- Expected gas costs on Arc:
  - `createSpendAccount`: tbd
  - `requestSpend`: tbd
  - `approveSpend`: tbd
  - `markSpendExecuted`: tbd
  - `autoTopup`: tbd
  - `sweepAccount`: tbd
  - `closeAccount`: tbd

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test testCreateSpendAccount

# Run with gas profiling
forge test --gas-report

# Run with detailed traces
forge test -vvv
```

Test coverage includes (49 tests, all passing):

- ✅ **Account Creation & Management**: Full lifecycle with validation
- ✅ **Spend Request Flow**: Auto-approve + manual approve paths
- ✅ **Budget & Limit Enforcement**: Period budget, per-tx, daily limits
- ✅ **Reservation System**: Race condition prevention, multi-request scenarios
- ✅ **Period Management**: Reset with reservation checks, period end validation
- ✅ **Access Control**: Role-based permissions (admin, manager, spender, backend)
- ✅ **Account Status**: Freeze/unfreeze, close, status validation
- ✅ **Chain Management**: Global + account-level allowlists
- ✅ **Auto-Topup**: Configuration and execution with reservation accounting
- ✅ **Account Sweeps**: End-of-period cleanup with reservation accounting
- ✅ **Daily Tracking**: Approval-time daily limits, 24-hour reset
- ✅ **Budget Accounting**: Total committed budget maintenance across all operations
- ✅ **Invariant Protection**: Budget >= allocations, approvalThreshold <= perTxLimit
- ✅ **String Length Limits**: DOS protection on all user inputs
- ✅ **Pause Behavior**: Critical operations blocked, cleanup operations allowed
- ✅ **Reservation Lifecycle**: Reserve → Execute/Fail → Release

## Integration with Backend

The backend should:

1. **Listen for events** using event subscriptions
2. **Process approved spends** via Circle Gateway
3. **Mark execution status** via `markSpendExecuted()` or `markSpendFailed()`
4. **Track funding** via `recordInboundFunding()` and `recordOutboundFunding()`

## Integration with Frontend

The frontend should:

1. **Read account state** via view functions (`getAccount`, `getRequest`)
2. **Submit spend requests** via `requestSpend()`
3. **Display real-time status** by listening to events
4. **Show budget utilization** using account data

## Resources

- [Arc Documentation](https://docs.arc.network)
- [Circle Gateway Docs](https://developers.circle.com/gateway)
- [Foundry Book](https://book.getfoundry.sh)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
