import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import {
  APICallError,
  RetryError,
  generateText,
  type LanguageModel,
  type ModelMessage,
} from "ai";

// Provider-agnostic LLM router (Velte_Connect_Technical_Implementation.md
// §5.1) — chain: OpenAI gpt-4o-mini (primary, multimodal) → Groq (fast
// text) → (no local Ollama entry yet: there's no Oracle/Coolify box running
// one, so a third provider that always fails is dead code, not resilience).
// Never hardcode one model — free-tier catalogs change without notice.
//
// Was Gemini 2.5 Flash until Gemini's free-tier daily quota (20 req/day on
// this project) repeatedly became the bottleneck under real testing —
// swapped to gpt-4o-mini: cheaper per token ($0.15/$0.60 per 1M vs Gemini's
// $0.30/$2.50), still genuinely multimodal (verified live in a sibling
// codebase's receipt-reading pipeline before committing to this), so it can
// still take the vision role Gemini used to hold — Groq stays text-only, so
// nothing else in the fallback shape changes.

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Each entry pairs a model factory with that PROVIDER's own default
// providerOptions (if any) — kept together and applied per-attempt inside
// callLLM's own fallback loop below, rather than as a single opts field
// shared across every provider in the chain. That distinction matters here
// specifically: reasoningEffort (openai-strong's own entry) is only valid
// on a reasoning-capable model. If it were bundled into a single shared
// GenerateTextOpts.providerOptions instead, it would still be present on
// the SAME opts object when the loop below falls through to plain "openai"
// (gpt-4o-mini) after a 429 — a non-reasoning model, which OpenAI's API
// rejects that parameter on. Keeping it scoped to only the provider entry
// that actually wants it is what keeps that fallback safe.
// Explicitly typed as Record<..literal key union.., ProviderEntry> —
// deliberately NOT inferred via `as const`/`satisfies` (the pattern this
// object used before adding per-entry providerOptions): either of those
// would keep each entry's own distinct literal shape instead of unifying
// to one, which makes `providerOptions` inaccessible on the union
// `PROVIDERS[name]` produces below wherever a given entry doesn't declare
// it — not even as `undefined`, since it wouldn't exist on that entry's
// type at all. The explicit Record keeps BOTH the literal key union
// ProviderName needs AND a uniform value shape every entry actually has.
type ProviderEntry = {
  model: () => LanguageModel;
  providerOptions?: Parameters<typeof generateText>[0]["providerOptions"];
};
const PROVIDERS: Record<"openai" | "openai-strong" | "groq", ProviderEntry> = {
  openai: { model: (): LanguageModel => openai("gpt-4o-mini") },
  // A stronger, genuinely reasoning-capable tier for route.ts's own main
  // pipeline (the multi-step tool-choice + sector-rule + reply-phrasing
  // call, and its retries — see route.ts's own providerOrder) — NOT used
  // by the narrow, single-purpose classifier calls (classifyScopeTool, the
  // location-only ask), which stay on the plain "openai" entry above:
  // they're scoped down to one small judgment each, cheap enough that a
  // non-reasoning model already handles them reliably, so paying for
  // reasoning there would just be wasted spend for no real gain.
  //
  // reasoningEffort: "low", not the default — per explicit decision: this
  // is a tool-use/multi-step-decision workload, exactly what OpenAI's own
  // guidance names "low" for ("optimizing for speed and cost"), and this
  // route streams live status text to a buyer mid-search, so every extra
  // reasoning token is real, buyer-visible latency before anything shows
  // up on screen — "high" trades that away for a depth of thought this
  // workload doesn't actually need (its failures were compound
  // instruction-following under a crowded prompt, not hard multi-step
  // reasoning). Price itself is flat regardless of effort level — this
  // only controls how many reasoning tokens get generated, billed at the
  // model's own output rate ($2.00/1M — vs gpt-4o-mini's $0.60/1M).
  "openai-strong": {
    model: (): LanguageModel => openai("gpt-5-mini"),
    providerOptions: { openai: { reasoningEffort: "low" } },
  },
  // Same model already live in generateBusinessDescription.ts.
  groq: { model: (): LanguageModel => groq("llama-3.3-70b-versatile") },
};
type ProviderName = keyof typeof PROVIDERS;

// `generateText` retries internally by default before giving up, and wraps
// the final failure in a RetryError (`.lastError`/`.errors`) rather than
// surfacing the underlying APICallError directly — found live when a real
// Gemini free-tier daily quota exhaustion during earlier testing threw
// immediately instead of falling through to Groq, because
// APICallError.isInstance(err) is false for the RetryError wrapper. Kept
// after the provider swap since this is core `ai`-package error handling,
// not Gemini-specific.
function isRateLimitedOrUnavailable(err: unknown): boolean {
  if (RetryError.isInstance(err)) {
    return err.errors.some(isRateLimitedOrUnavailable);
  }
  if (!APICallError.isInstance(err)) return false;
  return err.statusCode === 429 || err.statusCode === 503 || err.isRetryable;
}

// Narrower than `Omit<Parameters<typeof generateText>[0], "model">` on
// purpose: that type is a discriminated union between a `prompt`-based call
// and a `messages`-based call, and `Omit` collapses it into an intersection
// that (incorrectly) makes both required at once. `messages`, not `prompt`,
// since it's the only shape that can carry multimodal (text + image)
// content — the route handler is the sole caller and always builds one now.
interface GenerateTextOpts {
  system?: string;
  messages: ModelMessage[];
  tools?: Parameters<typeof generateText>[0]["tools"];
  stopWhen?: Parameters<typeof generateText>[0]["stopWhen"];
  providerOptions?: Parameters<typeof generateText>[0]["providerOptions"];
  // Only ever passed by route.ts's forced-clarification retry (see its own
  // comment) — everywhere else relies on the model's own judgment ('auto',
  // the SDK default) over which tool, if any, to call.
  toolChoice?: Parameters<typeof generateText>[0]["toolChoice"];
}

/**
 * Provider-agnostic chat+tools call. Falls through `order` on a 429/503 from
 * the current provider. Uses `generateText` (not `streamText`) specifically
 * because this makes fallback reliable: the whole call is one awaited
 * promise, so a rate-limit error always surfaces before anything is returned
 * to the caller — no risk of a provider failing mid-stream after tokens have
 * already reached a client.
 */
export async function callLLM(
  opts: GenerateTextOpts,
  order: ProviderName[] = ["openai", "groq"],
) {
  let lastErr: unknown;
  for (const name of order) {
    try {
      const entry = PROVIDERS[name];
      // The provider's own default providerOptions (if any — currently
      // only "openai-strong"'s reasoningEffort) wins over whatever the
      // caller passed for THIS attempt specifically, rather than a plain
      // opts.providerOptions passthrough — see PROVIDERS' own comment for
      // why: it must never leak onto a fallback provider that doesn't
      // support it.
      return await generateText({
        model: entry.model(),
        ...opts,
        providerOptions: entry.providerOptions ?? opts.providerOptions,
      });
    } catch (err) {
      lastErr = err;
      if (!isRateLimitedOrUnavailable(err)) throw err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All LLM providers unavailable");
}
