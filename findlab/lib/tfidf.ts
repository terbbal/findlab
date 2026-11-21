import "server-only";
import { allLabs, isMatchable } from "./labs";
import { expandKo } from "./glossary";
import type { Lab } from "./types";

const STOP = new Set(
  "a an the and or of in on for to with by from at as is are was were be been this that these those we our their its it into using use used based via than then also can may such both between within new study studies results show shows paper research lab laboratory method methods approach system systems high low data analysis development effect effects 및 의 을 를 이 가 은 는 에 에서 연구".split(" "),
);

/** Korean research terms also count as their English equivalents ("단백질" → "protein"), on both sides. */
export function tokenize(text: string): string[] {
  return (expandKo(text).toLowerCase().match(/[a-z][a-z0-9+#-]{1,}|[가-힣]{2,}/g) ?? [])
    .map((t) => t.replace(/(ies)$/, "y").replace(/([^s])s$/, "$1"))
    .filter((t) => !STOP.has(t) && t.length > 1);
}

export function labText(l: Lab): string {
  return [
    l.labName,
    ...l.researchInterests,
    ...l.researchInterests, // interests count double
    ...(l.keywords ?? []),
    l.labDescription,
    ...l.recentPapers.flatMap((p) => [p.title, p.abstract, ...(p.keywords ?? [])]),
    l.department,
  ]
    .filter(Boolean)
    .join(" ");
}

type Vec = Map<string, number>;
let cache: { idf: Map<string, number>; vecs: Map<string, Vec>; labs: Lab[] } | null = null;

function build() {
  const labs = allLabs().filter(isMatchable);
  const docs = labs.map((l) => tokenize(labText(l)));
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = docs.length || 1;
  const idf = new Map(Array.from(df.entries()).map(([t, n]) => [t, Math.log((N + 1) / (n + 1)) + 1]));
  const vecs = new Map<string, Vec>();
  labs.forEach((l, i) => vecs.set(l.id, toVec(docs[i], idf)));
  cache = { idf, vecs, labs };
  return cache;
}

function toVec(tokens: string[], idf: Map<string, number>): Vec {
  const tf = new Map<string, number>();
  tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
  const v: Vec = new Map();
  let norm = 0;
  tf.forEach((n, t) => {
    const w = (1 + Math.log(n)) * (idf.get(t) ?? 0);
    if (w > 0) {
      v.set(t, w);
      norm += w * w;
    }
  });
  norm = Math.sqrt(norm) || 1;
  v.forEach((w, t) => v.set(t, w / norm));
  return v;
}

export function rank(queryText: string, opts: { department?: string | null; limit?: number } = {}) {
  const { idf, vecs, labs } = cache ?? build();
  const q = toVec(tokenize(queryText), idf);
  return labs
    .filter((l) => !opts.department || l.department === opts.department)
    .map((l) => {
      const v = vecs.get(l.id)!;
      let score = 0;
      const shared: [string, number][] = [];
      q.forEach((w, t) => {
        const lw = v.get(t);
        if (lw) {
          score += w * lw;
          shared.push([t, w * lw]);
        }
      });
      return { lab: l, score, shared: shared.sort((a, b) => b[1] - a[1]).map(([t]) => t) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 15);
}

export function matchableCount() {
  return (cache ?? build()).labs.length;
}
