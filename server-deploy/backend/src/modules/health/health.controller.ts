import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService, @Inject('PRISMA_CLIENT') private readonly prisma) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' } };
      } catch (e) {
        return { database: { status: 'down', message: e.message } };
      }
    }]);
  }
}
