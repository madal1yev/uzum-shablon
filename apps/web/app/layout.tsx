import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPix AI — Marketplace reklama kartalari",
  description:
    "Mahsulot rasmini Uzum / Wildberries uslubidagi reklama infografikasiga aylantiruvchi vosita.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
