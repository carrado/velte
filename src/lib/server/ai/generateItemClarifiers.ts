import { tool } from "ai";
import { z } from "zod";

import { callLLM } from "@/lib/server/ai/router";
import type { ClarifierField } from "@/types/sectors";
import type { SearchIntentKind } from "@/types/search";

// Per-ITEM clarifying fields (2026-08-26).
//
// The problem this exists for: the deterministic clarifier picks fields from
// a table keyed by SECTOR, and a sector is always coarser than a product.
// One table has to serve every item under it, so its examples drift — a
// laptop buyer was asked for "Model (e.g. Spark 10 Pro)" and "Battery (e.g.
// 5000mAh)", which are a Tecno phone and a phone battery, because Computers
// & Laptops shared the phone table. Splitting that table fixed laptops.
// Splitting the next one fixes televisions. It never ends, because the
// mismatch is structural: there is no finite set of categories that is as
// specific as the set of things people buy.
//
// So the fields are generated for the ACTUAL item instead — "power bank"
// gets Capacity/Brand/Output, "wedding cake" gets Flavour/Servings/Tiers,
// "generator repair" gets Fault/Generator Size/Turnaround — and the static
// tables become the fallback rather than the answer.
//
// The division of labour is the same one used everywhere else in this
// codebase: the model writes, CODE decides what survives.
//   - The model proposes field names and examples for one item.
//   - Code rejects anything malformed, unsafe, or belonging to a different
//     part of the flow (location, budget and identity are each collected by
//     their own dedicated step and must never be re-asked here).
//   - Any failure at all — provider down, timeout, output that doesn't
//     validate — returns null, and the caller falls back to the sector
//     presets exactly as before. This can improve the question; it can
//     never be the reason a buyer gets no question.
//
// Cost and latency are handled by CACHING, not by asking less: this runs
// before the search with the buyer watching an empty screen, so the second
// person ever to ask for a power bank must not pay for it again.

// Generous enough to absorb an ordinary slow response, short enough that a
// stuck provider costs the buyer one beat rather than the turn. Every
// expiry falls back to the sector presets, so this is a quality ceiling,
// never a failure.
const TIMEOUT_MS = 5000;

// Groq was tried first here — it is genuinely fast when it answers — but
// measured sequentially on the free tier it exceeded the timeout on 4 of
// 10 items while the rest came back in under 1.5s. That shape is queueing,
// not compute, and the timeout below races the WHOLE router call, so a
// slow Groq attempt never reaches the OpenAI fallback behind it. Since
// this call sits in front of the search with the buyer watching an empty
// screen, predictability beats peak speed.
const PROVIDER_ORDER = ["openai", "groq"] as const;

const MIN_FIELDS = 2;
const MAX_FIELDS = 3;
const MAX_NAME_LENGTH = 28;
const MAX_EXAMPLE_LENGTH = 60;

// A field name has to read like a spec label a vendor would actually fill
// in — letters, spaces and the odd separator. Anything else is a model
// improvising prose into a slot that gets rendered as a bullet.
const VALID_NAME = /^[A-Za-z][A-Za-z0-9 &/'’-]{1,27}$/;

// Each of these is collected by its own step, deliberately: location by the
// location gate, budget by searchProducts' own structural `maxBudgetNaira`,
// identity by the buyer-request phone/OTP flow. A model asked "what should
// we know about this item" reaches for them constantly, and every one of
// them re-asked here is either a duplicated question or, for the identity
// ones, a privacy problem — a clarifying bullet is not a place to collect
// somebody's phone number.
//
// Kept to whole concepts rather than loose words on purpose: an earlier
// version banned bare "name" and "number", which would have thrown away
// "Brand Name", "Model Number" and "Part Number" — all real, useful vendor
// labels — and banning "area" would have taken land size with it.
const RESERVED_FIELD =
  /\b(budget|price|cost|naira|location|address|nearby|distance|your name|buyer name|full name|phone|whatsapp|email|contact)\b/i;

const URL_LIKE = /(https?:\/\/|www\.|\.(com|ng|net|org)\b)/i;
const PHONE_LIKE = /\+?(?:\d[\s-]?){9,16}\d/;
const MARKUP = /[<>{}[\]|*_`]/;

function clarifierTool() {
  return tool({
    description:
      "Call this exactly once with the details worth knowing about this specific item.",
    inputSchema: z.object({
      fields: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                "The detail's short label, in Title Case, as a vendor listing this item would label it — e.g. 'Capacity', 'Fabric Type', 'Turnaround Time', 'Engine Size'. Two or three words at most. Never a full question.",
              ),
            example: z
              .string()
              .describe(
                "A short, concrete, REAL example of what a buyer might answer, appropriate to Nigeria — e.g. '20000mAh', 'ankara, lace, aso-oke', 'UK used (Tokunbo)', '2 days'. Two or three alternatives separated by commas is ideal. Never a sentence, never a made-up brand or model that does not exist.",
              ),
          }),
        )
        .describe(
          "Exactly 3 details, the ones that most change WHICH listing a buyer ends up matched with for this specific item. Order them most-useful first.",
        ),
    }),
    execute: async (verdict) => verdict,
  });
}

const SYSTEM_PROMPT = [
  "You help a Nigerian marketplace decide what to ask a buyer about the item or service they just named, before it searches its vendor catalogue.",
  "",
  "Return the 3 details that most change WHICH vendor listing this buyer should be matched with, for this SPECIFIC item — not for its general category.",
  "A power bank is decided by capacity and output, a laptop by processor and condition, a wedding cake by servings and tiers, a generator repair by the fault and the generator's size.",
  "",
  "Rules:",
  "- Name each detail the way a VENDOR listing that item would label it. These are matched against what vendors actually wrote about their stock, so a detail no vendor would ever mention is useless here.",
  "- Every example must be real and specific to Nigeria. Never invent a brand, model or product that does not exist.",
  "- Never ask about price, budget, location, delivery address, or the buyer's name or phone number. Those are collected separately, and repeating them here is a bug.",
  "- For a SERVICE, ask about the job (what needs doing, scale, timing), never about the buyer.",
  "- Keep labels to two or three words and examples to a few words.",
].join("\n");

interface CacheEntry {
  fields: ClarifierField[];
  at: number;
}

// One item term is asked about by many buyers, and the answer doesn't
// change between them — so this is cached for a day. Keyed by intent too,
// since "generator" as a purchase and "generator" as a repair job want
// completely different questions. Bounded so a long-running instance can't
// grow this without limit; oldest-first eviction is fine for a cache whose
// entries are all equally cheap to rebuild.
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

function cacheKey(itemTerm: string, intent?: SearchIntentKind): string {
  return `${intent ?? "unclear"}|${itemTerm.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function readCache(key: string): ClarifierField[] | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return hit.fields;
}

function writeCache(key: string, fields: ClarifierField[]): void {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(key, { fields, at: Date.now() });
}

/** Everything a generated field has to survive before a buyer sees it. */
function validate(raw: unknown): ClarifierField[] | null {
  if (!raw || typeof raw !== "object") return null;
  const list = (raw as { fields?: unknown }).fields;
  if (!Array.isArray(list)) return null;

  const seen = new Set<string>();
  const out: ClarifierField[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const example = String(
      (item as { example?: unknown }).example ?? "",
    ).trim();
    if (!VALID_NAME.test(name) || name.length > MAX_NAME_LENGTH) continue;
    if (RESERVED_FIELD.test(name) || RESERVED_FIELD.test(example)) continue;
    if (!example || example.length > MAX_EXAMPLE_LENGTH) continue;
    if (URL_LIKE.test(example) || PHONE_LIKE.test(example)) continue;
    if (MARKUP.test(name) || MARKUP.test(example)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // `important` is meaningless for a generated set — the model was asked
    // for the three that matter most and nothing else competes for the
    // slots, so the whole list is the selection.
    out.push({
      name,
      // "Human Hair,Synthetic" comes back unspaced often enough to be
      // worth normalising rather than re-prompting for. Digits are
      // excluded: the first version turned "10,000W" into "10, 000W".
      example: example.replace(/,(?=[^\s\d])/g, ", "),
      important: true,
    });
    if (out.length === MAX_FIELDS) break;
  }
  return out.length >= MIN_FIELDS ? out : null;
}

/**
 * Clarifying fields for one specific item. Returns null on ANY failure, so
 * every caller must have a preset fallback ready — see this file's own top
 * comment. Never throws.
 *
 * `presetHint` — the field names the sector table would have used, passed
 * to the model as context rather than as an instruction. It carries two
 * things worth keeping: the vocabulary vendors in this category actually
 * fill in, and any operator tuning applied through the DB overrides layer
 * (Phase 2), which would otherwise be silently bypassed the moment
 * generation succeeds.
 */
export async function generateItemClarifiers(params: {
  itemTerm: string;
  intent?: SearchIntentKind;
  presetHint?: string[];
}): Promise<ClarifierField[] | null> {
  const itemTerm = params.itemTerm.trim();
  if (itemTerm.length < 2) return null;

  const key = cacheKey(itemTerm, params.intent);
  const cached = readCache(key);
  if (cached) return cached;

  const intentLine =
    params.intent === "get_service"
      ? "The buyer wants this DONE for them (a service)."
      : params.intent === "buy_item"
        ? "The buyer wants to BUY this (a product)."
        : "It is not certain whether the buyer wants to buy an item or hire someone.";

  const hint = params.presetHint?.length
    ? `\n\nVendors in the nearest matching category on this marketplace tend to fill in: ${params.presetHint.join(", ")}. Use these only as a guide to the kind of vocabulary vendors use — replace any that do not genuinely fit "${itemTerm}".`
    : "";

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Item: "${itemTerm}"\n${intentLine}${hint}`,
            },
          ],
          tools: { clarifierFields: clarifierTool() },
          toolChoice: "required",
        },
        [...PROVIDER_ORDER],
        "item-clarifiers",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("item clarifier generation timed out")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const fields = validate(
      result.toolResults.find((r) => r.toolName === "clarifierFields")?.output,
    );
    if (!fields) return null;
    writeCache(key, fields);
    return fields;
  } catch (err) {
    console.error(
      "[search] item clarifier generation failed, falling back to presets:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
