"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canvasToBlob,
  downloadBlob,
  fileName,
  loadImageFromFile,
  prepareAsset,
  renderAllTemplates,
  renderCard,
} from "@/lib/cards/engine";
import { hexToRgb } from "@/lib/cards/colors";
import { defaultSpec } from "@/lib/cards/specs";
import { buildZip } from "@/lib/cards/zip";
import {
  PRESET_SIZES,
  TEMPLATE_ORDER,
  type CardSpec,
  type ProductAsset,
  type TemplateKey,
} from "@/lib/cards/types";
import { LANGS, TEMPLATE_LABELS, t, type Lang } from "@/lib/i18n";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow rounded-2xl bg-white p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function StudioPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [spec, setSpec] = useState<CardSpec>(() => defaultSpec("uz"));
  const [asset, setAsset] = useState<ProductAsset | null>(null);
  const [fileNameState, setFileNameState] = useState("");
  const [hint, setHint] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("light_chips");
  const [sizeKey, setSizeKey] = useState("uzum");
  const [useCustom, setUseCustom] = useState(false);
  const [customW, setCustomW] = useState(1200);
  const [customH, setCustomH] = useState(1600);
  const [brandColor, setBrandColor] = useState("");
  const [logo, setLogo] = useState<CanvasImageSource | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const renderToken = useRef(0);

  const width = useCustom ? customW : PRESET_SIZES.find((s) => s.key === sizeKey)?.width ?? 1080;
  const height = useCustom ? customH : PRESET_SIZES.find((s) => s.key === sizeKey)?.height ?? 1440;

  const effAsset = useMemo<ProductAsset | null>(() => {
    if (!asset) return null;
    return { ...asset, brandColor: brandColor ? hexToRgb(brandColor) : null, logo };
  }, [asset, brandColor, logo]);

  const doRender = useCallback(async () => {
    if (!effAsset) return;
    if (width < 300 || width > 4000 || height < 300 || height > 4000) {
      setError(t(lang, "err_size"));
      return;
    }
    const token = ++renderToken.current;
    setBusy(true);
    try {
      const canvas = await renderCard(effAsset, spec, template, width, height);
      if (token !== renderToken.current) return;
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.86));
      setBlob(await canvasToBlob(canvas, 0.92));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render xatosi");
    } finally {
      if (token === renderToken.current) setBusy(false);
    }
  }, [effAsset, spec, template, width, height, lang]);

  useEffect(() => {
    void doRender();
  }, [doRender]);

  function pickLang(l: Lang) {
    setLang(l);
    setSpec(defaultSpec(l));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t(lang, "err_image"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const a = await prepareAsset(file);
      setAsset(a);
      setFileNameState(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(lang, "err_image"));
    } finally {
      setBusy(false);
    }
  }

  async function onLogo(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setLogo(await loadImageFromFile(file));
    } catch {
      /* ignore */
    }
  }

  function setField<K extends keyof CardSpec>(key: K, value: CardSpec[K]) {
    setSpec((s) => ({ ...s, [key]: value }));
  }

  function setFeature(i: number, key: "title" | "text", value: string) {
    setSpec((s) => {
      const features = s.features.map((f, idx) => (idx === i ? { ...f, [key]: value } : f));
      return { ...s, features };
    });
  }

  function setStat(i: number, key: "value" | "label", value: string) {
    setSpec((s) => {
      const stats = s.stats.map((st, idx) => (idx === i ? { ...st, [key]: value } : st));
      return { ...s, stats };
    });
  }

  function download() {
    if (!blob) return;
    downloadBlob(blob, fileName(template, 1, width, height));
  }

  async function downloadAll() {
    if (!effAsset) {
      setError(t(lang, "err_no_image"));
      return;
    }
    setBusy(true);
    try {
      const results = await renderAllTemplates(effAsset, spec, width, height);
      const zip = await buildZip(
        results.map((r, i) => ({ name: fileName(r.template, i + 1, width, height), blob: r.blob })),
      );
      downloadBlob(zip, `cards_${width}x${height}.zip`);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP xatosi");
    } finally {
      setBusy(false);
    }
  }

  function nextVariant() {
    const idx = TEMPLATE_ORDER.indexOf(template);
    setTemplate(TEMPLATE_ORDER[(idx + 1) % TEMPLATE_ORDER.length]);
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">M</div>
            <span className="text-lg font-extrabold">MarketPix</span>
          </Link>
          <div className="flex items-center gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => pickLang(l)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                  lang === l ? "bg-brand text-white" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          <Section title={t(lang, "step_upload")}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFile(e.dataTransfer.files?.[0]);
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-zinc-50 px-6 py-10 text-center"
            >
              <p className="mb-4 max-w-sm text-sm text-zinc-500">{t(lang, "upload_hint")}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  {asset ? t(lang, "change_btn") : t(lang, "upload_btn")}
                </button>
                {fileNameState && <span className="text-xs text-zinc-500">{fileNameState}</span>}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </div>
            {asset && (
              <div className="mt-3">
                <Field label={t(lang, "hint_label")}>
                  <input className={inputCls} value={hint} onChange={(e) => setHint(e.target.value)} placeholder={t(lang, "hint_ph")} />
                </Field>
                <p className={`mt-2 text-xs font-semibold ${asset.hasCutout ? "text-emerald-600" : "text-amber-600"}`}>
                  {asset.hasCutout ? `✓ ${t(lang, "cutout_yes")}` : `• ${t(lang, "cutout_no")}`}
                </p>
              </div>
            )}
          </Section>

          <Section title={t(lang, "step_text")}>
            <button
              onClick={() => setSpec(defaultSpec(lang))}
              className="mb-4 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200"
            >
              {t(lang, "apply_auto")}
            </button>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t(lang, "field_title")}>
                <input className={inputCls} value={spec.title} onChange={(e) => setField("title", e.target.value)} />
              </Field>
              <Field label={t(lang, "field_subtitle")}>
                <input className={inputCls} value={spec.subtitle} onChange={(e) => setField("subtitle", e.target.value)} />
              </Field>
              <Field label={t(lang, "field_badge")}>
                <input className={inputCls} value={spec.badge} onChange={(e) => setField("badge", e.target.value)} />
              </Field>
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-zinc-500">{t(lang, "features")}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {spec.features.slice(0, 4).map((f, i) => (
                <div key={i} className="rounded-xl border border-black/5 bg-zinc-50 p-3">
                  <input
                    className={`${inputCls} mb-2`}
                    value={f.title}
                    placeholder={t(lang, "feature_title")}
                    onChange={(e) => setFeature(i, "title", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    value={f.text}
                    placeholder={t(lang, "feature_text")}
                    onChange={(e) => setFeature(i, "text", e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="mb-2 mt-5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500">{t(lang, "stats")}</h3>
              <button
                onClick={() => setField("stats", [...spec.stats, { value: "", label: "" }].slice(0, 4))}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
              >
                + {t(lang, "add_stat")}
              </button>
            </div>
            <div className="space-y-2">
              {spec.stats.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    value={st.value}
                    placeholder={t(lang, "stat_value")}
                    onChange={(e) => setStat(i, "value", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    value={st.label}
                    placeholder={t(lang, "stat_label")}
                    onChange={(e) => setStat(i, "label", e.target.value)}
                  />
                  <button
                    onClick={() => setField("stats", spec.stats.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t(lang, "step_style")}>
            <h3 className="mb-2 text-xs font-bold text-zinc-500">{t(lang, "template")}</h3>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_ORDER.map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => setTemplate(tpl)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    template === tpl ? "bg-brand text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {TEMPLATE_LABELS[tpl][lang]}
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-zinc-500">{t(lang, "size")}</h3>
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setUseCustom(false);
                    setSizeKey(s.key);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    !useCustom && sizeKey === s.key ? "bg-brand text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {s.width}×{s.height}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  useCustom ? "bg-brand text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {t(lang, "custom_size")}
              </button>
            </div>
            {useCustom && (
              <div className="mt-3 flex items-center gap-3">
                <Field label={t(lang, "width")}>
                  <input
                    type="number"
                    className={inputCls}
                    value={customW}
                    min={300}
                    max={4000}
                    onChange={(e) => setCustomW(Number(e.target.value))}
                  />
                </Field>
                <Field label={t(lang, "height")}>
                  <input
                    type="number"
                    className={inputCls}
                    value={customH}
                    min={300}
                    max={4000}
                    onChange={(e) => setCustomH(Number(e.target.value))}
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title={t(lang, "step_brand")}>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <span className="mb-1 block text-xs font-semibold text-zinc-500">{t(lang, "logo")}</span>
                <button
                  onClick={() => logoRef.current?.click()}
                  className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-200"
                >
                  {logo ? t(lang, "change_btn") : t(lang, "logo")}
                </button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onLogo(e.target.files?.[0])}
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold text-zinc-500">{t(lang, "primary_color")}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor || "#6c3cff"}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-white"
                  />
                  <button
                    onClick={() => setBrandColor("")}
                    className={`rounded-full px-3 py-2 text-xs font-bold ${
                      brandColor ? "bg-zinc-100 text-zinc-700" : "bg-brand text-white"
                    }`}
                  >
                    {t(lang, "color_auto")}
                  </button>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-shadow rounded-2xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-500">{t(lang, "preview")}</h2>
              {busy && <span className="text-xs font-semibold text-brand">{t(lang, "generating")}</span>}
            </div>
            <div
              className="grid place-items-center overflow-hidden rounded-xl bg-zinc-100"
              style={{ aspectRatio: `${width} / ${height}` }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />
              ) : (
                <span className="p-6 text-center text-sm text-zinc-400">{t(lang, "empty_preview")}</span>
              )}
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => void doRender()}
                disabled={!asset || busy}
                className="col-span-2 rounded-full bg-brand px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {t(lang, "generate")}
              </button>
              <button
                onClick={download}
                disabled={!blob}
                className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {t(lang, "download")}
              </button>
              <button
                onClick={() => void downloadAll()}
                disabled={!asset || busy}
                className="rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-40"
              >
                {t(lang, "download_all")}
              </button>
              <button
                onClick={nextVariant}
                disabled={!asset}
                className="col-span-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
              >
                🔄 {t(lang, "next_variant")}
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{t(lang, "note_local")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
