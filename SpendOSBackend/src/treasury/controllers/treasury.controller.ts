import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
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
import { FundTreasuryDto, TransferAdminDto } from '../dto';

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
      'Retrieve the unified USDC balance from admin wallet Gateway deposits across all chains. Available to admins and managers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'string',
          example: '22.50',
          description: 'Balance in USDC dollars',
        },
        balanceFormatted: {
          type: 'string',
          example: '22.50',
          description: 'Human-readable balance in USDC',
        },
        currency: { type: 'string', example: 'USDC' },
        unified: {
          type: 'string',
          example: '22.50',
          description: 'Total unified balance across all chains in USDC',
        },
        committed: {
          type: 'string',
          example: '5.00',
          description: 'Total committed to active spend accounts in USDC',
        },
        available: {
          type: 'string',
          example: '17.50',
          description: 'Available balance after commitments in USDC',
        },
        lastSyncAt: {
          type: 'string',
          example: '2025-11-16T09:00:00.000Z',
          description: 'Last balance sync timestamp',
        },
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

  @Get('balance/unified')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get unified cross-chain USDC balance',
    description:
      'Retrieve the unified USDC balance across all supported chains (Arc Testnet, Base Sepolia, Ethereum Sepolia, Avalanche Fuji) via Circle Gateway API. This shows the total USDC available for instant cross-chain transfers. Available to admins and managers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unified cross-chain balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalBalance: {
          type: 'string',
          example: '5000000000',
          description: 'Total balance across all chains in micro USDC',
        },
        totalBalanceUsdc: {
          type: 'string',
          example: '5000.000000',
          description: 'Total balance in USDC (formatted)',
        },
        balances: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chainId: { type: 'number', example: 5042002 },
              domain: { type: 'number', example: 26 },
              balance: { type: 'string', example: '1000000000' },
              balanceUsdc: { type: 'string', example: '1000.000000' },
              token: {
                type: 'string',
                example: '0x3600000000000000000000000000000000000000',
              },
            },
          },
        },
        address: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0aEb6',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getUnifiedBalance() {
    return this.treasuryService.getUnifiedCrossChainBalance();
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

  @Post('fund')
  @Roles('admin')
  @ApiOperation({
    summary: 'Fund the treasury',
    description:
      'Record inbound funding to the treasury contract from Gateway. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury funded successfully',
    schema: {
      type: 'object',
      properties: {
        transactionHash: {
          type: 'string',
          example: '0x8efc29a1e8c7f5b6c42d3e8f9a7b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async fundTreasury(@Body() dto: FundTreasuryDto) {
    const transactionHash = await this.treasuryService.fundTreasury(
      dto.amount,
      dto.gatewayTxId,
    );
    return { transactionHash };
  }

  @Post('pause')
  @Roles('admin')
  @ApiOperation({
    summary: 'Pause the treasury contract',
    description:
      'Emergency pause of the treasury contract. All operations will be disabled. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury contract paused successfully',
    schema: {
      type: 'object',
      properties: {
        transactionHash: {
          type: 'string',
          example: '0x8efc29a1e8c7f5b6c42d3e8f9a7b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async pauseContract() {
    const transactionHash = await this.treasuryService.pauseContract();
    return { transactionHash };
  }

  @Post('unpause')
  @Roles('admin')
  @ApiOperation({
    summary: 'Unpause the treasury contract',
    description:
      'Resume normal operations of the treasury contract after a pause. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Treasury contract unpaused successfully',
    schema: {
      type: 'object',
      properties: {
        transactionHash: {
          type: 'string',
          example: '0x8efc29a1e8c7f5b6c42d3e8f9a7b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async unpauseContract() {
    const transactionHash = await this.treasuryService.unpauseContract();
    return { transactionHash };
  }

  @Post('transfer-admin')
  @Roles('admin')
  @ApiOperation({
    summary: 'Transfer admin rights',
    description:
      'Transfer the admin role to a new address. This is a critical operation. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin rights transferred successfully',
    schema: {
      type: 'object',
      properties: {
        transactionHash: {
          type: 'string',
          example: '0x8efc29a1e8c7f5b6c42d3e8f9a7b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async transferAdmin(@Body() dto: TransferAdminDto) {
    const transactionHash = await this.treasuryService.transferAdmin(
      dto.newAdmin,
    );
    return { transactionHash };
  }
}
