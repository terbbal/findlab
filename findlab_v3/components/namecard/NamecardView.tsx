"use client";

import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Mail, Search } from "lucide-react";
import type { DiaryEntry, Profile } from "@/lib/types";

export function SkillDots({ level }: { level: number }) {
  return (
    <span className="tracking-[2px] text-dgist" aria-label={`level ${level} of 4`}>
      {"●".repeat(level)}
      <span className="text-slate-300">{"●".repeat(4 - level)}</span>
    </span>
  );
}

/** Business-card ratio (3.5 : 2) namecard. */
export const NamecardView = forwardRef<HTMLDivElement, { profile: Profile; projects: DiaryEntry[]; url: string }>(
  function NamecardView({ profile, projects, url }, ref) {
    const [qr, setQr] = useState<string>("");
    useEffect(() => {
      QRCode.toDataURL(url, { margin: 0, width: 220, color: { dark: "#1F2430", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
    }, [url]);

    return (
      <div
        ref={ref}
        className="relative w-full max-w-[700px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(31,36,48,0.15)] ring-1 ring-slate-100"
        style={{ aspectRatio: "3.5 / 2" }}
      >
        {/* watermark */}
        <div className="pointer-events-none absolute -bottom-6 -right-4 select-none text-[110px] font-black leading-none text-slate-50">
          fin<span className="text-cv-tint">D</span>
        </div>
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-dgist via-lab to-mail" />

        <div className="relative flex h-full gap-[3%] p-[5%] pl-[6%]">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="text-[clamp(18px,3.6vw,28px)] font-extrabold leading-tight text-navy">{profile.name}</div>
            <div className="text-[clamp(10px,1.6vw,13px)] font-medium text-slate-500">
              DGIST · {profile.year}
            </div>
            <p className="mt-[3%] line-clamp-2 text-[clamp(10px,1.7vw,14px)] font-medium leading-snug text-navy">{profile.oneLineIntro}</p>
            <div className="mt-[3%] flex flex-wrap gap-1">
              {profile.interests.slice(0, 4).map((i) => (
                <span key={i} className="rounded-full bg-lab-tint px-2 py-0.5 text-[clamp(8px,1.3vw,11px)] font-semibold text-lab">
                  #{i}
                </span>
              ))}
            </div>

            <div className="mt-auto space-y-[2px] text-[clamp(9px,1.45vw,12px)]">
              <div className="font-bold uppercase tracking-wide text-slate-400">Best projects</div>
              {projects.slice(0, 3).map((p) => (
                <div key={p.id} className="truncate text-slate-700">
                  ▸ {p.cvBulletEdited || p.cvBullet}
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-[34%] shrink-0 flex-col">
            <div className="space-y-[3px] text-[clamp(9px,1.45vw,12px)]">
              {profile.topSkills.slice(0, 5).map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-navy">{s.name}</span>
                  <SkillDots level={s.level} />
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="min-w-0 text-[clamp(8px,1.3vw,11px)] text-slate-500">
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" /> {profile.email}
                </div>
                <div className="mt-1 flex items-center gap-1 font-bold text-navy">
                  <Search className="h-3 w-3 text-dgist" strokeWidth={3} />
                  <span>
                    fin<span className="font-black text-dgist">D</span> Lab
                  </span>
                </div>
              </div>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code to namecard" className="aspect-square w-[42%] min-w-[54px]" />
              ) : (
                <div className="aspect-square w-[42%] min-w-[54px] rounded bg-slate-100" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
