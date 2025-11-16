// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Treasury} from "../src/Treasury.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Treasury contract on Arc Testnet
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    // Environment variables
    address gatewayWalletAddress;
    address backendWalletAddress;

    // Supported chain IDs
    uint256 constant ARC_TESTNET = 5042002;
    uint256 constant BASE_SEPOLIA = 84532;
    uint256 constant ETH_SEPOLIA = 11155111;
    uint256 constant AVAX_FUJI = 43113;

    function setUp() public {
        // Load environment variables
        gatewayWalletAddress = vm.envAddress("GATEWAY_WALLET_ADDRESS");
        backendWalletAddress = vm.envAddress("BACKEND_WALLET_ADDRESS");

        // Validate addresses
        require(gatewayWalletAddress != address(0), "Gateway wallet address not set");
        require(backendWalletAddress != address(0), "Backend wallet address not set");
    }

    function run() public {
        // Get deployer from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("==================================================");
        console.log("Arc SpendOS - Treasury Deployment");
        console.log("==================================================");
        console.log("");
        console.log("Deployer:", deployer);
        console.log("Admin:", deployer); // Admin is the deployer
        console.log("Gateway Wallet:", gatewayWalletAddress);
        console.log("Backend Operator:", backendWalletAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Treasury contract
        console.log("Deploying Treasury contract...");
        Treasury treasury = new Treasury(deployer, gatewayWalletAddress);
        console.log("Treasury deployed at:", address(treasury));
        console.log("");

        // Add backend operator
        console.log("Adding backend operator...");
        treasury.addBackendOperator(backendWalletAddress);
        console.log("Backend operator added:", backendWalletAddress);
        console.log("");

        // Add supported chains
        console.log("Adding supported chains...");

        // Arc Testnet is already added in constructor
        console.log("- Arc Testnet (5042002): Already supported (default)");

        // Add Base Sepolia
        treasury.setChainSupport(BASE_SEPOLIA, true);
        console.log("- Base Sepolia (84532): Added");

        // Add Ethereum Sepolia
        treasury.setChainSupport(ETH_SEPOLIA, true);
        console.log("- Ethereum Sepolia (11155111): Added");

        // Add Avalanche Fuji
        treasury.setChainSupport(AVAX_FUJI, true);
        console.log("- Avalanche Fuji (43113): Added");
        console.log("");

        vm.stopBroadcast();

        // Print summary
        console.log("==================================================");
        console.log("Deployment Summary");
        console.log("==================================================");
        console.log("Treasury Contract:", address(treasury));
        console.log("Admin:", deployer);
        console.log("Backend Operator:", backendWalletAddress);
        console.log("Gateway Wallet:", gatewayWalletAddress);
        console.log("");
        console.log("Supported Chains:");
        console.log("- Arc Testnet (5042002)");
        console.log("- Base Sepolia (84532)");
        console.log("- Ethereum Sepolia (11155111)");
        console.log("- Avalanche Fuji (43113)");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Save the Treasury address to your .env file:");
        console.log("   TREASURY_CONTRACT_ADDRESS=%s", address(treasury));
        console.log("");
        console.log("2. Verify the contract (requires BLOCKSCOUT_API_KEY in .env):");
        console.log("   Get API key: https://testnet.arcscan.app/account/api-key");
        console.log("   Add to .env: BLOCKSCOUT_API_KEY=your-api-key");
        console.log("");
        console.log("   Then run (as single line):");
        console.log("   forge verify-contract %s \\", address(treasury));
        console.log("     src/Treasury.sol:Treasury \\");
        console.log("     --chain-id 5042002 \\");
        console.log("     --verifier blockscout \\");
        console.log("     --verifier-url https://testnet.arcscan.app/api \\");
        console.log("     --etherscan-api-key $BLOCKSCOUT_API_KEY \\");
        console.log("     --constructor-args $(cast abi-encode \"constructor(address,address)\" %s %s)", deployer, gatewayWalletAddress);
        console.log("");
        console.log("3. Run the demo setup script (optional):");
        console.log("   forge script script/SetupDemo.s.sol:SetupDemoScript --rpc-url $ARC_TESTNET_RPC_URL --broadcast");
        console.log("==================================================");
    }
}
