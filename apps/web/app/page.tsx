"use client";

import Link from "next/link";
import { useState } from "react";
import { LANGS, t, type Lang } from "@/lib/i18n";

function LangPills({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-black/5 backdrop-blur">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
            lang === l ? "bg-brand text-white" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("uz");

  const features = [
    { t: t(lang, "f1_t"), d: t(lang, "f1_d") },
    { t: t(lang, "f2_t"), d: t(lang, "f2_d") },
    { t: t(lang, "f3_t"), d: t(lang, "f3_d") },
    { t: t(lang, "f4_t"), d: t(lang, "f4_d") },
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">M</div>
          <div className="leading-tight">
            <div className="text-lg font-extrabold">MarketPix</div>
            <div className="text-[11px] text-zinc-500">{t(lang, "brand_tag")}</div>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="#features" className="hidden text-sm font-semibold text-zinc-600 hover:text-zinc-900 sm:block">
            {t(lang, "nav_features")}
          </Link>
          <Link
            href="/studio"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {t(lang, "nav_studio")}
          </Link>
          <LangPills lang={lang} setLang={setLang} />
        </nav>
      </header>

      <section className="grid-bg">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand shadow-sm ring-1 ring-brand/15">
            {t(lang, "hero_badge")}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-zinc-900 sm:text-6xl">
            {t(lang, "hero_title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-zinc-600">{t(lang, "hero_sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/studio"
              className="rounded-full bg-brand px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand/25 transition hover:opacity-90"
            >
              {t(lang, "hero_cta")}
            </Link>
            <Link
              href="#features"
              className="rounded-full bg-white px-6 py-3 text-base font-bold text-zinc-800 ring-1 ring-black/10 transition hover:bg-zinc-50"
            >
              {t(lang, "hero_cta2")}
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {["Light", "Dark", "Bold", "Stats", "Ribbon"].map((name, i) => (
              <div
                key={name}
                className="card-shadow aspect-[3/4] rounded-2xl bg-white p-3"
                style={{ background: i % 2 === 0 ? "white" : "#111018" }}
              >
                <div
                  className="mb-2 h-2 w-10 rounded-full"
                  style={{ background: i % 2 === 0 ? "#6c3cff" : "#ff5e3a" }}
                />
                <div
                  className="h-16 rounded-lg"
                  style={{ background: i % 2 === 0 ? "#f1eeff" : "#242233" }}
                />
                <div className="mt-3 space-y-1.5">
                  <div className={`h-2 w-3/4 rounded ${i % 2 === 0 ? "bg-zinc-300" : "bg-zinc-600"}`} />
                  <div className={`h-2 w-1/2 rounded ${i % 2 === 0 ? "bg-zinc-200" : "bg-zinc-700"}`} />
                </div>
                <div className={`mt-3 text-center text-xs font-bold ${i % 2 === 0 ? "text-zinc-500" : "text-zinc-400"}`}>
                  {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-black text-zinc-900">{t(lang, "feats_title")}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="card-shadow rounded-2xl bg-white p-6">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-lg font-black text-brand">
                ★
              </div>
              <div className="text-base font-bold text-zinc-900">{f.t}</div>
              <div className="mt-1 text-sm text-zinc-600">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-zinc-500">
          MarketPix AI · {t(lang, "brand_tag")}
        </div>
      </footer>
    </main>
  );
}
