export const CARD_FONT = "MarketPixSans";

let ready: Promise<void> | null = null;

export function fontString(size: number, weight: 400 | 700 | 800 = 700): string {
  return `${weight} ${Math.max(8, Math.round(size))}px "${CARD_FONT}", system-ui, sans-serif`;
}

/** Montserrat (bold + medium) ni yuklaydi. Canvas chizishdan oldin chaqiriladi. */
export function ensureFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (ready) return ready;
  ready = (async () => {
    const defs: Array<{ url: string; weight: string }> = [
      { url: "/fonts/Montserrat-Bold.ttf", weight: "700" },
      { url: "/fonts/Montserrat-Medium.ttf", weight: "400" },
    ];
    for (const d of defs) {
      try {
        const face = new FontFace(CARD_FONT, `url(${d.url})`, { weight: d.weight });
        await face.load();
        (document.fonts as FontFaceSet).add(face);
      } catch {
        /* fallback shrift ishlatiladi */
      }
    }
    try {
      await document.fonts.load(fontString(64, 700));
      await document.fonts.load(fontString(64, 400));
      await document.fonts.ready;
    } catch {
      /* e'tiborsiz */
    }
  })();
  return ready;
}
