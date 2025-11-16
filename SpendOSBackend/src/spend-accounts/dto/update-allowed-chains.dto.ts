import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsNumber } from 'class-validator';

export class UpdateAllowedChainsDto {
  @ApiProperty({
    description: 'Array of chain IDs to allow for this account',
    example: [5042002, 84532, 11155111],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  allowedChains: number[];
}
