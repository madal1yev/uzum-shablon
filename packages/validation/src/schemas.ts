import { z } from 'zod';
import {
  IMAGE_FORMATS,
  IMAGE_FITS,
  IMAGE_LIMITS,
  LOCALES_DEFAULT_CHECK,
  PROCESSING_MODES,
  SUPPORTED_LOCALES,
} from './constants';

export { LOCALES_DEFAULT_CHECK };

const id = z.string().uuid();

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Parol kamida 8 ta belgidan iborat bo\'lsin')
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Parolda harf va raqam bo\'lishi kerak');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(80),
  locale: localeSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  locale: localeSchema.optional(),
});

export const dimensionsSchema = z
  .object({
    width: z.number().int().min(IMAGE_LIMITS.minWidth).max(IMAGE_LIMITS.maxWidth),
    height: z.number().int().min(IMAGE_LIMITS.minHeight).max(IMAGE_LIMITS.maxHeight),
  })
  .refine((d) => d.width * d.height <= 64_000_000, 'Maydon 64 MP dan oshmasligi kerak');

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Rang #RRGGBB formatida bo\'lishi kerak');

export const imageSpecSchema = z
  .object({
    presetId: id.optional(),
    width: z.number().int().min(IMAGE_LIMITS.minWidth).max(IMAGE_LIMITS.maxWidth).optional(),
    height: z.number().int().min(IMAGE_LIMITS.minHeight).max(IMAGE_LIMITS.maxHeight).optional(),
    aspectRatio: z
      .string()
      .regex(/^\d+:\d+$/, 'Nisbat N:M formatida')
      .optional(),
    format: z.enum(IMAGE_FORMATS).default('JPEG'),
    fit: z.enum(IMAGE_FITS).default('CONTAIN'),
    padding: z.number().int().min(0).max(40).default(6),
    background: colorSchema.default('#FFFFFF'),
    stripTransparency: z.boolean().optional(),
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
      const d = dimensionsSchema.safeParse({ width: spec.width, height: spec.height });
      if (!d.success) {
        for (const issue of d.error.issues) ctx.addIssue({ ...issue, path: ['width', 'height'] });
      }
    }
  });

export const createJobSchema = z.object({
  assetId: id,
  mode: z.enum(PROCESSING_MODES).default('STANDARD_RESIZE'),
  spec: imageSpecSchema.default({}),
  style: z.string().trim().max(60).optional(),
  variations: z.number().int().min(1).max(6).default(1),
  text: z
    .object({
      title: z.string().trim().max(80).optional(),
      subtitle: z.string().trim().max(120).optional(),
      badge: z.string().trim().max(30).optional(),
      bullets: z.array(z.string().trim().max(60)).max(5).default([]),
    })
    .optional(),
  idempotencyKey: z.string().min(8).max(120).optional(),
});

export const variationSchema = z.object({
  jobId: id,
  variations: z.number().int().min(1).max(4).default(1),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const telegramLinkRequestSchema = z.object({
  payload: z.string().min(10).max(200),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  banned: z.boolean().optional(),
  credits: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  reason: z.string().trim().min(3).max(300).optional(),
});

export const presetUpsertSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Faqat kichik harf, raqam va tire'),
  nameUz: z.string().trim().min(1).max(80),
  nameRu: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  width: z.number().int().min(IMAGE_LIMITS.minWidth).max(IMAGE_LIMITS.maxWidth),
  height: z.number().int().min(IMAGE_LIMITS.minHeight).max(IMAGE_LIMITS.maxHeight),
  active: z.boolean().default(true),
});

export const pricingRuleSchema = z.object({
  mode: z.enum(PROCESSING_MODES),
  cost: z.number().int().min(0).max(10_000),
  active: z.boolean().default(true),
});

export const creditPackageUpsertSchema = z.object({
  key: z.string().trim().min(2).max(40),
  nameUz: z.string().trim().min(1).max(80),
  nameRu: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  credits: z.number().int().min(1).max(1_000_000),
  priceUzs: z.number().int().min(0).max(1_000_000_000),
  active: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ImageSpecInput = z.infer<typeof imageSpecSchema>;
export type PresetUpsertInput = z.infer<typeof presetUpsertSchema>;
