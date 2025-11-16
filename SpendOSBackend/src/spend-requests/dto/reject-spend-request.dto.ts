import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectSpendRequestDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Insufficient budget justification',
    maxLength: 256,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  reason: string;
}
