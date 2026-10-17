import { Logger } from '@nestjs/common';
import { loadEnv } from '@marketpix/config';
import type { ImageFit, ImageFormat } from '@marketpix/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ImageService, formatExtension, formatMime, sniffImageFormat } from '../image/image.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { ProviderError } from '../ai/provider.types';
import { CreditsService } from '../credits/credits.service';
import type { GenerationJobData } from './queue';

const STYLE_PROMPTS: Record<string, string> = {
  studio: 'clean white studio background, soft shadows, professional product photography',
  premium: 'dark luxury background, subtle gradient, premium editorial product photography',
  minimal: 'minimal light grey background, generous negative space, modern product photography',
  lifestyle: 'bright lifestyle setting, natural light, shallow depth of field',
  promo: 'bold promotional background with vibrant colors, commercial advertising style',
};

export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly image: ImageService,
    private readonly ai: AiProviderService,
    private readonly credits: CreditsService,
  ) {}

  async handle(data: GenerationJobData): Promise<void> {
    const env = loadEnv();
    const job = await this.prisma.generationJob.findUnique({
      where: { id: data.jobId },
      include: { assets: true },
    });
    if (!job) {
      this.logger.warn(`job ${data.jobId} not found, skipping`);
      return;
    }
    if (job.status === 'CANCELLED' || job.status === 'COMPLETED') return;

    await this.prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', startedAt: new Date(), progress: 5, attempts: { increment: 1 } },
    });
    await this.prisma.jobEvent.create({
      data: { jobId: job.id, stage: 'start', message: `mode=${job.mode}` },
    });

    try {
      if (!job.sourceAssetId) throw new Error('SOURCE_ASSET_MISSING');
      const source = await this.prisma.asset.findFirst({
        where: { id: job.sourceAssetId, deletedAt: null },
      });
      if (!source) throw new Error('SOURCE_ASSET_DELETED');

      const input = await this.storage.getBuffer(source.storageKey);
      const sniffed = sniffImageFormat(input);
      if (!sniffed) throw new Error('UNSUPPORTED_IMAGE');

      const spec = {
        width: job.width,
        height: job.height,
        format: job.format as ImageFormat,
        fit: job.fit as ImageFit,
        padding: job.padding,
        background: job.background,
      };

      const meta = (job.meta ?? {}) as { text?: { title?: string; subtitle?: string; badge?: string; bullets?: string[] } };
      const outputs: Array<{ id: string; key: string }> = [];
      const total = job.variations;

      for (let i = 0; i < total; i++) {
        const produced = await this.produceOne(job.mode, input, sniffed, spec, meta.text, job.style, i);
        const key = this.storage.newKey('generated', formatExtension(spec.format));
        await this.storage.put(key, produced, formatMime(spec.format));
        const dims = await this.image.inspect(produced);
        const asset = await this.prisma.asset.create({
          data: {
            userId: job.userId,
            kind: 'GENERATED',
            jobId: job.id,
            storageKey: key,
            mime: formatMime(spec.format),
            format: spec.format,
            width: dims.width,
            height: dims.height,
            bytes: produced.byteLength,
          },
        });
        outputs.push({ id: asset.id, key });
        await this.prisma.generationJob.update({
          where: { id: job.id },
          data: { progress: Math.round(((i + 1) / total) * 90) + 5 },
        });
        await this.prisma.jobEvent.create({
          data: { jobId: job.id, stage: 'variation', message: `${i + 1}/${total}`, data: { assetId: asset.id } },
        });
      }

      // Yakuniy tekshiruv: natija haqiqatan ham kerakli o'lchamda va formatdami?
      for (const o of outputs) {
        const a = await this.prisma.asset.findUniqueOrThrow({ where: { id: o.id } });
        if (a.width !== job.width || a.height !== job.height) {
          throw new Error(`OUTPUT_SIZE_MISMATCH: ${a.width}x${a.height}`);
        }
      }

      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date(), failureCode: null, failureMessage: null },
      });
      await this.prisma.jobEvent.create({ data: { jobId: job.id, stage: 'completed' } });
      if (job.cost > 0) await this.credits.charge(job.userId, job.cost, job.id);
      this.logger.log(`job ${job.id} completed (${total} output(s))`);
    } catch (err) {
      const e = err as Error;
      const code =
        e instanceof ProviderError
          ? e.code
          : /^INSUFFICIENT|SOURCE_|UNSUPPORTED|OUTPUT_/.test(e.message)
            ? e.message.split(':')[0]
            : 'PROCESSING_FAILED';
      const isConfig = code === 'NOT_CONFIGURED';

      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          failureCode: code,
          failureMessage: e.message.slice(0, 500),
          progress: 0,
          completedAt: new Date(),
        },
      });
      await this.prisma.jobEvent.create({ data: { jobId: job.id, stage: 'failed', message: e.message.slice(0, 300) } });

      // Konfiguratsiya xatosi qayta urinishga sabab bo'lmaydi — kreditni darhol qaytaramiz.
      if (isConfig || job.attempts + 1 >= env.JOB_MAX_ATTEMPTS) {
        if (job.cost > 0) await this.credits.refund(job.userId, job.cost, job.id, `Muvaffaqiyatsiz: ${code}`);
      }
      this.logger.error(`job ${job.id} failed: ${code} — ${e.message}`);
      // BullMQ'ga xato beramiz: u retry qiladi, lekin biz statusni allaqachon yopdik.
      throw err;
    }
  }

  private async produceOne(
    mode: string,
    input: Buffer,
    sniffed: string,
    spec: { width: number; height: number; format: ImageFormat; fit: ImageFit; padding: number; background: string },
    text: { title?: string; subtitle?: string; badge?: string; bullets?: string[] } | undefined,
    style: string | null,
    index: number,
  ): Promise<Buffer> {
    const mime = sniffed === 'JPEG' ? 'image/jpeg' : sniffed === 'WEBP' ? 'image/webp' : 'image/png';

    if (mode === 'STANDARD_RESIZE') {
      return this.image.placeOnCanvas(input, spec);
    }

    if (mode === 'PRODUCT_CLEANUP') {
      const provider = this.ai.require('REMOVE_BACKGROUND');
      const res = await provider.removeBackground(input, mime);
      return this.image.composite(res.images[0], res.images[0], spec);
    }

    if (mode === 'AI_PRODUCT_DESIGN') {
      const provider = this.ai.require('EDIT');
      const prompt =
        `Professional e-commerce product photo. Keep the product exactly as it looks, do not alter labels or logos. ` +
        `Background: ${STYLE_PROMPTS[style ?? ''] ?? STYLE_PROMPTS.studio}. ` +
        `No text, no watermark, no extra objects.`;
      const res = await provider.editImage({
        prompt,
        sourceImage: input,
        sourceMime: mime,
        width: spec.width,
        height: spec.height,
        count: 1,
        seed: index,
      });
      // Model cheklovi tufayli kelgan natijani kerakli o'lchamga keltiramiz.
      return this.image.placeOnCanvas(res.images[0], spec);
    }

    if (mode === 'PRODUCT_INFOGRAPHICS') {
      const base = await this.image.placeOnCanvas(input, spec);
      if (!text?.title && !text?.subtitle && !text?.badge && !(text?.bullets ?? []).length) return base;
      return this.image.applyInfographic(base, text ?? {}, spec);
    }

    throw new Error(`UNKNOWN_MODE: ${mode}`);
  }
}
