import { complement, contrastText, css, darken, lighten, luminance, mix, type Rgb } from "./colors";
import { drawCheck, drawPill, fillRound, productForArea, radialGlow, strokeRound, verticalGradient, type Area } from "./draw";
import { fontString } from "./fonts";
import { blockHeight, drawLines, fitText, measure } from "./text";
import type { CardSpec, Feature, ProductAsset, TemplateKey } from "./types";

type Ctx = CanvasRenderingContext2D;

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const INK: Rgb = { r: 18, g: 19, b: 24 };

function accent(asset: ProductAsset): Rgb {
  return asset.brandColor ?? asset.dominant;
}

function featsOf(spec: CardSpec, max = 4): Feature[] {
  return spec.features.filter((f) => (f.title ?? "").trim() || (f.text ?? "").trim()).slice(0, max);
}

function numberCard(
  ctx: Ctx,
  x: number,
  y: number,
  cw: number,
  ch: number,
  num: number,
  f: Feature,
  u: number,
  dom: Rgb,
): void {
  fillRound(ctx, x, y, cw, ch, u * 0.03, css(WHITE));
  const numR = Math.max(10, Math.min(cw, ch) * 0.16);
  const ncx = x + numR + cw * 0.06;
  const ncy = y + ch / 2;
  ctx.beginPath();
  ctx.arc(ncx, ncy, numR, 0, Math.PI * 2);
  ctx.fillStyle = css(dom);
  ctx.fill();
  ctx.fillStyle = css(contrastText(dom));
  ctx.font = fontString(numR * 1.25, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), ncx, ncy + numR * 0.05);
  const tx = ncx + numR + cw * 0.05;
  const avail = x + cw - tx - cw * 0.05;
  const ft = fitText(ctx, f.title, avail, ch * 0.42, u * 0.03, { minSize: u * 0.016, maxLines: 2 });
  const fx = fitText(ctx, f.text, avail, ch * 0.4, u * 0.024, { minSize: u * 0.014, weight: 400, maxLines: 3 });
  const th = blockHeight(ft.lines, ft.lineHeight);
  const xh = blockHeight(fx.lines, fx.lineHeight);
  let yy = y + Math.max(u * 0.01, (ch - (th + xh + u * 0.006)) / 2);
  yy += drawLines(ctx, tx, yy, ft.lines, ft.size, 700, css({ r: 22, g: 23, b: 28 }), ft.lineHeight);
  yy += u * 0.006;
  drawLines(ctx, tx, yy, fx.lines, fx.size, 400, css({ r: 100, g: 105, b: 118 }), fx.lineHeight);
}

// ---------------------------------------------------------------------------
// 1) light_chips
// ---------------------------------------------------------------------------
export function renderLightChips(ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec): void {
  const dom = accent(asset);
  const u = Math.min(w, h);
  const pad = Math.max(16, u * 0.055);
  ctx.fillStyle = verticalGradient(ctx, w, h, { r: 252, g: 252, b: 254 }, lighten(dom, 0.88));
  ctx.fillRect(0, 0, w, h);

  const headerW = (w - 2 * pad) * (spec.badge ? 0.55 : 0.95);
  const ft = fitText(ctx, spec.title, headerW, u * 0.22, u * 0.072, { minSize: u * 0.032 });
  let y = pad;
  y += drawLines(ctx, pad, y, ft.lines, ft.size, 700, css(INK), ft.lineHeight);
  const fs = fitText(ctx, spec.subtitle, headerW, u * 0.1, u * 0.036, { minSize: u * 0.02, weight: 400 });
  y += Math.max(4, u * 0.012);
  y += drawLines(ctx, pad, y, fs.lines, fs.size, 400, css({ r: 92, g: 98, b: 110 }), fs.lineHeight);
  if (spec.badge) {
    drawPill(ctx, w - pad, pad, spec.badge.toUpperCase(), {
      size: u * 0.034, bg: dom, fg: contrastText(dom), padx: u * 0.03, pady: u * 0.016, align: "right", maxW: w * 0.34,
    });
  }

  const panelH = Math.max(u * 0.3, Math.min(h * 0.3, u * 0.42));
  const panelTop = h - pad - panelH;
  fillRound(ctx, pad, panelTop, w - 2 * pad, panelH, u * 0.045, css(WHITE));

  const feats = featsOf(spec, 4);
  const inner = u * 0.035;
  const cellW = (w - 2 * pad - 2 * inner) / 2;
  const cellH = (panelH - 2 * inner) / 2;
  feats.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx0 = pad + inner + col * cellW;
    const cy0 = panelTop + inner + row * cellH;
    const cr = Math.max(8, u * 0.022);
    drawCheck(ctx, cx0 + cr, cy0 + cr + 2, cr, dom, contrastText(dom));
    const tx = cx0 + 2 * cr + Math.max(8, u * 0.018);
    const avail = cellW - (tx - cx0) - u * 0.012;
    let yy = cy0;
    const t = fitText(ctx, f.title, avail, cellH * 0.4, u * 0.03, { minSize: u * 0.018, maxLines: 2 });
    yy += drawLines(ctx, tx, yy, t.lines, t.size, 700, css({ r: 24, g: 25, b: 30 }), t.lineHeight);
    const d = fitText(ctx, f.text, avail, cellH * 0.5, u * 0.025, { minSize: u * 0.015, weight: 400, maxLines: 3 });
    yy += Math.max(2, u * 0.006);
    drawLines(ctx, tx, yy, d.lines, d.size, 400, css({ r: 105, g: 110, b: 122 }), d.lineHeight);
  });

  const area: Area = { x: pad, y: y + u * 0.02, w: w - 2 * pad, h: panelTop - (y + u * 0.02) };
  productForArea(ctx, asset, area, lighten(dom, 0.85));
}

// ---------------------------------------------------------------------------
// 2) dark_premium
// ---------------------------------------------------------------------------
export function renderDarkPremium(ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec): void {
  const dom = accent(asset);
  const u = Math.min(w, h);
  const pad = Math.max(16, u * 0.055);
  ctx.fillStyle = verticalGradient(ctx, w, h, { r: 9, g: 9, b: 14 }, { r: 24, g: 24, b: 36 });
  ctx.fillRect(0, 0, w, h);
  radialGlow(ctx, w, h, lighten(dom, 0.25), 0.42);

  const ft = fitText(ctx, spec.title, w * 0.84, u * 0.2, u * 0.075, { minSize: u * 0.03 });
  let y = pad;
  y += drawLines(ctx, pad, y, ft.lines, ft.size, 700, css(WHITE), ft.lineHeight, "center", w - 2 * pad);
  if (spec.subtitle) {
    const fs = fitText(ctx, spec.subtitle, w * 0.8, u * 0.09, u * 0.034, { minSize: u * 0.02, weight: 400 });
    y += Math.max(4, u * 0.014);
    y += drawLines(ctx, pad, y, fs.lines, fs.size, 400, css({ r: 176, g: 182, b: 196 }), fs.lineHeight, "center", w - 2 * pad);
  }
  if (spec.badge) {
    drawPill(ctx, w - pad, pad, spec.badge.toUpperCase(), {
      size: u * 0.032, bg: dom, fg: contrastText(dom), padx: u * 0.028, pady: u * 0.015, align: "right", maxW: w * 0.32,
    });
  }

  const panelH = Math.max(u * 0.3, Math.min(h * 0.3, u * 0.4));
  const panelTop = h - pad - panelH;
  const inner = u * 0.03;
  const gap = u * 0.022;
  const cellW = (w - 2 * pad - 2 * inner - gap) / 2;
  const cellH = (panelH - 2 * inner - gap) / 2;
  const feats = featsOf(spec, 4);
  feats.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx0 = pad + inner + col * (cellW + gap);
    const cy0 = panelTop + inner + row * (cellH + gap);
    fillRound(ctx, cx0, cy0, cellW, cellH, u * 0.028, "rgba(255,255,255,0.07)");
    strokeRound(ctx, cx0, cy0, cellW, cellH, u * 0.028, "rgba(255,255,255,0.22)", Math.max(1, u / 400));
    const ix = cx0 + cellW * 0.08;
    const avail = cellW * 0.84;
    let yy = cy0 + cellH * 0.1;
    const dotR = Math.max(4, u * 0.012);
    ctx.beginPath();
    ctx.arc(ix + dotR, yy + u * 0.008 + dotR, dotR, 0, Math.PI * 2);
    ctx.fillStyle = css(dom);
    ctx.fill();
    yy += 2 * dotR + u * 0.014;
    const t = fitText(ctx, f.title, avail, cellH * 0.34, u * 0.028, { minSize: u * 0.016, maxLines: 2 });
    yy += drawLines(ctx, ix, yy, t.lines, t.size, 700, css(WHITE), t.lineHeight);
    const d = fitText(ctx, f.text, avail, cellH * 0.42, u * 0.023, { minSize: u * 0.014, weight: 400, maxLines: 3 });
    yy += Math.max(2, u * 0.005);
    drawLines(ctx, ix, yy, d.lines, d.size, 400, css({ r: 168, g: 174, b: 188 }), d.lineHeight);
  });

  const area: Area = { x: pad + u * 0.02, y: y + u * 0.015, w: w - 2 * pad - u * 0.04, h: panelTop - (y + u * 0.03) };
  productForArea(ctx, asset, area, { r: 14, g: 14, b: 20 });
}

// ---------------------------------------------------------------------------
// 3) color_bold
// ---------------------------------------------------------------------------
export function renderColorBold(ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec): void {
  const dom = accent(asset);
  const u = Math.min(w, h);
  const pad = Math.max(16, u * 0.055);
  const tc = contrastText(dom);
  ctx.fillStyle = verticalGradient(ctx, w, h, dom, darken(dom, 0.28));
  ctx.fillRect(0, 0, w, h);

  const circleR = u * 0.44;
  ctx.beginPath();
  ctx.arc(w * 0.62, h * 0.52, circleR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();

  const title = (spec.title || "").toUpperCase();
  const ft = fitText(ctx, title, w * 0.9, u * 0.16, u * 0.085, { minSize: u * 0.034, maxLines: 2 });
  let y = pad;
  y += drawLines(ctx, pad, y, ft.lines, ft.size, 700, css(tc), ft.lineHeight);
  if (spec.subtitle) {
    const fs = fitText(ctx, spec.subtitle, w * 0.7, u * 0.08, u * 0.032, { minSize: u * 0.018, weight: 400, maxLines: 2 });
    y += Math.max(4, u * 0.01);
    y += drawLines(ctx, pad, y, fs.lines, fs.size, 400, css(mix(tc, dom, 0.3)), fs.lineHeight);
  }
  if (spec.badge) {
    drawPill(ctx, w - pad, pad, spec.badge.toUpperCase(), {
      size: u * 0.03, bg: WHITE, fg: dom, padx: u * 0.026, pady: u * 0.014, align: "right", maxW: w * 0.3,
    });
  }

  const feats = featsOf(spec, 3);
  const tall = h >= w * 1.12;
  const n = Math.max(1, feats.length);
  if (tall) {
    const area: Area = { x: pad, y: y + u * 0.02, w: w - 2 * pad, h: h * 0.58 - (y + u * 0.02) };
    productForArea(ctx, asset, area, dom);
    const cardTop = h * 0.6;
    const gap = u * 0.022;
    const ch = (h - pad - cardTop - gap * (n - 1)) / n;
    const cw = w - 2 * pad;
    feats.forEach((f, i) => numberCard(ctx, pad, cardTop + i * (ch + gap), cw, ch, i + 1, f, u, dom));
  } else {
    const colW = w * 0.46;
    const cardTop = y + u * 0.03;
    const gap = u * 0.02;
    const ch = (h - pad - cardTop - gap * (n - 1)) / n;
    feats.forEach((f, i) => numberCard(ctx, pad, cardTop + i * (ch + gap), colW, ch, i + 1, f, u, dom));
    const area: Area = { x: pad + colW + u * 0.02, y: cardTop, w: w - pad - (pad + colW + u * 0.02), h: h - pad - cardTop };
    productForArea(ctx, asset, area, dom);
  }
}

// ---------------------------------------------------------------------------
// 4) stats_side
// ---------------------------------------------------------------------------
export function renderStatsSide(ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec): void {
  const dom = accent(asset);
  const u = Math.min(w, h);
  const pad = Math.max(16, u * 0.055);
  ctx.fillStyle = verticalGradient(ctx, w, h, { r: 250, g: 250, b: 252 }, lighten(dom, 0.82));
  ctx.fillRect(0, 0, w, h);

  const headerW = (w - 2 * pad) * (spec.badge ? 0.55 : 0.95);
  const ft = fitText(ctx, spec.title, headerW, u * 0.16, u * 0.062, { minSize: u * 0.03, maxLines: 2 });
  let y = pad;
  y += drawLines(ctx, pad, y, ft.lines, ft.size, 700, css(INK), ft.lineHeight);
  if (spec.subtitle) {
    const fs = fitText(ctx, spec.subtitle, headerW, u * 0.08, u * 0.032, { minSize: u * 0.018, weight: 400, maxLines: 2 });
    y += Math.max(3, u * 0.01);
    y += drawLines(ctx, pad, y, fs.lines, fs.size, 400, css({ r: 96, g: 101, b: 112 }), fs.lineHeight);
  }
  if (spec.badge) {
    drawPill(ctx, w - pad, pad, spec.badge.toUpperCase(), {
      size: u * 0.03, bg: dom, fg: contrastText(dom), padx: u * 0.026, pady: u * 0.014, align: "right", maxW: w * 0.3,
    });
  }

  const colW = w * 0.42;
  const blocksTop = y + u * 0.035;
  const bottomBarH = u * 0.075;
  const blocksBottom = h - pad - bottomBarH - u * 0.03;
  const gap = u * 0.022;

  const stats = spec.stats.slice(0, 4);
  const useStats = stats.length > 0;
  const items: Array<{ a: string; b: string }> = useStats
    ? stats.map((s) => ({ a: s.value, b: s.label }))
    : featsOf(spec, 4).map((f) => ({ a: f.title, b: f.text }));
  const n = Math.max(1, items.length);
  let blockH = (blocksBottom - blocksTop - gap * (n - 1)) / n;
  blockH = Math.max(u * 0.1, blockH);

  items.forEach((it, i) => {
    const by0 = blocksTop + i * (blockH + gap);
    fillRound(ctx, pad, by0, colW, blockH, u * 0.028, css({ r: 20, g: 21, b: 26 }));
    const ix = pad + colW * 0.08;
    const avail = colW * 0.84;
    if (useStats) {
      const fv = fitText(ctx, it.a, avail, blockH * 0.55, u * 0.052, { minSize: u * 0.024, maxLines: 1 });
      let yy = by0 + blockH * 0.16;
      yy += drawLines(ctx, ix, yy, fv.lines, fv.size, 700, css(WHITE), fv.lineHeight);
      if (it.b) {
        const fl = fitText(ctx, it.b, avail, blockH * 0.3, u * 0.024, { minSize: u * 0.014, weight: 400, maxLines: 2 });
        yy += Math.max(2, u * 0.005);
        drawLines(ctx, ix, yy, fl.lines, fl.size, 400, css({ r: 158, g: 163, b: 175 }), fl.lineHeight);
      }
    } else {
      const ftv = fitText(ctx, it.a, avail, blockH * 0.4, u * 0.028, { minSize: u * 0.016, maxLines: 2 });
      let yy = by0 + blockH * 0.14;
      yy += drawLines(ctx, ix, yy, ftv.lines, ftv.size, 700, css(WHITE), ftv.lineHeight);
      if (it.b) {
        const fx = fitText(ctx, it.b, avail, blockH * 0.45, u * 0.022, { minSize: u * 0.013, weight: 400, maxLines: 3 });
        yy += Math.max(2, u * 0.005);
        drawLines(ctx, ix, yy, fx.lines, fx.size, 400, css({ r: 158, g: 163, b: 175 }), fx.lineHeight);
      }
    }
  });

  const area: Area = { x: pad + colW + u * 0.03, y: blocksTop, w: w - pad - (pad + colW + u * 0.03), h: blocksBottom - blocksTop };
  productForArea(ctx, asset, area, lighten(dom, 0.8));

  const by0 = h - pad - bottomBarH;
  fillRound(ctx, pad, by0, w - 2 * pad, bottomBarH, bottomBarH / 2, css(dom));
  const bt = spec.badge || spec.subtitle || spec.title;
  let bs = u * 0.032;
  while (measure(ctx, bt, bs, 700) > w - 2 * pad - u * 0.1 && bs > 12) bs -= 2;
  ctx.font = fontString(bs, 700);
  ctx.fillStyle = css(contrastText(dom));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bt, w / 2, by0 + bottomBarH / 2 + bs * 0.05);
}

// ---------------------------------------------------------------------------
// 5) ribbon_badge
// ---------------------------------------------------------------------------
export function renderRibbonBadge(ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec): void {
  const dom = accent(asset);
  const comp = complement(dom);
  const u = Math.min(w, h);
  const pad = Math.max(16, u * 0.05);
  const warmTop = mix(lighten(comp, 0.85), WHITE, 0.5);
  ctx.fillStyle = verticalGradient(ctx, w, h, warmTop, lighten(comp, 0.65));
  ctx.fillRect(0, 0, w, h);

  const bandH = Math.max(u * 0.13, h * 0.11);
  const tailH = bandH * 0.35;
  const tailW = w * 0.08;
  ctx.fillStyle = css(dom);
  ctx.fillRect(0, 0, w, bandH);
  ctx.fillStyle = css(darken(dom, 0.25));
  ctx.beginPath();
  ctx.moveTo(0, bandH);
  ctx.lineTo(0, bandH + tailH);
  ctx.lineTo(tailW, bandH + tailH);
  ctx.lineTo(tailW, bandH);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, bandH);
  ctx.lineTo(w, bandH + tailH);
  ctx.lineTo(w - tailW, bandH + tailH);
  ctx.lineTo(w - tailW, bandH);
  ctx.closePath();
  ctx.fill();

  const ft = fitText(ctx, spec.title, w * 0.84, bandH * 0.82, u * 0.062, { minSize: u * 0.028, maxLines: 2 });
  const total = blockHeight(ft.lines, ft.lineHeight);
  drawLines(ctx, 0, (bandH - total) / 2, ft.lines, ft.size, 700, css(contrastText(dom)), ft.lineHeight, "center", w);

  const subH = Math.max(u * 0.075, h * 0.055);
  const subTop = bandH + tailH;
  fillRound(ctx, w * 0.06, subTop, w * 0.88, subH, subH / 2, css(WHITE));
  const fs = fitText(ctx, spec.subtitle, w * 0.8, subH * 0.8, u * 0.032, { minSize: u * 0.018, weight: 400, maxLines: 1 });
  const fst = blockHeight(fs.lines, fs.lineHeight);
  drawLines(ctx, 0, subTop + (subH - fst) / 2, fs.lines, fs.size, 400, css({ r: 40, g: 42, b: 50 }), fs.lineHeight, "center", w);

  const feats = featsOf(spec, 2);
  const stripH = Math.max(u * 0.075, h * 0.05);
  const stripGap = u * 0.018;
  const totalStrips = feats.length * stripH + Math.max(0, feats.length - 1) * stripGap;

  const yBodyTop = subTop + subH + u * 0.04;
  const yBodyBottom = h - pad - totalStrips - u * 0.025;
  const badgeR = u * 0.19;
  const bcx = w * 0.26;
  const bcy = yBodyTop + Math.min((yBodyBottom - yBodyTop) * 0.4, badgeR + u * 0.03);

  ctx.save();
  try {
    ctx.filter = `blur(${Math.max(4, u / 90)}px)`;
  } catch {
    /* ignore */
  }
  ctx.beginPath();
  ctx.arc(bcx + 4, bcy + 8, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(bcx, bcy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = css(comp);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bcx, bcy, badgeR - Math.max(4, u / 70), 0, Math.PI * 2);
  ctx.strokeStyle = css(WHITE);
  ctx.lineWidth = Math.max(2, u / 200);
  ctx.stroke();
  const bt = (spec.badge || "TOP").toUpperCase();
  const fb = fitText(ctx, bt, badgeR * 1.5, badgeR * 1.1, u * 0.065, { minSize: u * 0.025, maxLines: 2 });
  const bh = blockHeight(fb.lines, fb.lineHeight);
  drawLines(ctx, bcx - badgeR, bcy - bh / 2, fb.lines, fb.size, 700, css(contrastText(comp)), fb.lineHeight, "center", 2 * badgeR);

  const area: Area = { x: w * 0.46, y: yBodyTop, w: w - pad - w * 0.46, h: yBodyBottom - yBodyTop };
  productForArea(ctx, asset, area, warmTop);

  let sy = h - pad - totalStrips;
  feats.forEach((f) => {
    const text = [f.title, f.text].filter(Boolean).join(" ").trim();
    const checkR = stripH * 0.42;
    drawCheck(ctx, pad + checkR, sy + stripH / 2, checkR, dom, contrastText(dom));
    const stripX0 = pad + 2 * checkR + u * 0.015;
    fillRound(ctx, stripX0, sy, w - pad - stripX0, stripH, stripH / 2, css(WHITE));
    const avail = w - pad - stripX0 - stripH * 0.9;
    const fx = fitText(ctx, text, avail, stripH * 0.8, u * 0.028, { minSize: u * 0.015, weight: 400, maxLines: 1 });
    const tth = blockHeight(fx.lines, fx.lineHeight);
    drawLines(ctx, stripX0 + stripH * 0.45, sy + (stripH - tth) / 2, fx.lines, fx.size, 400, css({ r: 35, g: 37, b: 45 }), fx.lineHeight);
    sy += stripH + stripGap;
  });
}

export const TEMPLATES: Record<
  TemplateKey,
  (ctx: Ctx, w: number, h: number, asset: ProductAsset, spec: CardSpec) => void
> = {
  light_chips: renderLightChips,
  dark_premium: renderDarkPremium,
  color_bold: renderColorBold,
  stats_side: renderStatsSide,
  ribbon_badge: renderRibbonBadge,
};

export { luminance };
