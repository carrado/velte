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

const PROVIDERS = {
  openai: (): LanguageModel => openai("gpt-4o-mini"),
  // Same model already live in generateBusinessDescription.ts.
  groq: (): LanguageModel => groq("llama-3.3-70b-versatile"),
} as const;
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
      return await generateText({ model: PROVIDERS[name](), ...opts });
    } catch (err) {
      lastErr = err;
      if (!isRateLimitedOrUnavailable(err)) throw err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("All LLM providers unavailable");
}
