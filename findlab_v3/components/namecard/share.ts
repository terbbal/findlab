import type { DiaryEntry, Profile } from "@/lib/types";

export type SharedCard = Pick<Profile, "name" | "year" | "oneLineIntro" | "interests" | "topSkills" | "email"> & { projects: string[] };

function b64url(s: string) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCard(d: string): SharedCard | null {
  try {
    const s = d.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(Buffer.from(s, "base64").toString("binary")));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** The namecard travels inside the link (nothing stored on a server). The demo user keeps a short URL. */
export function namecardUrl(origin: string, p: Profile, isDemo: boolean, projects: DiaryEntry[]): string {
  if (isDemo) return `${origin}/cv/namecard/minji`;
  const card: SharedCard = {
    name: p.name,
    year: p.year,
    oneLineIntro: p.oneLineIntro,
    interests: p.interests,
    topSkills: p.topSkills,
    email: p.email,
    projects: projects.map((e) => e.cvBulletEdited || e.cvBullet).slice(0, 3),
  };
  return `${origin}/cv/namecard/share?d=${b64url(JSON.stringify(card))}`;
}
