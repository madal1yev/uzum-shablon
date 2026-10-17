export declare const SUPPORTED_LOCALES: readonly ["uz", "ru", "en"];
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export declare const DEFAULT_LOCALE: Locale;
export declare const ROLES: readonly ["USER", "ADMIN"];
export type Role = (typeof ROLES)[number];
export declare const JOB_STATUSES: readonly ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];
export type JobStatus = (typeof JOB_STATUSES)[number];
export declare const PROCESSING_MODES: readonly ["STANDARD_RESIZE", "PRODUCT_CLEANUP", "AI_PRODUCT_DESIGN", "PRODUCT_INFOGRAPHICS"];
export type ProcessingMode = (typeof PROCESSING_MODES)[number];
export declare const IMAGE_FORMATS: readonly ["JPEG", "PNG", "WEBP"];
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
export declare const IMAGE_FITS: readonly ["CONTAIN", "COVER"];
export type ImageFit = (typeof IMAGE_FITS)[number];
export declare const CREDIT_TRANSACTION_TYPES: readonly ["GRANT", "RESERVE", "CHARGE", "REFUND", "ADMIN_ADJUST", "EXPIRE"];
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];
export declare const ASSET_KINDS: readonly ["UPLOADED", "GENERATED"];
export type AssetKind = (typeof ASSET_KINDS)[number];
export declare const PROVIDER_KINDS: readonly ["OPENAI_IMAGES", "REMOVE_BG", "CUSTOM_OPENAI"];
export type ProviderKind = (typeof PROVIDER_KINDS)[number];
export declare const PROVIDER_OPERATIONS: readonly ["GENERATE", "EDIT", "REMOVE_BACKGROUND"];
export type ProviderOperation = (typeof PROVIDER_OPERATIONS)[number];
export declare const SUBSCRIPTION_STATUSES: readonly ["NONE", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export declare const PAYMENT_STATUSES: readonly ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export declare const PAYMENT_PROVIDERS: readonly ["PAYME", "CLICK", "STRIPE", "MANUAL"];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
/** Presetlardagi o'lcham chegaralari (server ham, client ham shuni tekshiradi). */
export declare const IMAGE_LIMITS: {
    readonly maxWidth: 12000;
    readonly maxHeight: 12000;
    readonly minWidth: 16;
    readonly minHeight: 16;
    readonly maxUploadBytes: number;
};
export declare const API_PREFIX = "/api/v1";
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
//# sourceMappingURL=index.d.ts.map