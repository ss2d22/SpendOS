import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEthereumAddress,
  IsNumber,
  Min,
} from 'class-validator';
import { UsdcTransform } from '../../common/decorators/usdc-transform.decorator';

export class UpdateSpendAccountDto {
  @ApiProperty({
    description:
      'New budget per period (in USDC, 0 to keep current). Accepts decimal format (e.g., "3000.00") or micro USDC (e.g., "3000000000")',
    example: '3000.00',
    required: false,
  })
  @UsdcTransform()
  @IsString()
  @IsOptional()
  budgetPerPeriod?: string;

  @ApiProperty({
    description:
      'New per-transaction limit (in USDC, 0 to keep current). Accepts decimal format (e.g., "600.00") or micro USDC (e.g., "600000000")',
    example: '600.00',
    required: false,
  })
  @UsdcTransform()
  @IsString()
  @IsOptional()
  perTxLimit?: string;

  @ApiProperty({
    description:
      'New daily limit (in USDC, 0 to keep current). Accepts decimal format (e.g., "1200.00") or micro USDC (e.g., "1200000000")',
    example: '1200.00',
    required: false,
  })
  @UsdcTransform()
  @IsString()
  @IsOptional()
  dailyLimit?: string;

  @ApiProperty({
    description:
      'New approval threshold (in USDC, 0 to keep current). Accepts decimal format (e.g., "300.00") or micro USDC (e.g., "300000000")',
    example: '300.00',
    required: false,
  })
  @UsdcTransform()
  @IsString()
  @IsOptional()
  approvalThreshold?: string;

  @ApiProperty({
    description: 'New approver address (address(0) to keep current)',
    example: '0x422d3C8f40DF3e79a2bBF16F7E3F23C1b5Bd3aF5',
    required: false,
  })
  @IsEthereumAddress()
  @IsOptional()
  approver?: string;
}
