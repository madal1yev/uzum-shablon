import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { ImageModule } from '../image/image.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { GenerationProcessor } from './jobs.processor';
import { closeQueueResources, generationQueue, generationWorker, type GenerationJobData } from './queue';
import type { Queue, Worker } from 'bullmq';

@Global()
@Module({
  imports: [CreditsModule, ImageModule, AiModule, StorageModule],
  controllers: [JobsController],
  providers: [JobsService, GenerationProcessor],
  exports: [JobsService],
})
export class JobsModule implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<GenerationJobData> | null = null;
  private queue: Queue<GenerationJobData> | null = null;

  constructor(private readonly processor: GenerationProcessor) {}

  async onModuleInit(): Promise<void> {
    this.queue = generationQueue();
    this.worker = generationWorker(async (data) => this.processor.handle(data));
    await this.worker.waitUntilReady().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    await closeQueueResources(this.worker, this.queue);
  }
}

