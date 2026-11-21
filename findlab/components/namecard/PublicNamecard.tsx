"use client";

import Link from "next/link";
import type { DiaryEntry, Profile } from "@/lib/types";
import { Chip } from "@/components/ui";
import { NamecardView } from "./NamecardView";

export function PublicNamecard({ profile, projects, url }: { profile: Profile; projects: DiaryEntry[]; url: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-6">
      <NamecardView profile={profile} projects={projects} url={url} />
      <div className="w-full max-w-[700px] rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-2 text-lg font-bold">Interests</h2>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {profile.interests.map((i) => (
            <Chip key={i} color="lab">
              {i}
            </Chip>
          ))}
        </div>
        <h2 className="mb-2 text-lg font-bold">Highlights</h2>
        <ul className="space-y-2 text-sm">
          {projects.map((p) => (
            <li key={p.id} className="flex gap-2">
              <span className="text-slate-400">{p.date.slice(0, 7)}</span>
              <span>{p.cvBulletEdited || p.cvBullet}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-slate-400">
          Made with{" "}
          <Link href="/" className="font-bold text-navy">
            fin<span className="text-dgist">D</span> Lab
          </Link>{" "}
          — DGIST 연구실 소개팅
        </p>
      </div>
    </div>
  );
}
