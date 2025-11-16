import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEthereumAddress,
  IsNumber,
  IsArray,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { UsdcTransform } from '../../common/decorators/usdc-transform.decorator';

export class CreateSpendAccountDto {
  @ApiProperty({
    description: 'Address of the account owner (spender)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: 'Human-readable label for the account',
    example: 'Marketing Team',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  label: string;

  @ApiProperty({
    description:
      'Budget amount per period (in USDC). Accepts decimal format (e.g., "1000.50") or micro USDC (e.g., "1000500000")',
    example: '2000.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  budgetPerPeriod: string;

  @ApiProperty({
    description: 'Duration of budget period in seconds (minimum 1 day)',
    example: 2592000,
  })
  @IsNumber()
  @Min(86400) // 1 day minimum
  periodDuration: number;

  @ApiProperty({
    description:
      'Maximum amount per transaction (in USDC). Accepts decimal format (e.g., "500.00") or micro USDC (e.g., "500000000")',
    example: '500.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  perTxLimit: string;

  @ApiProperty({
    description:
      'Maximum daily spending limit (in USDC, 0 = use perTxLimit). Accepts decimal format (e.g., "1000.00") or micro USDC (e.g., "1000000000")',
    example: '1000.00',
    required: false,
  })
  @UsdcTransform()
  @IsString()
  dailyLimit?: string;

  @ApiProperty({
    description:
      'Amounts above this require approval (in USDC, must be <= perTxLimit). Accepts decimal format (e.g., "200.00") or micro USDC (e.g., "200000000")',
    example: '200.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  approvalThreshold: string;

  @ApiProperty({
    description: 'Address of the manager who can approve spends',
    example: '0x422d3C8f40DF3e79a2bBF16F7E3F23C1b5Bd3aF5',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  approver: string;

  @ApiProperty({
    description: 'Array of chain IDs where spends are allowed',
    example: [5042002, 84532],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  allowedChains: number[];
}
