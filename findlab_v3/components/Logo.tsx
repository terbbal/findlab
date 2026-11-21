import Link from "next/link";
import { Search } from "lucide-react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight text-navy ${className}`}>
      fin<span className="font-black text-dgist">D</span> Lab
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="finD Lab home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-dgist text-white shadow-soft">
        <Search className="h-5 w-5" strokeWidth={2.75} />
      </span>
      <Wordmark className="text-xl" />
    </Link>
  );
}
