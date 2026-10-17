import { loadEnv } from '@marketpix/config';
import {
  ProviderError,
  type GenerateRequest,
  type ImageGenerationProvider,
  type ProviderCapabilities,
  type ProviderResult,
} from './provider.types';

/** Modeldan olinadigan eng mos o'lchamni tanlaymiz (model faqat shu o'lchamlarni qaytaradi). */
function pickSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.83) return '1024x1536';
  return '1024x1024';
}

/**
 * OpenAI Images integratsiyasi (rasmiy REST API).
 * Dokumentatsiya: platform.openai.com/docs/api-reference/images
 * Model cheklovi tufayli natija doim model o'lchamida keladi; biz uni
 * keyin deterministik resize bilan kerakli o'lchamga keltiramiz.
 */
export class OpenAiImagesProvider implements ImageGenerationProvider {
  readonly name = 'openai';
  private readonly env = loadEnv();

  isConfigured(): boolean {
    return !!this.env.OPENAI_API_KEY && this.env.AI_PROVIDER === 'openai';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      operations: ['GENERATE', 'EDIT'],
      maxOutputSize: { width: 1536, height: 1536 },
      supportedFormats: ['PNG', 'JPEG', 'WEBP'],
      supportsTransparency: true,
    };
  }

  async validateConfiguration(): Promise<{ ok: boolean; problems: string[] }> {
    const problems: string[] = [];
    if (this.env.AI_PROVIDER !== 'openai') problems.push('AI_PROVIDER openai emas');
    if (!this.env.OPENAI_API_KEY) problems.push('OPENAI_API_KEY bo\'sh');
    if (!problems.length) {
      try {
        const res = await this.request('/models', { method: 'GET' });
        if (!res.ok && (res.status === 401 || res.status === 403)) problems.push('OPENAI_API_KEY yaroqsiz');
      } catch (e) {
        problems.push(`OpenAI bilan aloqa yo'q: ${(e as Error).message}`);
      }
    }
    return { ok: problems.length === 0, problems };
  }

  async generateImage(req: GenerateRequest): Promise<ProviderResult> {
    if (!this.isConfigured()) throw new ProviderError('NOT_CONFIGURED', 'OpenAI sozlanmagan', false);
    return this.callImages('/images/generations', {
      model: this.env.OPENAI_IMAGES_MODEL,
      prompt: req.prompt,
      n: Math.min(Math.max(req.count, 1), 4),
      size: pickSize(req.width, req.height),
    });
  }

  async editImage(req: GenerateRequest): Promise<ProviderResult> {
    if (!this.isConfigured()) throw new ProviderError('NOT_CONFIGURED', 'OpenAI sozlanmagan', false);
    if (!req.sourceImage) throw new ProviderError('BAD_REQUEST', 'editImage uchun sourceImage kerak');

    const form = new FormData();
    form.append('model', this.env.OPENAI_IMAGES_MODEL);
    form.append('prompt', req.prompt);
    form.append('n', String(Math.min(Math.max(req.count, 1), 4)));
    form.append('size', pickSize(req.width, req.height));
    form.append(
      'image',
      new Blob([new Uint8Array(req.sourceImage)], { type: req.sourceMime ?? 'image/png' }),
      'product.png',
    );

    const started = Date.now();
    const res = await this.rawFetch('/images/edits', { method: 'POST', body: form });
    const data = await this.parseJson(res);
    const images = (data.data ?? [])
      .map((d: { b64_json?: string; url?: string }) => d.b64_json)
      .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
      .map((b64: string) => Buffer.from(b64, 'base64'));

    if (!images.length) throw new ProviderError('EMPTY_RESULT', 'Model rasm qaytarmadi', true);
    return { images, model: this.env.OPENAI_IMAGES_MODEL, latencyMs: Date.now() - started };
  }

  /** OpenAI'da alohida remove-background endpoint yo'q вЂ” bu imkoniyatni qo'llab-quvvatlamaymiz. */
  async removeBackground(): Promise<ProviderResult> {
    throw new ProviderError('PROVIDER_UNAVAILABLE', 'OpenAI provider removeBackground ni qo\'llab-quvvatlamaydi', false);
  }

  private async callImages(path: string, body: Record<string, unknown>): Promise<ProviderResult> {
    const started = Date.now();
    const res = await this.rawFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await this.parseJson(res);
    const images = (data.data ?? [])
      .map((d: { b64_json?: string; url?: string }) => d.b64_json)
      .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)
      .map((b64: string) => Buffer.from(b64, 'base64'));
    if (!images.length) throw new ProviderError('EMPTY_RESULT', 'Model rasm qaytarmadi', true);
    return { images, model: String(body.model), latencyMs: Date.now() - started };
  }

  private async rawFetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${this.env.OPENAI_BASE_URL}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.env.OPENAI_API_KEY}`, ...(init.headers ?? {}) },
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) throw new ProviderError('UNAUTHORIZED', 'OpenAI kaliti rad etildi');
      if (res.status === 429) throw new ProviderError('RATE_LIMITED', 'OpenAI limiti tugadi', true);
      if (res.status >= 500) throw new ProviderError('PROVIDER_UNAVAILABLE', `OpenAI ${res.status}`, true);
      return res;
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if ((e as Error).name === 'AbortError') throw new ProviderError('TIMEOUT', 'OpenAI javob bermadi', true);
      throw new ProviderError('PROVIDER_UNAVAILABLE', (e as Error).message, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseJson(res: Response): Promise<{ data?: Array<{ b64_json?: string; url?: string }> }> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderError('PROVIDER_UNAVAILABLE', `OpenAI noto'g'ri javob: ${text.slice(0, 200)}`, true);
    }
  }
}
