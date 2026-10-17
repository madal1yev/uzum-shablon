import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@marketpix/validation';
import { dict, type TranslationKey } from './dict';

export { dict };
export type { TranslationKey };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  return isLocale(value) ? value : fallback;
}

export interface TranslateOptions {
  /** Interpolatsiya: t('...',{ count: 3 }) -> matndagi {count} o'rniga qo'yiladi */
  vars?: Record<string, string | number>;
}

/** Kalit topilmasa o'xshash tilda qidiradi, so'ng fallbackda qoladi. */
export function translate(locale: Locale, key: TranslationKey, options: TranslateOptions = {}): string {
  const primary = (dict[locale] as Record<string, string | undefined>)[key];
  const secondary = (dict[DEFAULT_LOCALE] as Record<string, string | undefined>)[key];
  const template = primary ?? secondary ?? key;
  if (!options.vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(options.vars, name) ? String(options.vars[name]) : m,
  );
}

export function createTranslator(locale: Locale) {
  return (key: TranslationKey, options?: TranslateOptions) => translate(locale, key, options);
}

/** Til nomlari вЂ” tanlash menyulari uchun doim 3 tilda ko'rinadi. */
export const localeNames: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Р СѓСЃСЃРєРёР№',
  en: 'English',
};

const intlCache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(key: string, make: () => T): T {
  const hit = intlCache.get(key);
  if (hit) return hit as T;
  const made = make();
  intlCache.set(key, made);
  return made;
}

const intlLocale: Record<Locale, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

export function formatDate(locale: Locale, value: Date | number | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'вЂ”';
  return cached(`d:${locale}`, () =>
    new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: 'medium', timeStyle: 'short' }),
  ).format(date);
}

export function formatNumber(locale: Locale, value: number): string {
  return cached(`n:${locale}`, () => new Intl.NumberFormat(intlLocale[locale])).format(value);
}

const currencyByLocale: Record<Locale, string> = { uz: 'UZS', ru: 'UZS', en: 'USD' };

export function formatCurrency(locale: Locale, amount: number, currency?: string): string {
  return cached(`c:${locale}:${currency ?? currencyByLocale[locale]}`, () =>
    new Intl.NumberFormat(intlLocale[locale], {
      style: 'currency',
      currency: currency ?? currencyByLocale[locale],
      maximumFractionDigits: 0,
    }),
  ).format(amount);
}
