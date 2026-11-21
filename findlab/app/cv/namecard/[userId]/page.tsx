import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getProfile, listEntries } from "@/lib/storage";
import { PublicNamecard } from "@/components/namecard/PublicNamecard";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { userId: string } }) {
  const profile = await getProfile(params.userId);
  if (!profile.email && !profile.year) notFound();
  const entries = await listEntries(params.userId);
  const projects = profile.bestProjects.map((id) => entries.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const h = headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/cv/namecard/${params.userId}`;
  return <PublicNamecard profile={profile} projects={projects} url={url} />;
}
