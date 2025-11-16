import {
  Controller,
  Get,
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
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth('spendos_token')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('runway')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get treasury runway',
    description:
      'Calculate how many days the current treasury balance will last based on recent spending patterns. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Runway calculation',
    schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          example: 200,
          description: 'Days until funds depleted',
        },
        amount: {
          type: 'string',
          example: '1000.00',
          description: 'Available balance in USDC dollars',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getRunway() {
    return this.analyticsService.getRunway();
  }

  @Get('burn-rate')
  @Roles('admin')
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to calculate burn rate over',
    example: 30,
  })
  @ApiOperation({
    summary: 'Get burn rate',
    description:
      'Calculate the average daily spending rate over a specified period. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Burn rate calculation',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'number', example: 30, description: 'Days analyzed' },
        totalSpent: {
          type: 'string',
          example: '150000000',
          description: 'Total spent in period',
        },
        dailyAverage: {
          type: 'string',
          example: '5000000',
          description: 'Average daily spend',
        },
        weeklyAverage: {
          type: 'string',
          example: '35000000',
          description: 'Average weekly spend',
        },
        monthlyAverage: {
          type: 'string',
          example: '150000000',
          description: 'Average monthly spend',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getBurnRate(@Query('days', ParseIntPipe) days: number = 30) {
    return this.analyticsService.getBurnRate(days);
  }

  @Get('department-breakdown')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get department spending breakdown',
    description:
      'Analyze spending by department/account to understand budget allocation and usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Department spending breakdown',
    schema: {
      type: 'object',
      properties: {
        departments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              department: { type: 'string', example: 'Engineering' },
              totalSpent: { type: 'string', example: '50000000' },
              requestCount: { type: 'number', example: 15 },
              averageRequest: { type: 'string', example: '3333333' },
              percentOfTotal: { type: 'number', example: 33.33 },
            },
          },
        },
        totalSpent: { type: 'string', example: '150000000' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getDepartmentBreakdown() {
    return this.analyticsService.getDepartmentBreakdown();
  }
}
