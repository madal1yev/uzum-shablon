"""Rasm bilan ishlash: rembg cutout, fonga ajratish, render, JPEG/ZIP.

Yagona render API: render_card(asset, spec, template, w, h) -> PIL.Image (RGB).
Barcha og'ir ishlar chaqiruvchi tomonda asyncio.to_thread orqali bajariladi.
"""

from __future__ import annotations

import io
import os
import zipfile
from pathlib import Path

from PIL import Image, ImageOps

import cards
from cards import CardSpec, ProductAsset

Image.MAX_IMAGE_PIXELS = 64_000_000

SUPERSAMPLE = 2
MAX_SIDE = 2400
PREVIEW_MAX = 1024

_rembg_session = None
_rembg_model = os.getenv("REMBG_MODEL", "u2net")


# ---------------------------------------------------------------------------
# Kirish rasmini ochish
# ---------------------------------------------------------------------------


def open_image(data: bytes) -> Image.Image:
    """Baytlardan rasm ochadi, EXIF orientatsiyani tuzatadi."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img


def _resize_max(img: Image.Image, max_side: int = MAX_SIDE) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_side:
        return img
    scale = max_side / longest
    return img.resize((max(2, int(w * scale)), max(2, int(h * scale))), Image.LANCZOS)


def _looks_transparent(img: Image.Image) -> bool:
    if img.mode not in ("RGBA", "LA", "P"):
        return False
    rgba = img.convert("RGBA")
    alpha = rgba.getchannel("A")
    lo, hi = alpha.getextrema()
    if lo >= 250:
        return False
    # shaffof piksellar ulushi mazmunli bo'lishi kerak
    hist = alpha.histogram()
    transparent = sum(hist[:16])
    total = sum(hist) or 1
    return transparent / total > 0.02


# ---------------------------------------------------------------------------
# rembg
# ---------------------------------------------------------------------------


def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session

        _rembg_session = new_session(_rembg_model)
    return _rembg_session


def warmup_rembg() -> str:
    """Modelni oldindan yuklaydi (birinchi ishga tushirishda ~170 MB)."""
    session = _get_rembg_session()
    return type(session).__name__ if session is not None else "ok"


def _cutout(img: Image.Image) -> Image.Image:
    from rembg import remove

    rgba = img.convert("RGBA")
    out = remove(rgba, session=_get_rembg_session())
    if out.mode != "RGBA":
        out = out.convert("RGBA")
    return out


# ---------------------------------------------------------------------------
# Mahsulot tayyorlash
# ---------------------------------------------------------------------------


def prepare_product_sync(data: bytes, use_rembg: bool = True) -> ProductAsset:
    """Baytdan ProductAsset tayyorlaydi: cutout + dominant rang + Gemini preview.

    Xato bo'lsa ham bot yiqilmaydi: oddiy rasm (cutout emas) qaytadi.
    """
    img = open_image(data)
    img = _resize_max(img, MAX_SIDE)

    cutout: Image.Image | None = None
    if _looks_transparent(img):
        cutout = img.convert("RGBA")
        has_cutout = True
    elif use_rembg:
        try:
            cand = _cutout(img)
            alpha = cand.getchannel("A")
            lo, hi = alpha.getextrema()
            hist = alpha.histogram()
            opaque = sum(hist[128:])
            total = sum(hist) or 1
            if hi > 0 and lo < 250 and opaque / total > 0.03:
                cutout = cand
                has_cutout = True
            else:
                cutout = None
                has_cutout = False
        except Exception:
            cutout = None
            has_cutout = False
    else:
        has_cutout = False

    if cutout is not None:
        cutout = _trim_alpha(cutout)
        dom = cards.dominant_color(cutout)
        asset_img = cutout
    else:
        rgb = img.convert("RGB")
        dom = cards.dominant_color(rgb)
        asset_img = rgb

    preview = _preview_jpeg(cutout if cutout is not None else asset_img, "RGBA" if cutout is not None else "RGB")
    return ProductAsset(image=asset_img, dominant=dom, has_cutout=has_cutout, preview_jpeg=preview)


def _trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.getchannel("A").getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def _preview_jpeg(img: Image.Image, mode: str) -> bytes:
    if mode == "RGBA":
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.alpha_composite(img)
        out = bg.convert("RGB")
    else:
        out = img.convert("RGB")
    out = _resize_max(out, PREVIEW_MAX)
    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Render (yagona API)
# ---------------------------------------------------------------------------


def render_card(
    asset: ProductAsset,
    spec: CardSpec,
    template: str,
    width: int,
    height: int,
    supersample: int = SUPERSAMPLE,
) -> Image.Image:
    """Berilgan shablon va o'lchamda kartani chizadi (2x supersampling + LANCZOS)."""
    if template not in cards.TEMPLATES:
        template = cards.TEMPLATE_ORDER[0]
    width = max(300, min(4000, int(width)))
    height = max(300, min(4000, int(height)))
    ss = max(1, int(supersample))
    fn = cards.TEMPLATES[template]
    img = fn(width * ss, height * ss, asset, spec)
    if ss > 1:
        img = img.resize((width, height), Image.LANCZOS)
    return img.convert("RGB")


def render_card_name(template: str, width: int, height: int, index: int) -> str:
    """ZIP uchun tartibli fayl nomi: 01_card_light_chips_1080x1440.jpg"""
    return f"{index:02d}_card_{template}_{width}x{height}.jpg"


# ---------------------------------------------------------------------------
# Eksport
# ---------------------------------------------------------------------------


def to_jpeg_bytes(img: Image.Image, quality: int = 92) -> bytes:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def build_zip(items: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for name, data in items:
            zf.writestr(name, data)
    return buf.getvalue()


def png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
