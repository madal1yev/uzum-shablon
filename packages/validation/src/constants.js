"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTED_EXT = exports.ACCEPTED_MIME = exports.IMAGE_LIMITS = exports.IMAGE_FITS = exports.IMAGE_FORMATS = exports.PROCESSING_MODES = exports.LOCALES_DEFAULT_CHECK = exports.DEFAULT_LOCALE = exports.SUPPORTED_LOCALES = void 0;
exports.SUPPORTED_LOCALES = ['uz', 'ru', 'en'];
exports.DEFAULT_LOCALE = 'uz';
exports.LOCALES_DEFAULT_CHECK = true;
exports.PROCESSING_MODES = [
    'STANDARD_RESIZE',
    'PRODUCT_CLEANUP',
    'AI_PRODUCT_DESIGN',
    'PRODUCT_INFOGRAPHICS',
];
exports.IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP'];
exports.IMAGE_FITS = ['CONTAIN', 'COVER'];
exports.IMAGE_LIMITS = {
    maxWidth: 12000,
    maxHeight: 12000,
    minWidth: 16,
    minHeight: 16,
    maxUploadBytes: 25 * 1024 * 1024,
};
exports.ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
exports.ACCEPTED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
//# sourceMappingURL=constants.js.map