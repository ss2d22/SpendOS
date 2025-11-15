// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";

contract TreasuryTest is Test {
    Treasury public treasury;

    // Test accounts
    address admin = address(0x1);
    address manager = address(0x2);
    address spender = address(0x3);
    address backend = address(0x4);
    address gatewayWallet = address(0x0077777d7EBA4688BDeF3E311b846F25870A19B9);

    // Constants
    uint256 constant ARC_TESTNET_CHAIN_ID = 5042002;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;

    function setUp() public {
        vm.startPrank(admin);
        treasury = new Treasury(admin, gatewayWallet);

        // Setup roles
        treasury.addManager(manager);
        treasury.addBackendOperator(backend);

        // Add supported chains
        treasury.setChainSupport(BASE_SEPOLIA_CHAIN_ID, true);
        treasury.setChainSupport(84531, true); // Arbitrum Sepolia

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        ACCOUNT CREATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCreateSpendAccount() public {
        vm.startPrank(admin);

        uint256[] memory allowedChains = new uint256[](2);
        allowedChains[0] = ARC_TESTNET_CHAIN_ID;
        allowedChains[1] = BASE_SEPOLIA_CHAIN_ID;

        uint256 accountId = treasury.createSpendAccount(
            spender,
            "Marketing Q1",
            2000 * 10**6, // 2000 USDC budget
            30 days,      // Monthly period
            500 * 10**6,  // 500 USDC per tx
            1000 * 10**6, // 1000 USDC daily limit
            200 * 10**6,  // 200 USDC approval threshold
            manager,
            allowedChains
        );

        assertEq(accountId, 0, "First account should have ID 0");

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.owner, spender);
        assertEq(account.label, "Marketing Q1");
        assertEq(account.budgetPerPeriod, 2000 * 10**6);
        assertEq(account.perTxLimit, 500 * 10**6);
        assertEq(account.approver, manager);
        assertEq(uint(account.status), uint(Treasury.AccountStatus.Active));

        vm.stopPrank();
    }

    function testCannotCreateAccountWithInvalidData() public {
        vm.startPrank(admin);

        uint256[] memory allowedChains = new uint256[](1);
        allowedChains[0] = ARC_TESTNET_CHAIN_ID;

        // Zero budget should revert
        vm.expectRevert("Budget must be > 0");
        treasury.createSpendAccount(
            spender,
            "Test",
            0, // Invalid
            30 days,
            100 * 10**6,
            200 * 10**6, // daily limit
            50 * 10**6,
            manager,
            allowedChains
        );

        // Per-tx limit > budget should revert
        vm.expectRevert("Invalid per-tx limit");
        treasury.createSpendAccount(
            spender,
            "Test",
            1000 * 10**6,
            30 days,
            2000 * 10**6, // Invalid: > budget
            2000 * 10**6, // daily limit
            50 * 10**6,
            manager,
            allowedChains
        );

        vm.stopPrank();
    }

    function testOnlyAdminCanCreateAccount() public {
        uint256[] memory allowedChains = new uint256[](1);
        allowedChains[0] = ARC_TESTNET_CHAIN_ID;

        vm.prank(spender);
        vm.expectRevert("Only admin");
        treasury.createSpendAccount(
            spender,
            "Test",
            1000 * 10**6,
            30 days,
            100 * 10**6,
            200 * 10**6, // daily limit
            50 * 10**6,
            manager,
            allowedChains
        );
    }

    /*//////////////////////////////////////////////////////////////
                        SPEND REQUEST TESTS
    //////////////////////////////////////////////////////////////*/

    function testRequestSpendAutoApprove() public {
        // Create account first
        _createTestAccount();

        // Request spend below approval threshold (auto-approve)
        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(
            0,              // accountId
            150 * 10**6,    // 150 USDC (below 200 threshold)
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999), // destination
            "Facebook Ads"
        );

        assertEq(requestId, 0, "First request should have ID 0");

        Treasury.SpendRequest memory request = treasury.getRequest(0);
        assertEq(request.amount, 150 * 10**6);
        assertEq(uint(request.status), uint(Treasury.SpendStatus.Approved));
        assertEq(request.approvedAt, block.timestamp);
    }

    function testRequestSpendRequiresApproval() public {
        _createTestAccount();

        // Request spend above approval threshold
        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(
            0,
            300 * 10**6, // 300 USDC (above 200 threshold)
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Influencer payment"
        );

        Treasury.SpendRequest memory request = treasury.getRequest(requestId);
        assertEq(uint(request.status), uint(Treasury.SpendStatus.PendingApproval));
        assertEq(request.approvedAt, 0);
    }

    function testApproveSpend() public {
        _createTestAccount();

        // Create pending request
        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(
            0,
            300 * 10**6,
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Payment"
        );

        // Manager approves
        vm.prank(manager);
        treasury.approveSpend(requestId);

        Treasury.SpendRequest memory request = treasury.getRequest(requestId);
        assertEq(uint(request.status), uint(Treasury.SpendStatus.Approved));
        assertTrue(request.approvedAt > 0);
    }

    function testRejectSpend() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(
            0,
            300 * 10**6,
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Payment"
        );

        // Manager rejects
        vm.prank(manager);
        treasury.rejectSpend(requestId, "Not in budget");

        Treasury.SpendRequest memory request = treasury.getRequest(requestId);
        assertEq(uint(request.status), uint(Treasury.SpendStatus.Rejected));
    }

    function testCannotExceedPerTxLimit() public {
        _createTestAccount();

        vm.prank(spender);
        vm.expectRevert("Exceeds per-tx limit");
        treasury.requestSpend(
            0,
            600 * 10**6, // Exceeds 500 limit
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Too much"
        );
    }

    function testCannotExceedBudget() public {
        _createTestAccount();

        // Spend 200 USDC per day for 10 days to reach 2000 USDC budget
        for (uint i = 1; i <= 10; i++) {
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("S", vm.toString(i)));

            vm.prank(backend);
            treasury.markSpendExecuted(reqId, string.concat("gw-tx-", vm.toString(i)));

            // Advance time by 1 day to reset daily limit
            if (i < 10) {
                vm.warp(block.timestamp + 1 days);
            }
        }

        // Advance one more day for the 11th request
        vm.warp(block.timestamp + 1 days);

        // Eleventh spend: Should fail - exceeds period budget
        vm.prank(spender);
        vm.expectRevert("Exceeds period budget");
        treasury.requestSpend(0, 100 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "S11");
    }

    function testCannotSpendOnDisallowedChain() public {
        _createTestAccount();

        vm.prank(spender);
        vm.expectRevert("Chain not globally supported");
        treasury.requestSpend(
            0,
            100 * 10**6,
            999999, // Not in globally supported chains
            address(0x999),
            "Test"
        );
    }

    function testOnlyAccountOwnerCanRequestSpend() public {
        _createTestAccount();

        vm.prank(address(0x999)); // Not the owner
        vm.expectRevert("Not account owner");
        treasury.requestSpend(
            0,
            100 * 10**6,
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Test"
        );
    }

    /*//////////////////////////////////////////////////////////////
                        PERIOD MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function testResetPeriod() public {
        _createTestAccount();

        // Make a spend (auto-approved since 150 < 200 threshold)
        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(
            0,
            150 * 10**6,
            BASE_SEPOLIA_CHAIN_ID,
            address(0x999),
            "Test"
        );

        vm.prank(backend);
        treasury.markSpendExecuted(requestId, "gw-tx-1");

        // Check spent amount
        Treasury.SpendAccount memory accountBefore = treasury.getAccount(0);
        assertEq(accountBefore.periodSpent, 150 * 10**6);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        // Reset period (as manager)
        vm.prank(manager);
        treasury.resetPeriod(0);

        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        assertEq(accountAfter.periodSpent, 0, "Period spent should be reset");
        assertEq(accountAfter.periodStart, block.timestamp, "Period start should be updated");
    }

    function testCannotResetPeriodEarly() public {
        _createTestAccount();

        vm.prank(manager);
        vm.expectRevert("Period not ended");
        treasury.resetPeriod(0);
    }

    /*//////////////////////////////////////////////////////////////
                        ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function testFreezeAndUnfreezeAccount() public {
        _createTestAccount();

        // Manager freezes account
        vm.prank(manager);
        treasury.freezeAccount(0);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(uint(account.status), uint(Treasury.AccountStatus.Frozen));

        // Cannot request spend from frozen account
        vm.prank(spender);
        vm.expectRevert("Account not active");
        treasury.requestSpend(0, 100 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        // Admin unfreezes
        vm.prank(admin);
        treasury.unfreezeAccount(0);

        account = treasury.getAccount(0);
        assertEq(uint(account.status), uint(Treasury.AccountStatus.Active));
    }

    /*//////////////////////////////////////////////////////////////
                        CLOSE ACCOUNT TESTS
    //////////////////////////////////////////////////////////////*/

    function testCloseAccount() public {
        _createTestAccount();

        uint256 initialCommittedBudget = treasury.totalCommittedBudget();

        vm.prank(admin);
        treasury.closeAccount(0);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(uint(account.status), uint(Treasury.AccountStatus.Closed));

        // Committed budget should be reduced
        assertEq(treasury.totalCommittedBudget(), initialCommittedBudget - 2000 * 10**6);
    }

    function testCannotCloseAlreadyClosedAccount() public {
        _createTestAccount();

        vm.prank(admin);
        treasury.closeAccount(0);

        vm.prank(admin);
        vm.expectRevert("Account already closed");
        treasury.closeAccount(0);
    }

    /*//////////////////////////////////////////////////////////////
                        UPDATE ALLOWED CHAINS TESTS
    //////////////////////////////////////////////////////////////*/

    function testUpdateAllowedChains() public {
        _createTestAccount();

        // Add Arbitrum Sepolia support
        vm.prank(admin);
        treasury.setChainSupport(84531, true);

        uint256[] memory newChains = new uint256[](1);
        newChains[0] = 84531;

        vm.prank(admin);
        treasury.updateAllowedChains(0, newChains);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.allowedChains.length, 1);
        assertEq(account.allowedChains[0], 84531);
    }

    function testCannotUpdateAllowedChainsWithUnsupportedChain() public {
        _createTestAccount();

        uint256[] memory newChains = new uint256[](1);
        newChains[0] = 999999; // Unsupported chain

        vm.prank(admin);
        vm.expectRevert("Unsupported chain");
        treasury.updateAllowedChains(0, newChains);
    }

    /*//////////////////////////////////////////////////////////////
                        AUTO-TOPUP TESTS
    //////////////////////////////////////////////////////////////*/

    function testSetAutoTopupConfig() public {
        _createTestAccount();

        vm.prank(manager);
        treasury.setAutoTopupConfig(0, 500 * 10**6, 1500 * 10**6);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.minBalance, 500 * 10**6);
        assertEq(account.targetBalance, 1500 * 10**6);
    }

    function testCannotSetInvalidAutoTopupConfig() public {
        _createTestAccount();

        vm.prank(manager);
        vm.expectRevert("Target must be > min");
        treasury.setAutoTopupConfig(0, 1500 * 10**6, 500 * 10**6);
    }

    function testAutoTopup() public {
        _createTestAccount();

        // Configure auto-topup
        vm.prank(manager);
        treasury.setAutoTopupConfig(0, 500 * 10**6, 1500 * 10**6);

        // Spend money to bring balance below minimum, advancing time to avoid daily limit
        for (uint i = 1; i <= 8; i++) {
            if (i > 1) {
                vm.warp(block.timestamp + 1 days); // Advance to avoid daily limit
            }
            vm.prank(spender);
            uint256 requestId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("Test", vm.toString(i)));
            vm.prank(backend);
            treasury.markSpendExecuted(requestId, string.concat("gw-tx-", vm.toString(i)));
        }

        Treasury.SpendAccount memory accountBefore = treasury.getAccount(0);
        uint256 balanceBefore = accountBefore.budgetPerPeriod - accountBefore.periodSpent;
        assertTrue(balanceBefore < 500 * 10**6, "Balance should be below minimum");

        uint256 committedBefore = treasury.totalCommittedBudget();

        // Execute auto-topup
        vm.prank(manager);
        treasury.autoTopup(0);

        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        uint256 balanceAfter = accountAfter.budgetPerPeriod - accountAfter.periodSpent;
        assertEq(balanceAfter, 1500 * 10**6, "Balance should be at target");

        // Committed budget should increase
        assertTrue(treasury.totalCommittedBudget() > committedBefore);
    }

    function testCannotAutoTopupWhenBalanceAboveMinimum() public {
        _createTestAccount();

        // Configure auto-topup
        vm.prank(manager);
        treasury.setAutoTopupConfig(0, 500 * 10**6, 1500 * 10**6);

        // Balance is 2000 USDC, above minimum
        vm.prank(manager);
        vm.expectRevert("Balance above minimum");
        treasury.autoTopup(0);
    }

    /*//////////////////////////////////////////////////////////////
                        SWEEP TESTS
    //////////////////////////////////////////////////////////////*/

    function testSweepAccount() public {
        _createTestAccount();

        // Spend some money
        vm.prank(spender);
        uint256 requestId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        vm.prank(backend);
        treasury.markSpendExecuted(requestId, "gw-tx-1");

        // Fast forward to end of period
        vm.warp(block.timestamp + 30 days);

        uint256 committedBefore = treasury.totalCommittedBudget();
        Treasury.SpendAccount memory accountBefore = treasury.getAccount(0);
        uint256 unspent = accountBefore.budgetPerPeriod - accountBefore.periodSpent;

        // Sweep account
        vm.prank(manager);
        treasury.sweepAccount(0);

        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        assertEq(accountAfter.budgetPerPeriod, accountBefore.budgetPerPeriod - unspent);
        assertEq(treasury.totalCommittedBudget(), committedBefore - unspent);
    }

    function testCannotSweepBeforePeriodEnd() public {
        _createTestAccount();

        vm.prank(manager);
        vm.expectRevert("Period not ended");
        treasury.sweepAccount(0);
    }

    function testCannotSweepWithNoUnspentFunds() public {
        _createTestAccount();

        // Spend all budget
        for (uint i = 1; i <= 10; i++) {
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("S", vm.toString(i)));
            vm.prank(backend);
            treasury.markSpendExecuted(reqId, string.concat("gw-tx-", vm.toString(i)));

            if (i < 10) {
                vm.warp(block.timestamp + 1 days);
            }
        }

        // Fast forward to end of period
        vm.warp(block.timestamp + 30 days);

        vm.prank(manager);
        vm.expectRevert("No funds to sweep");
        treasury.sweepAccount(0);
    }

    /*//////////////////////////////////////////////////////////////
                        RESERVATION SYSTEM TESTS
    //////////////////////////////////////////////////////////////*/

    function testCannotExceedDailyLimitWithMultiplePendingRequests() public {
        _createTestAccount();

        // Request 1: 400 USDC (below 1000 daily limit, requires approval since > 200 threshold)
        vm.prank(spender);
        uint256 req1 = treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "R1");

        // Approve it
        vm.prank(manager);
        treasury.approveSpend(req1);

        // Request 2: 400 USDC (requires approval)
        vm.prank(spender);
        uint256 req2 = treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "R2");

        // Approve it
        vm.prank(manager);
        treasury.approveSpend(req2);

        // Request 3: 400 USDC (would exceed 1000 daily limit with reserved amounts = 800)
        vm.prank(spender);
        vm.expectRevert("Exceeds daily limit");
        treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "R3");

        // Verify requests are approved and reserved (via periodReserved as proxy)
        Treasury.SpendRequest memory request1 = treasury.getRequest(req1);
        Treasury.SpendRequest memory request2 = treasury.getRequest(req2);
        assertEq(uint(request1.status), uint(Treasury.SpendStatus.Approved));
        assertEq(uint(request2.status), uint(Treasury.SpendStatus.Approved));

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.periodReserved, 800 * 10**6, "Period reserved should be 800");
        assertEq(account.periodSpent, 0, "Period spent should still be 0");
    }

    function testCannotExceedPeriodBudgetWithMultiplePendingRequests() public {
        _createTestAccount();

        // Request and approve 5 requests of 400 USDC each
        // They should all be approved, reserving 2000 USDC total (= period budget)
        for (uint i = 0; i < 5; i++) {
            // Advance time to avoid daily limit
            if (i > 0) {
                vm.warp(block.timestamp + 1 days);
            }

            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("R", vm.toString(i)));

            vm.prank(manager);
            treasury.approveSpend(reqId);
        }

        // Request 6: Should fail because period budget (2000) is fully reserved
        vm.warp(block.timestamp + 1 days);
        vm.prank(spender);
        vm.expectRevert("Exceeds period budget");
        treasury.requestSpend(0, 100 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "R6");

        // Verify nothing has been spent yet (only reserved)
        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.periodSpent, 0, "Period spent should still be 0");
    }

    function testReservationReleasedOnFailure() public {
        _createTestAccount();

        // Request spend (auto-approved because below 200 threshold, reserves amount)
        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        // Mark as failed
        vm.prank(backend);
        treasury.markSpendFailed(reqId, "Gateway error");

        // Verify reservation released by checking we can make another request for the same amount
        vm.prank(spender);
        uint256 reqId2 = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test2");

        // Verify nothing was spent from the failed request
        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.periodSpent, 0, "Nothing should be spent");
        assertEq(account.dailySpent, 0, "Nothing should be spent daily");

        // Verify new request was created successfully
        Treasury.SpendRequest memory req2 = treasury.getRequest(reqId2);
        assertEq(uint(req2.status), uint(Treasury.SpendStatus.Approved), "New request should be approved");
    }

    function testReservationMovedToSpentOnExecution() public {
        _createTestAccount();

        // Request spend (auto-approved because below 200 threshold, reserves amount)
        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        // Mark as executed
        vm.prank(backend);
        treasury.markSpendExecuted(reqId, "gw-tx-1");

        // Verify reservation moved to spent
        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.periodSpent, 150 * 10**6, "Amount should be spent");
        assertEq(account.dailySpent, 150 * 10**6, "Daily amount should be spent");

        // Verify we can make another request for remaining budget (2000 - 150 = 1850)
        // Daily limit is 1000, so try another 150 which should work (total 300 daily)
        vm.prank(spender);
        uint256 reqId2 = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test2");
        Treasury.SpendRequest memory req2 = treasury.getRequest(reqId2);
        assertEq(uint(req2.status), uint(Treasury.SpendStatus.Approved), "Should be approved");

        // Verify combined spending + reservations respect daily limit (150 spent + 150 reserved = 300)
        // Request another 200 which is auto-approved (total: 150 spent + 350 reserved = 500)
        vm.prank(spender);
        uint256 reqId3 = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test3");

        // Request another 200 which is auto-approved (total: 150 spent + 550 reserved = 700)
        vm.prank(spender);
        uint256 reqId4 = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test4");

        // Request another 200 which is auto-approved (total: 150 spent + 750 reserved = 900)
        vm.prank(spender);
        uint256 reqId5 = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test5");

        // Now try another 200 which would exceed 1000 daily limit (900 + 200 = 1100)
        vm.prank(spender);
        vm.expectRevert("Exceeds daily limit");
        treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test6");
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function testCannotResetPeriodWithPendingReservations() public {
        _createTestAccount();

        // Create and approve a request (reserves budget)
        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        vm.prank(manager);
        treasury.approveSpend(reqId);

        // Try to reset period after it ends - should fail due to pending reservations
        vm.warp(block.timestamp + 30 days);

        vm.prank(manager);
        vm.expectRevert("Cannot reset with pending reservations");
        treasury.resetPeriod(0);

        // Execute the request to clear reservations
        vm.prank(backend);
        treasury.markSpendExecuted(reqId, "gw-tx-1");

        // Now reset should work (as manager)
        vm.prank(manager);
        treasury.resetPeriod(0);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.periodSpent, 0, "Period spent should be reset");
    }

    function testSweepAccountConsidersReservations() public {
        _createTestAccount();

        // Spend 600 USDC across 3 days
        for (uint i = 0; i < 3; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 days);
            }
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("S", vm.toString(i + 1)));
            vm.prank(backend);
            treasury.markSpendExecuted(reqId, string.concat("gw-tx-", vm.toString(i + 1)));
        }

        // Approve 300 USDC (reserved, not executed)
        vm.warp(block.timestamp + 1 days);
        vm.prank(spender);
        uint256 req4 = treasury.requestSpend(0, 300 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "S4");
        vm.prank(manager);
        treasury.approveSpend(req4);

        // Fast forward to end of period (30 days from account creation)
        Treasury.SpendAccount memory tempAccount = treasury.getAccount(0);
        vm.warp(tempAccount.periodStart + tempAccount.periodDuration);

        // Budget: 2000, Spent: 600, Reserved: 300, Unspent: 1100
        Treasury.SpendAccount memory accountBefore = treasury.getAccount(0);
        assertEq(accountBefore.periodSpent, 600 * 10**6);
        assertEq(accountBefore.periodReserved, 300 * 10**6);

        uint256 committedBefore = treasury.totalCommittedBudget();

        // Sweep should only sweep truly unallocated amount (1100)
        vm.prank(manager);
        treasury.sweepAccount(0);

        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        // Budget should be reduced by 1100 (2000 - 1100 = 900)
        assertEq(accountAfter.budgetPerPeriod, 900 * 10**6, "Budget should be 900");
        assertEq(treasury.totalCommittedBudget(), committedBefore - 1100 * 10**6);
    }

    function testCannotSweepClosedAccount() public {
        _createTestAccount();

        // Close the account
        vm.prank(admin);
        treasury.closeAccount(0);

        // Fast forward to end of period
        vm.warp(block.timestamp + 30 days);

        // Try to sweep - should fail
        vm.prank(manager);
        vm.expectRevert("Cannot sweep closed account");
        treasury.sweepAccount(0);
    }

    function testAutoTopupConsidersReservations() public {
        _createTestAccount();

        // Configure auto-topup
        vm.prank(manager);
        treasury.setAutoTopupConfig(0, 500 * 10**6, 1500 * 10**6);

        // Spend 1000 USDC (executed) across 5 days
        for (uint i = 0; i < 5; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 days);
            }
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("S", vm.toString(i)));
            vm.prank(backend);
            treasury.markSpendExecuted(reqId, string.concat("gw-tx-", vm.toString(i)));
        }

        // Approve 750 USDC (reserved, not executed) across 3 days (use 250 > 200 threshold)
        for (uint i = 0; i < 3; i++) {
            vm.warp(block.timestamp + 1 days);
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 250 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("R", vm.toString(i)));
            vm.prank(manager);
            treasury.approveSpend(reqId);
        }

        // Available balance = 2000 - (1000 spent + 750 reserved) = 250
        // This is below minimum (500), so topup should trigger
        Treasury.SpendAccount memory accountBefore = treasury.getAccount(0);
        assertEq(accountBefore.periodSpent, 1000 * 10**6);
        assertEq(accountBefore.periodReserved, 750 * 10**6);

        uint256 committedBefore = treasury.totalCommittedBudget();

        // Execute auto-topup
        vm.prank(manager);
        treasury.autoTopup(0);

        // Should topup to bring available balance to 1500
        // Topup amount = 1500 - 250 = 1250
        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        uint256 availableAfter = accountAfter.budgetPerPeriod - (accountAfter.periodSpent + accountAfter.periodReserved);
        assertEq(availableAfter, 1500 * 10**6, "Available balance should be 1500 after topup");
        assertEq(treasury.totalCommittedBudget(), committedBefore + 1250 * 10**6);
    }

    function testCannotUpdateBudgetBelowAllocations() public {
        _createTestAccount();

        // Spend 1000 and reserve 500
        for (uint i = 0; i < 5; i++) {
            if (i > 0) {
                vm.warp(block.timestamp + 1 days);
            }
            vm.prank(spender);
            uint256 reqId = treasury.requestSpend(0, 200 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), string.concat("S", vm.toString(i)));
            vm.prank(backend);
            treasury.markSpendExecuted(reqId, string.concat("gw-tx-", vm.toString(i)));
        }

        // Reserve 500 more
        vm.warp(block.timestamp + 1 days);
        vm.prank(spender);
        uint256 pendingReq = treasury.requestSpend(0, 500 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Pending");
        vm.prank(manager);
        treasury.approveSpend(pendingReq);

        // Total allocated: 1000 spent + 500 reserved = 1500
        // Try to reduce budget to 1400 - should fail
        vm.prank(admin);
        vm.expectRevert("New budget must cover existing allocations");
        treasury.updateSpendAccount(0, 1400 * 10**6, 0, 0, 0, address(0));

        // Reduce to 1500 exactly - should work
        vm.prank(admin);
        treasury.updateSpendAccount(0, 1500 * 10**6, 0, 0, 0, address(0));

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(account.budgetPerPeriod, 1500 * 10**6);
    }

    function testCannotCloseAccountWithPendingReservations() public {
        _createTestAccount();

        // Create and approve a request (reserves budget)
        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 400 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");
        vm.prank(manager);
        treasury.approveSpend(reqId);

        // Try to close - should fail
        vm.prank(admin);
        vm.expectRevert("Cannot close with pending reservations");
        treasury.closeAccount(0);

        // Execute the request
        vm.prank(backend);
        treasury.markSpendExecuted(reqId, "gw-tx-1");

        // Now close should work
        vm.prank(admin);
        treasury.closeAccount(0);

        Treasury.SpendAccount memory account = treasury.getAccount(0);
        assertEq(uint(account.status), uint(Treasury.AccountStatus.Closed));
    }

    function testCannotSpendOnChainNotInAccountAllowlist() public {
        _createTestAccount();

        // Add Ethereum Sepolia to global support but not to account's allowedChains
        vm.prank(admin);
        treasury.setChainSupport(11155111, true);

        // Try to spend on Ethereum Sepolia - should fail
        vm.prank(spender);
        vm.expectRevert("Chain not allowed for account");
        treasury.requestSpend(0, 100 * 10**6, 11155111, address(0x999), "Test");
    }

    /*//////////////////////////////////////////////////////////////
                        STRING LENGTH LIMIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testCannotCreateAccountWithTooLongLabel() public {
        uint256[] memory allowedChains = new uint256[](1);
        allowedChains[0] = ARC_TESTNET_CHAIN_ID;

        // Create a label that's 65 characters (exceeds MAX_LABEL_LENGTH of 64)
        string memory longLabel = "12345678901234567890123456789012345678901234567890123456789012345";

        vm.prank(admin);
        vm.expectRevert("Invalid label length");
        treasury.createSpendAccount(
            spender,
            longLabel,
            1000 * 10**6,
            30 days,
            500 * 10**6,
            1000 * 10**6,
            200 * 10**6,
            manager,
            allowedChains
        );
    }

    function testCannotRequestSpendWithTooLongDescription() public {
        _createTestAccount();

        // Create a description that's 257 characters (exceeds MAX_DESCRIPTION_LENGTH of 256)
        string memory longDesc = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789";

        vm.prank(spender);
        vm.expectRevert("Description too long");
        treasury.requestSpend(0, 100 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), longDesc);
    }

    function testCannotRejectSpendWithTooLongReason() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 300 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        // Create a reason that's 257 characters
        string memory longReason = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789";

        vm.prank(manager);
        vm.expectRevert("Reason too long");
        treasury.rejectSpend(reqId, longReason);
    }

    function testCannotMarkExecutedWithInvalidGatewayTxId() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        // Empty gateway tx ID
        vm.prank(backend);
        vm.expectRevert("Invalid gateway tx ID");
        treasury.markSpendExecuted(reqId, "");

        // Too long (129 characters, exceeds MAX_GATEWAY_TX_ID_LENGTH of 128)
        string memory longTxId = "12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901";

        vm.prank(backend);
        vm.expectRevert("Invalid gateway tx ID");
        treasury.markSpendExecuted(reqId, longTxId);
    }

    /*//////////////////////////////////////////////////////////////
                        PAUSE BEHAVIOR TESTS
    //////////////////////////////////////////////////////////////*/

    function testCannotRequestSpendWhenPaused() public {
        _createTestAccount();

        vm.prank(admin);
        treasury.pause();

        vm.prank(spender);
        vm.expectRevert("Contract is paused");
        treasury.requestSpend(0, 100 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");
    }

    function testCannotApproveSpendWhenPaused() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 300 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        vm.prank(admin);
        treasury.pause();

        vm.prank(manager);
        vm.expectRevert("Contract is paused");
        treasury.approveSpend(reqId);
    }

    function testCannotMarkExecutedWhenPaused() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        vm.prank(admin);
        treasury.pause();

        vm.prank(backend);
        vm.expectRevert("Contract is paused");
        treasury.markSpendExecuted(reqId, "gw-tx-1");
    }

    function testCanMarkFailedWhenPaused() public {
        _createTestAccount();

        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 150 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test");

        vm.prank(admin);
        treasury.pause();

        // markSpendFailed should still work when paused
        vm.prank(backend);
        treasury.markSpendFailed(reqId, "Gateway error");

        Treasury.SpendRequest memory request = treasury.getRequest(reqId);
        assertEq(uint(request.status), uint(Treasury.SpendStatus.Failed));
    }

    function testCannotUpdatePerTxLimitBelowApprovalThreshold() public {
        _createTestAccount();

        // Current: perTxLimit = 500, approvalThreshold = 200
        // Try to reduce perTxLimit to 150 (below approvalThreshold of 200)
        vm.prank(admin);
        vm.expectRevert("Existing approval threshold > new per-tx limit");
        treasury.updateSpendAccount(0, 0, 150 * 10**6, 0, 0, address(0));
    }

    function testCannotUpdateApprovalThresholdAbovePerTxLimit() public {
        _createTestAccount();

        // Try to update approval threshold to 600 USDC while perTxLimit is 500 USDC
        vm.prank(admin);
        vm.expectRevert("Approval threshold > per-tx limit");
        treasury.updateSpendAccount(
            0,
            0,  // keep budget
            0,  // keep perTxLimit (500)
            0,  // keep dailyLimit
            600 * 10**6,  // raise approval threshold to 600 (INVALID!)
            address(0)
        );
    }

    function testCannotMarkSpendFailedWithTooLongReason() public {
        _createTestAccount();

        // Create and approve a spend
        vm.prank(spender);
        uint256 reqId = treasury.requestSpend(0, 250 * 10**6, BASE_SEPOLIA_CHAIN_ID, address(0x999), "Test spend");

        vm.prank(manager);
        treasury.approveSpend(reqId);

        // Try to mark failed with too long reason (257 chars)
        string memory longReason = "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"; // 257 chars

        vm.prank(backend);
        vm.expectRevert("Reason too long");
        treasury.markSpendFailed(reqId, longReason);
    }

    function testCannotRecordInboundFundingWithTooLongGatewayTxId() public {
        // Try to record inbound funding with too long gateway tx ID (129 chars)
        string memory longTxId = "123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"; // 129 chars

        vm.prank(backend);
        vm.expectRevert("Invalid gateway tx ID");
        treasury.recordInboundFunding(500 * 10**6, longTxId);
    }

    function testCannotRecordOutboundFundingWithTooLongGatewayTxId() public {
        // Try to record outbound funding with too long gateway tx ID (129 chars)
        string memory longTxId = "123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"; // 129 chars

        vm.prank(backend);
        vm.expectRevert("Invalid gateway tx ID");
        treasury.recordOutboundFunding(500 * 10**6, longTxId);
    }

    /*//////////////////////////////////////////////////////////////
                        HELPERS
    //////////////////////////////////////////////////////////////*/

    function _createTestAccount() internal returns (uint256) {
        uint256[] memory allowedChains = new uint256[](2);
        allowedChains[0] = ARC_TESTNET_CHAIN_ID;
        allowedChains[1] = BASE_SEPOLIA_CHAIN_ID;

        vm.prank(admin);
        return treasury.createSpendAccount(
            spender,
            "Test Account",
            2000 * 10**6,  // 2000 USDC budget
            30 days,
            500 * 10**6,   // 500 USDC per tx
            1000 * 10**6,  // 1000 USDC daily limit
            200 * 10**6,   // 200 USDC approval threshold
            manager,
            allowedChains
        );
    }
}
