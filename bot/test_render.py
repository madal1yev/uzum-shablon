"""Sintetik render testi: barcha shablonlar x barcha o'lchamlar.

Ishlatish:  python test_render.py
Natijalar:  test_out/ papkasi (rasmlarni ko'zdan kechiring).
Bu skript rembg/tarmoqsiz ishlaydi (sun'iy mahsulot rasmi chiziladi).
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from PIL import Image, ImageDraw, ImageFilter

import cards
import imaging
from cards import CardSpec, ProductAsset

OUT = Path(__file__).resolve().parent / "test_out"
SIZES = [
    ("uzum_3x4", 1080, 1440),
    ("square_1x1", 1080, 1080),
    ("instagram_4x5", 1080, 1350),
    ("stories_9x16", 1080, 1920),
]


def synthetic_product(color=(255, 94, 58)) -> Image.Image:
    """Shaftoli rangli telefon-simon mahsulot (RGBA, shaffof fon)."""
    w = h = 800
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # tana
    d.rounded_rectangle([200, 60, 600, 740], radius=70, fill=color)
    # ekran
    d.rounded_rectangle([225, 90, 575, 710], radius=55, fill=(20, 22, 30))
    d.rounded_rectangle([245, 115, 555, 685], radius=45, fill=(60, 120, 220))
    # kamera
    d.ellipse([500, 500, 545, 545], fill=(240, 240, 245))
    # highlight
    hl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([(260, 120), (420, 120), (300, 680), (260, 680)], fill=(255, 255, 255, 40))
    img.alpha_composite(hl)
    return img


def synced_spec() -> CardSpec:
    return CardSpec(
        title="Avtomatik kofemashina professional",
        subtitle="Kuchli va tezkor qahva tayyorlovchi qurilma",
        badge="HIT",
        features=[
            {"title": "Tezkor", "text": "15 soniyada tayyor"},
            {"title": "Sifat", "text": "Kuchli po'lat korpus"},
            {"title": "Qulay", "text": "Oson tozalash"},
            {"title": "Zamonaviy", "text": "Sensor boshqaruv"},
        ],
        stats=[
            {"value": "256 GB", "label": "Xotira"},
            {"value": "15 bar", "label": "Bosim"},
            {"value": "1.5 L", "label": "Hajm"},
        ],
    )


def make_asset() -> ProductAsset:
    prod = synthetic_product()
    prod = imaging._trim_alpha(prod)
    dom = cards.dominant_color(prod)
    preview = imaging._preview_jpeg(prod, "RGBA")
    return ProductAsset(image=prod, dominant=dom, has_cutout=True, preview_jpeg=preview)


def make_flat_asset() -> ProductAsset:
    """Cutout bo'lmagan holat: fon ichida oddiy rasm (rounded card yo'li)."""
    prod = synthetic_product((40, 170, 110))
    bg = Image.new("RGB", (900, 900), (235, 236, 240))
    bg.paste(prod, (50, 50), prod)
    return ProductAsset(image=bg, dominant=cards.dominant_color(bg), has_cutout=False, preview_jpeg=b"")


def verify_units() -> list[str]:
    """fit_text hech qachon chetga chiqmasligi va kontrast qoidalarini tekshiradi."""
    problems: list[str] = []
    probe = Image.new("RGB", (10, 10))
    d = ImageDraw.Draw(probe)
    samples = [
        ("Avtomatik kofemashina professional", 500, 200),
        ("X" * 90, 400, 120),
        ("Elektron", 300, 100),
        ("O'ta uzun so'z turlari va boshqalar", 260, 90),
        ("Качественный товар премиум класса", 360, 120),
    ]
    for text, mw, mh in samples:
        font, lines, lh = cards.fit_text(d, text, mw, mh, 80, min_size=14)
        for ln in lines:
            if d.textlength(ln, font=font) > mw + 2:
                problems.append(f"overflow: '{ln[:30]}' > {mw}")
        if lh * len(lines) > mh + 2:
            problems.append(f"vert overflow: '{text[:20]}' {lh * len(lines)} > {mh}")

    for bg in [(255, 255, 255), (0, 0, 0), (255, 240, 120), (108, 60, 255), (240, 200, 90)]:
        fg = cards.contrast_text(bg)
        ratio = (cards.luminance(fg) + 0.05) / (cards.luminance(bg) + 0.05)
        ratio = max(ratio, 1 / ratio)
        if ratio < 3.0:
            problems.append(f"past kontrast: bg={bg} fg={fg} ratio={ratio:.2f}")
    return problems


def make_contact_sheet() -> Path | None:
    """Barcha shablonlarni bitta ko'rish uchun kontakt-varaq."""
    cols = len(cards.TEMPLATE_ORDER)
    rows = [(f"cutout_{tpl}_uzum_3x4_1080x1440.jpg", tpl) for tpl in cards.TEMPLATE_ORDER]
    thumbs: list[Image.Image] = []
    for name, _ in rows:
        p = OUT / name
        if not p.exists():
            return None
        im = Image.open(p)
        im.thumbnail((360, 480), Image.LANCZOS)
        thumbs.append(im.convert("RGB"))
    if not thumbs:
        return None
    tw, th = thumbs[0].size
    sheet = Image.new("RGB", (cols * tw, th), (255, 255, 255))
    for i, im in enumerate(thumbs):
        sheet.paste(im, (i * tw, 0))
    path = OUT / "contact_sheet.jpg"
    sheet.save(path, quality=88)
    return path


def main() -> int:
    OUT.mkdir(exist_ok=True)
    asset = make_asset()
    flat = make_flat_asset()
    spec = synced_spec()

    print(f"Dominant rang: {cards.rgb_to_hex(asset.dominant)}  (flat: {cards.rgb_to_hex(flat.dominant)})")
    print("-" * 72)

    errors: list[str] = []
    total = 0
    for tpl in cards.TEMPLATE_ORDER:
        for name, w, h in SIZES:
            try:
                img = imaging.render_card(asset, spec, tpl, w, h)
                assert img.size == (w, h), f"o'lcham xato {img.size}"
                path = OUT / f"cutout_{tpl}_{name}_{w}x{h}.jpg"
                path.write_bytes(imaging.to_jpeg_bytes(img, 90))
                total += 1
                print(f"OK  {tpl:12s} {name:14s} {w}x{h}")
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{tpl} {name}: {exc!r}")
                print(f"XATO {tpl:12s} {name:14s} {w}x{h}  ->  {exc!r}")

    # cutout bo'lmagan holat
    for tpl in cards.TEMPLATE_ORDER:
        try:
            img = imaging.render_card(flat, spec, tpl, 1080, 1440)
            (OUT / f"flat_{tpl}_1080x1440.jpg").write_bytes(imaging.to_jpeg_bytes(img, 90))
            total += 1
            print(f"OK  flat/{tpl:12s} 1080x1440")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"flat/{tpl}: {exc!r}")
            print(f"XATO flat/{tpl:12s} -> {exc!r}")

    # stats yo'q (features fallback) va tillar bo'yicha fallback spec
    for lang in ("uz", "ru", "en"):
        fs = cards.default_spec(lang)
        for tpl in cards.TEMPLATE_ORDER:
            img = imaging.render_card(asset, fs, tpl, 1080, 1080)
            (OUT / f"fallback_{lang}_{tpl}_1080x1080.jpg").write_bytes(imaging.to_jpeg_bytes(img, 88))
            total += 1

    # juda uzun sarlavha / bitta uzun so'z
    stress = CardSpec(
        title="Elektron",
        subtitle="X" * 90,
        badge="SUPERNOVA",
        features=[{"title": "A" * 30, "text": "B" * 60}] * 4,
        stats=[{"value": "999999 GB", "label": "Xotira"}],
    )
    for tpl in cards.TEMPLATE_ORDER:
        img = imaging.render_card(asset, stress, tpl, 1080, 1080)
        (OUT / f"stress_{tpl}.jpg").write_bytes(imaging.to_jpeg_bytes(img, 85))
        total += 1

    print("-" * 72)
    unit_problems = verify_units()
    print(f"Unit tekshiruv (fit/kontrast): {'OK' if not unit_problems else 'PROBLEM'}")
    for p in unit_problems:
        print("  !", p)
    errors.extend(unit_problems)
    print(f"Jami render: {total}, xato: {len(errors)}")
    for e in errors:
        print("  -", e)
    sheet = make_contact_sheet()
    if sheet:
        print(f"Kontakt-varaq: {sheet}")
    print(f"Natijalar: {OUT}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
