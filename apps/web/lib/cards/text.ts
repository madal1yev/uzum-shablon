import { fontString } from "./fonts";

export function measure(ctx: CanvasRenderingContext2D, text: string, size: number, weight: 400 | 700 | 800): number {
  ctx.font = fontString(size, weight);
  return ctx.measureText(text).width;
}

/** So'zlarni berilgan kenglikka sig'adigan satrlarga bo'ladi; juda uzun so'zlarni bo'laklaydi. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  size: number,
  weight: 400 | 700 | 800,
): string[] {
  const lines: string[] = [];
  ctx.font = fontString(size, weight);
  for (const raw of (text ?? "").split("\n")) {
    const words = raw.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const word of words) {
      if (ctx.measureText(word).width > maxW) {
        if (cur) {
          lines.push(cur);
          cur = "";
        }
        let piece = "";
        for (const ch of word) {
          if (ctx.measureText(piece + ch).width <= maxW || !piece) piece += ch;
          else {
            lines.push(piece);
            piece = ch;
          }
        }
        cur = piece;
        continue;
      }
      const trial = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(trial).width <= maxW) cur = trial;
      else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

export interface FitResult {
  size: number;
  lines: string[];
  lineHeight: number;
}

export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxH: number,
  startSize: number,
  opts: { minSize?: number; weight?: 400 | 700 | 800; lineSpacing?: number; maxLines?: number } = {},
): FitResult {
  const minSize = opts.minSize ?? 14;
  const weight = opts.weight ?? 700;
  const spacing = opts.lineSpacing ?? 1.14;
  let size = Math.max(minSize, Math.round(startSize));
  const mw = Math.max(10, maxW);
  const mh = Math.max(10, maxH);
  for (;;) {
    let lines = wrapText(ctx, text, mw, size, weight);
    if (opts.maxLines) lines = lines.slice(0, opts.maxLines);
    const lineHeight = Math.max(1, Math.round(size * spacing));
    const widest = Math.max(0, ...lines.map((l) => measure(ctx, l, size, weight)));
    if ((lineHeight * lines.length <= mh && widest <= mw + 1) || size <= minSize) {
      return { size, lines, lineHeight };
    }
    size = Math.max(minSize, Math.round(size * 0.92) - 1);
  }
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lines: string[],
  size: number,
  weight: 400 | 700 | 800,
  color: string,
  lineHeight: number,
  align: "left" | "center" | "right" = "left",
  boxWidth?: number,
): number {
  ctx.font = fontString(size, weight);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  let cx = x;
  if (align === "center" && boxWidth != null) cx = x + boxWidth / 2;
  if (align === "right" && boxWidth != null) cx = x + boxWidth;
  ctx.fillStyle = color;
  for (let i = 0; i < lines.length; i++) {
    const ly = y + i * lineHeight;
    if (align === "left") ctx.fillText(lines[i], cx, ly);
    else if (align === "center") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillText(lines[i], cx, ly);
      ctx.restore();
    } else {
      ctx.save();
      ctx.textAlign = "right";
      ctx.fillText(lines[i], cx, ly);
      ctx.restore();
    }
  }
  return lineHeight * lines.length;
}

export function blockHeight(lines: string[], lineHeight: number): number {
  return lineHeight * Math.max(1, lines.length);
}
