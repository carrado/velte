import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";

import { recordCall } from "@/lib/server/ai/usage";
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
const PROVIDERS: Record<
  | "openai"
  | "openai-strong"
  | "openai-reasoning"
  | "openai-max"
  | "groq"
  | "qwen",
  ProviderEntry
> = {
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
  // `openai/gpt-oss-20b`, not llama-3.3-70b-versatile (2026-08-26).
  // Groq decommissioned the llama-3.3 id — the API answers "The model
  // `llama-3.3-70b-versatile` does not exist or you do not have access to
  // it" — which had quietly made every Groq fallback in this codebase dead
  // weight: callLLM only ever reached it after OpenAI failed, so nothing
  // surfaced the breakage until a call was pointed at Groq FIRST. Verified
  // live against Groq's model list: gpt-oss-120b refuses forced tool calls,
  // qwen3.8-27b works, gpt-oss-20b works and keeps OpenAI-lineage tool
  // calling, which is what the rest of this pipeline is written against.
  groq: { model: (): LanguageModel => groq("openai/gpt-oss-20b") },
  // A second, independent Groq-hosted family. Same host, different model
  // lineage — which is the point: when Groq retires an id (it retired
  // llama-3.3 out from under this router), having only one entry there
  // means the whole rung dies at once. Registered so a provider order can
  // name it; nothing routes here by default until it earns it on the evals.
  qwen: { model: (): LanguageModel => groq("qwen/qwen3.8-27b") },
  // MEASUREMENT TIERS — registered so the evals can name them, not wired
  // into any live provider order. Both exist to answer one question with
  // numbers instead of intuition: does more reasoning actually buy this
  // pipeline anything, and is it worth the latency a buyer waits through?
  "openai-reasoning": {
    model: (): LanguageModel => openai("gpt-5-mini"),
    providerOptions: { openai: { reasoningEffort: "medium" } },
  },
  "openai-max": {
    model: (): LanguageModel => openai("gpt-5"),
    providerOptions: { openai: { reasoningEffort: "medium" } },
  },
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
  // Names this call site in the cost log ("main-loop", "verify-matches", …).
  // Optional so adding a new call site can never break the build, but an
  // unlabelled call is invisible in the per-call-site breakdown that makes
  // the data actionable — always pass one. See usage.ts.
  label = "unlabelled",
) {
  let lastErr: unknown;
  for (const name of order) {
    try {
      const entry = PROVIDERS[name];
      // Built once and reused for both the call and the cost record — this
      // used to be two `entry.model()` calls, which constructed the model
      // twice and risked the log naming a different instance than the one
      // that actually answered.
      const model = entry.model();
      const startedAt = Date.now();
      // The provider's own default providerOptions (if any — currently
      // only "openai-strong"'s reasoningEffort) wins over whatever the
      // caller passed for THIS attempt specifically, rather than a plain
      // opts.providerOptions passthrough — see PROVIDERS' own comment for
      // why: it must never leak onto a fallback provider that doesn't
      // support it.
      const result = await generateText({
        model,
        ...opts,
        providerOptions: entry.providerOptions ?? opts.providerOptions,
      });

      // Recorded HERE rather than at the call sites because this is the one
      // place that knows which provider actually answered after a 429
      // fallback — a call that started on "openai-strong" and finished on
      // "groq" costs what Groq costs, and attributing it to the requested
      // provider would quietly bias every average.
      const usage = result.usage;
      recordCall({
        label,
        provider: name,
        // LanguageModel is a union — a provider entry may be a bare model-id
        // string rather than an instance, so this can't just read .modelId.
        model: typeof model === "string" ? model : model.modelId,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        reasoningTokens: usage?.outputTokenDetails?.reasoningTokens ?? 0,
        cachedInputTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        images: countImages(opts.messages),
        ms: Date.now() - startedAt,
      });
      return result;
    } catch (err) {
      lastErr = err;
      if (!isRateLimitedOrUnavailable(err)) throw err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All LLM providers unavailable");
}

/** Image parts across every message in the request. Counted rather than
 *  inferred from token totals because images are billed as input tokens and
 *  are therefore invisible in the usage numbers on their own — and "how
 *  much do photos actually cost us" is the specific question this whole
 *  instrumentation exists to answer. */
function countImages(messages: ModelMessage[]): number {
  let count = 0;
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part.type === "image") count += 1;
      // The non-deprecated shape the codebase actually emits — see
      // verifyMatches / recommendResults.
      else if (part.type === "file" && part.mediaType?.startsWith("image"))
        count += 1;
    }
  }
  return count;
}
