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

    // Gateway Supported Chain IDs - Testnet
    uint256 constant ARC_TESTNET = 5042002;
    uint256 constant AVALANCHE_FUJI = 43113;
    uint256 constant BASE_SEPOLIA = 84532;
    uint256 constant ETHEREUM_SEPOLIA = 11155111;
    uint256 constant HYPEREVM_TESTNET = 998;
    uint256 constant SEI_ATLANTIC = 1328;
    uint256 constant SONIC_TESTNET = 57054;
    uint256 constant WORLD_CHAIN_SEPOLIA = 4801;

    // Gateway Supported Chain IDs - Mainnet
    uint256 constant ARBITRUM = 42161;
    uint256 constant AVALANCHE = 43114;
    uint256 constant BASE = 8453;
    uint256 constant ETHEREUM = 1;
    uint256 constant HYPEREVM = 999;
    uint256 constant OPTIMISM = 10;
    uint256 constant POLYGON = 137;
    uint256 constant SEI = 1329;
    uint256 constant SONIC = 146;
    uint256 constant UNICHAIN = 130;
    uint256 constant WORLD_CHAIN = 480;

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

        // Add all Gateway-supported testnet chains to the Treasury
        console.log("Adding Gateway-supported chains to Treasury...");
        treasury.setChainSupport(ARC_TESTNET, true);
        treasury.setChainSupport(AVALANCHE_FUJI, true);
        treasury.setChainSupport(BASE_SEPOLIA, true);
        treasury.setChainSupport(ETHEREUM_SEPOLIA, true);
        treasury.setChainSupport(HYPEREVM_TESTNET, true);
        treasury.setChainSupport(SEI_ATLANTIC, true);
        treasury.setChainSupport(SONIC_TESTNET, true);
        treasury.setChainSupport(WORLD_CHAIN_SEPOLIA, true);
        console.log("- Added 8 testnet chains");
        console.log("");

        // Demo Account 1: Marketing Department
        console.log("Creating Demo Account 1: Marketing Department...");
        uint256[] memory marketingChains = new uint256[](8);
        marketingChains[0] = ARC_TESTNET;
        marketingChains[1] = AVALANCHE_FUJI;
        marketingChains[2] = BASE_SEPOLIA;
        marketingChains[3] = ETHEREUM_SEPOLIA;
        marketingChains[4] = HYPEREVM_TESTNET;
        marketingChains[5] = SEI_ATLANTIC;
        marketingChains[6] = SONIC_TESTNET;
        marketingChains[7] = WORLD_CHAIN_SEPOLIA;

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
        console.log("- Supported Chains: All Gateway Testnet chains");
        console.log("  (Arc, Avalanche Fuji, Base Sepolia, Ethereum Sepolia,");
        console.log("   HyperEVM Testnet, Sei Atlantic, Sonic Testnet, World Chain Sepolia)");
        console.log("");

        // Demo Account 2: Engineering Department (High Budget)
        console.log("Creating Demo Account 2: Engineering Department...");
        uint256[] memory engineeringChains = new uint256[](8);
        engineeringChains[0] = ARC_TESTNET;
        engineeringChains[1] = AVALANCHE_FUJI;
        engineeringChains[2] = BASE_SEPOLIA;
        engineeringChains[3] = ETHEREUM_SEPOLIA;
        engineeringChains[4] = HYPEREVM_TESTNET;
        engineeringChains[5] = SEI_ATLANTIC;
        engineeringChains[6] = SONIC_TESTNET;
        engineeringChains[7] = WORLD_CHAIN_SEPOLIA;

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
        console.log("- Supported Chains: All Gateway Testnet chains");
        console.log("  (Arc, Avalanche Fuji, Base Sepolia, Ethereum Sepolia,");
        console.log("   HyperEVM Testnet, Sei Atlantic, Sonic Testnet, World Chain Sepolia)");
        console.log("");

        // Demo Account 3: Operations (Lower Budget, Auto-Approve)
        console.log("Creating Demo Account 3: Operations Department...");
        uint256[] memory operationsChains = new uint256[](8);
        operationsChains[0] = ARC_TESTNET;
        operationsChains[1] = AVALANCHE_FUJI;
        operationsChains[2] = BASE_SEPOLIA;
        operationsChains[3] = ETHEREUM_SEPOLIA;
        operationsChains[4] = HYPEREVM_TESTNET;
        operationsChains[5] = SEI_ATLANTIC;
        operationsChains[6] = SONIC_TESTNET;
        operationsChains[7] = WORLD_CHAIN_SEPOLIA;

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
        console.log("- Supported Chains: All Gateway Testnet chains");
        console.log("  (Arc, Avalanche Fuji, Base Sepolia, Ethereum Sepolia,");
        console.log("   HyperEVM Testnet, Sei Atlantic, Sonic Testnet, World Chain Sepolia)");
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
