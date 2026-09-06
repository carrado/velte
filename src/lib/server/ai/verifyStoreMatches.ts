import { tool } from "ai";
import { z } from "zod";
import type { ModelMessage } from "ai";

import { callLLM } from "@/lib/server/ai/router";
import type { StoreMatch, VendorMatch } from "@/types/search";

// Kind-of-BUSINESS verification — the store-shaped sibling of
// verifyMatches.ts's own item verification (2026-09-05, built after
// checking whether the accessory-in-comparison bug also reached the
// store/service comparison path: it didn't, because there was never any
// kind-of-business check for stores at all, on any turn, single-item or
// comparison).
//
// A phone case can leak into a phone comparison because a shop's SEO title
// bundles the phone's own name into an accessory listing. The store
// equivalent is just as real: a phone accessories shop tagged under
// "Electronics" can surface for "phone repair shop", a hardware store can
// surface for "plumber", a general handyman can surface for "emergency
// plumbing" — the vendor genuinely exists and genuinely matched on
// sector/keyword similarity, but is not the kind of business the buyer
// actually named.
//
// TEXT ONLY, deliberately — unlike the product verifier, which judges
// primarily from a PHOTO (a product photo shows what the product physically
// IS). A store's gallery shows whatever the vendor chose to upload — shop
// front, past work, staff — and is not reliable evidence of what KIND of
// business it is, the way one product photo is reliable evidence of what
// kind of product it is. Name, description, sector tags and the vendor's
// own matching listings are the real signal here, and they are all text —
// which also means every call here is Groq-eligible, unlike the product
// verifier's photo path (see that file's own note on why OpenAI-only there).
//
// Same contract as verifyItemMatches/verifyOfferMatches: never throws, never
// rejects anything it cannot justify — any failure keeps the full list
// untouched — and only an explicit `mismatch` naming what the vendor
// actually does can remove one from the buyer's results.

const VERIFY_TIMEOUT_MS = 8000;

// A comparison table is already capped at MAX_COMPARISON_ROWS
// (comparisonTemplate.ts), so nothing past this many candidates would ever
// render anyway — no reason to spend the round trip judging them.
const MAX_CANDIDATES = 10;

type Verdict = "match" | "close" | "mismatch";

function verifyStoreMatchesTool() {
  return tool({
    description:
      "Call this exactly once with one verdict for every vendor you were given.",
    inputSchema: z.object({
      verdicts: z.array(
        z.object({
          id: z
            .string()
            .describe(
              "The candidate's number exactly as it was labelled in the list (e.g. '1', '2').",
            ),
          verdict: z
            .enum(["match", "close", "mismatch"])
            .describe(
              "'match' — this vendor genuinely offers what the buyer named. 'close' — the same kind of business, differing only in specialisation, scale, or how completely they describe themselves, OR you cannot tell from what you were given. 'mismatch' — a different KIND of business altogether, one the buyer would reject on sight (a hardware store for 'plumber', a general electronics shop for 'phone repair shop', a printing shop for 'wedding photographer').",
            ),
          actualBusiness: z
            .string()
            .describe(
              "A short, plain description of what this vendor actually does, from their own description and listings (e.g. 'a phone accessories shop, not a repair service'). Required for a 'mismatch'; a few words is enough.",
            ),
        }),
      ),
    }),
    execute: async (verdicts) => verdicts,
  });
}

function buildSystemPrompt(): string {
  return [
    "You are a quality gate on Velte, a Nigerian vendor-discovery service.",
    "A buyer described a kind of business or service they want; a search returned candidate vendors from Velte. Your ONE job is to say, for each candidate, whether they genuinely offer what the buyer named.",
    "",
    "Vendors are matched by sector tags and their own store description, which routinely pulls in near-neighbours of the WRONG kind of business — a hardware store for 'plumber', a general electronics shop for 'phone repair shop', a printing shop for 'wedding photographer', a general handyman for 'emergency plumbing'. Catching exactly that is why you exist.",
    "",
    "Judge from the vendor's own description, sector tags, and their listed products/services — whichever tells you most concretely what they actually do. A store's own description is written by the vendor and can be broad or aspirational; their actual LISTINGS (what they've named and priced for sale) are stronger evidence of what they genuinely offer.",
    "",
    "Rules for the verdict:",
    "- 'mismatch' ONLY when it is a different KIND of business altogether — one the buyer would look at and say 'that's not what I asked for at all'.",
    "- When the buyer named a specific TYPE or SPECIALITY within a broader trade (a WEDDING photographer, an EMERGENCY plumber, a CORPORATE caterer), a vendor plainly outside that speciality but genuinely in the broader trade is still 'close', not 'mismatch' — reserve 'mismatch' for a vendor not really in that trade at all.",
    "- 'close', NOT 'mismatch', when it is genuinely the same kind of business and only the specialisation, scale, or completeness of their profile differs.",
    "- 'close' whenever you genuinely cannot tell — a bare profile with no description and no listings is NOT enough evidence to call a mismatch. Never guess a 'mismatch'.",
    "",
    "A wrong 'mismatch' deletes a real vendor's real listing from the buyer's results, so only call one when you are confident. Judge only what you can read — never infer quality, reliability, or reputation from any of this.",
    "",
    "Give a verdict for every candidate, using the number it was labelled with. Call the verifyStoreMatchesTool exactly once.",
  ].join("\n");
}

/** One vendor reduced to the text a verdict actually needs — the same three
 *  signals comparisonTemplate.ts's own storeSummary gives the model for the
 *  comparison itself, so the verifier and the comparison never judge a
 *  vendor from two different pictures of them. */
function describeStore(store: StoreMatch, services: VendorMatch[]): string[] {
  const lines = [
    `${store.name}${
      store.sectors.length ? ` — sectors: ${store.sectors.join(", ")}` : ""
    }`,
  ];
  if (store.description) {
    lines.push(`description: ${store.description.slice(0, 220)}`);
  }
  if (services.length) {
    lines.push(
      `their own listings: ${services
        .slice(0, 4)
        .map((s) => s.name)
        .join("; ")}`,
    );
  }
  return lines;
}

export interface RejectedStoreMatch {
  match: StoreMatch;
  /** What the vendor actually does, in the verifier's words — used for the
   *  server log, never rendered to the buyer directly. */
  actualBusiness: string;
}

export interface StoreMatchVerification {
  kept: StoreMatch[];
  rejected: RejectedStoreMatch[];
}

/**
 * Verifies that each candidate vendor genuinely IS the kind of business the
 * buyer named, from their description, sector tags and their own matching
 * listings — never from photos (see this file's own header for why).
 *
 * Never throws, and never drops anything it can't justify dropping: on any
 * failure the input list comes back untouched as `kept`. Order within
 * `kept` is retrieval's own order, unchanged — this filters, it never ranks.
 */
export async function verifyStoreMatches(params: {
  businessType: string;
  stores: StoreMatch[];
  /** This turn's own matched listings across ALL stores — the same flat
   *  list route.ts already passes to buildStoreComparisonTemplate. Filtered
   *  per vendor here the identical way that builder does (by vendorId),
   *  so this never re-derives a different grouping. */
  services?: VendorMatch[];
}): Promise<StoreMatchVerification> {
  const { businessType, stores } = params;
  const services = params.services ?? [];
  const unchanged: StoreMatchVerification = { kept: stores, rejected: [] };
  if (!stores.length || !businessType.trim()) return unchanged;

  const checked = stores.slice(0, MAX_CANDIDATES);
  const unchecked = stores.slice(MAX_CANDIDATES);
  const servicesFor = (store: StoreMatch) =>
    services.filter((s) => s.vendorId === store.vendorId);

  const listText = checked
    .map((s, i) => {
      const lines = describeStore(s, servicesFor(s));
      return [
        `${i + 1}. ${lines[0]}`,
        ...lines.slice(1).map((l) => `   ${l}`),
      ].join("\n");
    })
    .join("\n");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        `The buyer asked for: "${businessType}".`,
        "",
        `Candidate vendors (${checked.length}):`,
        listText,
      ].join("\n"),
    },
  ];

  try {
    const result = await Promise.race([
      callLLM(
        {
          system: buildSystemPrompt(),
          messages,
          tools: { verifyStoreMatchesTool: verifyStoreMatchesTool() },
          toolChoice: "required",
        },
        // Text-only throughout, so both providers are safe — unlike the
        // product verifier's photo path, which reserves OpenAI for turns
        // carrying an image.
        ["openai", "groq"],
        "verify-store-matches",
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("store verification timed out")),
          VERIFY_TIMEOUT_MS,
        ),
      ),
    ]);

    const output = result.toolResults.find(
      (r) => r.toolName === "verifyStoreMatchesTool",
    )?.output as
      | {
          verdicts?: {
            id?: string;
            verdict?: Verdict;
            actualBusiness?: string;
          }[];
        }
      | undefined;
    const verdicts = output?.verdicts;
    if (!Array.isArray(verdicts) || !verdicts.length) return unchanged;

    // The numbers the model returns are claims, not facts — same discipline
    // verifyMatches.ts applies to its own returned ids. A number outside
    // the candidate range is discarded rather than allowed to delete the
    // wrong vendor.
    const rejectedByIndex = new Map<number, string>();
    for (const v of verdicts) {
      if (v?.verdict !== "mismatch") continue;
      const index = Number.parseInt(String(v.id ?? ""), 10) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= checked.length) {
        continue;
      }
      const actualBusiness =
        typeof v.actualBusiness === "string" ? v.actualBusiness.trim() : "";
      // A mismatch with nothing behind it is exactly the shape of a
      // hallucinated rejection: the verdict has to come with what the
      // vendor actually does, or it doesn't get to delete one.
      if (!actualBusiness) continue;
      rejectedByIndex.set(index, actualBusiness.slice(0, 80));
    }
    if (!rejectedByIndex.size) return unchanged;

    const rejected: RejectedStoreMatch[] = [];
    const kept: StoreMatch[] = [];
    checked.forEach((store, i) => {
      const actualBusiness = rejectedByIndex.get(i);
      if (actualBusiness) rejected.push({ match: store, actualBusiness });
      else kept.push(store);
    });

    return { kept: [...kept, ...unchecked], rejected };
  } catch (err) {
    console.error("[search] store verification failed, keeping all:", err);
    return unchanged;
  }
}
