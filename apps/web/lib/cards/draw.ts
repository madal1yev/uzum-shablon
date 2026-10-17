import { css, lighten, type Rgb } from "./colors";
import { fontString } from "./fonts";
import { measure } from "./text";
import type { ProductAsset } from "./types";

type Ctx = CanvasRenderingContext2D;

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lineWidth: number): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function verticalGradient(ctx: Ctx, w: number, h: number, top: Rgb, bottom: Rgb): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(bottom));
  return g;
}

/** Mahsulot ortidagi radial yorug'lik (glow). */
export function radialGlow(ctx: Ctx, w: number, h: number, color: Rgb, strength = 0.5): void {
  const cx = w / 2;
  const cy = h * 0.48;
  const r = Math.max(w, h) * 0.6;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, css(lighten(color, 0.25), strength));
  g.addColorStop(0.55, css(color, strength * 0.4));
  g.addColorStop(1, css(color, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawCheck(ctx: Ctx, cx: number, cy: number, r: number, circleFill: Rgb, checkFill: Rgb): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = css(circleFill);
  ctx.fill();
  ctx.strokeStyle = css(checkFill);
  ctx.lineWidth = Math.max(2, r * 0.34);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.5, cy - r * 0.42);
  ctx.stroke();
}

export interface PillBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawPill(
  ctx: Ctx,
  x: number,
  y: number,
  text: string,
  opts: {
    size: number;
    bg: Rgb;
    fg: Rgb;
    padx: number;
    pady: number;
    align?: "left" | "center" | "right";
    maxW?: number;
  },
): PillBox {
  let size = opts.size;
  if (opts.maxW) {
    while (measure(ctx, text, size, 700) + 2 * opts.padx > opts.maxW && size > 10) size -= 2;
  }
  ctx.font = fontString(size, 700);
  const tw = ctx.measureText(text).width;
  const th = size * 1.0;
  const pw = tw + 2 * opts.padx;
  const ph = th + 2 * opts.pady;
  const align = opts.align ?? "right";
  let px = x;
  if (align === "right") px = x - pw;
  else if (align === "center") px = x - pw / 2;
  fillRound(ctx, px, y, pw, ph, ph / 2, css(opts.bg));
  ctx.fillStyle = css(opts.fg);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, px + opts.padx, y + ph / 2 + size * 0.06);
  return { x: px, y, w: pw, h: ph };
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawShadowEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.save();
  try {
    ctx.filter = `blur(${Math.max(6, Math.round(rx / 14))}px)`;
  } catch {
    /* filter qo'llab-quvvatlanmasa */
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fill();
  ctx.restore();
}

/** Mahsulotni proporsiyani buzmasdan hududga markazlaydi (+ yumshoq soya). */
export function pasteProduct(ctx: Ctx, asset: ProductAsset, area: Area, scale = 0.86, shadow = true): void {
  if (area.w <= 10 || area.h <= 10 || asset.width < 2 || asset.height < 2) return;
  const ratio = Math.min((area.w * scale) / asset.width, (area.h * scale) / asset.height);
  const dw = Math.max(2, asset.width * ratio);
  const dh = Math.max(2, asset.height * ratio);
  const px = area.x + (area.w - dw) / 2;
  const py = area.y + (area.h - dh) / 2;
  if (shadow && asset.hasCutout) {
    drawShadowEllipse(ctx, px + dw / 2, py + dh - dh * 0.03, dw * 0.46, Math.max(8, dh * 0.055));
  }
  ctx.drawImage(asset.image, px, py, dw, dh);
}

/** Cutout bo'lmasa: yumaloq burchakli karta sifatida joylashtiradi. */
export function drawRoundedCardProduct(ctx: Ctx, asset: ProductAsset, area: Area, bg: Rgb): void {
  const side = Math.max(40, Math.min(area.w, area.h) * 0.9);
  const card = document.createElement("canvas");
  card.width = Math.round(side);
  card.height = Math.round(side);
  const c = card.getContext("2d");
  if (!c) return;
  const radius = side / 10;
  fillRound(c, 0, 0, side, side, radius, css(lighten(bg, 0.9)));
  const inner = side * 0.8;
  const ratio = Math.min(inner / asset.width, inner / asset.height);
  const iw = Math.max(2, asset.width * ratio);
  const ih = Math.max(2, asset.height * ratio);
  c.save();
  roundRectPath(c, radius * 0.4, radius * 0.4, side - radius * 0.8, side - radius * 0.8, radius * 0.7);
  c.clip();
  c.drawImage(asset.image, (side - iw) / 2, (side - ih) / 2, iw, ih);
  c.restore();
  c.save();
  roundRectPath(c, 0, 0, side, side, radius);
  c.strokeStyle = "rgba(0,0,0,0.06)";
  c.lineWidth = Math.max(1, side / 160);
  c.stroke();
  c.restore();
  ctx.drawImage(card, area.x + (area.w - side) / 2, area.y + (area.h - side) / 2, side, side);
}

export function productForArea(ctx: Ctx, asset: ProductAsset, area: Area, fallbackBg: Rgb): void {
  if (asset.hasCutout) pasteProduct(ctx, asset, area, 0.88, true);
  else drawRoundedCardProduct(ctx, asset, area, fallbackBg);
}

/** Brend kit logotipini o'ng pastga joylaydi (ixtiyoriy). */
export function drawLogo(ctx: Ctx, asset: ProductAsset, w: number, h: number, pad: number): void {
  if (!asset.logo) return;
  const logo = asset.logo as HTMLImageElement;
  const lw = (logo as HTMLImageElement).naturalWidth || (logo as HTMLImageElement).width || 1;
  const lh = (logo as HTMLImageElement).naturalHeight || (logo as HTMLImageElement).height || 1;
  const maxH = Math.max(28, h * 0.05);
  const ratio = Math.min(maxH / lh, (w * 0.18) / lw);
  const dw = lw * ratio;
  const dh = lh * ratio;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(asset.logo, w - pad - dw, h - pad - dh, dw, dh);
  ctx.restore();
}
