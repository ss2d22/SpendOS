// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Treasury} from "../src/Treasury.sol";

/**
 * @title SetupDemoScript
 * @notice Creates demo spend accounts for testing Treasury functionality
 * @dev Run with: forge script script/SetupDemo.s.sol:SetupDemoScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast
 */
contract SetupDemoScript is Script {
    // Environment variables
    address treasuryAddress;
    address admin;
    address backendWalletAddress;

    // Chain IDs
    uint256 constant ARC_TESTNET = 5042002;
    uint256 constant BASE_SEPOLIA = 84532;

    function setUp() public {
        // Load environment variables
        treasuryAddress = vm.envAddress("TREASURY_CONTRACT_ADDRESS");
        backendWalletAddress = vm.envAddress("BACKEND_WALLET_ADDRESS");

        require(treasuryAddress != address(0), "Treasury contract address not set");
        require(backendWalletAddress != address(0), "Backend wallet address not set");
    }

    function run() public {
        // Get deployer/admin from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("==================================================");
        console.log("Arc SpendOS - Demo Account Setup");
        console.log("==================================================");
        console.log("");
        console.log("Treasury Contract:", treasuryAddress);
        console.log("Admin:", deployer);
        console.log("");

        // Connect to existing Treasury contract
        Treasury treasury = Treasury(treasuryAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Demo Account 1: Marketing Department
        console.log("Creating Demo Account 1: Marketing Department...");
        uint256[] memory marketingChains = new uint256[](2);
        marketingChains[0] = ARC_TESTNET;
        marketingChains[1] = BASE_SEPOLIA;

        uint256 marketingAccountId = treasury.createSpendAccount(
            deployer, // owner (for demo, same as deployer)
            "Marketing", // label
            2000 * 10**6, // budgetPerPeriod: 2000 USDC
            30 days, // periodDuration
            500 * 10**6, // perTxLimit: 500 USDC
            1000 * 10**6, // dailyLimit: 1000 USDC
            200 * 10**6, // approvalThreshold: 200 USDC
            deployer, // approver (for demo, same as deployer)
            marketingChains
        );
        console.log("- Account ID:", marketingAccountId);
        console.log("- Owner:", deployer);
        console.log("- Label: Marketing");
        console.log("- Budget: 2000 USDC per 30 days");
        console.log("- Per-tx limit: 500 USDC");
        console.log("- Daily limit: 1000 USDC");
        console.log("- Approval threshold: 200 USDC");
        console.log("- Chains: Arc Testnet, Base Sepolia");
        console.log("");

        // Demo Account 2: Engineering Department (High Budget)
        console.log("Creating Demo Account 2: Engineering Department...");
        uint256[] memory engineeringChains = new uint256[](1);
        engineeringChains[0] = ARC_TESTNET;

        uint256 engineeringAccountId = treasury.createSpendAccount(
            deployer, // owner
            "Engineering", // label
            5000 * 10**6, // budgetPerPeriod: 5000 USDC
            30 days, // periodDuration
            1000 * 10**6, // perTxLimit: 1000 USDC
            2000 * 10**6, // dailyLimit: 2000 USDC
            500 * 10**6, // approvalThreshold: 500 USDC
            deployer, // approver
            engineeringChains
        );
        console.log("- Account ID:", engineeringAccountId);
        console.log("- Owner:", deployer);
        console.log("- Label: Engineering");
        console.log("- Budget: 5000 USDC per 30 days");
        console.log("- Per-tx limit: 1000 USDC");
        console.log("- Daily limit: 2000 USDC");
        console.log("- Approval threshold: 500 USDC");
        console.log("- Chains: Arc Testnet");
        console.log("");

        // Demo Account 3: Operations (Lower Budget, Auto-Approve)
        console.log("Creating Demo Account 3: Operations Department...");
        uint256[] memory operationsChains = new uint256[](2);
        operationsChains[0] = ARC_TESTNET;
        operationsChains[1] = BASE_SEPOLIA;

        uint256 operationsAccountId = treasury.createSpendAccount(
            deployer, // owner
            "Operations", // label
            1000 * 10**6, // budgetPerPeriod: 1000 USDC
            7 days, // periodDuration (weekly)
            200 * 10**6, // perTxLimit: 200 USDC
            500 * 10**6, // dailyLimit: 500 USDC
            200 * 10**6, // approvalThreshold: 200 USDC (all requests auto-approved)
            deployer, // approver
            operationsChains
        );
        console.log("- Account ID:", operationsAccountId);
        console.log("- Owner:", deployer);
        console.log("- Label: Operations");
        console.log("- Budget: 1000 USDC per 7 days");
        console.log("- Per-tx limit: 200 USDC");
        console.log("- Daily limit: 500 USDC");
        console.log("- Approval threshold: 200 USDC (auto-approve all)");
        console.log("- Chains: Arc Testnet, Base Sepolia");
        console.log("");

        // Configure auto-topup for Marketing account
        console.log("Configuring auto-topup for Marketing account...");
        treasury.setAutoTopupConfig(
            marketingAccountId,
            500 * 10**6, // minBalance: 500 USDC
            1500 * 10**6  // targetBalance: 1500 USDC
        );
        console.log("- Min balance: 500 USDC");
        console.log("- Target balance: 1500 USDC");
        console.log("");

        vm.stopBroadcast();

        // Print summary
        console.log("==================================================");
        console.log("Demo Setup Complete!");
        console.log("==================================================");
        console.log("");
        console.log("Created Accounts:");
        console.log("1. Marketing (ID: %s) - 2000 USDC/month, auto-topup enabled", marketingAccountId);
        console.log("2. Engineering (ID: %s) - 5000 USDC/month", engineeringAccountId);
        console.log("3. Operations (ID: %s) - 1000 USDC/week, auto-approve", operationsAccountId);
        console.log("");
        console.log("Next Steps:");
        console.log("");
        console.log("1. Test requesting a spend:");
        console.log("   cast send %s", treasuryAddress);
        console.log("   \"requestSpend(uint256,uint256,uint256,address,string)\"");
        console.log("   %s", marketingAccountId);
        console.log("   150000000"); // 150 USDC (will be auto-approved)
        console.log("   %s", BASE_SEPOLIA);
        console.log("   <destination-address>");
        console.log("   \"Marketing campaign payment\"");
        console.log("   --private-key $PRIVATE_KEY");
        console.log("   --rpc-url $ARC_TESTNET_RPC_URL");
        console.log("");
        console.log("2. View account details:");
        console.log("   cast call %s", treasuryAddress);
        console.log("   \"getAccount(uint256)\"");
        console.log("   %s", marketingAccountId);
        console.log("   --rpc-url $ARC_TESTNET_RPC_URL");
        console.log("");
        console.log("3. Check request status:");
        console.log("   cast call %s", treasuryAddress);
        console.log("   \"getRequest(uint256)\"");
        console.log("   0"); // First request will be ID 0
        console.log("   --rpc-url $ARC_TESTNET_RPC_URL");
        console.log("==================================================");
    }
}
