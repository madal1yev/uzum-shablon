# MarketPix AI — sessiya holati (resume qilish uchun)

> Bu fayl avtomatik yozilgan "qayerda qoldik" eslatmasi.
> Keyingi sessiyada shu faylni o'qib, `KEYINGI QADAMLAR` bo'yicha davom eting.

## Muhit (tekshirilgan va ishga tushirilgan)

| Xizmat | Holat | Ma'lumot |
|---|---|---|
| Node.js | ✅ v24.20.0 | npm 11.19.0 |
| PostgreSQL 16 | ✅ ishlayapti | `C:\Program Files\PostgreSQL\16`, xizmat `postgresql-x64-16`, port 5432, login `postgres`, parol `postgres` |
| PostgreSQL baza | ✅ yaratildi | `marketpix` (boshqa bazalarga tegmang: hermes, hermes_ai, yurist, ai_mkt_test, app) |
| Redis | ✅ xizmat sifatida | `C:\tools\redis` (tporadowski 5.0.14.1), xizmat nomi `MarketPixRedis`, port 6379 |
| Git | ❌ o'rnatilmagan | ixtiyoriy |
| Docker | ❌ yo'q | docker-compose fayllar yoziladi, lekin mahalliy ishga tushirish Docker'siz |
| Developer Mode | ✅ yoqildi | symlink/junction ishlaydi (HKLM AppModelUnlock AllowDevelopmentWithoutDevLicense=1). **Bu npm workspaces uchun majburiy edi.** |

## Loyiha: `C:\Users\New\Desktop\uzum-shablon`

npm workspaces monorepo qurildi. `npm install` o'tdi (732 paket).
Install scriptlar: `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild` **approve** qilindi; `@scarf/scarf`, `msgpackr-extract` **deny** qilindi.

### Paket versiyalari (muhim, moslashuvchan qat'iy tanlov)

- typescript `~5.9.3` (TS 7 emas — NestJS decoratorlar uchun)
- NestJS `^11.x` (swagger 11.4.7, jwt 11.0.2, passport 11.0.5, cli 11.0.24, testing 11.2.7)
- `@nestjs/config` `^4.0.4` (Nest 11 bilan mos; 5-11 oralig'i yo'q, keyingi 12)
- `@nestjs/throttler` `^6.7.1`
- prisma / @prisma/client `^6.19.3` (7 emas — generator API farqli)
- next `15.5.27`, react `^19.1.1`, tailwindcss `^4.3.3`
- sharp `^0.35.5`, bullmq `^5.81.5`, ioredis `^5.11.1`, grammy `^1.46.0`, zod `^3.25.76`
- vitest `^3.2.7`

## Tayyor bo'lgan narsalar

1. Root: `package.json` (workspaces), `tsconfig.base.json`, `.gitignore`, `.prettierrc`, `.env.example`, `.env` (mahalliy, gitignored)
2. `packages/shared-types` — enum/tiplar
3. `packages/config` — zod bilan env validatsiya + `externalServiceStatus()`
4. `packages/validation` — auth/job/preset/payment DTO sxemalari
5. `packages/localization` — uz/ru/en lug'at + Intl formatlash
6. `apps/api/prisma/schema.prisma` — to'liq model (User, Session, PasswordResetToken, AccountConnection, Asset, ImagePreset, GenerationJob, JobEvent, CreditBalance, CreditLedger, PricingRule, CreditPackage, Subscription, Payment, WebhookEvent, Notification, AuditLog, ProviderUsage, Setting)
7. **Migratsiya qo'llandi**: `apps/api/prisma/migrations/20261012173426_init/`
8. API manba qismlari yozildi (quyida ro'yxat), **LEKIN HALI BUILD/QABUL QILINMADI**

### apps/api/src yozilgan fayllar

- `main.ts`, `app.module.ts` (**HALI YO'Q** — main.ts undan import qiladi)
- `common/logger.ts`, `common/request-id.middleware.ts`, `common/all-exceptions.filter.ts`
- `common/decorators/current-user.decorator.ts`
- `common/guards/jwt-auth.guard.ts`, `common/guards/roles.guard.ts`
- `common/pipes/zod-validation.pipe.ts`
- `prisma/prisma.module.ts`, `prisma/prisma.service.ts`
- `redis/redis.module.ts`, `redis/redis.service.ts`
- `storage/storage.module.ts`, `storage/storage.service.ts` (local + s3 adapter, path-traversal himoyasi)
- `image/image.module.ts`, `image/image.service.ts` (sharp: sniff, placeOnCanvas, composite, applyInfographic SVG)
- `ai/provider.types.ts`, `ai/openai-images.provider.ts`, `ai/remove-bg.provider.ts`, `ai/ai-provider.service.ts`, `ai/ai.module.ts`
- `credits/credits.service.ts`, `credits.controller.ts`, `credits.module.ts` (shartli UPDATE bilan atomik reserve/charge/refund)
- `jobs/queue.ts`, `jobs/jobs.service.ts`, `jobs/jobs.processor.ts`, `jobs/jobs.controller.ts`, `jobs/jobs.module.ts`

## KEYINGI QADAMLAR (navbatma-navbat)

1. **`jobs/jobs.module.ts` dagi `void Inject;` va `Inject` importini o'chirish** (oxirgi edit bekor qilindi)
2. `apps/api/src/app.module.ts` yozish (global modullar, throttler, config)
3. `assets/` moduli: multer upload (memory), magic-byte tekshiruvi, `GET /assets/:id/download` (egasi tekshiruvi bilan)
4. `presets/` moduli + seed (ImagePreset)
5. `auth/` moduli: register/login/refresh/logout/forgot/reset + bcrypt + httpOnly cookie (`mp_access`, `mp_refresh`)
6. `users/` (profile, o'chirish), `health/` (`/health`, `/ready`)
7. `telegram/` (HMAC imzolangan bot uchun endpoint + akkaunt ulash)
8. `payments/` (adapter, `none` holatida aniq 503)
9. `admin/` (RolesGuard, foydalanuvchi/ledjer/preset/pProvayder)
10. `seed.ts` (presetlar + pricing rules + credit packages)
11. `apps/web` — Next.js: landing, auth, studio, history, credits, settings, admin
12. `apps/telegram-bot` — grammY: uz/ru/en, inline keyboard, API bilan HMAC orqali
13. `infra/docker/*`, `docs/*`
14. `npm run build` → xatolarni tuzatish → API'ni ishga tushirish → curl bilan tekshirish

## Muhim arxitektura qarorlari (o'zgartirmang)

- **Paketlar CommonJS** (`module: commonjs`, `moduleResolution: node10`). NestJS shuni talab qiladi.
- **Cookie + Bearer ikkalasi ham qabul qilinadi**: `mp_access`, `mp_refresh` httpOnly cookie; bot/testlar `Authorization: Bearer`.
- **Bot autentifikatsiyasi**: user trust qilinmaydi. `TELEGRAM_LINK_SECRET` bilan HMAC imzosi tekshiriladi.
- **AI provayder sozlanmagan** (`AI_PROVIDER=none`) — bu ongli holat: standart resize ishlaydi, AI rejimlari `NOT_CONFIGURED` xatosini qaytaradi. Sun'iy muvaffaqiyat YO'Q.
- **Kredit**: `RESERVE` (balance↓ reserved↑) → `CHARGE` (reserved↓) yoki `REFUND` (reserved↓ balance↑). Idempotency kalitlari `reserve:<jobId>`, `charge:<jobId>`, `refund:<jobId>`.
- **"Boshqa variant"** = yangi job yaratadi, eski rasmni qaytarmaydi.
- **Narx**: `PricingRule` jadvalidan, bo'sh bo'lsa `.env` dan.

## Boshqa loyihalar (tegma!)

- `C:\Users\New\Desktop\Abdulaziz\hermes-agent-grupa` — Hermes Telegram agent + dashboard (port 7788/7789). U alohida loyiha.
- PostgreSQL'dagi `hermes`, `hermes_ai`, `yurist`, `ai_mkt_test`, `app` bazalari boshqa loyihalarniki.
