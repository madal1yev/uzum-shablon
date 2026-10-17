export const SUPPORTED_LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const JOB_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PROCESSING_MODES = ['STANDARD_RESIZE', 'PRODUCT_CLEANUP', 'AI_PRODUCT_DESIGN', 'PRODUCT_INFOGRAPHICS'] as const;
export type ProcessingMode = (typeof PROCESSING_MODES)[number];

export const IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const IMAGE_FITS = ['CONTAIN', 'COVER'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

export const CREDIT_TRANSACTION_TYPES = [
  'GRANT',
  'RESERVE',
  'CHARGE',
  'REFUND',
  'ADMIN_ADJUST',
  'EXPIRE',
] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export const ASSET_KINDS = ['UPLOADED', 'GENERATED'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const PROVIDER_KINDS = ['OPENAI_IMAGES', 'REMOVE_BG', 'CUSTOM_OPENAI'] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export const PROVIDER_OPERATIONS = ['GENERATE', 'EDIT', 'REMOVE_BACKGROUND'] as const;
export type ProviderOperation = (typeof PROVIDER_OPERATIONS)[number];

export const SUBSCRIPTION_STATUSES = ['NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = ['PAYME', 'CLICK', 'STRIPE', 'MANUAL'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** Presetlardagi o'lcham chegaralari (server ham, client ham shuni tekshiradi). */
export const IMAGE_LIMITS = {
  maxWidth: 12000,
  maxHeight: 12000,
  minWidth: 16,
  minHeight: 16,
  maxUploadBytes: 25 * 1024 * 1024,
} as const;

export const API_PREFIX = '/api/v1';

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PresetDto {
  id: string;
  key: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  width: number;
  height: number;
  aspectRatio: string;
  builtin: boolean;
  active: boolean;
}

export interface CreditBalanceDto {
  balance: number;
  reserved: number;
}

export interface JobDto {
  id: string;
  mode: ProcessingMode;
  status: JobStatus;
  presetId: string | null;
  width: number;
  height: number;
  format: ImageFormat;
  fit: ImageFit;
  padding: number;
  background: string;
  style: string | null;
  variations: number;
  progress: number;
  cost: number;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  outputs: AssetDto[];
}

export interface AssetDto {
  id: string;
  kind: AssetKind;
  width: number;
  height: number;
  format: string;
  bytes: number;
  url: string;
  createdAt: string;
}
