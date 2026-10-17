export interface Feature {
  title: string;
  text: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface CardSpec {
  title: string;
  subtitle: string;
  badge: string;
  features: Feature[];
  stats: Stat[];
}

export type TemplateKey =
  | "light_chips"
  | "dark_premium"
  | "color_bold"
  | "stats_side"
  | "ribbon_badge";

export const TEMPLATE_ORDER: TemplateKey[] = [
  "light_chips",
  "dark_premium",
  "color_bold",
  "stats_side",
  "ribbon_badge",
];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ProductAsset {
  /** Cutout (shaffof PNG) yoki oddiy rasm. */
  image: CanvasImageSource;
  /** Rasm tabiiy o'lchamlari. */
  width: number;
  height: number;
  dominant: Rgb;
  hasCutout: boolean;
  /** Brend kit: logotip va asosiy rang (ixtiyoriy). */
  logo?: CanvasImageSource | null;
  brandColor?: Rgb | null;
}

export interface CardSize {
  key: string;
  width: number;
  height: number;
}

export const PRESET_SIZES: CardSize[] = [
  { key: "uzum", width: 1080, height: 1440 },
  { key: "square", width: 1080, height: 1080 },
  { key: "ig", width: 1080, height: 1350 },
  { key: "stories", width: 1080, height: 1920 },
];

export const FALLBACK_ACCENT: Rgb = { r: 0x6c, g: 0x3c, b: 0xff };
