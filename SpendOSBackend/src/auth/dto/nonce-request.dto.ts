import { IsEthereumAddress } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NonceRequestDto {
  @ApiProperty({
    description: 'Ethereum wallet address requesting a nonce',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  })
  @IsEthereumAddress()
  address: string;
}
