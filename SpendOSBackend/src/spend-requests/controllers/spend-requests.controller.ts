import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { SpendRequestsService } from '../services/spend-requests.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/decorators/user.decorator';
import { SpendStatus } from '../../common/enums';
import { CreateSpendRequestDto, RejectSpendRequestDto } from '../dto';

@ApiTags('Spend Requests')
@Controller('spend-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class SpendRequestsController {
  constructor(private readonly spendRequestsService: SpendRequestsService) {}

  @Get()
  @Roles('admin', 'manager', 'spender')
  @ApiOperation({
    summary: 'Get all spend requests',
    description:
      'Retrieve spend requests with optional filters. Spenders can see their own requests, managers can see requests for accounts they approve, admins can see all.',
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    description: 'Filter by spend account ID',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by request status',
    enum: SpendStatus,
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results to return',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of spend requests',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requestId: { type: 'number', example: 15 },
          accountId: { type: 'number', example: 1 },
          amount: { type: 'string', example: '1500000' },
          destinationChainId: { type: 'number', example: 84532 },
          destinationAddress: { type: 'string', example: '0x742d35Cc...' },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'],
            example: 'EXECUTED',
          },
          reason: { type: 'string', example: 'Cloud infrastructure costs' },
          createdAt: { type: 'string', format: 'date-time' },
          executedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(
    @Query('accountId') accountId?: number,
    @Query('status') status?: SpendStatus,
    @Query('limit') limit?: number,
  ) {
    return this.spendRequestsService.findAll(accountId, status, limit);
  }

  @Get('account/:accountId')
  @ApiParam({
    name: 'accountId',
    description: 'The spend account ID to filter requests by',
    example: 1,
  })
  @ApiOperation({
    summary: 'Get spend requests by account',
    description: 'Retrieve all spend requests for a specific spend account',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend requests for the account',
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByAccount(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.spendRequestsService.findByAccount(accountId);
  }

  @Get(':requestId')
  @ApiParam({
    name: 'requestId',
    description: 'The unique identifier of the spend request',
    example: 15,
  })
  @ApiOperation({
    summary: 'Get spend request by ID',
    description:
      'Retrieve detailed information about a specific spend request, including execution details',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend request details',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'number', example: 15 },
        accountId: { type: 'number', example: 1 },
        amount: { type: 'string', example: '1500000' },
        destinationChainId: { type: 'number', example: 84532 },
        destinationAddress: { type: 'string', example: '0x742d35Cc...' },
        status: { type: 'string', example: 'EXECUTED' },
        reason: { type: 'string', example: 'Cloud infrastructure costs' },
        createdAt: { type: 'string', format: 'date-time' },
        approvedAt: { type: 'string', format: 'date-time' },
        executedAt: { type: 'string', format: 'date-time' },
        transactionHash: { type: 'string', example: '0x8efc...' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Spend request not found' })
  async findOne(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.spendRequestsService.findOne(requestId);
  }

  @Post()
  @Roles('spender')
  @ApiOperation({
    summary: 'Create a new spend request',
    description:
      'Submit a new spend request from your spend account. If below auto-approve limit, it will be automatically approved and executed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Spend request created successfully',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'number', example: 25 },
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
    description: 'Forbidden - spender role required',
  })
  async create(@Body() dto: CreateSpendRequestDto, @User() user: any) {
    return this.spendRequestsService.createRequest(
      dto.accountId,
      dto.amount,
      dto.chainId,
      dto.destinationAddress,
      dto.description,
      user.address,
    );
  }

  @Post(':requestId/approve')
  @Roles('manager', 'admin')
  @ApiParam({
    name: 'requestId',
    description: 'The spend request ID to approve',
    example: 15,
  })
  @ApiOperation({
    summary: 'Approve a spend request',
    description:
      'Approve a pending spend request. Once approved, the spend will be executed automatically. Manager or admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend request approved successfully',
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
    description: 'Forbidden - manager or admin role required',
  })
  @ApiResponse({ status: 404, description: 'Spend request not found' })
  async approve(@Param('requestId', ParseIntPipe) requestId: number) {
    const transactionHash =
      await this.spendRequestsService.approveRequest(requestId);
    return { transactionHash };
  }

  @Post(':requestId/reject')
  @Roles('manager', 'admin')
  @ApiParam({
    name: 'requestId',
    description: 'The spend request ID to reject',
    example: 15,
  })
  @ApiOperation({
    summary: 'Reject a spend request',
    description:
      'Reject a pending spend request with a reason. Manager or admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Spend request rejected successfully',
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
    description: 'Forbidden - manager or admin role required',
  })
  @ApiResponse({ status: 404, description: 'Spend request not found' })
  async reject(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: RejectSpendRequestDto,
  ) {
    const transactionHash = await this.spendRequestsService.rejectRequest(
      requestId,
      dto.reason,
    );
    return { transactionHash };
  }
}
