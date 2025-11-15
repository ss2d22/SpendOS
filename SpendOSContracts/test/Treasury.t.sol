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
        vm.expectRevert("Chain not allowed");
        treasury.requestSpend(
            0,
            100 * 10**6,
            999999, // Not in allowed chains
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

        // Reset period
        treasury.resetPeriod(0);

        Treasury.SpendAccount memory accountAfter = treasury.getAccount(0);
        assertEq(accountAfter.periodSpent, 0, "Period spent should be reset");
        assertEq(accountAfter.periodStart, block.timestamp, "Period start should be updated");
    }

    function testCannotResetPeriodEarly() public {
        _createTestAccount();

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
            200 * 10**6,   // 200 USDC approval threshold
            manager,
            allowedChains
        );
    }
}
