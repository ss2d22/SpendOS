import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SpendAccountsService } from '../services/spend-accounts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/decorators/user.decorator';

@ApiTags('Spend Accounts')
@Controller('spend-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class SpendAccountsController {
  constructor(private readonly spendAccountsService: SpendAccountsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get all spend accounts',
    description:
      'Retrieve all spend accounts in the system. Each account represents a budget allocation for a department or team. Admin and manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all spend accounts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          accountId: { type: 'number', example: 1 },
          owner: { type: 'string', example: '0x742d35Cc...' },
          approver: { type: 'string', example: '0x422d3C8f...' },
          spendLimit: { type: 'string', example: '500000000' },
          autoApproveLimit: { type: 'string', example: '200000000' },
          active: { type: 'boolean', example: true },
          department: { type: 'string', example: 'Engineering' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll() {
    return this.spendAccountsService.findAll();
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Get my spend accounts',
    description:
      'Retrieve spend accounts where the authenticated user is either the owner (spender) or the approver (manager).',
  })
  @ApiResponse({
    status: 200,
    description: "User's spend accounts",
    schema: {
      type: 'object',
      properties: {
        owned: {
          type: 'array',
          description: 'Accounts where user is the owner',
          items: { type: 'object' },
        },
        approver: {
          type: 'array',
          description: 'Accounts where user is the approver',
          items: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMine(@User() user: any) {
    const ownedAccounts = await this.spendAccountsService.findByOwner(
      user.address,
    );
    const approverAccounts = await this.spendAccountsService.findByApprover(
      user.address,
    );

    return {
      owned: ownedAccounts,
      approver: approverAccounts,
    };
  }

  @Get(':accountId')
  @ApiParam({
    name: 'accountId',
    description: 'The unique identifier of the spend account',
    example: 1,
  })
  @ApiOperation({
    summary: 'Get spend account by ID',
    description: 'Retrieve detailed information about a specific spend account',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend account details',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'number', example: 1 },
        owner: { type: 'string', example: '0x742d35Cc...' },
        approver: { type: 'string', example: '0x422d3C8f...' },
        spendLimit: { type: 'string', example: '500000000' },
        autoApproveLimit: { type: 'string', example: '200000000' },
        active: { type: 'boolean', example: true },
        department: { type: 'string', example: 'Engineering' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async findOne(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.spendAccountsService.findOne(accountId);
  }
}
