#!/usr/bin/env npx ts-node

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

console.log('\n🔍 Balance State Check\n');
console.log('=' .repeat(60));

console.log('\n📍 Configuration:');
console.log(`Admin Private Key: ${process.env.ADMIN_PRIVATE_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`Backend Private Key: ${process.env.BACKEND_PRIVATE_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`Gateway API: ${process.env.GATEWAY_API_BASE_URL || 'https://gateway-api-testnet.circle.com/v1'}`);

console.log('\n💡 Next Steps:');
console.log('1. Check admin wallet address in server logs');
console.log('2. Deposit USDC to Gateway Wallet contract');
console.log('3. Gateway Wallet: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9');
console.log('4. Or reduce spend account budgets to match available balance');

console.log('\n' + '='.repeat(60) + '\n');
