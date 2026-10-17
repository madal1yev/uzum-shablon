import { drawLogo } from "./draw";
import { dominantColor } from "./colors";
import { ensureFonts } from "./fonts";
import { TEMPLATES } from "./templates";
import { TEMPLATE_ORDER, type CardSpec, type ProductAsset, type Rgb, type TemplateKey } from "./types";

const MAX_SIDE = 2400;

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Rasmni ochib bo'lmadi"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(img: HTMLImageElement, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D mavjud emas");
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function trimCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number): HTMLCanvasElement {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")?.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

/** Yuklangan fayldan ProductAsset tayyorlaydi (shaffoflik = cutout). */
export async function prepareAsset(
  file: File,
  opts: { brandColor?: Rgb | null; logo?: CanvasImageSource | null } = {},
): Promise<ProductAsset> {
  const img = await loadImageFromFile(file);
  const { canvas, ctx, w, h } = drawToCanvas(img);
  const data = ctx.getImageData(0, 0, w, h).data;
  let transparent = 0;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 16) transparent++;
    else if (a > 128) opaque++;
  }
  const total = w * h || 1;
  const hasCutout = transparent / total > 0.02 && opaque / total > 0.03;
  const finalCanvas = hasCutout ? trimCanvas(canvas, ctx, w, h) : canvas;
  const dominant = dominantColor(canvas, w, h);
  return {
    image: finalCanvas,
    width: finalCanvas.width,
    height: finalCanvas.height,
    dominant,
    hasCutout,
    logo: opts.logo ?? null,
    brandColor: opts.brandColor ?? null,
  };
}

export async function renderCard(
  asset: ProductAsset,
  spec: CardSpec,
  template: TemplateKey,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D mavjud emas");
  const fn = TEMPLATES[template] ?? TEMPLATES.light_chips;
  fn(ctx, width, height, asset, spec);
  const pad = Math.max(12, Math.min(width, height) * 0.04);
  drawLogo(ctx, asset, width, height, pad);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG yaratilmadi"))),
      "image/jpeg",
      quality,
    );
  });
}

export function fileName(template: TemplateKey, index: number, width: number, height: number): string {
  return `${String(index).padStart(2, "0")}_card_${template}_${width}x${height}.jpg`;
}

export async function renderAllTemplates(
  asset: ProductAsset,
  spec: CardSpec,
  width: number,
  height: number,
): Promise<Array<{ template: TemplateKey; canvas: HTMLCanvasElement; blob: Blob }>> {
  const out: Array<{ template: TemplateKey; canvas: HTMLCanvasElement; blob: Blob }> = [];
  for (const tpl of TEMPLATE_ORDER) {
    const canvas = await renderCard(asset, spec, tpl, width, height);
    out.push({ template: tpl, canvas, blob: await canvasToBlob(canvas) });
  }
  return out;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export { TEMPLATE_ORDER };
