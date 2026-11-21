"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang } from "@/components/Providers";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import type { Lab, MailRecord } from "@/lib/types";
import { MailComposer } from "./MailComposer";
import { SentMails } from "./SentMails";

export function MailPage() {
  const { lang } = useLang();
  const [labs, setLabs] = useState<Lab[] | null>(null);
  const [mails, setMails] = useState<MailRecord[]>([]);

  useEffect(() => {
    api<{ labs: Lab[] }>("/api/labs").then((d) => setLabs(d.labs));
    api<{ mails: MailRecord[] }>("/api/mails").then((d) => setMails(d.mails));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader step="mail" title={lang === "ko" ? "교수님께 보낼 메일, 같이 써요" : "Write the email you've been putting off"} />
      {labs === null ? <Skeleton className="h-[520px]" /> : <MailComposer labs={labs} onSent={(m) => setMails((xs) => [m, ...xs])} />}
      <SentMails mails={mails} labs={labs ?? []} onUpdate={(m) => setMails((xs) => xs.map((x) => (x.id === m.id ? m : x)))} />
    </div>
  );
}
