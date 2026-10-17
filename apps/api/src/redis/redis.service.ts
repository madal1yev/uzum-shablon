import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { loadEnv } from '@marketpix/config';
import Redis from 'ioredis';

/** Bitta Redis ulanishi: rate-limit, kesh va signal uchun. BullMQ alohida ulanish oladi. */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    const env = loadEnv();
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.client.on('error', (err) => {
      // Xatoni o'ldirmaymiz, faqat ko'ramiz — workerlar baribir ishlashda davom etadi.
      if (env.NODE_ENV !== 'test') console.warn('[redis]', err.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
