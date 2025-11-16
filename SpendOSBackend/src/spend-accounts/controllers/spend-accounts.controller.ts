import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import {
  CreateSpendAccountDto,
  UpdateSpendAccountDto,
  UpdateAllowedChainsDto,
  ConfigureAutoTopupDto,
} from '../dto';

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

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a new spend account',
    description:
      'Create a new spend account with specified budget limits and permissions. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Spend account created successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'number', example: 5 },
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
  async create(@Body() dto: CreateSpendAccountDto) {
    return this.spendAccountsService.createAccount(
      dto.owner,
      dto.label,
      dto.budgetPerPeriod,
      dto.periodDuration,
      dto.perTxLimit,
      dto.dailyLimit || '0',
      dto.approvalThreshold,
      dto.approver,
      dto.allowedChains,
    );
  }

  @Patch(':accountId')
  @Roles('admin')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to update',
    example: 1,
  })
  @ApiOperation({
    summary: 'Update spend account settings',
    description:
      'Update budget limits and approver for a spend account. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend account updated successfully',
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
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async update(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() dto: UpdateSpendAccountDto,
  ) {
    const transactionHash = await this.spendAccountsService.updateAccount(
      accountId,
      dto.budgetPerPeriod,
      dto.perTxLimit,
      dto.dailyLimit,
      dto.approvalThreshold,
      dto.approver,
    );
    return { transactionHash };
  }

  @Delete(':accountId')
  @Roles('admin')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to close',
    example: 1,
  })
  @ApiOperation({
    summary: 'Close a spend account',
    description:
      'Permanently close a spend account, preventing further spending. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend account closed successfully',
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
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async remove(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.closeAccount(accountId);
    return { transactionHash };
  }

  @Post(':accountId/freeze')
  @Roles('manager')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to freeze',
    example: 1,
  })
  @ApiOperation({
    summary: 'Freeze a spend account',
    description:
      'Temporarily freeze a spend account to prevent all spending. Manager role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend account frozen successfully',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - manager role required',
  })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async freeze(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.freezeAccount(accountId);
    return { transactionHash };
  }

  @Post(':accountId/unfreeze')
  @Roles('admin')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to unfreeze',
    example: 1,
  })
  @ApiOperation({
    summary: 'Unfreeze a spend account',
    description: 'Unfreeze a previously frozen spend account. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend account unfrozen successfully',
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
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async unfreeze(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.unfreezeAccount(accountId);
    return { transactionHash };
  }

  @Post(':accountId/sweep')
  @Roles('manager')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to sweep',
    example: 1,
  })
  @ApiOperation({
    summary: 'Sweep account reserved funds',
    description:
      'Return all reserved funds from this account back to the treasury. Manager role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account swept successfully',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - manager role required',
  })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async sweep(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.sweepAccount(accountId);
    return { transactionHash };
  }

  @Post(':accountId/reset-period')
  @Roles('manager')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to reset',
    example: 1,
  })
  @ApiOperation({
    summary: 'Reset account budget period',
    description:
      'Manually reset the budget period for this account. Manager role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget period reset successfully',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - manager role required',
  })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async resetPeriod(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.resetPeriod(accountId);
    return { transactionHash };
  }

  @Patch(':accountId/allowed-chains')
  @Roles('admin')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to update',
    example: 1,
  })
  @ApiOperation({
    summary: 'Update allowed chains for account',
    description:
      'Update the list of blockchain networks where this account can spend. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Allowed chains updated successfully',
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
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async updateAllowedChains(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() dto: UpdateAllowedChainsDto,
  ) {
    const transactionHash =
      await this.spendAccountsService.updateAllowedChains(
        accountId,
        dto.allowedChains,
      );
    return { transactionHash };
  }

  @Patch(':accountId/auto-topup')
  @Roles('manager')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to configure',
    example: 1,
  })
  @ApiOperation({
    summary: 'Configure auto-topup settings',
    description:
      'Set automatic balance top-up thresholds for this account. Manager role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-topup configured successfully',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - manager role required',
  })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async configureAutoTopup(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() dto: ConfigureAutoTopupDto,
  ) {
    const transactionHash =
      await this.spendAccountsService.configureAutoTopup(
        accountId,
        dto.minBalance,
        dto.targetBalance,
      );
    return { transactionHash };
  }

  @Post(':accountId/execute-auto-topup')
  @Roles('manager')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to top up',
    example: 1,
  })
  @ApiOperation({
    summary: 'Execute auto-topup manually',
    description:
      'Manually trigger an auto-topup for this account. Manager role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-topup executed successfully',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - manager role required',
  })
  @ApiResponse({ status: 404, description: 'Spend account not found' })
  async executeAutoTopup(@Param('accountId', ParseIntPipe) accountId: number) {
    const transactionHash =
      await this.spendAccountsService.executeAutoTopup(accountId);
    return { transactionHash };
  }

  @Post('sync-all')
  @Roles('admin')
  @ApiOperation({
    summary: 'Sync all accounts from blockchain',
    description:
      'Bulk sync all spend accounts from the blockchain to the database. Queries the contract for total account count and syncs each one. Useful for initial setup or recovering from missed events. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk sync completed',
    schema: {
      type: 'object',
      properties: {
        synced: { type: 'number', example: 5 },
        failed: { type: 'number', example: 0 },
        total: { type: 'number', example: 5 },
        message: {
          type: 'string',
          example: 'Successfully synced 5 out of 5 accounts',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async syncAllAccounts() {
    const result = await this.spendAccountsService.syncAllAccountsFromBlockchain();
    return {
      ...result,
      message: `Successfully synced ${result.synced} out of ${result.total} accounts`,
    };
  }

  @Post(':accountId/sync')
  @Roles('admin')
  @ApiParam({
    name: 'accountId',
    description:
      'The spend account ID to sync from blockchain to database',
    example: 3,
  })
  @ApiOperation({
    summary: 'Sync account from blockchain',
    description:
      'Manually sync an account from the blockchain to the database. Useful for accounts created outside the API or when events were missed. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account synced successfully',
    schema: {
      type: 'object',
      properties: {
        accountId: { type: 'number', example: 3 },
        ownerAddress: {
          type: 'string',
          example: '0xbd67dcc29facfcd59e1aef6d6af4491f2d0f8de1',
        },
        label: { type: 'string', example: 'Marketing Department' },
        budgetPerPeriod: { type: 'string', example: '100000000000' },
        frozen: { type: 'boolean', example: false },
        closed: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({
    status: 404,
    description: 'Account not found on blockchain',
  })
  async syncAccount(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.spendAccountsService.syncAccountFromBlockchain(accountId);
  }
}
