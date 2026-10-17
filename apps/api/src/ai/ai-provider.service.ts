import { Injectable } from '@nestjs/common';
import { loadEnv } from '@marketpix/config';
import { OpenAiImagesProvider } from './openai-images.provider';
import { RemoveBgProvider } from './remove-bg.provider';
import { ProviderError, type ImageGenerationProvider } from './provider.types';

export interface ProviderHealth {
  name: string;
  configured: boolean;
  operations: string[];
  problems: string[];
}

/**
 * Faol provayderni tanlaydi va barcha AI chaqiruvlarini shu yerdan o'tkazadi.
 * Provayder sozlanmagan bo'lsa, sun'iy muvaffaqiyat qaytarmaydi — aniq xato qaytaradi.
 */
@Injectable()
export class AiProviderService {
  private readonly env = loadEnv();
  private readonly openai = new OpenAiImagesProvider();
  private readonly removebg = new RemoveBgProvider();

  current(): ImageGenerationProvider | null {
    switch (this.env.AI_PROVIDER) {
      case 'openai':
        return this.openai;
      case 'removebg':
        return this.removebg;
      default:
        return null;
    }
  }

  require(kind: 'GENERATE' | 'EDIT' | 'REMOVE_BACKGROUND'): ImageGenerationProvider {
    const provider = this.current();
    if (!provider || !provider.isConfigured()) {
      throw new ProviderError(
        'NOT_CONFIGURED',
        'AI provayderi sozlanmagan. .env dagi AI_PROVIDER va kalitlarni tekshiring. Standart o\'lcham hali ham ishlaydi.',
        false,
      );
    }
    const caps = provider.getCapabilities();
    const map = { GENERATE: 'GENERATE', EDIT: 'EDIT', REMOVE_BACKGROUND: 'REMOVE_BACKGROUND' } as const;
    if (!caps.operations.includes(map[kind])) {
      throw new ProviderError(
        'PROVIDER_UNAVAILABLE',
        `${provider.name} provayderi "${kind}" operatsiyasini qo'llab-quvvatlamaydi.`,
        false,
      );
    }
    return provider;
  }

  async health(): Promise<ProviderHealth[]> {
    const all: ImageGenerationProvider[] = [this.openai, this.removebg];
    const out: ProviderHealth[] = [];
    for (const p of all) {
      const configured = p.isConfigured();
      out.push({
        name: p.name,
        configured,
        operations: p.getCapabilities().operations,
        problems: configured ? (await p.validateConfiguration()).problems : ['sozlanmagan'],
      });
    }
    return out;
  }
}
