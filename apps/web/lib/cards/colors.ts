import { FALLBACK_ACCENT, type Rgb } from "./types";

export type { Rgb };

export const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

export function rgbToHex(c: Rgb): string {
  const h = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return { r: clamp(a.r + (b.r - a.r) * k), g: clamp(a.g + (b.g - a.g) * k), b: clamp(a.b + (b.b - a.b) * k) };
}

export const lighten = (c: Rgb, t: number): Rgb => mix(c, { r: 255, g: 255, b: 255 }, t);
export const darken = (c: Rgb, t: number): Rgb => mix(c, { r: 0, g: 0, b: 0 }, t);

export function css(c: Rgb, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c.r},${c.g},${c.b})` : `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export function luminance(c: Rgb): number {
  const ch = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

export function contrastText(bg: Rgb): Rgb {
  return luminance(bg) > 0.45 ? { r: 20, g: 20, b: 26 } : { r: 255, g: 255, b: 255 };
}

export function complement(c: Rgb): Rgb {
  const [h, s, v] = rgbToHsv(c);
  const nh = (h + 0.5) % 1;
  return hsvToRgb(nh, Math.max(s, 0.45), Math.max(v, 0.55));
}

export function rgbToHsv(c: Rgb): [number, number, number] {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i % 6) {
    case 0:
      r = v; g = t; b = p; break;
    case 1:
      r = q; g = v; b = p; break;
    case 2:
      r = p; g = v; b = t; break;
    case 3:
      r = p; g = q; b = v; break;
    case 4:
      r = t; g = p; b = v; break;
    default:
      r = v; g = p; b = q;
  }
  return { r: clamp(r * 255), g: clamp(g * 255), b: clamp(b * 255) };
}

/** Mahsulot rasmidan dominant (to'yingan) rangni topadi. */
export function dominantColor(image: CanvasImageSource, width: number, height: number): Rgb {
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK_ACCENT;
  ctx.drawImage(image, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return FALLBACK_ACCENT;
  }
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 120) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: Rgb = FALLBACK_ACCENT;
  let bestScore = -1;
  for (const [key, n] of counts) {
    const c: Rgb = { r: ((key >> 8) & 15) * 16, g: ((key >> 4) & 15) * 16, b: (key & 15) * 16 };
    const [, s, v] = rgbToHsv(c);
    if (s < 0.18 || v < 0.15 || v > 0.97) continue;
    const score = n * (0.35 + s);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore < 0 ? FALLBACK_ACCENT : best;
}
