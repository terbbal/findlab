/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export function LabPhoto({ src, alt, size = 56 }: { src: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-slate-300" style={{ width: size, height: size }}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <UserRound style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </span>
  );
}
