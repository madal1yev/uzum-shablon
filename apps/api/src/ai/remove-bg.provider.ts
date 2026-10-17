import { loadEnv } from '@marketpix/config';
import {
  ProviderError,
  type GenerateRequest,
  type ImageGenerationProvider,
  type ProviderCapabilities,
  type ProviderResult,
} from './provider.types';

/**
 * remove.bg integratsiyasi (rasmiy API).
 * Dokumentatsiya: remove.bg/docs/api
 * Javob — shaffof fonli PNG binary.
 */
export class RemoveBgProvider implements ImageGenerationProvider {
  readonly name = 'removebg';
  private readonly env = loadEnv();

  isConfigured(): boolean {
    return !!this.env.REMOVE_BG_API_KEY && this.env.AI_PROVIDER === 'removebg';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      operations: ['REMOVE_BACKGROUND'],
      maxOutputSize: { width: 4096, height: 4096 },
      supportedFormats: ['PNG'],
      supportsTransparency: true,
    };
  }

  async validateConfiguration(): Promise<{ ok: boolean; problems: string[] }> {
    const problems: string[] = [];
    if (this.env.AI_PROVIDER !== 'removebg') problems.push('AI_PROVIDER removebg emas');
    if (!this.env.REMOVE_BG_API_KEY) problems.push("REMOVE_BG_API_KEY bo'sh");
    return { ok: problems.length === 0, problems };
  }

  async generateImage(): Promise<ProviderResult> {
    throw new ProviderError('PROVIDER_UNAVAILABLE', "remove.bg generatsiya qilmaydi", false);
  }

  async editImage(): Promise<ProviderResult> {
    throw new ProviderError('PROVIDER_UNAVAILABLE', "remove.bg edit qilmaydi", false);
  }

  async removeBackground(image: Buffer, mime: string): Promise<ProviderResult> {
    if (!this.isConfigured()) throw new ProviderError('NOT_CONFIGURED', "remove.bg sozlanmagan", false);

    const started = Date.now();
    const form = new FormData();
    form.append('image_file', new Blob([new Uint8Array(image)], { type: mime }), 'product');
    form.append('size', 'auto');
    form.append('format', 'png');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${this.env.REMOVE_BG_BASE_URL}/removebg`, {
        method: 'POST',
        headers: { 'X-Api-Key': this.env.REMOVE_BG_API_KEY ?? '' },
        body: form,
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) throw new ProviderError('UNAUTHORIZED', 'remove.bg kaliti rad etildi');
      if (res.status === 429) throw new ProviderError('RATE_LIMITED', 'remove.bg limiti tugadi', true);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError('PROVIDER_UNAVAILABLE', `remove.bg ${res.status}: ${text.slice(0, 200)}`, true);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new ProviderError('EMPTY_RESULT', 'remove.bg bo\'sh javob qaytardi', true);
      return { images: [buf], model: 'removebg', latencyMs: Date.now() - started };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if ((e as Error).name === 'AbortError') throw new ProviderError('TIMEOUT', 'remove.bg javob bermadi', true);
      throw new ProviderError('PROVIDER_UNAVAILABLE', (e as Error).message, true);
    } finally {
      clearTimeout(timer);
    }
  }
}
