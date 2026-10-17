"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.loadEnv = loadEnv;
exports.resetEnvCache = resetEnvCache;
exports.externalServiceStatus = externalServiceStatus;
const zod_1 = require("zod");
const num = (def) => zod_1.z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(zod_1.z.number().int().nonnegative());
const bool = (def) => zod_1.z
    .string()
    .optional()
    .transform((v) => {
    if (v === undefined || v.trim() === '')
        return def;
    return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
});
const csv = zod_1.z
    .string()
    .optional()
    .transform((v) => (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean));
/**
 * Server tomonidagi barcha majburiy va ixtiyoriy o'zgaruvchilar.
 * Hech qanday haqiqiy kalitmarni shu faylga yozmang — faqat placeholder'lar.
 */
exports.envSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: num(3001),
    HOST: zod_1.z.string().default('0.0.0.0'),
    PUBLIC_APP_URL: zod_1.z.string().url().default('http://localhost:3000'),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ORIGINS: csv.default([]),
    // ---- PostgreSQL ----
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL majburiy'),
    // ---- Redis ----
    REDIS_URL: zod_1.z.string().default('redis://127.0.0.1:6379'),
    // ---- Auth ----
    JWT_ACCESS_SECRET: zod_1.z.string().min(16, 'JWT_ACCESS_SECRET kamida 16 ta belgi'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16, 'JWT_REFRESH_SECRET kamida 16 ta belgi'),
    JWT_ACCESS_TTL: zod_1.z.string().default('15m'),
    JWT_REFRESH_TTL: zod_1.z.string().default('30d'),
    COOKIE_SECURE: bool(false),
    // ---- Upload / storage ----
    STORAGE_DRIVER: zod_1.z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_DIR: zod_1.z.string().default('./storage'),
    S3_ENDPOINT: zod_1.z.string().optional(),
    S3_REGION: zod_1.z.string().default('us-east-1'),
    S3_BUCKET: zod_1.z.string().optional(),
    S3_ACCESS_KEY_ID: zod_1.z.string().optional(),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    S3_FORCE_PATH_STYLE: bool(true),
    SIGNED_URL_TTL_SECONDS: num(600),
    // ---- AI providers ----
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_IMAGES_MODEL: zod_1.z.string().default('gpt-image-1'),
    OPENAI_BASE_URL: zod_1.z.string().default('https://api.openai.com/v1'),
    REMOVE_BG_API_KEY: zod_1.z.string().optional(),
    REMOVE_BG_BASE_URL: zod_1.z.string().default('https://api.remove.bg/v1.0'),
    AI_PROVIDER: zod_1.z.enum(['openai', 'removebg', 'none']).default('none'),
    // ---- Queue ----
    QUEUE_GENERATION_CONCURRENCY: num(2),
    JOB_TIMEOUT_MS: num(180000),
    JOB_MAX_ATTEMPTS: num(3),
    // ---- Credits ----
    FREE_TRIAL_CREDITS: num(25),
    COST_STANDARD_RESIZE: num(0),
    COST_PRODUCT_CLEANUP: num(1),
    COST_AI_PRODUCT_DESIGN: num(3),
    COST_PRODUCT_INFOGRAPHICS: num(1),
    // ---- Telegram ----
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_WEBHOOK_SECRET: zod_1.z.string().optional(),
    TELEGRAM_LINK_SECRET: zod_1.z.string().optional(),
    // ---- Payments ----
    PAYMENT_PROVIDER: zod_1.z.enum(['none', 'payme', 'click', 'stripe', 'manual']).default('none'),
    PAYME_WEBHOOK_SECRET: zod_1.z.string().optional(),
    CLICK_WEBHOOK_SECRET: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    // ---- Ops ----
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RATE_LIMIT_WINDOW_MS: num(60000),
    RATE_LIMIT_MAX: num(120),
    RETENTION_DAYS: num(30),
})
    .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 's3') {
        if (!env.S3_BUCKET)
            ctx.addIssue({ code: 'custom', path: ['S3_BUCKET'], message: 'S3 rejimida S3_BUCKET kerak' });
        if (!env.S3_ACCESS_KEY_ID)
            ctx.addIssue({ code: 'custom', path: ['S3_ACCESS_KEY_ID'], message: 'S3 rejimida S3_ACCESS_KEY_ID kerak' });
        if (!env.S3_SECRET_ACCESS_KEY)
            ctx.addIssue({ code: 'custom', path: ['S3_SECRET_ACCESS_KEY'], message: 'S3 rejimida S3_SECRET_ACCESS_KEY kerak' });
    }
});
let cached = null;
/** Environmentni bir marta tekshiradi va keshlaydi. Xato bo'lsa aniq ro'yxat qaytaradi. */
function loadEnv(source = process.env) {
    if (cached)
        return cached;
    const parsed = exports.envSchema.safeParse(source);
    if (!parsed.success) {
        const details = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment configuration:\n${details}`);
    }
    cached = parsed.data;
    return cached;
}
function resetEnvCache() {
    cached = null;
}
/** Tashqi xizmatlar sozlamalari haqida aniq, yolg'on bo'lmagan hisobot. */
function externalServiceStatus(env = loadEnv()) {
    return {
        database: { configured: !!env.DATABASE_URL, required: true },
        redis: { configured: !!env.REDIS_URL, required: true },
        storage: {
            configured: env.STORAGE_DRIVER === 's3' ? !!env.S3_BUCKET : true,
            driver: env.STORAGE_DRIVER,
            required: true,
        },
        ai: {
            configured: env.AI_PROVIDER !== 'none' && (!!env.OPENAI_API_KEY || !!env.REMOVE_BG_API_KEY),
            provider: env.AI_PROVIDER,
            required: false,
            note: env.AI_PROVIDER === 'none'
                ? 'AI integratsiyasi sozlanmagan: standart resize va format konversiyasi ishlaydi, AI rejimlari xato ko\'rsatadi.'
                : undefined,
        },
        telegram: {
            configured: !!env.TELEGRAM_BOT_TOKEN,
            required: false,
            note: env.TELEGRAM_BOT_TOKEN ? undefined : 'TELEGRAM_BOT_TOKEN yo\'q: bot kanali o\'chirilgan.',
        },
        payments: {
            configured: env.PAYMENT_PROVIDER !== 'none',
            provider: env.PAYMENT_PROVIDER,
            required: false,
            note: env.PAYMENT_PROVIDER === 'none' ? 'To\'lov integratsiyasi o\'rnatilmagan.' : undefined,
        },
    };
}
//# sourceMappingURL=index.js.map