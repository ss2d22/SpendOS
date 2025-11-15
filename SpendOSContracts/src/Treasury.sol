// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Main contract for Arc SpendOS treasury management
 * @dev Manages spend accounts, budgets, approvals, and cross-chain spends via Circle Gateway
 */
contract Treasury is ReentrancyGuard {

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    enum AccountStatus { Active, Frozen, Closed }
    enum SpendStatus { PendingApproval, Approved, Rejected, Executed, Failed }

    struct SpendAccount {
        uint256 id;
        address owner;
        string label;

        // Budget configuration
        uint256 budgetPerPeriod;
        uint256 periodStart;
        uint256 periodDuration; // in seconds
        uint256 periodSpent;
        uint256 periodReserved; // Reserved for approved but not executed requests

        // Limits
        uint256 perTxLimit;
        uint256 dailyLimit; // Note: enforced at approval time, not execution time
        uint256 dailySpent;
        uint256 dailyReserved; // Reserved for approved but not executed requests (same day)
        uint256 lastDayTimestamp;

        // Approval
        uint256 approvalThreshold;
        address approver;

        // Auto-topup (future feature)
        uint256 minBalance;
        uint256 targetBalance;

        // Status and permissions
        AccountStatus status;
        uint256[] allowedChains;

        // Metadata
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct SpendRequest {
        uint256 id;
        uint256 accountId;
        address requester;

        // Transaction details
        uint256 amount;
        uint256 chainId;
        address destinationAddress;
        string description;

        // Status tracking
        SpendStatus status;
        uint256 requestedAt;
        uint256 approvedAt;
        uint256 executedAt;

        // Gateway tracking
        string gatewayTxId;
    }

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    // Core organization
    address public admin;
    mapping(address => bool) public managers;
    mapping(address => bool) public backendOperators;

    // Gateway configuration
    bytes32 public gatewayOrgId;
    address public gatewayWalletAddress;

    // Spend accounts
    mapping(uint256 => SpendAccount) public spendAccounts;
    uint256 public nextAccountId;

    // Spend requests
    mapping(uint256 => SpendRequest) public spendRequests;
    uint256 public nextRequestId;

    // Budget tracking
    uint256 public totalCommittedBudget;

    // Supported chains
    mapping(uint256 => bool) public supportedChains;

    // Paused state
    bool public paused;

    // String length limits
    uint256 public constant MAX_LABEL_LENGTH = 64;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 256;
    uint256 public constant MAX_REASON_LENGTH = 256;
    uint256 public constant MAX_GATEWAY_TX_ID_LENGTH = 128;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    // Account events
    event SpendAccountCreated(
        uint256 indexed accountId,
        address indexed owner,
        string label,
        uint256 budgetPerPeriod
    );
    event SpendAccountUpdated(uint256 indexed accountId);
    event SpendAccountFrozen(uint256 indexed accountId);
    event SpendAccountUnfrozen(uint256 indexed accountId);
    event SpendAccountClosed(uint256 indexed accountId);

    // Spend request events
    event SpendRequested(
        uint256 indexed requestId,
        uint256 indexed accountId,
        address indexed requester,
        uint256 amount,
        uint256 chainId,
        address destinationAddress
    );
    event SpendApproved(
        uint256 indexed requestId,
        uint256 indexed accountId,
        address approver,
        uint256 amount
    );
    event SpendRejected(
        uint256 indexed requestId,
        uint256 indexed accountId,
        address approver,
        string reason
    );
    event SpendExecuted(
        uint256 indexed requestId,
        uint256 indexed accountId,
        uint256 amount,
        string gatewayTxId
    );
    event SpendFailed(
        uint256 indexed requestId,
        uint256 indexed accountId,
        string reason
    );

    // Funding events
    event InboundFunding(
        uint256 amount,
        string gatewayTxId,
        uint256 timestamp
    );
    event OutboundFunding(
        uint256 amount,
        string gatewayTxId,
        uint256 timestamp
    );

    // Period management events
    event PeriodReset(
        uint256 indexed accountId,
        uint256 newPeriodStart,
        uint256 previousSpent
    );
    event AutoTopup(uint256 indexed accountId, uint256 amount);
    event SweepExecuted(uint256 indexed accountId, uint256 amount);

    // Admin events
    event ManagerAdded(address indexed manager);
    event ManagerRemoved(address indexed manager);
    event BackendOperatorAdded(address indexed operator);
    event BackendOperatorRemoved(address indexed operator);
    event GatewayConfigUpdated(bytes32 orgId, address walletAddress);
    event ChainSupportUpdated(uint256 chainId, bool supported);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event ContractPaused();
    event ContractUnpaused();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    modifier onlyManager() {
        _onlyManager();
        _;
    }

    modifier onlyBackend() {
        _onlyBackend();
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier validAddress(address addr) {
        _validAddress(addr);
        _;
    }

    modifier accountExists(uint256 accountId) {
        _accountExists(accountId);
        _;
    }

    modifier requestExists(uint256 requestId) {
        _requestExists(requestId);
        _;
    }

    /*//////////////////////////////////////////////////////////////
                          MODIFIER HELPERS
    //////////////////////////////////////////////////////////////*/

    function _onlyAdmin() internal view {
        require(msg.sender == admin, "Only admin");
    }

    function _onlyManager() internal view {
        require(managers[msg.sender] || msg.sender == admin, "Only manager or admin");
    }

    function _onlyBackend() internal view {
        require(backendOperators[msg.sender], "Only backend operator");
    }

    function _whenNotPaused() internal view {
        require(!paused, "Contract is paused");
    }

    function _validAddress(address addr) internal pure {
        require(addr != address(0), "Invalid address");
    }

    function _accountExists(uint256 accountId) internal view {
        require(accountId < nextAccountId, "Account does not exist");
    }

    function _requestExists(uint256 requestId) internal view {
        require(requestId < nextRequestId, "Request does not exist");
    }

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _admin,
        address _gatewayWalletAddress
    ) validAddress(_admin) validAddress(_gatewayWalletAddress) {
        admin = _admin;
        gatewayWalletAddress = _gatewayWalletAddress;

        // Add Arc Testnet as default supported chain
        supportedChains[5042002] = true; // Arc Testnet
    }

    /*//////////////////////////////////////////////////////////////
                        SPEND ACCOUNT MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new spend account
     * @param owner Address of the account owner (spender)
     * @param label Human-readable label (e.g., "Marketing", "Alice Travel")
     * @param budgetPerPeriod Budget amount per period (in USDC, 6 decimals)
     * @param periodDuration Duration of budget period in seconds
     * @param perTxLimit Maximum amount per transaction (in USDC, 6 decimals)
     * @param dailyLimit Maximum amount per day (in USDC, 6 decimals, 0 = use perTxLimit)
     * @param approvalThreshold Amounts above this require approval (in USDC, 6 decimals)
     * @param approver Address of the manager who can approve spends
     * @param allowedChains Array of chain IDs where spends are allowed
     * @return accountId The ID of the newly created account
     */
    function createSpendAccount(
        address owner,
        string calldata label,
        uint256 budgetPerPeriod,
        uint256 periodDuration,
        uint256 perTxLimit,
        uint256 dailyLimit,
        uint256 approvalThreshold,
        address approver,
        uint256[] calldata allowedChains
    ) external onlyAdmin whenNotPaused validAddress(owner) validAddress(approver) returns (uint256) {
        // Validations
        require(bytes(label).length > 0 && bytes(label).length <= MAX_LABEL_LENGTH, "Invalid label length");
        require(budgetPerPeriod > 0, "Budget must be > 0");
        require(periodDuration >= 1 days, "Period must be >= 1 day");
        require(perTxLimit > 0 && perTxLimit <= budgetPerPeriod, "Invalid per-tx limit");
        require(approvalThreshold <= perTxLimit, "Approval threshold > per-tx limit");
        require(dailyLimit == 0 || dailyLimit >= perTxLimit, "Daily limit < perTxLimit");
        require(allowedChains.length > 0, "Must allow at least one chain");

        // Validate all chains are supported
        for (uint256 i = 0; i < allowedChains.length; i++) {
            require(supportedChains[allowedChains[i]], "Unsupported chain");
        }

        uint256 accountId = nextAccountId++;

        SpendAccount storage account = spendAccounts[accountId];
        account.id = accountId;
        account.owner = owner;
        account.label = label;
        account.budgetPerPeriod = budgetPerPeriod;
        account.periodStart = block.timestamp;
        account.periodDuration = periodDuration;
        account.periodSpent = 0;
        account.perTxLimit = perTxLimit;
        account.approvalThreshold = approvalThreshold;
        account.approver = approver;
        account.status = AccountStatus.Active;
        account.allowedChains = allowedChains;
        account.dailyLimit = dailyLimit > 0 ? dailyLimit : perTxLimit; // Default to perTxLimit if not specified
        account.dailySpent = 0;
        account.lastDayTimestamp = block.timestamp;
        account.createdAt = block.timestamp;
        account.updatedAt = block.timestamp;

        // Update total committed budget
        totalCommittedBudget += budgetPerPeriod;

        emit SpendAccountCreated(accountId, owner, label, budgetPerPeriod);

        return accountId;
    }

    /**
     * @notice Update spend account configuration
     * @param accountId The account ID to update
     * @param budgetPerPeriod New budget per period (0 to keep current)
     * @param perTxLimit New per-transaction limit (0 to keep current)
     * @param dailyLimit New daily limit (0 to keep current)
     * @param approvalThreshold New approval threshold (0 to keep current)
     * @param approver New approver address (address(0) to keep current)
     */
    function updateSpendAccount(
        uint256 accountId,
        uint256 budgetPerPeriod,
        uint256 perTxLimit,
        uint256 dailyLimit,
        uint256 approvalThreshold,
        address approver
    ) external onlyAdmin accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status != AccountStatus.Closed, "Account closed");

        if (budgetPerPeriod > 0) {
            // Validate new budget covers existing allocations
            uint256 allocated = account.periodSpent + account.periodReserved;
            require(budgetPerPeriod >= allocated, "New budget must cover existing allocations");

            // Update committed budget tracking
            totalCommittedBudget = totalCommittedBudget - account.budgetPerPeriod + budgetPerPeriod;
            account.budgetPerPeriod = budgetPerPeriod;
        }

        if (perTxLimit > 0) {
            require(perTxLimit <= account.budgetPerPeriod, "Per-tx limit > budget");
            require(perTxLimit <= account.dailyLimit, "Per-tx limit > daily limit");
            account.perTxLimit = perTxLimit;
            // Ensure existing approval threshold is still valid
            require(account.approvalThreshold <= perTxLimit, "Existing approval threshold > new per-tx limit");
        }

        if (dailyLimit > 0) {
            require(dailyLimit >= account.perTxLimit, "Daily limit < perTxLimit");
            account.dailyLimit = dailyLimit;
        }

        if (approvalThreshold > 0) {
            require(approvalThreshold <= account.perTxLimit, "Approval threshold > per-tx limit");
            account.approvalThreshold = approvalThreshold;
        }

        if (approver != address(0)) {
            account.approver = approver;
        }

        account.updatedAt = block.timestamp;

        emit SpendAccountUpdated(accountId);
    }

    /**
     * @notice Freeze a spend account (prevents new spend requests)
     */
    function freezeAccount(uint256 accountId) external onlyManager accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status == AccountStatus.Active, "Account not active");

        account.status = AccountStatus.Frozen;
        account.updatedAt = block.timestamp;

        emit SpendAccountFrozen(accountId);
    }

    /**
     * @notice Unfreeze a spend account
     */
    function unfreezeAccount(uint256 accountId) external onlyAdmin accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status == AccountStatus.Frozen, "Account not frozen");

        account.status = AccountStatus.Active;
        account.updatedAt = block.timestamp;

        emit SpendAccountUnfrozen(accountId);
    }

    /**
     * @notice Close a spend account permanently
     * @param accountId The account ID to close
     */
    function closeAccount(uint256 accountId) external onlyAdmin accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status != AccountStatus.Closed, "Account already closed");
        require(account.periodReserved == 0, "Cannot close with pending reservations");

        // Update total committed budget
        totalCommittedBudget -= account.budgetPerPeriod;

        account.status = AccountStatus.Closed;
        account.updatedAt = block.timestamp;

        emit SpendAccountClosed(accountId);
    }

    /**
     * @notice Update allowed chains for an account
     * @param accountId The account ID to update
     * @param allowedChains New array of allowed chain IDs
     */
    function updateAllowedChains(
        uint256 accountId,
        uint256[] calldata allowedChains
    ) external onlyAdmin accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status != AccountStatus.Closed, "Account closed");
        require(allowedChains.length > 0, "Must allow at least one chain");

        // Validate all chains are supported
        for (uint256 i = 0; i < allowedChains.length; i++) {
            require(supportedChains[allowedChains[i]], "Unsupported chain");
        }

        account.allowedChains = allowedChains;
        account.updatedAt = block.timestamp;

        emit SpendAccountUpdated(accountId);
    }

    /**
     * @notice Configure auto-topup settings for an account
     * @param accountId The account ID to configure
     * @param minBalance Minimum balance threshold to trigger topup
     * @param targetBalance Target balance after topup
     */
    function setAutoTopupConfig(
        uint256 accountId,
        uint256 minBalance,
        uint256 targetBalance
    ) external onlyManager accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status != AccountStatus.Closed, "Account closed");
        require(minBalance > 0, "Min balance must be > 0");
        require(targetBalance > 0, "Target balance must be > 0");
        require(targetBalance > minBalance, "Target must be > min");

        account.minBalance = minBalance;
        account.targetBalance = targetBalance;
        account.updatedAt = block.timestamp;

        emit SpendAccountUpdated(accountId);
    }

    /**
     * @notice Execute auto-topup for an account
     * @dev This uses a virtual balance approach - tracks budget allocation rather than actual USDC
     * @dev Available balance = budgetPerPeriod - (periodSpent + periodReserved)
     * @param accountId The account ID to topup
     */
    function autoTopup(uint256 accountId) external onlyManager accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status == AccountStatus.Active, "Account not active");
        require(account.minBalance > 0 && account.targetBalance > 0, "Auto-topup not configured");

        // Calculate available balance: budgetPerPeriod - (periodSpent + periodReserved)
        uint256 allocated = account.periodSpent + account.periodReserved;
        uint256 currentBalance = account.budgetPerPeriod > allocated
            ? account.budgetPerPeriod - allocated
            : 0;

        require(currentBalance < account.minBalance, "Balance above minimum");

        // Calculate topup amount
        uint256 topupAmount = account.targetBalance > currentBalance
            ? account.targetBalance - currentBalance
            : 0;

        require(topupAmount > 0, "No topup needed");

        // Increase budget for current period
        account.budgetPerPeriod += topupAmount;
        totalCommittedBudget += topupAmount;
        account.updatedAt = block.timestamp;

        emit AutoTopup(accountId, topupAmount);
    }

    /*//////////////////////////////////////////////////////////////
                        SPEND REQUEST FLOW
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Request a spend from an account
     * @dev Daily limit semantics: The dailyLimit is enforced at approval time based on
     *      dailySpent + dailyReserved. Requests approved on Day 1 but executed on Day 2
     *      will have their reservations reset when the day changes, but the actual execution
     *      on Day 2 counts against Day 2's dailySpent. This means the limit controls
     *      "approval rate per day" rather than "execution rate per day".
     * @param accountId The spend account to use
     * @param amount Amount to spend (in USDC, 6 decimals)
     * @param chainId Destination chain ID
     * @param destinationAddress Recipient address on destination chain
     * @param description Human-readable description
     * @return requestId The ID of the created spend request
     */
    function requestSpend(
        uint256 accountId,
        uint256 amount,
        uint256 chainId,
        address destinationAddress,
        string calldata description
    ) external whenNotPaused accountExists(accountId) validAddress(destinationAddress) nonReentrant returns (uint256) {
        SpendAccount storage account = spendAccounts[accountId];

        // Validation: Account must be active
        require(account.status == AccountStatus.Active, "Account not active");

        // Validation: Caller must be account owner
        require(msg.sender == account.owner, "Not account owner");

        // Validation: String length
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");

        // Validation: Amount must be > 0 and <= per-tx limit
        require(amount > 0, "Amount must be > 0");
        require(amount <= account.perTxLimit, "Exceeds per-tx limit");

        // Validation: Chain must be globally supported
        require(supportedChains[chainId], "Chain not globally supported");

        // Validation: Chain must be allowed for this account
        bool chainAllowed = false;
        for (uint256 i = 0; i < account.allowedChains.length; i++) {
            if (account.allowedChains[i] == chainId) {
                chainAllowed = true;
                break;
            }
        }
        require(chainAllowed, "Chain not allowed for account");

        // Validation: Check daily limit (spent + reserved)
        _updateDailySpent(accountId);
        require(account.dailySpent + account.dailyReserved + amount <= account.dailyLimit, "Exceeds daily limit");

        // Validation: Check period budget (spent + reserved)
        require(account.periodSpent + account.periodReserved + amount <= account.budgetPerPeriod, "Exceeds period budget");

        // Create spend request
        uint256 requestId = nextRequestId++;

        SpendRequest storage request = spendRequests[requestId];
        request.id = requestId;
        request.accountId = accountId;
        request.requester = msg.sender;
        request.amount = amount;
        request.chainId = chainId;
        request.destinationAddress = destinationAddress;
        request.description = description;
        request.requestedAt = block.timestamp;

        // Auto-approve if below threshold
        if (amount <= account.approvalThreshold) {
            request.status = SpendStatus.Approved;
            request.approvedAt = block.timestamp;

            // Reserve amounts for this approved request
            account.periodReserved += amount;
            account.dailyReserved += amount;
            account.updatedAt = block.timestamp;

            emit SpendApproved(requestId, accountId, address(this), amount);
        } else {
            request.status = SpendStatus.PendingApproval;
        }

        emit SpendRequested(requestId, accountId, msg.sender, amount, chainId, destinationAddress);

        return requestId;
    }

    /**
     * @notice Approve a pending spend request
     * @param requestId The request ID to approve
     */
    function approveSpend(uint256 requestId) external whenNotPaused requestExists(requestId) nonReentrant {
        SpendRequest storage request = spendRequests[requestId];
        SpendAccount storage account = spendAccounts[request.accountId];

        // Validation: Caller must be approver or admin
        require(
            msg.sender == account.approver || msg.sender == admin,
            "Not authorized to approve"
        );

        // Validation: Request must be pending
        require(request.status == SpendStatus.PendingApproval, "Request not pending");

        // Validation: Account must be active
        require(account.status == AccountStatus.Active, "Account not active");

        // Re-validate budget constraints (in case period was reset)
        _updateDailySpent(request.accountId);
        require(
            account.periodSpent + account.periodReserved + request.amount <= account.budgetPerPeriod,
            "Exceeds period budget"
        );
        require(
            account.dailySpent + account.dailyReserved + request.amount <= account.dailyLimit,
            "Exceeds daily limit"
        );

        request.status = SpendStatus.Approved;
        request.approvedAt = block.timestamp;

        // Reserve amounts for this approved request
        account.periodReserved += request.amount;
        account.dailyReserved += request.amount;
        account.updatedAt = block.timestamp;

        emit SpendApproved(requestId, request.accountId, msg.sender, request.amount);
    }

    /**
     * @notice Reject a pending spend request
     * @param requestId The request ID to reject
     * @param reason Reason for rejection
     */
    function rejectSpend(uint256 requestId, string calldata reason) external requestExists(requestId) {
        SpendRequest storage request = spendRequests[requestId];
        SpendAccount storage account = spendAccounts[request.accountId];

        // Validation: String length
        require(bytes(reason).length <= MAX_REASON_LENGTH, "Reason too long");

        // Validation: Caller must be approver or admin
        require(
            msg.sender == account.approver || msg.sender == admin,
            "Not authorized to reject"
        );

        // Validation: Request must be pending
        require(request.status == SpendStatus.PendingApproval, "Request not pending");

        request.status = SpendStatus.Rejected;

        emit SpendRejected(requestId, request.accountId, msg.sender, reason);
    }

    /**
     * @notice Mark a spend as executed (called by backend after Gateway execution)
     * @param requestId The request ID that was executed
     * @param gatewayTxId The Gateway transaction ID
     */
    function markSpendExecuted(
        uint256 requestId,
        string calldata gatewayTxId
    ) external whenNotPaused onlyBackend requestExists(requestId) nonReentrant {
        SpendRequest storage request = spendRequests[requestId];
        SpendAccount storage account = spendAccounts[request.accountId];

        // Validation: String length
        require(bytes(gatewayTxId).length > 0 && bytes(gatewayTxId).length <= MAX_GATEWAY_TX_ID_LENGTH, "Invalid gateway tx ID");

        // Validation: Request must be approved
        require(request.status == SpendStatus.Approved, "Request not approved");

        // Update request status
        request.status = SpendStatus.Executed;
        request.executedAt = block.timestamp;
        request.gatewayTxId = gatewayTxId;

        // Update daily spent (resets if new day)
        _updateDailySpent(request.accountId);

        // Move from reserved to spent
        account.periodReserved -= request.amount;
        account.periodSpent += request.amount;

        // Only decrease dailyReserved if we're still in the same day as approval
        // (if day changed, dailyReserved was already reset to 0 by _updateDailySpent)
        if (account.dailyReserved >= request.amount) {
            account.dailyReserved -= request.amount;
        }
        account.dailySpent += request.amount;
        account.updatedAt = block.timestamp;

        emit SpendExecuted(requestId, request.accountId, request.amount, gatewayTxId);
    }

    /**
     * @notice Mark a spend as failed (called by backend if Gateway execution fails)
     * @param requestId The request ID that failed
     * @param reason Failure reason
     */
    function markSpendFailed(
        uint256 requestId,
        string calldata reason
    ) external onlyBackend requestExists(requestId) {
        SpendRequest storage request = spendRequests[requestId];
        SpendAccount storage account = spendAccounts[request.accountId];

        // Validation: String length
        require(bytes(reason).length <= MAX_REASON_LENGTH, "Reason too long");

        // Validation: Request must be approved
        require(request.status == SpendStatus.Approved, "Request not approved");

        request.status = SpendStatus.Failed;

        // Release reservation
        account.periodReserved -= request.amount;

        // Update daily spent (resets if new day)
        _updateDailySpent(request.accountId);

        // Only decrease dailyReserved if we're still in the same day as approval
        if (account.dailyReserved >= request.amount) {
            account.dailyReserved -= request.amount;
        }
        account.updatedAt = block.timestamp;

        emit SpendFailed(requestId, request.accountId, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        PERIOD MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Reset the budget period for an account
     * @param accountId The account ID to reset
     */
    function resetPeriod(uint256 accountId) external onlyManager accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];
        require(account.status != AccountStatus.Closed, "Account closed");

        // Validation: Period must have ended
        require(
            block.timestamp >= account.periodStart + account.periodDuration,
            "Period not ended"
        );

        // Validation: Cannot reset if there are pending reservations (approved but not executed requests)
        require(account.periodReserved == 0, "Cannot reset with pending reservations");

        uint256 previousSpent = account.periodSpent;

        // Reset period
        account.periodSpent = 0;
        account.periodStart = block.timestamp;
        account.updatedAt = block.timestamp;

        emit PeriodReset(accountId, account.periodStart, previousSpent);
    }

    /**
     * @notice Sweep unspent budget from an account at end of period
     * @dev Returns unspent virtual balance to treasury (reduces committed budget)
     * @param accountId The account ID to sweep
     */
    function sweepAccount(uint256 accountId) external onlyManager accountExists(accountId) {
        SpendAccount storage account = spendAccounts[accountId];

        // Validation: Account must not be closed
        require(account.status != AccountStatus.Closed, "Cannot sweep closed account");

        // Validation: Period must have ended
        require(
            block.timestamp >= account.periodStart + account.periodDuration,
            "Period not ended"
        );

        // Calculate unspent amount (must account for reservations)
        // unspent = budgetPerPeriod - (periodSpent + periodReserved)
        uint256 allocated = account.periodSpent + account.periodReserved;
        uint256 unspent = account.budgetPerPeriod > allocated
            ? account.budgetPerPeriod - allocated
            : 0;

        require(unspent > 0, "No funds to sweep");

        // Reduce committed budget by unspent amount
        totalCommittedBudget -= unspent;

        // Reduce account budget by unspent amount
        account.budgetPerPeriod -= unspent;
        account.updatedAt = block.timestamp;

        emit SweepExecuted(accountId, unspent);
    }

    /*//////////////////////////////////////////////////////////////
                        FUNDING TRACKING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Record inbound funding to Gateway wallet
     * @param amount Amount funded (in USDC, 6 decimals)
     * @param gatewayTxId Gateway transaction ID
     */
    function recordInboundFunding(
        uint256 amount,
        string calldata gatewayTxId
    ) external onlyBackend {
        require(bytes(gatewayTxId).length > 0 && bytes(gatewayTxId).length <= MAX_GATEWAY_TX_ID_LENGTH, "Invalid gateway tx ID");
        emit InboundFunding(amount, gatewayTxId, block.timestamp);
    }

    /**
     * @notice Record outbound funding from Gateway wallet
     * @param amount Amount spent (in USDC, 6 decimals)
     * @param gatewayTxId Gateway transaction ID
     */
    function recordOutboundFunding(
        uint256 amount,
        string calldata gatewayTxId
    ) external onlyBackend {
        require(bytes(gatewayTxId).length > 0 && bytes(gatewayTxId).length <= MAX_GATEWAY_TX_ID_LENGTH, "Invalid gateway tx ID");
        emit OutboundFunding(amount, gatewayTxId, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                        ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Add a manager
     */
    function addManager(address manager) external onlyAdmin validAddress(manager) {
        require(!managers[manager], "Already a manager");
        managers[manager] = true;
        emit ManagerAdded(manager);
    }

    /**
     * @notice Remove a manager
     */
    function removeManager(address manager) external onlyAdmin {
        require(managers[manager], "Not a manager");
        managers[manager] = false;
        emit ManagerRemoved(manager);
    }

    /**
     * @notice Add a backend operator
     */
    function addBackendOperator(address operator) external onlyAdmin validAddress(operator) {
        require(!backendOperators[operator], "Already an operator");
        backendOperators[operator] = true;
        emit BackendOperatorAdded(operator);
    }

    /**
     * @notice Remove a backend operator
     */
    function removeBackendOperator(address operator) external onlyAdmin {
        require(backendOperators[operator], "Not an operator");
        backendOperators[operator] = false;
        emit BackendOperatorRemoved(operator);
    }

    /*//////////////////////////////////////////////////////////////
                        CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Update Gateway configuration
     */
    function setGatewayConfig(
        bytes32 orgId,
        address walletAddress
    ) external onlyAdmin validAddress(walletAddress) {
        gatewayOrgId = orgId;
        gatewayWalletAddress = walletAddress;
        emit GatewayConfigUpdated(orgId, walletAddress);
    }

    /**
     * @notice Add or remove chain support
     */
    function setChainSupport(uint256 chainId, bool supported) external onlyAdmin {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
    }

    /**
     * @notice Transfer admin rights to a new address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin validAddress(newAdmin) {
        require(newAdmin != admin, "Already admin");
        address previousAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(previousAdmin, newAdmin);
    }

    /**
     * @notice Pause the contract (emergency use)
     * @dev When paused, the following operations are blocked:
     *      - createSpendAccount: Cannot create new accounts
     *      - requestSpend: Cannot request new spends
     *      - approveSpend: Cannot approve pending requests
     *      - markSpendExecuted: Cannot mark spends as executed
     *
     *      The following cleanup operations remain available when paused:
     *      - rejectSpend: Can reject pending requests
     *      - markSpendFailed: Can mark approved requests as failed
     *
     *      This allows emergency shutdown while still permitting failure cleanup.
     */
    function pause() external onlyAdmin {
        paused = true;
        emit ContractPaused();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit ContractUnpaused();
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Update daily spent amount, resetting if new day
     */
    function _updateDailySpent(uint256 accountId) internal {
        SpendAccount storage account = spendAccounts[accountId];

        // Check if we're in a new day (simple 24h rolling window)
        if (block.timestamp >= account.lastDayTimestamp + 1 days) {
            account.dailySpent = 0;
            account.dailyReserved = 0; // Also reset daily reservations
            account.lastDayTimestamp = block.timestamp;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get account details
     */
    function getAccount(uint256 accountId) external view returns (SpendAccount memory) {
        return spendAccounts[accountId];
    }

    /**
     * @notice Get spend request details
     */
    function getRequest(uint256 requestId) external view returns (SpendRequest memory) {
        return spendRequests[requestId];
    }

    /**
     * @notice Get number of accounts
     */
    function getAccountCount() external view returns (uint256) {
        return nextAccountId;
    }

    /**
     * @notice Get number of requests
     */
    function getRequestCount() external view returns (uint256) {
        return nextRequestId;
    }

    /**
     * @notice Check if account period has ended
     */
    function isPeriodEnded(uint256 accountId) external view returns (bool) {
        SpendAccount storage account = spendAccounts[accountId];
        return block.timestamp >= account.periodStart + account.periodDuration;
    }
}
