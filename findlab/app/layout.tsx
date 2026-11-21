import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { DailyAlarm } from "@/components/DailyAlarm";

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
          <Header />
          <DailyAlarm />
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
