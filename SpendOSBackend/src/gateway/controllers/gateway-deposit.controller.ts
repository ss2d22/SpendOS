import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { GatewayDepositService } from '../services/gateway-deposit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Gateway')
@Controller('gateway')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class GatewayDepositController {
  constructor(
    private readonly gatewayDepositService: GatewayDepositService,
  ) {}

  @Get('balances')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get admin wallet and Gateway balances',
    description:
      'Check current USDC balance in admin wallet and Gateway. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          example: '0xbd67dcc29facfcd59e1aef6d6af4491f2d0f8de1',
        },
        walletBalance: {
          type: 'string',
          example: '50.00',
          description: 'USDC balance in admin wallet',
        },
        gatewayBalance: {
          type: 'string',
          example: '100.00',
          description: 'USDC balance in Gateway',
        },
        reserveAmount: {
          type: 'string',
          example: '20.00',
          description: 'Reserved amount kept in wallet',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getBalances() {
    return this.gatewayDepositService.getBalances();
  }

  @Post('deposit')
  @Roles('admin')
  @ApiOperation({
    summary: 'Manually deposit USDC to Gateway',
    description:
      'Manually trigger a deposit from admin wallet to Gateway. If no amount specified, deposits all USDC except 20 USDC reserve. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Deposit completed successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async manualDeposit(@Body() body?: { amount?: string }) {
    await this.gatewayDepositService.manualDeposit(body?.amount);
    return { message: 'Deposit completed successfully' };
  }
}
