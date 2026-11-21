import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Header } from "@/components/Header";
import { DailyAlarm } from "@/components/DailyAlarm";
import { labsMeta } from "@/lib/labs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "finD Lab — DGIST 연구실 소개팅",
  description: "From your diary to your dream lab. Log activities, find DGIST labs that fit you, and email them with confidence.",
};

export const viewport: Viewport = { themeColor: "#F7F6F2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>
          <Header />
          <DailyAlarm />
          <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">{children}</main>
          <footer className="border-t border-slate-200/70 px-4 py-6 text-center text-xs text-slate-500 print:hidden">
            Lab data from{" "}
            <a href="https://scholar.dgist.ac.kr" target="_blank" rel="noreferrer" className="underline">
              DGIST Scholar (scholar.dgist.ac.kr)
            </a>
            , crawled {labsMeta.crawledAt}. AI-derived fields are labeled ✦ AI. ·{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
          </footer>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
