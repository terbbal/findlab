/**
 * finD Lab v3 — enrich crawled labs with analysis fields only.
 *   npm run enrich            AI enrichment if ANTHROPIC_API_KEY is set (cached per lab in scripts/cache/enrich/),
 *                             otherwise rule-based skill extraction from the scraped abstracts/keywords.
 *   npm run enrich -- --auto  force rule-based only (no API calls)
 *   npm run enrich -- --force re-run AI even if cached
 * Fields written: plainSummary (AI only), keywords, inferredSkills (with evidence + source papers).
 * Never invents anything beyond the scraped text.
 */
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { InferredSkill, Lab } from "../lib/types";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts/cache/enrich");
fs.mkdirSync(CACHE, { recursive: true });

for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const AUTO_ONLY = process.argv.includes("--auto") || !process.env.ANTHROPIC_API_KEY;
const FORCE = process.argv.includes("--force");

/* ---------- Rule-based extraction ---------- */

const SKILLS: [RegExp, string][] = [
  [/\bpython\b/i, "Python"], [/\bmatlab\b/i, "MATLAB"], [/\bc\+\+/i, "C++"], [/\bros\b|robot operating system/i, "ROS"],
  [/deep learning|deep neural|convolutional|\bcnn\b|transformer|neural network/i, "Deep learning"],
  [/machine learning|random forest|support vector|\bsvm\b|gradient boost|regression model/i, "Machine learning"],
  [/reinforcement learning/i, "Reinforcement learning"], [/computer vision|image recognition|object detection|segmentation/i, "Computer vision"],
  [/natural language|\bnlp\b|language model|\bllm/i, "NLP / language models"], [/large language model|\bllm/i, "Large language models"],
  [/signal processing|filtering|fourier|spectral analysis/i, "Signal processing"], [/\beeg\b|electroencephalog/i, "EEG"], [/\bemg\b|electromyog/i, "EMG"],
  [/\bfmri\b|functional magnetic/i, "fMRI"], [/electrophysiolog|patch[- ]clamp/i, "Electrophysiology"],
  [/control (system|theory|algorithm)|feedback control|model predictive|\bmpc\b/i, "Control systems"], [/kinematic|dynamics model|trajectory/i, "Robot dynamics & kinematics"],
  [/embedded|microcontroller|fpga|firmware/i, "Embedded systems"], [/circuit design|\bcmos\b|analog circuit|integrated circuit|\basic\b/i, "Circuit design"],
  [/semiconductor|transistor|\btft\b|thin[- ]film transistor/i, "Semiconductor devices"], [/wireless|5g|6g|antenna|communication system/i, "Wireless communications"],
  [/optimization|optimisation|convex/i, "Optimization"], [/statistic|bayesian|probabilistic/i, "Statistics"], [/simulation|finite element|\bfem\b|comsol/i, "Simulation / FEM"],
  [/density functional|\bdft\b|first[- ]principles|ab initio/i, "DFT / computational chemistry"], [/molecular dynamics/i, "Molecular dynamics"],
  [/crispr|gene editing|genome editing/i, "CRISPR gene editing"], [/sequencing|\bngs\b|rna-seq|transcriptom|genomic/i, "Sequencing & genomics"],
  [/bioinformatic|computational biology/i, "Bioinformatics"], [/single[- ]cell/i, "Single-cell analysis"], [/proteom|mass spectrometr/i, "Proteomics / mass spec"],
  [/microscop|confocal|live[- ]cell imaging|fluorescence imaging/i, "Microscopy & imaging"], [/cell culture|organoid|in vitro/i, "Cell culture"], [/\bmouse\b|\bmice\b|in vivo|animal model/i, "Animal experiments"],
  [/zebrafish/i, "Zebrafish models"], [/c\. elegans|caenorhabditis/i, "C. elegans models"], [/drosophila/i, "Drosophila models"],
  [/western blot|immunohisto|immunofluoresc|elisa|qpcr|pcr\b/i, "Molecular biology techniques"],
  [/battery|batteries|lithium|cathode|anode|electrolyte/i, "Battery electrochemistry"], [/electrochemi|voltammetr|impedance spectro/i, "Electrochemistry"],
  [/catalys|catalytic/i, "Catalysis"], [/organic synthesis|total synthesis|synthetic route/i, "Organic synthesis"], [/polymer/i, "Polymer science"],
  [/perovskite|solar cell|photovoltaic/i, "Solar cells / perovskites"], [/nanoparticle|nanostructure|nanomaterial|2d material|graphene/i, "Nanomaterials"],
  [/x-ray diffraction|\bxrd\b|\bxps\b|\bsem\b|\btem\b|spectroscop/i, "Materials characterization"], [/thin film|deposition|sputtering|\bcvd\b|\bald\b/i, "Thin-film fabrication"],
  [/microfluidic|lab-on-a-chip/i, "Microfluidics"], [/sensor|biosensor|wearable/i, "Sensors & wearables"], [/soft robot|actuator|exoskeleton/i, "Soft robotics & actuators"],
  [/\bslam\b|localization|lidar|autonomous driving|autonomous vehicle/i, "Autonomous systems / SLAM"], [/human-robot|haptic/i, "Human-robot interaction"],
  [/blockchain|cryptograph|cybersecurity|encryption/i, "Security & cryptography"], [/database|big data|data mining/i, "Data engineering"], [/network(ing)? protocol|edge computing|cloud computing|distributed system/i, "Systems & networking"],
  [/quantum/i, "Quantum physics"], [/laser|photonic|optical/i, "Optics & photonics"], [/magnet|spintronic/i, "Magnetism / spintronics"], [/superconduct/i, "Superconductivity"],
  [/survey|interview|questionnaire|case study|policy/i, "Survey & qualitative research"], [/decision[- ]making|fuzzy|multi-criteria|\bmcdm\b/i, "Decision analysis"], [/economic|innovation management|technology management/i, "Economics & innovation"],
];

function autoSkills(lab: Lab): InferredSkill[] {
  const found = new Map<string, { papers: string[]; inInterests: boolean }>();
  for (const [re, name] of SKILLS) {
    const papers = lab.recentPapers.filter((p) => re.test(`${p.title} ${p.abstract ?? ""} ${(p.keywords ?? []).join(" ")}`)).map((p) => p.title);
    const inInterests = lab.researchInterests.some((i) => re.test(i)) || re.test(lab.labDescription ?? "");
    if (papers.length || inInterests) found.set(name, { papers, inInterests });
  }
  return Array.from(found.entries())
    .map(([name, f]) => ({
      name,
      importance: (f.papers.length >= 2 || (f.inInterests && f.papers.length >= 1) ? "core" : "helpful") as "core" | "helpful",
      evidence: f.papers.length
        ? `Mentioned in ${f.papers.length} recent paper${f.papers.length > 1 ? "s" : ""}: “${f.papers[0].slice(0, 90)}${f.papers[0].length > 90 ? "…" : ""}”${f.inInterests ? " and in the lab's interests/description" : ""}.`
        : "Mentioned in the lab's research interests or description.",
      sourcePapers: lab.recentPapers.filter((p) => f.papers.includes(p.title)).map((p) => p.url),
      method: "auto" as const,
    }))
    .sort((a, b) => (a.importance === b.importance ? b.sourcePapers.length - a.sourcePapers.length : a.importance === "core" ? -1 : 1))
    .slice(0, 8);
}

function autoKeywords(lab: Lab): string[] {
  const kws = lab.recentPapers.flatMap((p) => p.keywords ?? []).map((k) => k.toLowerCase());
  const counts = new Map<string, number>();
  [...kws, ...lab.researchInterests.map((i) => i.toLowerCase())].forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 12);
}

/* ---------- AI enrichment ---------- */

const SYSTEM = `You are finD Lab's assistant for DGIST undergraduates. You analyse ONE lab using ONLY the scraped text given (lab description, research interests, recent paper titles/abstracts/keywords).
Honesty rules: never invent methods, tools, people, numbers or recruiting status. Every skill must be supported by the given text, and its evidence must cite which paper (by title) or the description.
Return ONLY valid JSON, no markdown:
{ "plainSummary": string|null,      // 2–3 jargon-free sentences for a smart first-year student; null if there is too little text
  "plainSummaryKo": string|null,    // the same in natural Korean
  "keywords": string[],             // 8–12 lowercase topic/method keywords from the text
  "inferredSkills": [ { "name": string, "importance": "core"|"helpful", "evidence": string, "sourcePaperTitles": string[] } ]  // 4–8 concrete skills a student would need (tools, methods, techniques)
}`;

async function aiEnrich(client: Anthropic, model: string, lab: Lab) {
  const input = {
    labName: lab.labName,
    department: lab.department,
    researchInterests: lab.researchInterests,
    labDescription: lab.labDescription,
    recentPapers: lab.recentPapers.map((p) => ({ title: p.title, year: p.year, abstract: p.abstract, keywords: p.keywords })),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages.create({
      model,
      max_tokens: 3000,
      system: SYSTEM,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: JSON.stringify(input) + (attempt ? "\nReply with ONLY the JSON object." : "") }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    try {
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const urlFor = (t: string) => lab.recentPapers.find((p) => p.title.toLowerCase().startsWith(t.toLowerCase().slice(0, 40)))?.url;
      return {
        plainSummary: j.plainSummary ?? null,
        plainSummaryKo: j.plainSummaryKo ?? null,
        keywords: (j.keywords ?? []).map((k: string) => k.toLowerCase()).slice(0, 12),
        inferredSkills: (j.inferredSkills ?? []).slice(0, 8).map((s: { name: string; importance: string; evidence: string; sourcePaperTitles?: string[] }) => ({
          name: s.name,
          importance: s.importance === "core" ? "core" : "helpful",
          evidence: s.evidence,
          sourcePapers: (s.sourcePaperTitles ?? []).map(urlFor).filter(Boolean),
          method: "ai",
        })),
      };
    } catch {
      if (attempt) throw new Error("invalid JSON");
    }
  }
}

async function main() {
  const file = path.join(ROOT, "data/labs.json");
  const labs: Lab[] = JSON.parse(fs.readFileSync(file, "utf8"));
  const client = AUTO_ONLY ? null : new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
  console.log(AUTO_ONLY ? "Rule-based enrichment (no API key or --auto)" : `AI enrichment with ${model} (cached in scripts/cache/enrich/)`);
  let ai = 0;
  let auto = 0;
  for (const [i, lab] of labs.entries()) {
    const hasText = Boolean(lab.labDescription) || lab.recentPapers.some((p) => p.abstract);
    const cacheFile = path.join(CACHE, `${lab.id}.json`);
    if (client && hasText) {
      try {
        let data = !FORCE && fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : null;
        if (!data) {
          data = await aiEnrich(client, model, lab);
          fs.writeFileSync(cacheFile, JSON.stringify(data, null, 1));
        }
        Object.assign(lab, data);
        ai++;
        console.log(`[${i + 1}/${labs.length}] ${lab.professor.nameEn ?? lab.professor.nameKo} ✓ AI`);
        continue;
      } catch (e) {
        console.log(`[${i + 1}/${labs.length}] AI failed (${(e as Error).message}) → rule-based`);
      }
    }
    lab.inferredSkills = autoSkills(lab);
    lab.keywords = autoKeywords(lab);
    lab.plainSummary = lab.plainSummary ?? null;
    auto++;
  }
  fs.writeFileSync(file, JSON.stringify(labs, null, 1) + "\n");
  console.log(`Done. AI: ${ai}, rule-based: ${auto}. Labs with skills: ${labs.filter((l) => l.inferredSkills.length).length}/${labs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
