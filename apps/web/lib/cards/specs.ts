import type { CardSpec } from "./types";

const UZ: CardSpec = {
  title: "Sifatli mahsulot",
  subtitle: "Qulay narx va tezkor yetkazib berish",
  badge: "HIT",
  features: [
    { title: "Sifat", text: "Tekshirilgan mahsulot" },
    { title: "Qulay", text: "Oson foydalanish" },
    { title: "Tezkor", text: "Tez yetkazib berish" },
    { title: "Qo'llab", text: "Doimiy yordam" },
  ],
  stats: [],
};

const RU: CardSpec = {
  title: "Качественный товар",
  subtitle: "Удобная цена и быстрая доставка",
  badge: "HIT",
  features: [
    { title: "Качество", text: "Проверенный товар" },
    { title: "Удобно", text: "Просто в использовании" },
    { title: "Быстро", text: "Быстрая доставка" },
    { title: "Поддержка", text: "Всегда на связи" },
  ],
  stats: [],
};

const EN: CardSpec = {
  title: "Quality product",
  subtitle: "Great price and fast delivery",
  badge: "HIT",
  features: [
    { title: "Quality", text: "Verified product" },
    { title: "Easy", text: "Simple to use" },
    { title: "Fast", text: "Quick delivery" },
    { title: "Support", text: "Always here to help" },
  ],
  stats: [],
};

export function defaultSpec(lang: string): CardSpec {
  const src = lang === "ru" ? RU : lang === "en" ? EN : UZ;
  return {
    title: src.title,
    subtitle: src.subtitle,
    badge: src.badge,
    features: src.features.map((f) => ({ ...f })),
    stats: src.stats.map((s) => ({ ...s })),
  };
}
