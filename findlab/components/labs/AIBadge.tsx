export function AIBadge({ label = "AI" }: { label?: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">✦ {label}</span>;
}
