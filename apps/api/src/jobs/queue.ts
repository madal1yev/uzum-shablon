import { loadEnv } from '@marketpix/config';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export const GENERATION_QUEUE = 'image-generation';
export interface GenerationJobData {
  jobId: string;
}

let connection: IORedis | null = null;

export function redisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(loadEnv().REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  }
  return connection;
}

export function generationQueue(): Queue<GenerationJobData> {
  return new Queue<GenerationJobData>(GENERATION_QUEUE, { connection: redisConnection() });
}

export function generationWorker(handler: (data: GenerationJobData) => Promise<void>): Worker<GenerationJobData> {
  const env = loadEnv();
  const defaultJobOptions: JobsOptions = {
    attempts: env.JOB_MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  };
  return new Worker<GenerationJobData>(
    GENERATION_QUEUE,
    async (job) => handler(job.data),
    { connection: redisConnection(), concurrency: env.QUEUE_GENERATION_CONCURRENCY, defaultJobOptions },
  );
}

export async function closeQueueResources(worker: Worker | null, queue: Queue | null): Promise<void> {
  await worker?.close().catch(() => undefined);
  await queue?.close().catch(() => undefined);
  try {
    await connection?.quit();
  } catch {
    /* ignore */
  }
  connection = null;
}
