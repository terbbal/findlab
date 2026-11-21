"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, Compass, Library, NotebookPen, Route, Settings } from "lucide-react";
import { UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "./auth/AuthProvider";
import { useLang } from "./Providers";

const STEPS = [
  { href: "/cv", n: "①", en: "My Diary", ko: "My Diary", icon: NotebookPen, color: "#3B5BDB", tint: "#EEF2FF" },
  { href: "/labs", n: "②", en: "Labs", ko: "Labs", icon: Library, color: "#1F2430", tint: "#EEF0F4" },
  { href: "/find", n: "③", en: "Find My Lab", ko: "Find My Lab", icon: Compass, color: "#0C8F6F", tint: "#E7F7F1" },
  { href: "/roadmap", n: "④", en: "Skill Roadmap", ko: "Skill Roadmap", icon: Route, color: "#D9480F", tint: "#FFF1E8" },
] as const;

export function Header() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const { session, email } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-cream/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:flex-nowrap">
        <Logo />

        <nav className="order-3 flex w-full items-center justify-center gap-1 md:order-none md:w-auto md:flex-1">
          {STEPS.map((s, i) => {
            const active = pathname.startsWith(s.href);
            const Icon = s.icon;
            return (
              <div key={s.href} className="flex items-center gap-0.5 sm:gap-1">
                <Link
                  href={s.href}
                  className={clsx(
                    "flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-semibold transition sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
                    active ? "shadow-sm ring-2" : "opacity-75 hover:opacity-100",
                  )}
                  style={{
                    color: s.color,
                    background: active ? s.tint : "transparent",
                    // @ts-expect-error CSS var for ring color
                    "--tw-ring-color": s.color,
                  }}
                >
                  <span className="hidden text-base leading-none sm:inline">{s.n}</span>
                  <Icon className="hidden h-4 w-4 lg:block" />
                  <span className="whitespace-nowrap">{s[lang]}</span>
                </Link>
                {i < STEPS.length - 1 && <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="flex rounded-full bg-white p-0.5 text-xs font-bold shadow-sm ring-1 ring-slate-200">
            {(["ko", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx("rounded-full px-2.5 py-1 transition", lang === l ? "bg-navy text-white" : "text-slate-500")}
                aria-pressed={lang === l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link
            href="/settings"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-white"
            aria-label={t("nav.settings")}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            href="/account"
            title={session ? email ?? "" : lang === "ko" ? "로그인" : "Sign in"}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-dgist to-lab text-sm font-bold text-white shadow-soft"
            aria-label={session ? "Account" : "Sign in"}
          >
            {session ? email?.[0]?.toUpperCase() : <UserRound className="h-4 w-4" />}
            {session && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-cream bg-lab" />}
          </Link>
        </div>
      </div>
    </header>
  );
}
