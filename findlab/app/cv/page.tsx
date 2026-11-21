import { Suspense } from "react";
import { CVHub } from "@/components/cv/CVHub";

export default function Page() {
  return (
    <Suspense>
      <CVHub />
    </Suspense>
  );
}
