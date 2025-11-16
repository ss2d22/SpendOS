import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class TransferAdminDto {
  @ApiProperty({
    description: 'Address of the new admin',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  newAdmin: string;
}
