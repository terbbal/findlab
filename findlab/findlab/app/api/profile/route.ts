import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { getProfile, saveProfile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ profile: await getProfile() });
}

const Put = z.object({
  name: z.string().min(1).max(80).optional(),
  year: z.string().max(80).optional(),
  email: z.string().max(120).optional(),
  oneLineIntro: z.string().max(300).optional(),
  interests: z.array(z.string().max(60)).max(8).optional(),
  topSkills: z.array(z.object({ name: z.string().max(40), level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) })).max(8).optional(),
  bestProjects: z.array(z.string()).max(3).optional(),
});

export async function PUT(req: Request) {
  const [body, err] = await parseBody(req, Put);
  if (err) return err;
  const profile = { ...(await getProfile()), ...body };
  await saveProfile(profile);
  return NextResponse.json({ profile });
}
