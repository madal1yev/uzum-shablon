import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CreateJobInput } from '@marketpix/validation';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService, PricingService } from '../credits/credits.service';
import { generationQueue, type GenerationJobData } from './queue';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly pricing: PricingService,
  ) {}

  /** Ish yaratadi: egasi tekshiriladi, kredit ajratiladi, navbatga qo'yiladi. */
  async create(userId: string, input: CreateJobInput) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.generationJob.findFirst({
        where: { userId, idempotencyKey: input.idempotencyKey },
        include: { assets: true },
      });
      if (existing) return this.toDto(existing);
    }

    const asset = await this.prisma.asset.findFirst({
      where: { id: input.assetId, userId, kind: 'UPLOADED', deletedAt: null },
    });
    if (!asset) throw new NotFoundException('ASSET_NOT_FOUND');

    const preset = input.spec.presetId
      ? await this.prisma.imagePreset.findFirst({ where: { id: input.spec.presetId, active: true } })
      : null;
    if (input.spec.presetId && !preset) throw new BadRequestException('PRESET_NOT_FOUND');

    const width = preset?.width ?? input.spec.width;
    const height = preset?.height ?? input.spec.height;
    if (!width || !height) throw new BadRequestException('DIMENSIONS_REQUIRED');

    const unitCost = await this.pricing.costFor(input.mode);
    const cost = unitCost * input.variations;

    await this.credits.getBalance(userId);

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          userId,
          mode: input.mode,
          status: 'QUEUED',
          presetId: preset?.id ?? null,
          sourceAssetId: asset.id,
          width,
          height,
          format: input.spec.format,
          fit: input.spec.fit,
          padding: input.spec.padding,
          background: input.spec.background,
          style: input.style ?? null,
          variations: input.variations,
          cost,
          idempotencyKey: input.idempotencyKey ?? null,
          meta: {
            text: input.text ?? null,
          } as Prisma.InputJsonValue,
        },
      });
      return created;
    });

    try {
      await this.credits.reserve(userId, cost, job.id);
    } catch (e) {
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', failureCode: 'INSUFFICIENT_CREDITS', failureMessage: (e as Error).message },
      });
      throw new BadRequestException('INSUFFICIENT_CREDITS');
    }

    const queue = generationQueue();
    const data: GenerationJobData = { jobId: job.id };
    await queue.add('generate', data, { jobId: job.id });
    this.logger.log(`job queued ${job.id} mode=${input.mode} cost=${cost}`);

    const full = await this.prisma.generationJob.findUniqueOrThrow({
      where: { id: job.id },
      include: { assets: true },
    });
    return this.toDto(full);
  }

  async get(userId: string, jobId: string) {
    const job = await this.prisma.generationJob.findFirst({
      where: { id: jobId, userId },
      include: { assets: { where: { deletedAt: null } } },
    });
    if (!job) throw new NotFoundException('JOB_NOT_FOUND');
    return this.toDto(job);
  }

  /** Boshqa variant so'rash — haqiqiy yangi generatsiya (eski rasmni qaytarmaydi). */
  async requestVariation(userId: string, jobId: string, variations = 1) {
    const job = await this.prisma.generationJob.findFirst({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('JOB_NOT_FOUND');
    if (job.status !== 'COMPLETED') throw new BadRequestException('JOB_NOT_COMPLETED');

    const meta = (job.meta ?? {}) as { text?: Record<string, unknown> };
    const created = await this.create(userId, {
      assetId: job.sourceAssetId!,
      mode: job.mode,
      spec: {
        presetId: job.presetId ?? undefined,
        width: job.width,
        height: job.height,
        format: job.format as never,
        fit: job.fit as never,
        padding: job.padding,
        background: job.background,
      },
      style: job.style ?? undefined,
      variations,
      text: meta.text as never,
    });
    return created;
  }

  async cancel(userId: string, jobId: string) {
    const job = await this.prisma.generationJob.findFirst({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('JOB_NOT_FOUND');
    if (job.status !== 'QUEUED') throw new BadRequestException('JOB_NOT_CANCELLABLE');

    const updated = await this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', failureCode: 'CANCELLED_BY_USER' },
      include: { assets: true },
    });
    if (job.cost > 0) await this.credits.refund(userId, job.cost, job.id, 'Foydalanuvchi bekor qildi');
    return this.toDto(updated);
  }

  async history(userId: string, page = 1, pageSize = 20) {
    const where = { userId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.generationJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { assets: { where: { deletedAt: null } } },
      }),
      this.prisma.generationJob.count({ where }),
    ]);
    return { items: items.map((j) => this.toDto(j)), total, page, pageSize };
  }

  async toDto(job: {
    id: string;
    mode: string;
    status: string;
    presetId: string | null;
    width: number;
    height: number;
    format: string;
    fit: string;
    padding: number;
    background: string;
    style: string | null;
    variations: number;
    progress: number;
    cost: number;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    assets?: Array<{ id: string; kind: string; width: number; height: number; format: string; bytes: number; createdAt: Date }>;
  }) {
    return {
      id: job.id,
      mode: job.mode,
      status: job.status,
      presetId: job.presetId,
      width: job.width,
      height: job.height,
      format: job.format,
      fit: job.fit,
      padding: job.padding,
      background: job.background,
      style: job.style,
      variations: job.variations,
      progress: job.progress,
      cost: job.cost,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      outputs: (job.assets ?? [])
        .filter((a) => a.kind === 'GENERATED')
        .map((a) => ({
          id: a.id,
          kind: 'GENERATED' as const,
          width: a.width,
          height: a.height,
          format: a.format,
          bytes: a.bytes,
          url: `/api/v1/assets/${a.id}/download`,
          createdAt: a.createdAt.toISOString(),
        })),
    };
  }

  assertOwnership(userId: string, owner: string): void {
    if (userId !== owner) throw new ForbiddenException({ message: 'NOT_OWNER', error: 'Forbidden' });
  }
}
