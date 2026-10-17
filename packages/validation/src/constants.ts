export const SUPPORTED_LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';
export const LOCALES_DEFAULT_CHECK = true;

export const PROCESSING_MODES = [
  'STANDARD_RESIZE',
  'PRODUCT_CLEANUP',
  'AI_PRODUCT_DESIGN',
  'PRODUCT_INFOGRAPHICS',
] as const;
export type ProcessingMode = (typeof PROCESSING_MODES)[number];

export const IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const IMAGE_FITS = ['CONTAIN', 'COVER'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

export const IMAGE_LIMITS = {
  maxWidth: 12000,
  maxHeight: 12000,
  minWidth: 16,
  minHeight: 16,
  maxUploadBytes: 25 * 1024 * 1024,
} as const;

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png', '.webp'] as const;
