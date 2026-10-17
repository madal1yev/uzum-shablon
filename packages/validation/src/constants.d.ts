export declare const SUPPORTED_LOCALES: readonly ["uz", "ru", "en"];
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export declare const DEFAULT_LOCALE: Locale;
export declare const LOCALES_DEFAULT_CHECK = true;
export declare const PROCESSING_MODES: readonly ["STANDARD_RESIZE", "PRODUCT_CLEANUP", "AI_PRODUCT_DESIGN", "PRODUCT_INFOGRAPHICS"];
export type ProcessingMode = (typeof PROCESSING_MODES)[number];
export declare const IMAGE_FORMATS: readonly ["JPEG", "PNG", "WEBP"];
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
export declare const IMAGE_FITS: readonly ["CONTAIN", "COVER"];
export type ImageFit = (typeof IMAGE_FITS)[number];
export declare const IMAGE_LIMITS: {
    readonly maxWidth: 12000;
    readonly maxHeight: 12000;
    readonly minWidth: 16;
    readonly minHeight: 16;
    readonly maxUploadBytes: number;
};
export declare const ACCEPTED_MIME: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const ACCEPTED_EXT: readonly [".jpg", ".jpeg", ".png", ".webp"];
//# sourceMappingURL=constants.d.ts.map