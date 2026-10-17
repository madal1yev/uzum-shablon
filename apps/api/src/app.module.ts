import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { loadEnv } from '@marketpix/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { ImageModule } from './image/image.module';
import { AiModule } from './ai/ai.module';
import { CreditsModule } from './credits/credits.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssetsModule } from './assets/assets.module';
import { PresetsModule } from './presets/presets.module';
import { HealthModule } from './health/health.module';
import { TelegramModule } from './telegram/telegram.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: () => env }),
    ThrottlerModule.forRoot([
      { ttl: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, blockDuration: env.RATE_LIMIT_WINDOW_MS },
    ]),
    PrismaModule,
    RedisModule,
    StorageModule,
    ImageModule,
    AiModule,
    CreditsModule,
    JobsModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    PresetsModule,
    HealthModule,
    TelegramModule,
    PaymentsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
