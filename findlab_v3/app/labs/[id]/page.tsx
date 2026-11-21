import { notFound } from "next/navigation";
import { getLab } from "@/lib/labs";
import { LabDetail } from "@/components/labs/LabDetail";

export default function Page({ params }: { params: { id: string } }) {
  const lab = getLab(params.id);
  if (!lab) notFound();
  return <LabDetail lab={lab} />;
}
