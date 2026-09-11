import type { SectorClassification } from "@/types/sectors";
import {
  descriptionQuality,
  DESCRIPTION_QUALITY_COPY,
  type DescriptionQuality,
} from "@/lib/description-quality";

// Same Groq chat-completions endpoint as generateBusinessDescription.ts —
// kept in its own file for the same reason that one is: a single localized
// spot to swap models/providers later.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// See router.ts — the llama-3.3 id was decommissioned by Groq.
const GROQ_MODEL = "openai/gpt-oss-20b";

interface SectorInput {
  label: string;
  classification: SectorClassification;
}

interface AssessArgs {
  description: string;
  sectors: SectorInput[];
}

export interface DescriptionQualityAssessment {
  quality: DescriptionQuality;
  hint: string;
}

// Character-count fallback — used when there's no API key configured, or
// the model call/parse fails for any reason. Same tiering the client-side
// meter already showed before this existed, so a broken/missing key never
// regresses below what vendors already had.
function heuristicAssessment(
  description: string,
): DescriptionQualityAssessment {
  const quality = descriptionQuality(description);
  return { quality, hint: DESCRIPTION_QUALITY_COPY[quality].hint };
}

// Judges whether a description has enough REAL, specific detail — not just
// length — for the store-level vector search (see description-quality.ts's
// own comment on why this matters for a vendor with zero listings) to
// actually surface this vendor. Deliberately fails open to the length-based
// heuristic on any error: this is a background nudge, not something that
// should ever block or error out on the vendor.
export async function assessDescriptionQuality(
  args: AssessArgs,
): Promise<DescriptionQualityAssessment> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return heuristicAssessment(args.description);

  try {
    const sectorList = args.sectors.map((s) => s.label).join(", ");
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            // Found live: a description can be genuinely specific and
            // still score "good" wrongly if it only covers ONE of several
            // sectors the vendor selected (e.g. detailed about catering,
            // silent on real estate/ushering/event planning they also
            // picked) — checking for specificity alone isn't enough, this
            // has to also check the description actually reflects the
            // FULL spread of what was selected.
            content:
              'You judge whether a Nigerian vendor\'s business description gives an AI buyer-matching system enough REAL, SPECIFIC detail to find this vendor — even before they list any products — across EVERY sector they selected, not just one. Concrete detail means actual items/services named, brands carried, or the area covered. Vague filler ("we are the best", "quality guaranteed") scores low regardless of length. IMPORTANT: a vendor can select several different, unrelated sectors (e.g. catering AND real estate AND event planning) — if the description gives specific detail for only ONE of those and says nothing at all about the others, that is a real gap, not a "good" description of this store: mark it "weak" or "fair" and name the missing sector(s) in the hint. Only mark "good" when the specific detail given reasonably reflects the full spread of sectors selected (naturally related sectors, e.g. a restaurant that also does baked goods, don\'t need an exhaustive itemized list per sector — use judgment on whether a buyer interested in any selected sector would find something specific here). Respond with ONLY compact JSON, no markdown, no extra text: {"quality":"weak"|"fair"|"good","hint":"<one short second-person sentence, under 20 words, actionable>"}',
          },
          {
            role: "user",
            content: `Sector(s): ${sectorList || "not specified"}\nDescription: ${args.description}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return heuristicAssessment(args.description);

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return heuristicAssessment(args.description);

    const parsed = JSON.parse(content) as {
      quality?: string;
      hint?: string;
    };
    if (
      parsed.quality === "weak" ||
      parsed.quality === "fair" ||
      parsed.quality === "good"
    ) {
      return {
        quality: parsed.quality,
        hint:
          parsed.hint?.trim().slice(0, 200) ||
          DESCRIPTION_QUALITY_COPY[parsed.quality].hint,
      };
    }
    return heuristicAssessment(args.description);
  } catch {
    return heuristicAssessment(args.description);
  }
}
