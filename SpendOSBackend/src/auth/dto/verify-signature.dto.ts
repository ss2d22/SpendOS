import { IsEthereumAddress, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifySignatureDto {
  @ApiProperty({
    description: 'Ethereum wallet address that signed the message',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  })
  @IsEthereumAddress()
  address: string;

  @ApiProperty({
    description: 'The message that was signed (includes nonce)',
    example:
      'Sign this message to authenticate with Arc SpendOS\n\nNonce: abc123def456\nAddress: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'The signature produced by signing the message',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  signature: string;
}
