import { AsyncLocalStorage } from "node:async_hooks";

// ---------------------------------------------------------------------
// Per-turn LLM cost instrumentation (2026-08-28).
//
// Why this exists: pricing Velte — free-tier allowances, what a "search"
// costs, whether a subscription price is generous or suicidal — was being
// argued from guesses, because nothing anywhere recorded what a turn
// actually spends. This makes that a measured number instead.
//
// The one rule that shapes everything below: TOKENS ARE THE RECORD, NAIRA
// IS A CONVENIENCE. Token counts come from the provider and are facts.
// Prices change, FX moves, and the table below WILL go stale — so every
// log line carries the raw token counts, which means any past turn can be
// re-costed correctly later from the logs alone. Never delete the token
// fields to keep a line short.
//
// Two things it must never do, because it sits in the hot path of a buyer
// who is watching a status ticker:
//   1. NEVER THROW. Every entry point swallows its own errors — a
//      cost-accounting bug must not break a search.
//   2. NEVER BLOCK. No I/O, no awaits. Records accumulate in memory for
//      the life of one request and are emitted as one console line.
//
// Attribution without threading: callLLM is called from 14 places across
// route.ts, verifyMatches, recommendResults and generateItemClarifiers.
// Passing a context object through all of them would be invasive and easy
// to forget at a new call site, so this uses AsyncLocalStorage — the route
// opens a turn once, and every LLM call underneath it lands in that turn
// automatically, including ones added later by someone who never reads this
// file. Requires the Node runtime, which /api/search already uses (it has
// no `export const runtime`, and Node is the default).
// ---------------------------------------------------------------------

// Prices are USD per 1,000,000 tokens.
//
// VERIFY THESE BEFORE TRUSTING ANY NAIRA FIGURE. They were written from
// memory, not from a pricing page, and at least the gpt-5 family entries
// are guesses. Wrong numbers here do NOT corrupt the data — the token
// counts in each log line are unaffected and can be re-costed at any time.
// Override without a deploy by setting LLM_PRICE_OVERRIDES to a JSON object
// of the same shape, e.g. {"gpt-5-mini":{"input":0.25,"output":2}}.
const DEFAULT_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  // Guesses — the two that most need checking, since "openai-strong" (the
  // main tool loop, the most-called path of all) runs gpt-5-mini.
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5": { input: 1.25, output: 10.0 },
  // Groq is cheap enough that being wrong here barely moves a total, and
  // it's only ever reached on a 429 fallback.
  "openai/gpt-oss-20b": { input: 0.1, output: 0.5 },
  "qwen/qwen3.8-27b": { input: 0.1, output: 0.5 },
};

function loadPrices(): Record<string, { input: number; output: number }> {
  const raw = process.env.LLM_PRICE_OVERRIDES;
  if (!raw) return DEFAULT_PRICES;
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      { input?: number; output?: number }
    >;
    const merged = { ...DEFAULT_PRICES };
    for (const [model, price] of Object.entries(parsed)) {
      if (typeof price?.input !== "number") continue;
      if (typeof price?.output !== "number") continue;
      merged[model] = { input: price.input, output: price.output };
    }
    return merged;
  } catch {
    // A malformed override must not take the defaults down with it.
    console.warn("[cost] LLM_PRICE_OVERRIDES is not valid JSON — ignoring");
    return DEFAULT_PRICES;
  }
}

// Read once per process rather than per call — this is a cold-start-scoped
// constant, and re-parsing JSON inside the hot path would be silly.
const PRICES = loadPrices();

// Naira per dollar. Deliberately an env var with a visibly stale default:
// the whole point of the exercise is that Velte's revenue is naira and its
// costs are dollars, so this number is part of the business model, not a
// formatting detail. Set USD_TO_NGN in the environment and keep it current.
const USD_TO_NGN = Number(process.env.USD_TO_NGN) || 1600;

export interface CallRecord {
  /** Which call site — "scope", "main-loop", "verify-matches", … */
  label: string;
  /** The PROVIDERS entry that answered (after any 429 fallback). */
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedInputTokens: number;
  /** Images attached to this specific call, for correlating cost. */
  images: number;
  ms: number;
  /** USD, derived from the table above — an estimate, not a fact. */
  costUsd: number;
}

interface TurnContext {
  turnId: string;
  buyerId: string | null;
  /** Did the BUYER attach a photo to this turn? */
  hasImage: boolean;
  startedAt: number;
  calls: CallRecord[];
}

const turnStore = new AsyncLocalStorage<TurnContext>();

function priceFor(model: string): { input: number; output: number } | null {
  if (PRICES[model]) return PRICES[model];
  // Dated model ids ("gpt-4o-mini-2024-07-18") should cost like their base
  // model rather than silently falling to zero.
  const base = Object.keys(PRICES).find((known) => model.startsWith(known));
  return base ? PRICES[base] : null;
}

/**
 * Records one completed LLM call against the open turn, if there is one.
 * Calls made outside a turn (a script, a cron, a route that hasn't been
 * wrapped yet) are silently ignored rather than logged loose — a stray
 * half-attributed line is worse than no line when the point is per-turn
 * totals.
 */
export function recordCall(record: Omit<CallRecord, "costUsd">): void {
  try {
    const turn = turnStore.getStore();
    if (!turn) return;
    const price = priceFor(record.model);
    // An unknown model is recorded with its real tokens and a zero cost,
    // never dropped — a missing price is a table to update, and losing the
    // token count would lose the only part that was ever authoritative.
    const costUsd = price
      ? (record.inputTokens / 1_000_000) * price.input +
        (record.outputTokens / 1_000_000) * price.output
      : 0;
    if (!price) {
      console.warn(`[cost] no price for model "${record.model}" — counted 0`);
    }
    turn.calls.push({ ...record, costUsd });
  } catch {
    // Instrumentation must never break a search.
  }
}

/**
 * Fills in what the route only learns after the turn is already open.
 *
 * The turn has to be opened around the WHOLE handler (an LLM call that
 * happens before the context exists is a call that goes unrecorded), but
 * `buyerId` needs a cookie round-trip and `hasImage` needs the parsed body
 * — both of which happen inside it. So the turn starts anonymous and is
 * annotated a few lines later, rather than parsing the request twice.
 */
export function annotateTurn(meta: {
  buyerId?: string | null;
  hasImage?: boolean;
}): void {
  try {
    const turn = turnStore.getStore();
    if (!turn) return;
    if (meta.buyerId !== undefined) turn.buyerId = meta.buyerId;
    if (meta.hasImage !== undefined) turn.hasImage = meta.hasImage;
  } catch {
    // Instrumentation must never break a search.
  }
}

/** Naira, to 2dp, from a USD amount. */
function toNaira(usd: number): number {
  return Math.round(usd * USD_TO_NGN * 100) / 100;
}

/**
 * Opens a turn, runs `fn` inside it, and emits exactly one structured line
 * when it finishes — including when it throws, since a turn that failed
 * halfway still spent real money and is exactly the kind of turn worth
 * seeing in the data.
 *
 * The line is single-line JSON prefixed `[cost]` so it can be pulled
 * straight out of Vercel's log drain with a grep and loaded as NDJSON,
 * with no database, no schema migration and no extra infrastructure —
 * which matters, because this has to run on the free tier it's measuring.
 */
export async function withTurnUsage<T>(
  meta: { turnId: string; buyerId: string | null; hasImage: boolean },
  fn: () => Promise<T>,
): Promise<T> {
  const turn: TurnContext = {
    turnId: meta.turnId,
    buyerId: meta.buyerId,
    hasImage: meta.hasImage,
    startedAt: Date.now(),
    calls: [],
  };
  try {
    return await turnStore.run(turn, fn);
  } finally {
    emit(turn);
  }
}

function emit(turn: TurnContext): void {
  try {
    // A turn that never called an LLM (a validation bounce, an empty body)
    // is noise — it cost nothing and would drown the real lines.
    if (!turn.calls.length) return;

    const sum = (pick: (c: CallRecord) => number) =>
      turn.calls.reduce((total, call) => total + pick(call), 0);

    const costUsd = sum((c) => c.costUsd);
    // Per-call-site subtotals: the whole reason for `label`. This is what
    // answers "is it the main loop or the photo verification that's
    // expensive?", which is the question that decides what to optimise and
    // what to meter.
    const byLabel: Record<string, { calls: number; usd: number }> = {};
    for (const call of turn.calls) {
      const bucket = (byLabel[call.label] ??= { calls: 0, usd: 0 });
      bucket.calls += 1;
      bucket.usd = Math.round((bucket.usd + call.costUsd) * 1e6) / 1e6;
    }

    console.log(
      "[cost] " +
        JSON.stringify({
          turnId: turn.turnId,
          buyerId: turn.buyerId,
          // The single most important dimension in the whole dataset: a
          // photo turn and a text turn are different products with
          // different costs, and the pricing plan has to price them apart.
          kind: turn.hasImage ? "photo" : "text",
          ms: Date.now() - turn.startedAt,
          llmCalls: turn.calls.length,
          images: sum((c) => c.images),
          inputTokens: sum((c) => c.inputTokens),
          outputTokens: sum((c) => c.outputTokens),
          reasoningTokens: sum((c) => c.reasoningTokens),
          cachedInputTokens: sum((c) => c.cachedInputTokens),
          costUsd: Math.round(costUsd * 1e6) / 1e6,
          costNgn: toNaira(costUsd),
          fxRate: USD_TO_NGN,
          byLabel,
          // Per-call detail last: the aggregates above are what get read
          // day to day, and keeping them at the front means a truncated
          // log line still carries the useful half.
          calls: turn.calls.map((c) => ({
            label: c.label,
            provider: c.provider,
            model: c.model,
            in: c.inputTokens,
            out: c.outputTokens,
            img: c.images,
            ms: c.ms,
          })),
        }),
    );
  } catch {
    // Same rule as everywhere else here.
  }
}
