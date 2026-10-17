"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PREFIX = exports.IMAGE_LIMITS = exports.PAYMENT_PROVIDERS = exports.PAYMENT_STATUSES = exports.SUBSCRIPTION_STATUSES = exports.PROVIDER_OPERATIONS = exports.PROVIDER_KINDS = exports.ASSET_KINDS = exports.CREDIT_TRANSACTION_TYPES = exports.IMAGE_FITS = exports.IMAGE_FORMATS = exports.PROCESSING_MODES = exports.JOB_STATUSES = exports.ROLES = exports.DEFAULT_LOCALE = exports.SUPPORTED_LOCALES = void 0;
exports.SUPPORTED_LOCALES = ['uz', 'ru', 'en'];
exports.DEFAULT_LOCALE = 'uz';
exports.ROLES = ['USER', 'ADMIN'];
exports.JOB_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
exports.PROCESSING_MODES = ['STANDARD_RESIZE', 'PRODUCT_CLEANUP', 'AI_PRODUCT_DESIGN', 'PRODUCT_INFOGRAPHICS'];
exports.IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP'];
exports.IMAGE_FITS = ['CONTAIN', 'COVER'];
exports.CREDIT_TRANSACTION_TYPES = [
    'GRANT',
    'RESERVE',
    'CHARGE',
    'REFUND',
    'ADMIN_ADJUST',
    'EXPIRE',
];
exports.ASSET_KINDS = ['UPLOADED', 'GENERATED'];
exports.PROVIDER_KINDS = ['OPENAI_IMAGES', 'REMOVE_BG', 'CUSTOM_OPENAI'];
exports.PROVIDER_OPERATIONS = ['GENERATE', 'EDIT', 'REMOVE_BACKGROUND'];
exports.SUBSCRIPTION_STATUSES = ['NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED'];
exports.PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'];
exports.PAYMENT_PROVIDERS = ['PAYME', 'CLICK', 'STRIPE', 'MANUAL'];
/** Presetlardagi o'lcham chegaralari (server ham, client ham shuni tekshiradi). */
exports.IMAGE_LIMITS = {
    maxWidth: 12000,
    maxHeight: 12000,
    minWidth: 16,
    minHeight: 16,
    maxUploadBytes: 25 * 1024 * 1024,
};
exports.API_PREFIX = '/api/v1';
//# sourceMappingURL=index.js.map