import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-5-5";

export function getModel(): string {
  return process.env.CLAUDE_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasApiKey(): boolean {
  // FINDLAB_DEMO_MODE=1 forces precomputed responses (e.g. flaky venue Wi-Fi).
  if (process.env.FINDLAB_DEMO_MODE === "1") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 });
  return _client;
}

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

/** Strip ```json fences or leading prose and return the JSON substring. */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const starts = [firstObj, firstArr].filter((i) => i >= 0);
  if (!starts.length) return text.trim();
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return end > start ? text.slice(start, end + 1) : text.slice(start);
}

// Models that support the server-side refusal fallback ("default" routing).
const FALLBACK_MODELS = /^claude-(sonnet-5-5|opus-5-5|opus-5|fable-5)/;

async function askOnce(system: string, user: string, maxTokens: number): Promise<string> {
  const model = getModel();
  const params = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user" as const, content: user }],
    // Short, structured tasks: low effort keeps the live demo snappy.
    output_config: { effort: "low" as const },
  };

  let response: unknown;
  try {
    response = FALLBACK_MODELS.test(model)
      ? await client().beta.messages.create({
          ...params,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        } as Parameters<ReturnType<typeof client>["beta"]["messages"]["create"]>[0] & { stream?: false })
      : await client().messages.create(params as Anthropic.MessageCreateParamsNonStreaming);
  } catch (err) {
    // Some accounts/models reject optional params (beta fallbacks, effort): retry with a plain request.
    if (!(err instanceof Anthropic.BadRequestError)) throw err;
    console.warn("[ai] retrying without optional params:", err.message);
    response = await client().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
  }

  const msg = response as Anthropic.Message;
  if (msg.stop_reason === "refusal") throw new AIError("The AI declined this request.");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new AIError("The AI returned an empty response.");
  return text;
}

/**
 * Ask Claude for JSON only, parse it, retry once on invalid JSON.
 * Throws AIError with a readable message on failure.
 */
export async function callClaudeJSON<T>(
  system: string,
  user: string,
  schemaDescription: string,
  opts: { maxTokens?: number } = {},
): Promise<T> {
  if (!hasApiKey()) throw new AIError("No ANTHROPIC_API_KEY set.");
  const maxTokens = opts.maxTokens ?? 4000;
  const fullSystem = `${system}\n\nReturn ONLY valid JSON matching this schema, no markdown, no commentary:\n${schemaDescription}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt =
        attempt === 0
          ? user
          : `${user}\n\nYour previous answer was not valid JSON. Reply again with ONLY the JSON object.`;
      const text = await askOnce(fullSystem, prompt, maxTokens);
      return JSON.parse(extractJSON(text)) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof SyntaxError) continue; // retry once on invalid JSON
      break; // API errors: don't hammer; caller falls back to demo mode
    }
  }
  if (lastErr instanceof SyntaxError) throw new AIError("The AI response was not valid JSON.");
  if (lastErr instanceof Anthropic.APIError) throw new AIError(`AI service error (${lastErr.status ?? "network"}).`);
  if (lastErr instanceof AIError) throw lastErr;
  throw new AIError(lastErr instanceof Error ? lastErr.message : "Unknown AI error.");
}

/**
 * Run an AI call; if it fails (or no key is set), use the precomputed fallback
 * so the live demo never breaks. Returns `{ ...data, demoMode }`.
 */
export async function withFallback<T extends object>(
  run: () => Promise<T>,
  fallback: () => T | Promise<T>,
  label: string,
): Promise<T & { demoMode: boolean }> {
  if (hasApiKey()) {
    try {
      return { ...(await run()), demoMode: false };
    } catch (err) {
      console.warn(`[ai:${label}] falling back to demo mode:`, err instanceof Error ? err.message : err);
    }
  }
  return { ...(await fallback()), demoMode: true };
}
