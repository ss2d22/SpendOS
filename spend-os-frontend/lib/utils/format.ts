import { USDC_DECIMALS } from '../config/constants';

/**
 * Format USDC amount from 6-decimal integer to human-readable string
 */
export function formatUsdc(amount: string | bigint | number | undefined | null, decimals: number = 2): string {
  // Handle null/undefined cases
  if (amount === null || amount === undefined) {
    return '0.00';
  }

  // Handle different input types
  let num: bigint;
  if (typeof amount === 'string') {
    // Handle empty strings
    if (amount.trim() === '') {
      return '0.00';
    }
    num = BigInt(amount);
  } else if (typeof amount === 'bigint') {
    num = amount;
  } else if (typeof amount === 'number') {
    // If it's a number, assume it's already in USDC units (not micro-USDC)
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    // Fallback for any other type
    return '0.00';
  }

  const divisor = BigInt(10 ** USDC_DECIMALS);
  const whole = num / divisor;
  const fraction = num % divisor;

  const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').slice(0, decimals);

  if (decimals === 0) {
    return Number(whole).toLocaleString();
  }

  return `${Number(whole).toLocaleString()}.${fractionStr}`;
}

/**
 * Parse human-readable USDC amount to 6-decimal integer
 */
export function parseUsdcToInt(amount: string): bigint {
  const parts = amount.trim().split('.');
  const whole = parts[0] || '0';
  const fraction = (parts[1] || '').padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);

  const wholeInt = BigInt(whole.replace(/,/g, ''));
  const fractionInt = BigInt(fraction);

  return wholeInt * BigInt(10 ** USDC_DECIMALS) + fractionInt;
}

/**
 * Shorten Ethereum address (0x1234...5678)
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format Ethereum address (alias for shortenAddress)
 */
export function formatAddress(address: string, chars: number = 4): string {
  return shortenAddress(address, chars);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate USDC amount (max 6 decimals)
 */
export function isValidUsdcAmount(amount: string): boolean {
  if (!amount || amount.trim() === '') return false;

  const cleanAmount = amount.replace(/,/g, '');
  const parts = cleanAmount.split('.');

  if (parts.length > 2) return false;
  if (parts[1] && parts[1].length > USDC_DECIMALS) return false;

  const num = parseFloat(cleanAmount);
  return !isNaN(num) && num > 0;
}
