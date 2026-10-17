import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { externalServiceStatus, loadEnv } from '@marketpix/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness — jarayon tirikmi. DB'ga bog'liq emas. */
  @Get('health')
  health() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  /** Readiness — haqiqiy bog'lanishlar tekshiriladi. -->
  @Get('ready')
  async ready() {
    const checks = {
      database: false,
      redis: await this.redis.ping(),
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
    const ok = checks.database && checks.redis;
    const body = {
      status: ok ? 'ready' : 'degraded',
      checks,
      services: externalServiceStatus(loadEnv()),
    };
    if (!ok) throw new ServiceUnavailableException(body);
    return body;
  }
}
