import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEthereumAddress,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { UsdcTransform } from '../../common/decorators/usdc-transform.decorator';

export class CreateSpendRequestDto {
  @ApiProperty({
    description: 'The spend account ID to use',
    example: 1,
  })
  @IsNumber()
  accountId: number;

  @ApiProperty({
    description:
      'Amount to spend (in USDC). Accepts decimal format (e.g., "1.50") or micro USDC (e.g., "1500000")',
    example: '1.50',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Destination chain ID',
    example: 84532,
  })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    description: 'Recipient address on destination chain',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Cloud infrastructure costs',
    maxLength: 256,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  description: string;
}
