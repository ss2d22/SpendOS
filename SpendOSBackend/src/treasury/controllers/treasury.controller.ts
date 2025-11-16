import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { TreasuryService } from '../services/treasury.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Treasury')
@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('balance')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get treasury balance',
    description:
      'Retrieve the current USDC balance in the treasury contract on Arc Testnet. Available to admins and managers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'string',
          example: '1000000000',
          description: 'Balance in USDC (6 decimals)',
        },
        balanceFormatted: {
          type: 'string',
          example: '1000.00',
          description: 'Human-readable balance',
        },
        currency: { type: 'string', example: 'USDC' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getBalance() {
    return this.treasuryService.getBalance();
  }

  @Get('funding-history')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get funding history',
    description:
      'Retrieve the history of all deposits made to the treasury contract. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Funding history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transactionHash: { type: 'string', example: '0x123...' },
          amount: { type: 'string', example: '1000000000' },
          depositor: { type: 'string', example: '0x742d35Cc...' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getFundingHistory() {
    return this.treasuryService.getFundingHistory();
  }
}
