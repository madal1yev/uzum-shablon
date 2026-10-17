# Marketplace reklama-karta (infografika) Telegram AI-bot

Foydalanuvchi mahsulot rasmini yuboradi. Bot fonni olib tashlaydi (rembg), Google Gemini
bilan reklama matnini yozadi va Uzum / Wildberries uslubidagi reklama kartalarini turli
shablonlarda tayyorlab beradi. "Boshqa variant" tugmasi bilan yangi dizayn, "ZIP" bilan
barcha variantlar bitta arxivda.

Bu oddiy "resize" boti emas — asosiy qiymat: tayyor sotuvchi kartochkasi.

## Texnologiyalar
- Python 3.11+
- aiogram 3.x (async, polling)
- Pillow (2x supersampling bilan render)
- rembg (lokal fonni ajratish)
- Google Gemini (vision, JSON matn)
- python-dotenv, aiohttp

## Tezkor ishga tushirish (Windows)
1. `.env` faylini tayyorlang:
   ```
   copy .env.example .env
   ```
2. `.env` ichiga `BOT_TOKEN` (va ixtiyoriy `GEMINI_API_KEY`) yozing.
3. Ikki marta `run.bat` bosing. Bot avtomatik:
   - virtual muhit yaratadi,
   - kutubxonalarni o'rnatadi,
   - `diagnose.py` ni ishga tushiradi,
   - botni polling rejimida ishga tushiradi.

## Linux / macOS
```
chmod +x run.sh
./run.sh
```

## Qo'lda ishga tushirish
```
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python diagnose.py
python bot.py
```

## Foydalanish
1. `/start` → til tanlang (uz / ru / en).
2. Mahsulot rasmini yuboring (photo yoki hujjat). Rasm tagiga mahsulot nomini yozing:
   `iPhone 15 Pro 256GB`.
3. O'lchamni tanlang: Uzum 3:4, 1:1, Instagram 4:5, Stories 9:16 yoki o'z o'lchamingiz
   (masalan `1200x1600`).
4. Kartani olasiz. Tugmalar:
   - 🔄 Boshqa variant — keyingi shablon
   - ✍️ Boshqa matn — Gemini'dan yangi matn
   - 📥 Fayl — to'liq sifatli JPEG (hujjat sifatida)
   - 📦 Hammasi ZIP — barcha shablonlar bitta arxivda
   - 📐 Boshqa o'lcham — yangi o'lcham tanlash
5. Alohida matn yuborsangiz (rasm allaqachon yuborilgan bo'lsa) — u hint sifatida
   qabul qilinib, karta qayta yaratiladi.

## Muhim .env sozlamalari
| Kalit | Tavsif | Standart |
|---|---|---|
| `BOT_TOKEN` | Telegram bot tokeni | (majburiy) |
| `GEMINI_API_KEY` | Gemini API kaliti. Bo'sh = fallback matn | (ixtiyoriy) |
| `GEMINI_MODEL` | Gemini modeli | `gemini-2.0-flash` |
| `DEFAULT_LANG` | Interfeys tili (`uz`/`ru`/`en`) | `uz` |
| `USE_REMBG` | `1` = fonni ajratish, `0` = o'chirilgan | `1` |
| `REMBG_MODEL` | rembg modeli (birinchi marta ~170 MB) | `u2net` |
| `MAX_PARALLEL` | Parallel og'ir vazifalar | `2` |

## Shablonlar (5 ta)
`cards.py` ichida, har biri alohida funksiya:
- `light_chips` — yorug' gradient + oq panel ichida 4 afzallik
- `dark_premium` — qora fon, glow, 2×2 shisha kartalar
- `color_bold` — to'liq rangli fon, katta doira, raqamli kartalar
- `stats_side` — chapda qora statistik bloklar, o'ngda mahsulot, pastda badge
- `ribbon_badge` — rangli lenta-sarlavha, doira-nishon, check-lentalar

Ranglar mahsulotning dominant rangidan avtomatik olinadi. Matn kontrasti fon
yorqinligiga qarab avtomatik oq/qora tanlanadi.

## Sinov
Sintetik mahsulot rasmi bilan barcha shablonlar × o'lchamlarni render qilish:
```
python test_render.py
```
Natijalar `test_out/` papkasiga tushadi — rasmlarni ko'zdan kechiring.

## Loyiha tuzilishi
```
bot/
├── bot.py            # aiogram handlerlar, sessiya, tugmalar
├── cards.py          # shablonlar, fit_text, ranglar
├── imaging.py        # rembg cutout, render, JPEG/ZIP
├── ai.py             # Gemini so'rovi, JSON parse, fallback
├── i18n.py           # uz/ru/en matnlar
├── diagnose.py       # muhit tekshiruvi
├── test_render.py    # sintetik render testi
├── fonts/            # Montserrat-Bold, Montserrat-Medium
├── requirements.txt
├── .env.example
├── run.bat           # Windows ishga tushirish
└── run.sh            # Linux/macOS ishga tushirish
```

## 2-bosqich (reja, hozircha faqat arxitektura)
- SQLite: foydalanuvchilar, kunlik limit, tarix
- Tarif/to'lov (Click / Payme), bepul limit
- Admin buyruqlari (statistika, broadcast)
- AI fon generatsiyasi (Gemini image model) — alohida tarif
- Web-versiya (React + FastAPI) bir xil `cards.py` yadrosi bilan
- Foydalanuvchi o'z logotipi va rang palitrasini yuklashi (brend kit)
