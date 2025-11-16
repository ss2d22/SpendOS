import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
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
import { AlertsService } from '../services/alerts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AlertType, AlertSeverity } from '../../common/enums';

@ApiTags('Alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get system alerts',
    description:
      'Retrieve alerts with optional filters. Alerts are generated for important events like low balance, failed transactions, and approaching spend limits.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by alert type',
    enum: AlertType,
    example: 'LOW_BALANCE',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    description: 'Filter by severity level',
    enum: AlertSeverity,
    example: 'HIGH',
  })
  @ApiQuery({
    name: 'acknowledged',
    required: false,
    description: 'Filter by acknowledgment status',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of alerts to return',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of alerts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'alert_123' },
          type: {
            type: 'string',
            enum: [
              'LOW_BALANCE',
              'FAILED_TRANSACTION',
              'SPEND_LIMIT_APPROACHING',
            ],
            example: 'LOW_BALANCE',
          },
          severity: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            example: 'HIGH',
          },
          message: {
            type: 'string',
            example: 'Treasury balance below threshold: 50 USDC remaining',
          },
          acknowledged: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          acknowledgedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
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
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('acknowledged') acknowledged?: boolean,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.findAll(type, severity, acknowledged, limit);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the alert',
    example: 'alert_123',
  })
  @ApiOperation({
    summary: 'Acknowledge alert',
    description:
      'Mark an alert as acknowledged to indicate it has been reviewed',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert acknowledged successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'alert_123' },
        acknowledged: { type: 'boolean', example: true },
        acknowledgedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledge(
    @Param('id') id: string,
    @Body() body?: { acknowledged?: boolean },
  ) {
    // If no body or acknowledged is not explicitly false, acknowledge the alert
    if (!body || body.acknowledged !== false) {
      return this.alertsService.acknowledge(id);
    }
  }
}
