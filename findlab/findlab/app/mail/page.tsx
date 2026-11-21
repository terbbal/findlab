import { Suspense } from "react";
import { MailPage } from "@/components/mail/MailPage";

export default function Page() {
  return (
    <Suspense>
      <MailPage />
    </Suspense>
  );
}
