import { ethers } from 'ethers';
import { Treasury__factory } from '../typechain-types/factories/Treasury__factory';

const TREASURY_ADDRESS = '0x052Bce09a128e5a7A22f9aA14E7Bd7bA8313050f';
const RPC_URL = 'https://rpc.testnet.arc.network';

async function main() {
  console.log('🔍 Testing contract connection...\n');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  console.log(`📡 Connected to: ${RPC_URL}`);

  // Connect to contract
  const contract = Treasury__factory.connect(TREASURY_ADDRESS, provider);
  console.log(`📜 Contract: ${TREASURY_ADDRESS}\n`);

  // Try to fetch accounts 3, 4, and 5
  for (const accountId of [3, 4, 5]) {
    try {
      console.log(`Fetching account ${accountId}...`);
      const account = await contract.getAccount(accountId);
      console.log(`✅ Account ${accountId}:`);
      console.log(`   Owner: ${account.owner}`);
      console.log(`   Approver: ${account.approver}`);
      console.log(`   Label: ${account.label}`);
      console.log(`   Budget: ${account.budgetPerPeriod.toString()}`);
      console.log(`   Period Duration: ${account.periodDuration.toString()}s`);
      console.log(`   Status: ${account.status.toString()} (0=Active, 1=Frozen, 2=Closed)`);
      console.log(`   Allowed Chains: ${account.allowedChains.map(c => c.toString()).join(', ')}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to fetch account ${accountId}:`);
      console.error(`   ${error.message}\n`);
    }
  }
}

main().catch(console.error);
