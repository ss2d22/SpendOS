import { JsonRpcProvider, Contract } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ARC_RPC_URL;
const TREASURY_ADDRESS = process.env.TREASURY_CONTRACT_ADDRESS;

// Minimal ABI for checking admin
const TREASURY_ABI = [
  'function admin() view returns (address)',
];

async function main() {
  if (!RPC_URL || !TREASURY_ADDRESS) {
    console.error('❌ Missing ARC_RPC_URL or TREASURY_CONTRACT_ADDRESS');
    process.exit(1);
  }

  console.log('🔍 Checking Treasury Contract Admin...\n');

  const provider = new JsonRpcProvider(RPC_URL);
  const treasury = new Contract(TREASURY_ADDRESS, TREASURY_ABI, provider);

  try {
    const adminAddress = await treasury.admin();
    console.log(`✅ Current admin: ${adminAddress}`);
    console.log(`\nYour backend wallet: ${process.env.BACKEND_PRIVATE_KEY ? 'Set' : 'Not set'}`);

    if (process.env.BACKEND_PRIVATE_KEY) {
      const { Wallet } = await import('ethers');
      const backendWallet = new Wallet(process.env.BACKEND_PRIVATE_KEY);
      console.log(`   Address: ${backendWallet.address}`);

      if (backendWallet.address.toLowerCase() === adminAddress.toLowerCase()) {
        console.log('\n✅ Backend wallet IS the admin!');
      } else {
        console.log('\n❌ Backend wallet is NOT the admin!');
        console.log(`\n💡 To fix: Update BACKEND_PRIVATE_KEY to use the admin wallet's private key,`);
        console.log(`   OR grant admin role to ${backendWallet.address} on the Treasury contract.`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main();
