import { z } from 'zod';
import { LOCALES_DEFAULT_CHECK } from './constants';
export { LOCALES_DEFAULT_CHECK };
export declare const localeSchema: z.ZodEnum<["uz", "ru", "en"]>;
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodEffects<z.ZodString, string, string>;
    name: z.ZodString;
    locale: z.ZodOptional<z.ZodEnum<["uz", "ru", "en"]>>;
}, "strip", z.ZodTypeAny, {
    password: string;
    name: string;
    email: string;
    locale?: "uz" | "ru" | "en" | undefined;
}, {
    password: string;
    name: string;
    email: string;
    locale?: "uz" | "ru" | "en" | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodEnum<["uz", "ru", "en"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    locale?: "uz" | "ru" | "en" | undefined;
}, {
    name?: string | undefined;
    locale?: "uz" | "ru" | "en" | undefined;
}>;
export declare const dimensionsSchema: z.ZodEffects<z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
export declare const colorSchema: z.ZodString;
export declare const imageSpecSchema: z.ZodEffects<z.ZodObject<{
    presetId: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["JPEG", "PNG", "WEBP"]>>;
    fit: z.ZodDefault<z.ZodEnum<["CONTAIN", "COVER"]>>;
    padding: z.ZodDefault<z.ZodNumber>;
    background: z.ZodDefault<z.ZodString>;
    stripTransparency: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    format: "JPEG" | "PNG" | "WEBP";
    fit: "CONTAIN" | "COVER";
    background: string;
    padding: number;
    width?: number | undefined;
    height?: number | undefined;
    presetId?: string | undefined;
    aspectRatio?: string | undefined;
    stripTransparency?: boolean | undefined;
}, {
    width?: number | undefined;
    height?: number | undefined;
    format?: "JPEG" | "PNG" | "WEBP" | undefined;
    fit?: "CONTAIN" | "COVER" | undefined;
    background?: string | undefined;
    presetId?: string | undefined;
    aspectRatio?: string | undefined;
    padding?: number | undefined;
    stripTransparency?: boolean | undefined;
}>, {
    format: "JPEG" | "PNG" | "WEBP";
    fit: "CONTAIN" | "COVER";
    background: string;
    padding: number;
    width?: number | undefined;
    height?: number | undefined;
    presetId?: string | undefined;
    aspectRatio?: string | undefined;
    stripTransparency?: boolean | undefined;
}, {
    width?: number | undefined;
    height?: number | undefined;
    format?: "JPEG" | "PNG" | "WEBP" | undefined;
    fit?: "CONTAIN" | "COVER" | undefined;
    background?: string | undefined;
    presetId?: string | undefined;
    aspectRatio?: string | undefined;
    padding?: number | undefined;
    stripTransparency?: boolean | undefined;
}>;
export declare const createJobSchema: z.ZodObject<{
    assetId: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["STANDARD_RESIZE", "PRODUCT_CLEANUP", "AI_PRODUCT_DESIGN", "PRODUCT_INFOGRAPHICS"]>>;
    spec: z.ZodDefault<z.ZodEffects<z.ZodObject<{
        presetId: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        aspectRatio: z.ZodOptional<z.ZodString>;
        format: z.ZodDefault<z.ZodEnum<["JPEG", "PNG", "WEBP"]>>;
        fit: z.ZodDefault<z.ZodEnum<["CONTAIN", "COVER"]>>;
        padding: z.ZodDefault<z.ZodNumber>;
        background: z.ZodDefault<z.ZodString>;
        stripTransparency: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        format: "JPEG" | "PNG" | "WEBP";
        fit: "CONTAIN" | "COVER";
        background: string;
        padding: number;
        width?: number | undefined;
        height?: number | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        stripTransparency?: boolean | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        format?: "JPEG" | "PNG" | "WEBP" | undefined;
        fit?: "CONTAIN" | "COVER" | undefined;
        background?: string | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        padding?: number | undefined;
        stripTransparency?: boolean | undefined;
    }>, {
        format: "JPEG" | "PNG" | "WEBP";
        fit: "CONTAIN" | "COVER";
        background: string;
        padding: number;
        width?: number | undefined;
        height?: number | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        stripTransparency?: boolean | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        format?: "JPEG" | "PNG" | "WEBP" | undefined;
        fit?: "CONTAIN" | "COVER" | undefined;
        background?: string | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        padding?: number | undefined;
        stripTransparency?: boolean | undefined;
    }>>;
    style: z.ZodOptional<z.ZodString>;
    variations: z.ZodDefault<z.ZodNumber>;
    text: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        badge: z.ZodOptional<z.ZodString>;
        bullets: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        bullets: string[];
        title?: string | undefined;
        subtitle?: string | undefined;
        badge?: string | undefined;
    }, {
        title?: string | undefined;
        subtitle?: string | undefined;
        badge?: string | undefined;
        bullets?: string[] | undefined;
    }>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mode: "STANDARD_RESIZE" | "PRODUCT_CLEANUP" | "AI_PRODUCT_DESIGN" | "PRODUCT_INFOGRAPHICS";
    assetId: string;
    spec: {
        format: "JPEG" | "PNG" | "WEBP";
        fit: "CONTAIN" | "COVER";
        background: string;
        padding: number;
        width?: number | undefined;
        height?: number | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        stripTransparency?: boolean | undefined;
    };
    variations: number;
    idempotencyKey?: string | undefined;
    style?: string | undefined;
    text?: {
        bullets: string[];
        title?: string | undefined;
        subtitle?: string | undefined;
        badge?: string | undefined;
    } | undefined;
}, {
    assetId: string;
    mode?: "STANDARD_RESIZE" | "PRODUCT_CLEANUP" | "AI_PRODUCT_DESIGN" | "PRODUCT_INFOGRAPHICS" | undefined;
    idempotencyKey?: string | undefined;
    spec?: {
        width?: number | undefined;
        height?: number | undefined;
        format?: "JPEG" | "PNG" | "WEBP" | undefined;
        fit?: "CONTAIN" | "COVER" | undefined;
        background?: string | undefined;
        presetId?: string | undefined;
        aspectRatio?: string | undefined;
        padding?: number | undefined;
        stripTransparency?: boolean | undefined;
    } | undefined;
    style?: string | undefined;
    variations?: number | undefined;
    text?: {
        title?: string | undefined;
        subtitle?: string | undefined;
        badge?: string | undefined;
        bullets?: string[] | undefined;
    } | undefined;
}>;
export declare const variationSchema: z.ZodObject<{
    jobId: z.ZodString;
    variations: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    variations: number;
}, {
    jobId: string;
    variations?: number | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const telegramLinkRequestSchema: z.ZodObject<{
    payload: z.ZodString;
}, "strip", z.ZodTypeAny, {
    payload: string;
}, {
    payload: string;
}>;
export declare const adminUserUpdateSchema: z.ZodObject<{
    role: z.ZodOptional<z.ZodEnum<["USER", "ADMIN"]>>;
    banned: z.ZodOptional<z.ZodBoolean>;
    credits: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role?: "USER" | "ADMIN" | undefined;
    banned?: boolean | undefined;
    credits?: number | undefined;
    reason?: string | undefined;
}, {
    role?: "USER" | "ADMIN" | undefined;
    banned?: boolean | undefined;
    credits?: number | undefined;
    reason?: string | undefined;
}>;
export declare const presetUpsertSchema: z.ZodObject<{
    key: z.ZodString;
    nameUz: z.ZodString;
    nameRu: z.ZodString;
    nameEn: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    width: number;
    height: number;
    active: boolean;
    nameUz: string;
    nameRu: string;
    nameEn: string;
}, {
    key: string;
    width: number;
    height: number;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    active?: boolean | undefined;
}>;
export declare const pricingRuleSchema: z.ZodObject<{
    mode: z.ZodEnum<["STANDARD_RESIZE", "PRODUCT_CLEANUP", "AI_PRODUCT_DESIGN", "PRODUCT_INFOGRAPHICS"]>;
    cost: z.ZodNumber;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "STANDARD_RESIZE" | "PRODUCT_CLEANUP" | "AI_PRODUCT_DESIGN" | "PRODUCT_INFOGRAPHICS";
    cost: number;
    active: boolean;
}, {
    mode: "STANDARD_RESIZE" | "PRODUCT_CLEANUP" | "AI_PRODUCT_DESIGN" | "PRODUCT_INFOGRAPHICS";
    cost: number;
    active?: boolean | undefined;
}>;
export declare const creditPackageUpsertSchema: z.ZodObject<{
    key: z.ZodString;
    nameUz: z.ZodString;
    nameRu: z.ZodString;
    nameEn: z.ZodString;
    credits: z.ZodNumber;
    priceUzs: z.ZodNumber;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    active: boolean;
    credits: number;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    priceUzs: number;
}, {
    key: string;
    credits: number;
    nameUz: string;
    nameRu: string;
    nameEn: string;
    priceUzs: number;
    active?: boolean | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ImageSpecInput = z.infer<typeof imageSpecSchema>;
export type PresetUpsertInput = z.infer<typeof presetUpsertSchema>;
//# sourceMappingURL=schemas.d.ts.map