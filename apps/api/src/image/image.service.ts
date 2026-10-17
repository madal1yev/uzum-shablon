import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { ImageFit, ImageFormat } from '@marketpix/shared-types';

export interface RenderSpec {
  width: number;
  height: number;
  format: ImageFormat;
  fit: ImageFit;
  /** 0-40 foiz — mahsulot atrofidagi bo'sh joy */
  padding: number;
  background: string;
}

export interface InfographicText {
  title?: string;
  subtitle?: string;
  badge?: string;
  bullets?: string[];
}

const FORMAT_EXT: Record<ImageFormat, string> = { JPEG: 'jpg', PNG: 'png', WEBP: 'webp' };
const FORMAT_MIME: Record<ImageFormat, string> = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
};

/** Magic bytes orqali haqiqiy formatni aniqlaymiz — foydalanuvchi MIME'iga ishonmaymiz. */
export function sniffImageFormat(buf: Buffer): 'JPEG' | 'PNG' | 'WEBP' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'PNG';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'WEBP';
  }
  return null;
}

export const formatExtension = (f: ImageFormat) => FORMAT_EXT[f];
export const formatMime = (f: ImageFormat) => FORMAT_MIME[f];

/**
 * Deterministik rasm tayyorlash (Sharp).
 * Bu yerda AI ishlatilmaydi — shuning uchun bu operatsiya AI kreditini talab qilmaydi.
 * Metadata (EXIF, GPS) saqlanmaydi.
 */
@Injectable()
export class ImageService {
  async inspect(buf: Buffer): Promise<{ width: number; height: number; format: string; hasAlpha: boolean }> {
    const meta = await sharp(buf, { limitInputPixels: 100_000_000 }).metadata();
    if (!meta.width || !meta.height) throw new Error('UNREADABLE_IMAGE');
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format ?? 'unknown',
      hasAlpha: !!meta.hasAlpha,
    };
  }

  /** Mahsulotni toza fon ustiga markazlab joylashtiradi va kerakli o'lchamga keltiradi. */
  async placeOnCanvas(product: Buffer, spec: RenderSpec): Promise<Buffer> {
    const paddingRatio = Math.min(Math.max(spec.padding, 0), 40) / 100;
    const inset = Math.round(Math.min(spec.width, spec.height) * paddingRatio);

    const canvas = sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 4,
        background: this.parseColor(spec.background),
      },
      limitInputPixels: 100_000_000,
    });

    let placed: sharp.Sharp;
    if (spec.fit === 'COVER') {
      placed = sharp(product, { limitInputPixels: 100_000_000 })
        .resize(spec.width, spec.height, { fit: 'cover', position: 'attention' })
        .flatten({ background: this.parseColor(spec.background) });
      return this.encode(placed, spec);
    }

    const boxW = Math.max(1, spec.width - inset * 2);
    const boxH = Math.max(1, spec.height - inset * 2);
    const resized = await sharp(product, { limitInputPixels: 100_000_000 })
      .resize(boxW, boxH, { fit: 'inside', withoutEnlargement: false })
      .toBuffer();

    placed = canvas.composite([{ input: resized, gravity: 'center' }]);
    return this.encode(placed, spec);
  }

  /** Mahsulotni berilgan fon rasmi bilan birlashtiradi (AI tozalangan natija uchun). */
  async composite(product: Buffer, background: Buffer, spec: RenderSpec): Promise<Buffer> {
    const paddingRatio = Math.min(Math.max(spec.padding, 0), 40) / 100;
    const inset = Math.round(Math.min(spec.width, spec.height) * paddingRatio);
    const boxW = Math.max(1, spec.width - inset * 2);
    const boxH = Math.max(1, spec.height - inset * 2);

    const bg = await sharp(background, { limitInputPixels: 100_000_000 })
      .resize(spec.width, spec.height, { fit: 'cover' })
      .flatten({ background: this.parseColor(spec.background) })
      .toBuffer();
    const fg = await sharp(product, { limitInputPixels: 100_000_000 })
      .resize(boxW, boxH, { fit: 'inside', withoutEnlargement: false })
      .toBuffer();

    const out = sharp(bg).composite([{ input: fg, gravity: 'center' }]);
    return this.encode(out, spec);
  }

  /** Infografika qatlamini shaxmat (SVG) ustidan qo'shadi. Matn AI'ga topshirilmaydi. */
  async applyInfographic(image: Buffer, text: InfographicText, spec: RenderSpec): Promise<Buffer> {
    const svg = this.buildInfographicSvg(text, spec);
    const out = sharp(image).composite([{ input: Buffer.from(svg), gravity: 'south' }]);
    return this.encode(out, spec);
  }

  private buildInfographicSvg(text: InfographicText, spec: RenderSpec): string {
    const W = spec.width;
    const barH = Math.round(Math.min(spec.height * 0.28, 320));
    const titleSize = Math.max(18, Math.round(barH * 0.26));
    const subSize = Math.max(14, Math.round(barH * 0.16));
    const bulletSize = Math.max(12, Math.round(barH * 0.14));
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const bullets = (text.bullets ?? []).filter(Boolean).slice(0, 5);
    const bulletLines = bullets
      .map(
        (b, i) =>
          `<text x="${Math.round(W * 0.06)}" y="${Math.round(barH * 0.62 + i * bulletSize * 1.4)}" font-size="${bulletSize}" fill="#111827" font-family="Segoe UI, Arial, Helvetica, sans-serif">• ${esc(
            b,
          )}</text>`,
      )
      .join('');

    const badge = text.badge
      ? `<rect x="${Math.round(W * 0.06)}" y="8" width="${Math.round(badge.length * subSize * 0.62 + 24)}" height="${Math.round(subSize * 1.5)}" rx="${Math.round(
          subSize * 0.75,
        )}" fill="#4f46e5"/>
         <text x="${Math.round(W * 0.06 + 12)}" y="${Math.round(8 + subSize * 1.08)}" font-size="${Math.round(
           subSize * 0.85,
         )}" fill="#ffffff" font-family="Segoe UI, Arial, Helvetica, sans-serif">${esc(text.badge)}</text>`
      : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${barH}" viewBox="0 0 ${W} ${barH}">
  <rect width="${W}" height="${barH}" fill="#ffffff"/>
  ${badge}
  <text x="${Math.round(W * 0.06)}" y="${Math.round(barH * 0.42)}" font-size="${titleSize}" font-weight="700" fill="#0f172a" font-family="Segoe UI, Arial, Helvetica, sans-serif">${esc(
    (text.title ?? '').slice(0, 80),
  )}</text>
  ${
    text.subtitle
      ? `<text x="${Math.round(W * 0.06)}" y="${Math.round(barH * 0.56)}" font-size="${subSize}" fill="#475569" font-family="Segoe UI, Arial, Helvetica, sans-serif">${esc(
          text.subtitle.slice(0, 120),
        )}</text>`
      : ''
  }
  ${bulletLines}
</svg>`;
  }

  private encode(img: sharp.Sharp, spec: RenderSpec): Promise<Buffer> {
    switch (spec.format) {
      case 'PNG':
        return img.png({ compressionLevel: 9, palette: false }).toBuffer();
      case 'WEBP':
        return img.webp({ quality: 92 }).toBuffer();
      case 'JPEG':
      default:
        return img.flatten({ background: this.parseColor(spec.background) }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    }
  }

  private parseColor(input: string): sharp.RGBA {
    const hex = /^#([0-9a-fA-F]{6})$/.exec(input.trim());
    if (hex) {
      const n = parseInt(hex[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
    }
    return { r: 255, g: 255, b: 255, alpha: 1 };
  }
}
