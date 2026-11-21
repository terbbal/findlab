"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { LabBrowser } from "@/components/labs/LabBrowser";
import { useLang } from "@/components/Providers";

export default function Page() {
  const { lang } = useLang();
  return (
    <div>
      <PageHeader step="lab" title={lang === "ko" ? "DGIST 연구실" : "DGIST labs"} />
      <LabBrowser />
    </div>
  );
}
