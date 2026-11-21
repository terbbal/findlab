import { notFound } from "next/navigation";
import { getLab } from "@/lib/storage";
import { LabDetail } from "@/components/labs/LabDetail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { labId: string } }) {
  const lab = await getLab(params.labId);
  if (!lab) notFound();
  return <LabDetail lab={lab} />;
}
