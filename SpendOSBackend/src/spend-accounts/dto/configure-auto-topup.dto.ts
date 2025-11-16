import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { UsdcTransform } from '../../common/decorators/usdc-transform.decorator';

export class ConfigureAutoTopupDto {
  @ApiProperty({
    description:
      'Minimum balance threshold to trigger topup (in USDC). Accepts decimal format (e.g., "500.00") or micro USDC (e.g., "500000000")',
    example: '500.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  minBalance: string;

  @ApiProperty({
    description:
      'Target balance after topup (in USDC). Accepts decimal format (e.g., "1500.00") or micro USDC (e.g., "1500000000")',
    example: '1500.00',
  })
  @UsdcTransform()
  @IsString()
  @IsNotEmpty()
  targetBalance: string;
}
