import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { buildLogger, loggerProvider } from '../common/logger';
import { loadEnv } from '@marketpix/config';

/** Prisma orqali barcha DB operatsiyalari. Logda parol/secret yo'q. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const env = loadEnv();
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'stdout' },
      ],
      datasources: { db: { url: env.DATABASE_URL } },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  get logger() {
    return buildLogger();
  }

  get token(): string {
    return loggerProvider;
  }
}
