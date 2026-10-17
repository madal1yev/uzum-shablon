export type ProviderOperationKind = 'GENERATE' | 'EDIT' | 'REMOVE_BACKGROUND';

export interface ProviderCapabilities {
  operations: ProviderOperationKind[];
  /** Modeldan olinadigan maksimal natija o'lchami (model cheklovi, biz emas). */
  maxOutputSize: { width: number; height: number };
  supportedFormats: ('PNG' | 'JPEG' | 'WEBP')[];
  /** Model shaffof fon qaytara oladimi */
  supportsTransparency: boolean;
}

export interface GenerateRequest {
  prompt: string;
  sourceImage?: Buffer;
  sourceMime?: string;
  width: number;
  height: number;
  count: number;
  seed?: number;
}

export interface ProviderResult {
  images: Buffer[];
  model: string;
  latencyMs: number;
}

export type ProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'PROVIDER_UNAVAILABLE'
  | 'EMPTY_RESULT';

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * AI provayder uchun umumiy kontrakt.
 * Yangi provayder qo'shish uchun shu interfejsni bajaring — ilova kodini o'zgartirish shart emas.
 */
export interface ImageGenerationProvider {
  readonly name: string;
  isConfigured(): boolean;
  getCapabilities(): ProviderCapabilities;
  validateConfiguration(): Promise<{ ok: boolean; problems: string[] }>;
  generateImage(req: GenerateRequest): Promise<ProviderResult>;
  editImage(req: GenerateRequest): Promise<ProviderResult>;
  removeBackground(image: Buffer, mime: string): Promise<ProviderResult>;
}
