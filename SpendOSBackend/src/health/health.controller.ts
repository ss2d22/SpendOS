import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedisService } from '../redis/services/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redisService: RedisService,
  ) {}

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple check to verify the application is running. Used by Kubernetes/Docker for liveness probes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-16T12:00:00.000Z',
        },
      },
    },
  })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Check if the application and all dependencies (database, Redis) are ready to serve traffic. Used by Kubernetes/Docker for readiness probes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - one or more dependencies are down',
  })
  async readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async () => {
        try {
          await this.redisService.get('health-check');
          return { redis: { status: 'up' } };
        } catch (error) {
          return { redis: { status: 'down', error: error.message } };
        }
      },
    ]);
  }
}
