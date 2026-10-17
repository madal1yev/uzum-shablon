"""Karta shablonlari: chizish yordamchilari, fit_text, CardSpec, 5 ta infografika shabloni.

Barcha shablonlar 2x supersampling bilan imaging.render_card() orqali render qilinadi.
Shu modulda funksiyalar kenglik/likorlilikdan qat'i nazar ishlaydi (1:1 ... 9:16).
"""

from __future__ import annotations

import colorsys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_DIR = Path(__file__).resolve().parent
FONTS_DIR = BASE_DIR / "fonts"

ACCENT_FALLBACK = (0x6C, 0x3C, 0xFF)  # standart binafsha

# ---------------------------------------------------------------------------
# Matn tozalash / qirqish
# ---------------------------------------------------------------------------


def clean(text: str) -> str:
    """Apostrof belgilarini bitta ' ga almashtiradi, bo'shliqlarni siqadi."""
    if not text:
        return ""
    for ch in ("ʻ", "’", "‘", "ʼ", "`", "´"):
        text = text.replace(ch, "'")
    return " ".join(str(text).split())


def _w(text: str) -> list[str]:
    return [w for w in text.split() if w]


def trunc_words(text: str, max_words: int, max_chars: int) -> str:
    """Maksimal so'z soni va uzunlikda qirqadi."""
    words = _w(clean(text))[:max_words]
    s = " ".join(words)
    if len(s) > max_chars:
        s = s[:max_chars].rstrip()
        if " " in s:
            s = s.rsplit(" ", 1)[0]
    return s


# ---------------------------------------------------------------------------
# Dataclass'lar
# ---------------------------------------------------------------------------


@dataclass
class CardSpec:
    """Gemini'dan kelgan yoki fallback reklama kartasi ma'lumoti."""

    title: str = ""
    subtitle: str = ""
    badge: str = ""
    features: list[dict] = field(default_factory=list)   # [{"title": ..., "text": ...}]
    stats: list[dict] = field(default_factory=list)      # [{"value": ..., "label": ...}]

    @classmethod
    def from_ai(cls, data: dict, fallback: "CardSpec | None" = None) -> "CardSpec":
        """Gemini JSON'ini xavfsiz holda o'qib, uzunliklarni kod ichida qirqlaydi."""
        data = data if isinstance(data, dict) else {}
        fb = fallback or default_spec("en")

        def fget(key: str) -> str:
            v = data.get(key)
            return clean(v) if isinstance(v, str) else ""

        title = trunc_words(fget("title"), 4, 40) or fb.title
        subtitle = trunc_words(fget("subtitle"), 6, 60) or fb.subtitle
        badge = trunc_words(fget("badge"), 2, 14) or fb.badge

        feats_in = data.get("features")
        features: list[dict] = []
        if isinstance(feats_in, list):
            for item in feats_in[:6]:
                if not isinstance(item, dict):
                    continue
                t = trunc_words(item.get("title") if isinstance(item.get("title"), str) else "", 2, 26)
                x = trunc_words(item.get("text") if isinstance(item.get("text"), str) else "", 5, 46)
                if t or x:
                    features.append({"title": t, "text": x})
        if not features:
            features = [dict(f) for f in fb.features]
        while len(features) < 4:
            features.append({"title": "", "text": ""})

        stats_in = data.get("stats")
        stats: list[dict] = []
        if isinstance(stats_in, list) and len(stats_in) in (3, 4):
            for item in stats_in[:4]:
                if not isinstance(item, dict):
                    continue
                v = trunc_words(item.get("value") if isinstance(item.get("value"), str) else "", 3, 16)
                lb = trunc_words(item.get("label") if isinstance(item.get("label"), str) else "", 3, 18)
                if v:
                    stats.append({"value": v, "label": lb})
        return cls(title=title, subtitle=subtitle, badge=badge, features=features, stats=stats)


@dataclass
class ProductAsset:
    """Fondan ajratilgan (yoki ajratilmagan) mahsulot + dominant rang."""

    image: Image.Image          # RGBA
    dominant: tuple[int, int, int] = ACCENT_FALLBACK
    has_cutout: bool = False
    preview_jpeg: bytes = b""   # Gemini uchun kichik JPEG


# ---------------------------------------------------------------------------
# Rang yordamchilari
# ---------------------------------------------------------------------------


def clamp(v: int) -> int:
    return max(0, min(255, int(v)))


def rgb_to_hex(c: tuple[int, int, int]) -> str:
    return "#%02X%02X%02X" % (clamp(c[0]), clamp(c[1]), clamp(c[2]))


def mix(
    a: tuple[int, int, int], b: tuple[int, int, int], t: float
) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        clamp(a[0] + (b[0] - a[0]) * t),
        clamp(a[1] + (b[1] - a[1]) * t),
        clamp(a[2] + (b[2] - a[2]) * t),
    )


def lighten(c: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return mix(c, (255, 255, 255), t)


def darken(c: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return mix(c, (0, 0, 0), t)


def luminance(c: tuple[int, int, int]) -> float:
    def ch(v: int) -> float:
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = c
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast_text(bg: tuple[int, int, int]) -> tuple[int, int, int]:
    """Fon yorqinligiga qarab oq yoki qora matn tanlaydi."""
    return (20, 20, 26) if luminance(bg) > 0.45 else (255, 255, 255)


def complement(c: tuple[int, int, int]) -> tuple[int, int, int]:
    """HSV'da 180 gradus oraliq komplement rang."""
    h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
    h = (h + 0.5) % 1.0
    s = max(s, 0.45)
    v = max(v, 0.55)
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (clamp(r * 255), clamp(g * 255), clamp(b * 255))


def dominant_color(img: Image.Image) -> tuple[int, int, int]:
    """RGBA mahsulot rasmidan dominant (to'yingan) rangni topadi."""
    small = img.convert("RGBA").resize((72, 72), Image.BILINEAR)
    px = list(small.getdata())
    counts: dict[tuple[int, int, int], int] = {}
    for r, g, b, a in px:
        if a < 120:
            continue
        key = (r // 12 * 12, g // 12 * 12, b // 12 * 12)
        counts[key] = counts.get(key, 0) + 1
    if not counts:
        return ACCENT_FALLBACK
    best, best_score = ACCENT_FALLBACK, -1.0
    for (r, g, b), n in counts.items():
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s < 0.18 or v < 0.15 or v > 0.97:
            continue
        score = n * (0.35 + s)
        if score > best_score:
            best_score, best = score, (r, g, b)
    if best_score < 0:
        avg = [0, 0, 0]
        tot = 0
        for (r, g, b), n in counts.items():
            avg[0] += r * n
            avg[1] += g * n
            avg[2] += b * n
            tot += n
        if tot:
            avg = [v // tot for v in avg]
            _, s, _ = colorsys.rgb_to_hsv(avg[0] / 255, avg[1] / 255, avg[2] / 255)
            if s >= 0.12:
                return (clamp(avg[0]), clamp(avg[1]), clamp(avg[2]))
        return ACCENT_FALLBACK
    return best


# ---------------------------------------------------------------------------
# Shriftlar
# ---------------------------------------------------------------------------

_FONT_CANDIDATES_BOLD = [
    FONTS_DIR / "Montserrat-Bold.ttf",
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    Path("/Library/Fonts/Arial Bold.ttf"),
]
_FONT_CANDIDATES_MEDIUM = [
    FONTS_DIR / "Montserrat-Medium.ttf",
    FONTS_DIR / "DejaVuSans.ttf",
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/TTF/DejaVuSans.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    Path("/Library/Fonts/Arial.ttf"),
]
_font_cache: dict[tuple[bool, int], ImageFont.FreeTypeFont] = {}


def get_font(bold: bool, size: int) -> ImageFont.FreeTypeFont:
    size = max(8, int(size))
    key = (bold, size)
    if key in _font_cache:
        return _font_cache[key]
    candidates = _FONT_CANDIDATES_BOLD if bold else _FONT_CANDIDATES_MEDIUM
    font = None
    for path in candidates:
        try:
            if path.exists():
                font = ImageFont.truetype(str(path), size)
                break
        except OSError:
            continue
    if font is None:
        try:
            font = ImageFont.load_default(size=size)  # Pillow >= 10.1
        except TypeError:
            font = ImageFont.load_default()
    _font_cache[key] = font
    return font


# ---------------------------------------------------------------------------
# Matn: wrap + fit
# ---------------------------------------------------------------------------


def text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> float:
    return draw.textlength(text, font=font)


def wrap_text(
    draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_w: int
) -> list[str]:
    lines: list[str] = []
    for raw_line in (text or "").split("\n"):
        words = _w(raw_line)
        cur = ""
        for word in words:
            if text_w(draw, word, font) > max_w:
                # juda uzun so'z — belgilar bo'yicha bo'l
                if cur:
                    lines.append(cur)
                    cur = ""
                piece = ""
                for chn in word:
                    if text_w(draw, piece + chn, font) <= max_w or not piece:
                        piece += chn
                    else:
                        lines.append(piece)
                        piece = chn
                cur = piece
                continue
            trial = word if not cur else cur + " " + word
            if text_w(draw, trial, font) <= max_w:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
    return lines or [""]


def fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_w: int,
    max_h: int,
    start_size: int,
    *,
    min_size: int = 14,
    bold: bool = True,
    spacing: float = 1.12,
    max_lines: int | None = None,
) -> tuple[ImageFont.ImageFont, list[str], int]:
    """Matnni berilgan kenglik/balandlikka sig'diradi (shriftni kichraytirib).

    Returns: (font, lines, line_height_px)
    """
    max_w = max(10, int(max_w))
    max_h = max(10, int(max_h))
    size = max(min_size, int(start_size))
    while True:
        font = get_font(bold, size)
        lines = wrap_text(draw, text, font, max_w)
        if max_lines is not None and len(lines) > max_lines:
            lines = lines[:max_lines]
        lh = max(1, int(size * spacing))
        total_h = lh * len(lines)
        widest = max((text_w(draw, ln, font) for ln in lines), default=0)
        ok_h = total_h <= max_h
        ok_w = widest <= max_w + 1
        if (ok_h and ok_w) or size <= min_size:
            return font, lines, lh
        size = max(min_size, int(size * 0.92) - 1)


def draw_lines(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    lines: list[str],
    font: ImageFont.ImageFont,
    fill,
    lh: int,
    *,
    align: str = "left",
    width: int | None = None,
    anchor_top: bool = True,
) -> int:
    """Satrlarni chizadi, jami balandlikni qaytaradi."""
    x, y = xy
    for i, ln in enumerate(lines):
        if align == "center" and width is not None:
            cx = x + width // 2
            draw.text((cx, y + i * lh), ln, font=font, fill=fill, anchor="mt")
        elif align == "right" and width is not None:
            draw.text((x + width, y + i * lh), ln, font=font, fill=fill, anchor="rt")
        else:
            draw.text((x, y + i * lh), ln, font=font, fill=fill, anchor="lt")
    return lh * len(lines)


def block_height(lines: list[str], lh: int) -> int:
    return lh * max(1, len(lines))


# ---------------------------------------------------------------------------
# Dib yordamchilari
# ---------------------------------------------------------------------------


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def draw_rounded(
    draw: ImageDraw.ImageDraw, box: list[int], radius: int, fill=None, outline=None, width: int = 1
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def vertical_gradient(
    size: tuple[int, int],
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
) -> Image.Image:
    w, h = size
    strip = Image.new("RGB", (1, max(2, h)))
    sd = ImageDraw.Draw(strip)
    for y in range(strip.height):
        t = y / (strip.height - 1)
        sd.point((0, y), fill=mix(top, bottom, t))
    return strip.resize((w, h), Image.BILINEAR)


def radial_glow(
    size: tuple[int, int],
    color: tuple[int, int, int],
    *,
    strength: float = 0.55,
    blur: int = 60,
) -> Image.Image:
    """Markazdan periferiyaga so'rilgan yumshoq yorug'lik qatlami (RGBA)."""
    w, h = size
    base = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(base)
    cx, cy = w // 2, int(h * 0.48)
    rx, ry = int(w * 0.42), int(h * 0.34)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=int(255 * strength))
    base = base.filter(ImageFilter.GaussianBlur(max(8, blur)))
    layer = Image.new("RGBA", (w, h), (*color, 255))
    layer.putalpha(base)
    return layer


def draw_check(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    r: int,
    *,
    circle_fill,
    check_fill=(255, 255, 255),
) -> None:
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=circle_fill)
    lw = max(2, int(r * 0.34))
    p1 = (cx - int(r * 0.45), cy + int(r * 0.02))
    p2 = (cx - int(r * 0.12), cy + int(r * 0.38))
    p3 = (cx + int(r * 0.5), cy - int(r * 0.4))
    draw.line([p1, p2, p3], fill=check_fill, width=lw, joint="curve")


def draw_pill(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    *,
    font: ImageFont.ImageFont,
    bg,
    fg,
    padx: int,
    pady: int,
    radius: int | None = None,
    align: str = "right",
    max_w: int | None = None,
) -> tuple[int, int, int, int]:
    """Badge pill chizadi. Qaytaradi: (x0, y0, x1, y1)."""
    if max_w is not None:
        while draw.textlength(text, font=font) + 2 * padx > max_w and font.size > 10:
            font = get_font(True, font.size - 2)
            if font.size <= 10:
                break
    tw = int(draw.textlength(text, font=font))
    fh = font.getbbox("Ag")[3]
    pw, ph = tw + 2 * padx, fh + 2 * pady
    r = radius if radius is not None else ph // 2
    if align == "right":
        x = x - pw
    elif align == "center":
        x = x - pw // 2
    box = [x, y, x + pw, y + ph]
    draw_rounded(draw, box, r, fill=bg)
    draw.text((x + padx, y + pady - font.getbbox("Ag")[1]), text, font=font, fill=fg)
    return tuple(box)


def paste_product(
    canvas: Image.Image,
    product: Image.Image,
    area: tuple[int, int, int, int],
    *,
    scale: float = 0.86,
    shadow: bool = True,
    shadow_alpha: int = 90,
) -> None:
    """Mahsulotni proporsiyasini buzmay, berilgan hududga markazlaydi + soya."""
    ax, ay, aw, ah = area
    if aw <= 10 or ah <= 10 or product.width < 2 or product.height < 2:
        return
    avail_w, avail_h = int(aw * scale), int(ah * scale)
    ratio = min(avail_w / product.width, avail_h / product.height)
    new_w, new_h = max(2, int(product.width * ratio)), max(2, int(product.height * ratio))
    prod = product.resize((new_w, new_h), Image.LANCZOS)
    px = ax + (aw - new_w) // 2
    py = ay + (ah - new_h) // 2
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        ex_w, ex_h = int(new_w * 0.46), max(8, int(new_h * 0.055))
        ecx, ecy = px + new_w // 2, py + new_h - int(ex_h * 0.2)
        sd.ellipse([ecx - ex_w, ecy - ex_h, ecx + ex_w, ecy + ex_h], fill=(0, 0, 0, shadow_alpha))
        sh = sh.filter(ImageFilter.GaussianBlur(max(6, new_w // 28)))
        canvas.alpha_composite(sh)
    canvas.alpha_composite(prod, (px, py))


def rounded_card_product(
    product: Image.Image,
    size: int,
    bg: tuple[int, int, int],
    radius: int,
) -> Image.Image:
    """Cutout bo'lmasa: mahsulotni yumaloq burchakli kartaga joylash."""
    card = Image.new("RGBA", (size, size), (*bg, 255))
    inner = product.convert("RGBA")
    r = min(size, int(size * 0.78))
    ratio = min(r / inner.width, r / inner.height)
    inner = inner.resize((max(2, int(inner.width * ratio)), max(2, int(inner.height * ratio))), Image.LANCZOS)
    mask = rounded_mask(inner.size, radius=max(8, size // 12))
    bg_layer = Image.new("RGBA", inner.size, (*lighten(bg, 0.85), 255))
    bg_layer.putalpha(0)
    card.paste(bg_layer, ((size - inner.width) // 2, (size - inner.height) // 2), mask)
    card.paste(inner, ((size - inner.width) // 2, (size - inner.height) // 2), mask)
    return card


# ---------------------------------------------------------------------------
# Mahsulotni tayyorlash (kadr ichida)
# ---------------------------------------------------------------------------


def _product_for_area(
    asset: ProductAsset,
    area: tuple[int, int, int, int],
    *,
    fallback_bg: tuple[int, int, int],
) -> Image.Image:
    img = asset.image
    if asset.has_cutout:
        return img
    aw, ah = area[2], area[3]
    side = max(40, min(aw, ah))
    return rounded_card_product(img.convert("RGB"), side, fallback_bg, radius=side // 8)


# ---------------------------------------------------------------------------
# SHABLON 1: light_chips — yorug' gradient, oq panel + 4 afzallik
# ---------------------------------------------------------------------------


def render_light_chips(w: int, h: int, asset: ProductAsset, spec: CardSpec) -> Image.Image:
    dom = asset.dominant
    canvas = vertical_gradient((w, h), (252, 252, 254), lighten(dom, 0.88)).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    u = min(w, h)
    pad = max(16, int(u * 0.055))

    # --- header ---
    header_w = int((w - 2 * pad) * (0.55 if spec.badge else 0.95))
    title_size = int(u * 0.072)
    font_t, lines_t, lh_t = fit_text(
        draw, spec.title, header_w, int(u * 0.22), title_size, min_size=int(u * 0.032)
    )
    sub_size = int(u * 0.036)
    font_s, lines_s, lh_s = fit_text(
        draw, spec.subtitle, header_w, int(u * 0.10), sub_size, min_size=int(u * 0.02),
        bold=False,
    )
    y = pad
    tc = (18, 19, 24)
    y += draw_lines(draw, (pad, y), lines_t, font_t, tc, lh_t)
    y += max(4, int(u * 0.012))
    y += draw_lines(draw, (pad, y), lines_s, font_s, (92, 98, 110), lh_s)

    # badge (o'ng yuqori)
    if spec.badge:
        badge_font = get_font(True, int(u * 0.034))
        draw_pill(
            draw, w - pad, pad, spec.badge.upper(), font=badge_font,
            bg=dom, fg=contrast_text(dom), padx=int(u * 0.03), pady=int(u * 0.016),
            align="right", max_w=int(w * 0.34),
        )

    # --- pastki panel ---
    panel_h = max(int(u * 0.30), min(int(h * 0.30), int(u * 0.42)))
    panel_top = h - pad - panel_h
    draw_rounded(draw, [pad, panel_top, w - pad, h - pad], radius=int(u * 0.045), fill=(255, 255, 255, 255))
    # panel ichida 2x2 afzalliklar
    feats = [f for f in spec.features if (f.get("title") or f.get("text"))][:4]
    inner_pad = int(u * 0.035)
    cell_w = (w - 2 * pad - 2 * inner_pad) // 2
    cell_h = (panel_h - 2 * inner_pad) // 2
    for i, f in enumerate(feats):
        col, row = i % 2, i // 2
        cx0 = pad + inner_pad + col * cell_w
        cy0 = panel_top + inner_pad + row * cell_h
        check_r = max(8, int(u * 0.022))
        draw_check(
            draw, cx0 + check_r, cy0 + check_r + 2, check_r,
            circle_fill=dom, check_fill=contrast_text(dom),
        )
        text_x = cx0 + 2 * check_r + max(8, int(u * 0.018))
        avail = cell_w - (text_x - cx0) - int(u * 0.012)
        yy = cy0
        ft, lt, lht = fit_text(
            draw, f.get("title", ""), avail, int(cell_h * 0.4), int(u * 0.030),
            min_size=int(u * 0.018), max_lines=2,
        )
        yy += draw_lines(draw, (text_x, yy), lt, ft, (24, 25, 30), lht)
        fx, ff, lfh = fit_text(
            draw, f.get("text", ""), avail, int(cell_h * 0.55), int(u * 0.025),
            min_size=int(u * 0.015), bold=False, max_lines=3,
        )
        yy += max(2, int(u * 0.006))
        draw_lines(draw, (text_x, yy), ff, fx, (105, 110, 122), lfh)

    # --- mahsulot ---
    prod_area = (pad, y + int(u * 0.02), w - pad, panel_top - int(u * 0.02))
    prod = _product_for_area(asset, prod_area, fallback_bg=lighten(dom, 0.85))
    paste_product(canvas, prod, prod_area, scale=0.88, shadow=asset.has_cutout)
    return canvas


# ---------------------------------------------------------------------------
# SHABLON 2: dark_premium — qora fon, glow, 2x2 shisha kartalar
# ---------------------------------------------------------------------------


def render_dark_premium(w: int, h: int, asset: ProductAsset, spec: CardSpec) -> Image.Image:
    dom = asset.dominant
    canvas = vertical_gradient((w, h), (9, 9, 14), (24, 24, 36)).convert("RGBA")
    u = min(w, h)
    pad = max(16, int(u * 0.055))

    # glow mahsulot ortida
    glow_y0 = int(h * 0.16)
    glow = radial_glow((w, h - glow_y0), lighten(dom, 0.25), strength=0.5, blur=int(u * 0.14))
    canvas.alpha_composite(glow, (0, glow_y0))
    draw = ImageDraw.Draw(canvas)

    # header (markaz)
    title_size = int(u * 0.075)
    font_t, lines_t, lh_t = fit_text(
        draw, spec.title, int(w * 0.84), int(u * 0.20), title_size, min_size=int(u * 0.03)
    )
    th = block_height(lines_t, lh_t)
    draw_lines(draw, (pad, pad), lines_t, font_t, (255, 255, 255), lh_t, align="center", width=w - 2 * pad)
    y = pad + th + max(4, int(u * 0.014))
    if spec.subtitle:
        font_s, lines_s, lh_s = fit_text(
            draw, spec.subtitle, int(w * 0.8), int(u * 0.09), int(u * 0.034),
            min_size=int(u * 0.02), bold=False,
        )
        draw_lines(draw, (pad, y), lines_s, font_s, (176, 182, 196), lh_s, align="center", width=w - 2 * pad)
        y += block_height(lines_s, lh_s)

    if spec.badge:
        badge_font = get_font(True, int(u * 0.032))
        draw_pill(
            draw, w - pad, pad, spec.badge.upper(), font=badge_font,
            bg=dom, fg=contrast_text(dom), padx=int(u * 0.028), pady=int(u * 0.015),
            align="right", max_w=int(w * 0.32),
        )

    # pastki 2x2 shisha kartalar
    panel_h = max(int(u * 0.30), min(int(h * 0.30), int(u * 0.40)))
    panel_top = h - pad - panel_h
    glass = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass)
    inner_pad = int(u * 0.03)
    gap = int(u * 0.022)
    cell_w = (w - 2 * pad - 2 * inner_pad - gap) // 2
    cell_h = (panel_h - 2 * inner_pad - gap) // 2
    feats = [f for f in spec.features if (f.get("title") or f.get("text"))][:4]
    for i, f in enumerate(feats):
        col, row = i % 2, i // 2
        cx0 = pad + inner_pad + col * (cell_w + gap)
        cy0 = panel_top + inner_pad + row * (cell_h + gap)
        draw_rounded(
            gd, [cx0, cy0, cx0 + cell_w, cy0 + cell_h], radius=int(u * 0.028),
            fill=(255, 255, 255, 18), outline=(255, 255, 255, 55), width=max(1, u // 400),
        )
    canvas.alpha_composite(glass)
    draw = ImageDraw.Draw(canvas)
    for i, f in enumerate(feats):
        col, row = i % 2, i // 2
        cx0 = pad + inner_pad + col * (cell_w + gap)
        cy0 = panel_top + inner_pad + row * (cell_h + gap)
        ix = cx0 + int(cell_w * 0.08)
        avail = int(cell_w * 0.84)
        yy = cy0 + int(cell_h * 0.10)
        dot_r = max(4, int(u * 0.012))
        draw.ellipse([ix, yy + int(u * 0.008), ix + 2 * dot_r, yy + 2 * dot_r + int(u * 0.008)], fill=dom)
        yy += 2 * dot_r + int(u * 0.014)
        ft, lt, lht = fit_text(
            draw, f.get("title", ""), avail, int(cell_h * 0.34), int(u * 0.028),
            min_size=int(u * 0.016), max_lines=2,
        )
        yy += draw_lines(draw, (ix, yy), lt, ft, (255, 255, 255), lht)
        fx, ff, lfh = fit_text(
            draw, f.get("text", ""), avail, int(cell_h * 0.42), int(u * 0.023),
            min_size=int(u * 0.014), bold=False, max_lines=3,
        )
        yy += max(2, int(u * 0.005))
        draw_lines(draw, (ix, yy), ff, fx, (168, 174, 188), lfh)

    # mahsulot
    prod_area = (pad + int(u * 0.02), y + int(u * 0.015), w - pad - int(u * 0.02), panel_top - int(u * 0.015))
    prod = _product_for_area(asset, prod_area, fallback_bg=(14, 14, 20))
    paste_product(canvas, prod, prod_area, scale=0.82, shadow=False)
    return canvas


# ---------------------------------------------------------------------------
# SHABLON 3: color_bold — to'liq rangli fon, katta doira, raqamli kartalar
# ---------------------------------------------------------------------------


def render_color_bold(w: int, h: int, asset: ProductAsset, spec: CardSpec) -> Image.Image:
    dom = asset.dominant
    canvas = vertical_gradient((w, h), dom, darken(dom, 0.28)).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    u = min(w, h)
    pad = max(16, int(u * 0.055))
    tc = contrast_text(dom)

    # katta shaffof doira
    circle_r = int(u * 0.44)
    circle_cx, circle_cy = int(w * 0.62), int(h * 0.52)
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        [circle_cx - circle_r, circle_cy - circle_r, circle_cx + circle_r, circle_cy + circle_r],
        fill=(255, 255, 255, 36),
    )
    canvas.alpha_composite(overlay)

    # sarlavha (katta harflar)
    title = (spec.title or "").upper()
    font_t, lines_t, lh_t = fit_text(
        draw, title, int(w * 0.9), int(u * 0.16), int(u * 0.085), min_size=int(u * 0.034), max_lines=2
    )
    y = pad
    y += draw_lines(draw, (pad, y), lines_t, font_t, tc, lh_t)
    if spec.subtitle:
        font_s, lines_s, lh_s = fit_text(
            draw, spec.subtitle, int(w * 0.7), int(u * 0.08), int(u * 0.032),
            min_size=int(u * 0.018), bold=False, max_lines=2,
        )
        y += max(4, int(u * 0.01))
        y += draw_lines(draw, (pad, y), lines_s, font_s, mix(tc, dom, 0.25), lh_s)

    if spec.badge:
        badge_font = get_font(True, int(u * 0.03))
        draw_pill(
            draw, w - pad, pad, spec.badge.upper(), font=badge_font,
            bg=(255, 255, 255), fg=dom, padx=int(u * 0.026), pady=int(u * 0.014),
            align="right", max_w=int(w * 0.3),
        )

    feats = [f for f in spec.features if (f.get("title") or f.get("text"))][:3]
    tall = h >= w * 1.12

    if tall:
        # vertikal: mahsulot o'rta, kartalar pastda to'liq kenglikda
        prod_area = (pad, y + int(u * 0.02), w - pad, int(h * 0.58))
        prod = _product_for_area(asset, prod_area, fallback_bg=dom)
        paste_product(canvas, prod, prod_area, scale=0.78, shadow=False)

        card_top = int(h * 0.60)
        bottom_pad = pad
        gap = int(u * 0.022)
        n = max(1, len(feats))
        ch = (h - bottom_pad - card_top - gap * (n - 1)) // n
        cw = w - 2 * pad
        shadow_l = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sld = ImageDraw.Draw(shadow_l)
        for i in range(n):
            cy0 = card_top + i * (ch + gap)
            sld.rounded_rectangle([pad + 4, cy0 + 8, pad + cw + 4, cy0 + ch + 8], radius=int(u * 0.03), fill=(0, 0, 0, 70))
        shadow_l = shadow_l.filter(ImageFilter.GaussianBlur(max(4, u // 80)))
        canvas.alpha_composite(shadow_l)
        draw = ImageDraw.Draw(canvas)
        for i, f in enumerate(feats):
            _draw_number_card(draw, pad, card_top + i * (ch + gap), cw, ch, i + 1, f, u, dom)
    else:
        # gorizontal: chapda 3 ta karta, o'ngda mahsulot
        col_w = int(w * 0.46)
        card_top = y + int(u * 0.03)
        bottom_pad = pad
        gap = int(u * 0.02)
        n = max(1, len(feats))
        ch = (h - bottom_pad - card_top - gap * (n - 1)) // n
        shadow_l = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sld = ImageDraw.Draw(shadow_l)
        for i in range(n):
            cy0 = card_top + i * (ch + gap)
            sld.rounded_rectangle([pad + 4, cy0 + 8, pad + col_w + 4, cy0 + ch + 8], radius=int(u * 0.03), fill=(0, 0, 0, 70))
        shadow_l = shadow_l.filter(ImageFilter.GaussianBlur(max(4, u // 80)))
        canvas.alpha_composite(shadow_l)
        draw = ImageDraw.Draw(canvas)
        for i, f in enumerate(feats):
            _draw_number_card(draw, pad, card_top + i * (ch + gap), col_w, ch, i + 1, f, u, dom)
        prod_area = (pad + col_w + int(u * 0.02), card_top, w - pad, h - bottom_pad)
        prod = _product_for_area(asset, prod_area, fallback_bg=dom)
        paste_product(canvas, prod, prod_area, scale=0.9, shadow=False)
    return canvas


def _draw_number_card(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    cw: int,
    ch: int,
    num: int,
    f: dict,
    u: int,
    dom: tuple[int, int, int],
) -> None:
    draw_rounded(draw, [x, y, x + cw, y + ch], radius=int(u * 0.03), fill=(255, 255, 255, 255))
    num_r = max(10, int(min(cw, ch) * 0.16))
    ncx, ncy = x + num_r + int(cw * 0.06), y + ch // 2
    draw.ellipse([ncx - num_r, ncy - num_r, ncx + num_r, ncy + num_r], fill=dom)
    fnum = get_font(True, int(num_r * 1.25))
    draw.text((ncx, ncy), str(num), font=fnum, fill=contrast_text(dom), anchor="mm")
    tx = ncx + num_r + int(cw * 0.05)
    avail = x + cw - tx - int(cw * 0.05)
    ft, lt, lht = fit_text(
        draw, f.get("title", ""), avail, int(ch * 0.42), int(u * 0.03),
        min_size=int(u * 0.016), max_lines=2,
    )
    th = block_height(lt, lht)
    fx, ff, lfh = fit_text(
        draw, f.get("text", ""), avail, int(ch * 0.4), int(u * 0.024),
        min_size=int(u * 0.014), bold=False, max_lines=3,
    )
    fh = block_height(ff, lfh)
    total = th + fh + max(2, int(u * 0.006))
    yy = y + max(int(u * 0.01), (ch - total) // 2)
    yy += draw_lines(draw, (tx, yy), lt, ft, (22, 23, 28), lht)
    yy += max(2, int(u * 0.006))
    draw_lines(draw, (tx, yy), ff, fx, (100, 105, 118), lfh)


# ---------------------------------------------------------------------------
# SHABLON 4: stats_side — chapda qora statistik bloklar, o'ngda mahsulot
# ---------------------------------------------------------------------------


def render_stats_side(w: int, h: int, asset: ProductAsset, spec: CardSpec) -> Image.Image:
    dom = asset.dominant
    canvas = vertical_gradient((w, h), (250, 250, 252), lighten(dom, 0.82)).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    u = min(w, h)
    pad = max(16, int(u * 0.055))

    # header
    header_w = int((w - 2 * pad) * (0.55 if spec.badge else 0.95))
    title_size = int(u * 0.062)
    font_t, lines_t, lh_t = fit_text(
        draw, spec.title, header_w, int(u * 0.16), title_size, min_size=int(u * 0.03), max_lines=2
    )
    y = pad
    y += draw_lines(draw, (pad, y), lines_t, font_t, (18, 19, 24), lh_t)
    if spec.subtitle:
        font_s, lines_s, lh_s = fit_text(
            draw, spec.subtitle, header_w, int(u * 0.08), int(u * 0.032),
            min_size=int(u * 0.018), bold=False, max_lines=2,
        )
        y += max(3, int(u * 0.01))
        y += draw_lines(draw, (pad, y), lines_s, font_s, (96, 101, 112), lh_s)

    if spec.badge:
        badge_font = get_font(True, int(u * 0.03))
        draw_pill(
            draw, w - pad, pad, spec.badge.upper(), font=badge_font,
            bg=dom, fg=contrast_text(dom), padx=int(u * 0.026), pady=int(u * 0.014),
            align="right", max_w=int(w * 0.3),
        )

    # chap ustun: stats yoki features
    col_w = int(w * 0.42)
    blocks_top = y + int(u * 0.035)
    bottom_bar_h = int(u * 0.075)
    blocks_bottom = h - pad - bottom_bar_h - int(u * 0.03)
    gap = int(u * 0.022)

    stats = spec.stats[:4] if spec.stats else []
    items: list[tuple[str, str]] = []
    mode = "stats"
    if stats:
        items = [(s.get("value", ""), s.get("label", "")) for s in stats]
    else:
        mode = "features"
        items = [
            (f.get("title", ""), f.get("text", ""))
            for f in spec.features[:4]
            if (f.get("title") or f.get("text"))
        ]
    n = max(1, len(items))
    block_h = (blocks_bottom - blocks_top - gap * (n - 1)) // n
    block_h = max(int(u * 0.10), block_h)

    shadow_l = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sld = ImageDraw.Draw(shadow_l)
    for i in range(n):
        by0 = blocks_top + i * (block_h + gap)
        sld.rounded_rectangle(
            [pad + 4, by0 + 7, pad + col_w + 4, by0 + block_h + 7],
            radius=int(u * 0.028), fill=(0, 0, 0, 60),
        )
    shadow_l = shadow_l.filter(ImageFilter.GaussianBlur(max(4, u // 90)))
    canvas.alpha_composite(shadow_l)
    draw = ImageDraw.Draw(canvas)

    for i, (val, lab) in enumerate(items):
        by0 = blocks_top + i * (block_h + gap)
        draw_rounded(
            draw, [pad, by0, pad + col_w, by0 + block_h],
            radius=int(u * 0.028), fill=(20, 21, 26, 255),
        )
        ix = pad + int(col_w * 0.08)
        avail = int(col_w * 0.84)
        if mode == "stats":
            fv, lv, lhv = fit_text(
                draw, val, avail, int(block_h * 0.55), int(u * 0.052),
                min_size=int(u * 0.024), max_lines=1,
            )
            yy = by0 + int(block_h * 0.16)
            yy += draw_lines(draw, (ix, yy), lv, fv, (255, 255, 255), lhv)
            if lab:
                fl, ll, lhl = fit_text(
                    draw, lab, avail, int(block_h * 0.3), int(u * 0.024),
                    min_size=int(u * 0.014), bold=False, max_lines=2,
                )
                yy += max(2, int(u * 0.005))
                draw_lines(draw, (ix, yy), ll, fl, (158, 163, 175), lhl)
        else:
            ft, lt, lht = fit_text(
                draw, val, avail, int(block_h * 0.4), int(u * 0.028),
                min_size=int(u * 0.016), max_lines=2,
            )
            yy = by0 + int(block_h * 0.14)
            yy += draw_lines(draw, (ix, yy), lt, ft, (255, 255, 255), lht)
            if lab:
                fx, ff, lfh = fit_text(
                    draw, lab, avail, int(block_h * 0.45), int(u * 0.022),
                    min_size=int(u * 0.013), bold=False, max_lines=3,
                )
                yy += max(2, int(u * 0.005))
                draw_lines(draw, (ix, yy), ff, fx, (158, 163, 175), lfh)

    # o'ng: mahsulot
    prod_area = (pad + col_w + int(u * 0.03), blocks_top, w - pad, blocks_bottom)
    prod = _product_for_area(asset, prod_area, fallback_bg=lighten(dom, 0.8))
    paste_product(canvas, prod, prod_area, scale=0.92, shadow=asset.has_cutout)

    # pastda badge lentalari
    bar = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    by0 = h - pad - bottom_bar_h
    draw_rounded(bd, [pad, by0, w - pad, h - pad], radius=bottom_bar_h // 2, fill=dom)
    canvas.alpha_composite(bar)
    draw = ImageDraw.Draw(canvas)
    bt = spec.badge or spec.subtitle or spec.title
    fb = get_font(True, int(u * 0.032))
    while draw.textlength(bt, font=fb) > (w - 2 * pad - int(u * 0.1)) and fb.size > 12:
        fb = get_font(True, fb.size - 2)
    draw.text((w // 2, by0 + bottom_bar_h // 2), bt, font=fb, fill=contrast_text(dom), anchor="mm")
    return canvas


# ---------------------------------------------------------------------------
# SHABLON 5: ribbon_badge — rangli lenta-sarlavha, doira-nishon, check-lentalar
# ---------------------------------------------------------------------------


def render_ribbon_badge(w: int, h: int, asset: ProductAsset, spec: CardSpec) -> Image.Image:
    dom = asset.dominant
    comp = complement(dom)
    warm_top = mix(lighten(comp, 0.85), (255, 255, 255), 0.5)
    canvas = vertical_gradient((w, h), warm_top, lighten(comp, 0.65)).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    u = min(w, h)
    pad = max(16, int(u * 0.05))

    # --- yuqori lenta ---
    band_h = max(int(u * 0.13), int(h * 0.11))
    tail_h = int(band_h * 0.35)
    band = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    # yon cherralar (quyruqlar)
    bd.polygon([(0, band_h), (0, band_h + tail_h), (int(w * 0.08), band_h + tail_h), (int(w * 0.08), band_h)], fill=darken(dom, 0.25))
    bd.polygon(
        [(w, band_h), (w, band_h + tail_h), (w - int(w * 0.08), band_h + tail_h), (w - int(w * 0.08), band_h)],
        fill=darken(dom, 0.25),
    )
    bd.rectangle([0, 0, w, band_h], fill=dom)
    canvas.alpha_composite(band)
    draw = ImageDraw.Draw(canvas)

    ft, lt, lht = fit_text(
        draw, spec.title, int(w * 0.84), int(band_h * 0.82), int(u * 0.062),
        min_size=int(u * 0.028), max_lines=2,
    )
    total = block_height(lt, lht)
    draw_lines(draw, (0, (band_h - total) // 2), lt, ft, contrast_text(dom), lht, align="center", width=w)

    # --- oq subtitle lentasi ---
    sub_h = max(int(u * 0.075), int(h * 0.055))
    sub_top = band_h + tail_h
    draw_rounded(
        draw, [int(w * 0.06), sub_top, int(w * 0.94), sub_top + sub_h],
        radius=sub_h // 2, fill=(255, 255, 255, 255),
    )
    fs, ls, lhs = fit_text(
        draw, spec.subtitle, int(w * 0.8), int(sub_h * 0.8), int(u * 0.032),
        min_size=int(u * 0.018), bold=False, max_lines=1,
    )
    fst = block_height(ls, lhs)
    draw_lines(draw, (0, sub_top + (sub_h - fst) // 2), ls, fs, (40, 42, 50), lhs, align="center", width=w)

    # --- pastda 2 ta check-lenta uchun joyni oldindan hisoblaymiz ---
    feats = [f for f in spec.features if (f.get("title") or f.get("text"))][:2]
    strip_h = max(int(u * 0.075), int(h * 0.05))
    strip_gap = int(u * 0.018)
    total_strips = len(feats) * strip_h + max(0, len(feats) - 1) * strip_gap

    # --- chapdagi katta doira-nishon ---
    y_body_top = sub_top + sub_h + int(u * 0.04)
    y_body_bottom = h - pad - total_strips - int(u * 0.025)
    badge_r = int(u * 0.19)
    bcx = int(w * 0.26)
    bcy = y_body_top + min(int((y_body_bottom - y_body_top) * 0.4), badge_r + int(u * 0.03))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse(
        [bcx - badge_r + 4, bcy - badge_r + 8, bcx + badge_r + 4, bcy + badge_r + 8],
        fill=(0, 0, 0, 60),
    )
    sh = sh.filter(ImageFilter.GaussianBlur(max(4, u // 90)))
    canvas.alpha_composite(sh)
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([bcx - badge_r, bcy - badge_r, bcx + badge_r, bcy + badge_r], fill=comp)
    draw.ellipse(
        [bcx - badge_r + max(4, u // 70), bcy - badge_r + max(4, u // 70),
         bcx + badge_r - max(4, u // 70), bcy + badge_r - max(4, u // 70)],
        outline=(255, 255, 255), width=max(2, u // 200),
    )
    bt = (spec.badge or "TOP").upper()
    fb, lb, lhb = fit_text(
        draw, bt, int(badge_r * 1.5), int(badge_r * 1.1), int(u * 0.065),
        min_size=int(u * 0.025), max_lines=2,
    )
    bh = block_height(lb, lhb)
    draw_lines(
        draw, (bcx - badge_r, bcy - bh // 2), lb, fb, contrast_text(comp), lhb,
        align="center", width=2 * badge_r,
    )

    # --- mahsulot ---
    prod_area = (int(w * 0.46), y_body_top, w - pad, y_body_bottom)
    prod = _product_for_area(asset, prod_area, fallback_bg=warm_top)
    paste_product(canvas, prod, prod_area, scale=0.9, shadow=asset.has_cutout)

    # --- pastda 2 ta check-lenta ---
    sy = h - pad - total_strips
    for f in feats:
        text = " ".join(x for x in (f.get("title", ""), f.get("text", "")) if x).strip()
        check_r = int(strip_h * 0.42)
        draw_check(
            draw, pad + check_r, sy + strip_h // 2, check_r,
            circle_fill=dom, check_fill=contrast_text(dom),
        )
        strip_x0 = pad + 2 * check_r + int(u * 0.015)
        draw_rounded(
            draw, [strip_x0, sy, w - pad, sy + strip_h],
            radius=strip_h // 2, fill=(255, 255, 255, 255),
        )
        avail = (w - pad) - strip_x0 - int(strip_h * 0.9)
        fx, ls, lsh = fit_text(
            draw, text, avail, int(strip_h * 0.8), int(u * 0.028),
            min_size=int(u * 0.015), bold=False, max_lines=1,
        )
        tth = block_height(ls, lsh)
        draw_lines(draw, (strip_x0 + int(strip_h * 0.45), sy + (strip_h - tth) // 2), ls, fx, (35, 37, 45), lsh)
        sy += strip_h + strip_gap
    return canvas


# ---------------------------------------------------------------------------
# Katalog
# ---------------------------------------------------------------------------

TEMPLATES: dict[str, Callable[[int, int, ProductAsset, CardSpec], Image.Image]] = {
    "light_chips": render_light_chips,
    "dark_premium": render_dark_premium,
    "color_bold": render_color_bold,
    "stats_side": render_stats_side,
    "ribbon_badge": render_ribbon_badge,
}

TEMPLATE_ORDER: list[str] = list(TEMPLATES.keys())


# ---------------------------------------------------------------------------
# Fallback matnlar (til uchun)
# ---------------------------------------------------------------------------

_FALLBACK_SPECS: dict[str, CardSpec] = {
    "uz": CardSpec(
        title="Sifatli mahsulot",
        subtitle="Qulay narx va tezkor yetkazib berish",
        badge="HIT",
        features=[
            {"title": "Sifat", "text": "Tekshirilgan mahsulot"},
            {"title": "Qulay", "text": "Oson foydalanish"},
            {"title": "Tezkor", "text": "Tez yetkazib berish"},
            {"title": "Qo'llab", "text": "Doimiy qo'llab-quvvatlash"},
        ],
        stats=[],
    ),
    "ru": CardSpec(
        title="Качественный товар",
        subtitle="Удобная цена и быстрая доставка",
        badge="HIT",
        features=[
            {"title": "Качество", "text": "Проверенный товар"},
            {"title": "Удобно", "text": "Просто в использовании"},
            {"title": "Быстро", "text": "Быстрая доставка"},
            {"title": "Поддержка", "text": "Всегда на связи"},
        ],
        stats=[],
    ),
    "en": CardSpec(
        title="Quality product",
        subtitle="Great price and fast delivery",
        badge="HIT",
        features=[
            {"title": "Quality", "text": "Verified product"},
            {"title": "Easy", "text": "Simple to use"},
            {"title": "Fast", "text": "Quick delivery"},
            {"title": "Support", "text": "Always here to help"},
        ],
        stats=[],
    ),
}


def default_spec(lang: str) -> CardSpec:
    base = _FALLBACK_SPECS.get(lang, _FALLBACK_SPECS["en"])
    return CardSpec(
        title=base.title,
        subtitle=base.subtitle,
        badge=base.badge,
        features=[dict(f) for f in base.features],
        stats=[dict(s) for s in base.stats],
    )
