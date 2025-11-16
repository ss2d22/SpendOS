import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

/**
 * Transforms USDC amounts from decimal format to micro USDC (6 decimals)
 *
 * Accepts:
 * - Decimal strings: "999.99" → "999990000"
 * - Integer strings: "1000" → "1000000000"
 * - Comma-separated: "10,000.50" → "10000500000"
 * - Already formatted: "1000000000" → "1000000000"
 *
 * USDC uses 6 decimals, so 1 USDC = 1,000,000 micro USDC
 */
export function UsdcTransform() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    // Clean the input: remove whitespace and commas
    let stringValue = String(value).trim().replace(/,/g, '');

    // Validate format - only digits and optionally one decimal point
    if (!/^\d+(\.\d+)?$/.test(stringValue)) {
      throw new BadRequestException(
        `Invalid USDC amount format: "${value}". Must be a number (e.g., "1000.50" or "1000500000")`,
      );
    }

    const numValue = parseFloat(stringValue);

    // If it's already a large number (>= 1M), assume it's already in micro USDC
    if (numValue >= 1000000) {
      // Validate it's an integer (no decimal part)
      if (stringValue.includes('.')) {
        throw new BadRequestException(
          'USDC amounts in micro format must be integers (no decimals)',
        );
      }
      return stringValue;
    }

    // Otherwise, treat as decimal USDC and convert to micro USDC
    const parts = stringValue.split('.');

    const wholePart = parts[0] || '0';
    const decimalPart = (parts[1] || '').padEnd(6, '0').substring(0, 6);

    // Combine and remove leading zeros
    const microUsdc = BigInt(wholePart + decimalPart).toString();

    return microUsdc;
  });
}
