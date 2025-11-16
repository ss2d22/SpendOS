import { Wallet } from 'ethers';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

if (!ADMIN_PRIVATE_KEY) {
  console.error('❌ Error: ADMIN_PRIVATE_KEY environment variable is required');
  console.error('   Set it in your .env file or export it before running this script');
  process.exit(1);
}

async function main() {
  console.log('🔄 Starting account sync...\n');

  // Create wallet from private key (already validated above)
  const wallet = new Wallet(ADMIN_PRIVATE_KEY!);
  console.log(`📍 Admin wallet address: ${wallet.address}\n`);

  // Step 1: Get nonce for signing
  console.log('1️⃣ Getting authentication nonce...');
  const nonceResponse = await axios.post(`${API_URL}/auth/nonce`, {
    address: wallet.address,
  });
  const { nonce } = nonceResponse.data;
  console.log(`   Nonce: ${nonce}\n`);

  // Step 2: Sign the nonce
  console.log('2️⃣ Signing message with private key...');
  const message = `Sign this message to authenticate with SpendOS.\n\nNonce: ${nonce}`;
  const signature = await wallet.signMessage(message);
  console.log(`   Signature: ${signature.substring(0, 20)}...\n`);

  // Step 3: Authenticate and get JWT token
  console.log('3️⃣ Authenticating with backend...');
  const authResponse = await axios.post(
    `${API_URL}/auth/verify`,
    {
      address: wallet.address,
      message,
      signature,
    },
    {
      withCredentials: true,
    },
  );

  // Extract the cookie from response
  const cookieHeader = authResponse.headers['set-cookie'];
  const token = cookieHeader
    ? cookieHeader[0].split(';')[0].split('=')[1]
    : null;
  console.log(`   ✅ Authentication successful!\n`);

  // Step 4: Bulk sync all accounts from blockchain
  const headers = {
    Cookie: `spendos_token=${token}`,
  };

  console.log('4️⃣ Syncing ALL accounts from blockchain...');
  const syncResponse = await axios.post(
    `${API_URL}/spend-accounts/sync-all`,
    {},
    { headers, withCredentials: true },
  );

  const result = syncResponse.data;
  console.log(`   ✅ Bulk sync complete!`);
  console.log(`      Total: ${result.total} accounts`);
  console.log(`      Synced: ${result.synced} accounts`);
  console.log(`      Failed: ${result.failed} accounts`);
  console.log(`      Message: ${result.message}\n`);

  // Step 5: Verify synced accounts
  console.log('5️⃣ Verifying synced accounts...');
  const accountsResponse = await axios.get(`${API_URL}/spend-accounts`, {
    headers,
    withCredentials: true,
  });
  console.log(
    `   ✅ Total accounts in database: ${accountsResponse.data.length}`,
  );

  accountsResponse.data.forEach((acc: any) => {
    console.log(`      - Account ${acc.accountId}: ${acc.label}`);
  });

  console.log('\n✅ Sync complete!');
}

main().catch((error) => {
  console.error('❌ Error:', error.response?.data || error.message);
  process.exit(1);
});
