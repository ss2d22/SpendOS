import { TREASURY_ADDRESS } from '../config/constants';
import TreasuryAbi from '@/abis/Treasury.json';

export const treasuryConfig = {
  address: TREASURY_ADDRESS,
  abi: TreasuryAbi.abi,
} as const;
