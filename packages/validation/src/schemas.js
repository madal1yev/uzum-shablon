"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditPackageUpsertSchema = exports.pricingRuleSchema = exports.presetUpsertSchema = exports.adminUserUpdateSchema = exports.telegramLinkRequestSchema = exports.paginationSchema = exports.variationSchema = exports.createJobSchema = exports.imageSpecSchema = exports.colorSchema = exports.dimensionsSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = exports.passwordSchema = exports.emailSchema = exports.localeSchema = exports.LOCALES_DEFAULT_CHECK = void 0;
const zod_1 = require("zod");
const constants_1 = require("./constants");
Object.defineProperty(exports, "LOCALES_DEFAULT_CHECK", { enumerable: true, get: function () { return constants_1.LOCALES_DEFAULT_CHECK; } });
const id = zod_1.z.string().uuid();
exports.localeSchema = zod_1.z.enum(constants_1.SUPPORTED_LOCALES);
exports.emailSchema = zod_1.z.string().trim().toLowerCase().email().max(254);
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Parol kamida 8 ta belgidan iborat bo\'lsin')
    .max(128)
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Parolda harf va raqam bo\'lishi kerak');
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    name: zod_1.z.string().trim().min(2).max(80),
    locale: exports.localeSchema.optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1).max(128),
});
exports.forgotPasswordSchema = zod_1.z.object({ email: exports.emailSchema });
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(10),
    password: exports.passwordSchema,
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(128),
    newPassword: exports.passwordSchema,
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(80).optional(),
    locale: exports.localeSchema.optional(),
});
exports.dimensionsSchema = zod_1.z
    .object({
    width: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minWidth).max(constants_1.IMAGE_LIMITS.maxWidth),
    height: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minHeight).max(constants_1.IMAGE_LIMITS.maxHeight),
})
    .refine((d) => d.width * d.height <= 64_000_000, 'Maydon 64 MP dan oshmasligi kerak');
exports.colorSchema = zod_1.z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Rang #RRGGBB formatida bo\'lishi kerak');
exports.imageSpecSchema = zod_1.z
    .object({
    presetId: id.optional(),
    width: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minWidth).max(constants_1.IMAGE_LIMITS.maxWidth).optional(),
    height: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minHeight).max(constants_1.IMAGE_LIMITS.maxHeight).optional(),
    aspectRatio: zod_1.z
        .string()
        .regex(/^\d+:\d+$/, 'Nisbat N:M formatida')
        .optional(),
    format: zod_1.z.enum(constants_1.IMAGE_FORMATS).default('JPEG'),
    fit: zod_1.z.enum(constants_1.IMAGE_FITS).default('CONTAIN'),
    padding: zod_1.z.number().int().min(0).max(40).default(6),
    background: exports.colorSchema.default('#FFFFFF'),
    stripTransparency: zod_1.z.boolean().optional(),
})
    .superRefine((spec, ctx) => {
    const hasPreset = !!spec.presetId;
    const hasCustom = spec.width !== undefined && spec.height !== undefined;
    if (!hasPreset && !hasCustom) {
        ctx.addIssue({
            code: 'custom',
            path: ['presetId'],
            message: 'presetId yoki width/height dan biri kerak',
        });
    }
    if (hasCustom) {
        const d = exports.dimensionsSchema.safeParse({ width: spec.width, height: spec.height });
        if (!d.success) {
            for (const issue of d.error.issues)
                ctx.addIssue({ ...issue, path: ['width', 'height'] });
        }
    }
});
exports.createJobSchema = zod_1.z.object({
    assetId: id,
    mode: zod_1.z.enum(constants_1.PROCESSING_MODES).default('STANDARD_RESIZE'),
    spec: exports.imageSpecSchema.default({}),
    style: zod_1.z.string().trim().max(60).optional(),
    variations: zod_1.z.number().int().min(1).max(6).default(1),
    text: zod_1.z
        .object({
        title: zod_1.z.string().trim().max(80).optional(),
        subtitle: zod_1.z.string().trim().max(120).optional(),
        badge: zod_1.z.string().trim().max(30).optional(),
        bullets: zod_1.z.array(zod_1.z.string().trim().max(60)).max(5).default([]),
    })
        .optional(),
    idempotencyKey: zod_1.z.string().min(8).max(120).optional(),
});
exports.variationSchema = zod_1.z.object({
    jobId: id,
    variations: zod_1.z.number().int().min(1).max(4).default(1),
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.telegramLinkRequestSchema = zod_1.z.object({
    payload: zod_1.z.string().min(10).max(200),
});
exports.adminUserUpdateSchema = zod_1.z.object({
    role: zod_1.z.enum(['USER', 'ADMIN']).optional(),
    banned: zod_1.z.boolean().optional(),
    credits: zod_1.z.number().int().min(-1_000_000).max(1_000_000).optional(),
    reason: zod_1.z.string().trim().min(3).max(300).optional(),
});
exports.presetUpsertSchema = zod_1.z.object({
    key: zod_1.z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9-]+$/, 'Faqat kichik harf, raqam va tire'),
    nameUz: zod_1.z.string().trim().min(1).max(80),
    nameRu: zod_1.z.string().trim().min(1).max(80),
    nameEn: zod_1.z.string().trim().min(1).max(80),
    width: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minWidth).max(constants_1.IMAGE_LIMITS.maxWidth),
    height: zod_1.z.number().int().min(constants_1.IMAGE_LIMITS.minHeight).max(constants_1.IMAGE_LIMITS.maxHeight),
    active: zod_1.z.boolean().default(true),
});
exports.pricingRuleSchema = zod_1.z.object({
    mode: zod_1.z.enum(constants_1.PROCESSING_MODES),
    cost: zod_1.z.number().int().min(0).max(10_000),
    active: zod_1.z.boolean().default(true),
});
exports.creditPackageUpsertSchema = zod_1.z.object({
    key: zod_1.z.string().trim().min(2).max(40),
    nameUz: zod_1.z.string().trim().min(1).max(80),
    nameRu: zod_1.z.string().trim().min(1).max(80),
    nameEn: zod_1.z.string().trim().min(1).max(80),
    credits: zod_1.z.number().int().min(1).max(1_000_000),
    priceUzs: zod_1.z.number().int().min(0).max(1_000_000_000),
    active: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=schemas.js.map