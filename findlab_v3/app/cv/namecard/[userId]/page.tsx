import { headers } from "next/headers";
import { notFound } from "next/navigation";
import demo from "@/data/sample/demo_user.json";
import { PublicNamecard } from "@/components/namecard/PublicNamecard";
import { decodeCard } from "@/components/namecard/share";
import type { DiaryEntry, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function Page({ params, searchParams }: { params: { userId: string }; searchParams: { d?: string } }) {
  const h = headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/cv/namecard/${params.userId}${searchParams.d ? `?d=${searchParams.d}` : ""}`;
  if (params.userId === "minji") {
    const profile = demo.profile as Profile;
    const entries = demo.entries as DiaryEntry[];
    const projects = profile.bestProjects.map((id) => entries.find((e) => e.id === id)).filter((e): e is DiaryEntry => Boolean(e));
    return <PublicNamecard profile={profile} projects={projects} url={url} />;
  }
  const card = searchParams.d ? decodeCard(searchParams.d) : null;
  if (!card) notFound();
  const profile: Profile = { userId: "share", bestProjects: [], ...card };
  const projects: DiaryEntry[] = card.projects.map((p, i) => ({ id: `p${i}`, date: "", rawNote: p, source: "text", category: "Project", skills: [], cvBullet: p }));
  return <PublicNamecard profile={profile} projects={projects} url={url} />;
}
