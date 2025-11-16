import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { UsdcTransform } from '../../common/decorators/usdc-transform.decorator';

export class FundTreasuryDto {
  @ApiProperty({
    description:
      'Amount funded (in USDC). Accepts decimal format (e.g., "1000.00") or micro USDC (e.g., "1000000000")',
    example: '1000.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Gateway transaction ID',
    example: 'gateway-tx-abc123',
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  gatewayTxId: string;
}
