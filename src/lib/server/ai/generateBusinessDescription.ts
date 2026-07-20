import type { SectorClassification } from "@/types/sectors";

// First LLM integration in the stack — kept to one file so swapping models
// or providers later stays a localized change. Groq's chat completions API
// is OpenAI-compatible, so a plain fetch avoids pulling in an SDK.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface SectorInput {
  label: string;
  classification: SectorClassification;
}

interface GenerateArgs {
  businessName: string;
  sectors: SectorInput[]; // one or more — a vendor can pick up to 5 at signup
}

// "a", "a and b", "a, b and c" — reads naturally whether the vendor picked
// one sector or several.
function formatSectorList(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function templateDescription({ businessName, sectors }: GenerateArgs): string {
  const sectorList = formatSectorList(
    sectors.map((s) => s.label.toLowerCase()),
  );
  const hasFood = sectors.some(
    (s) => s.classification === "food" || s.classification === "food_both",
  );
  const hasService = sectors.some(
    (s) =>
      s.classification === "service" ||
      s.classification === "both" ||
      s.classification === "food_both",
  );

  if (hasFood && hasService) {
    return `${businessName} covers ${sectorList} — from food to services, we bring quality and reliable delivery to everything we do.`;
  }
  if (hasFood) {
    return `${businessName} covers ${sectorList}, made fresh and ready to order. We take pride in quality ingredients and fast, friendly service.`;
  }
  if (hasService) {
    return `${businessName} covers ${sectorList} — we bring the right skills and reliable service to every job, big or small.`;
  }
  return `${businessName} covers ${sectorList}. We stock quality products and are ready to serve customers looking for exactly what they need.`;
}

export async function generateBusinessDescription(
  args: GenerateArgs,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templateDescription(args);

  try {
    const sectorLabels = args.sectors.map((s) => s.label).join(", ");
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "You write short business descriptions for vendors on a Nigerian marketplace app. 2-3 plain-language sentences, first person plural ('We...'), no fluff, no hashtags, no emoji, no markdown. When more than one sector is listed, weave all of them into the description rather than focusing on just one.",
          },
          {
            role: "user",
            content: `Business name: ${args.businessName}\nSector(s): ${sectorLabels}\nWrite a description that helps buyers understand what this business sells or does across all the sectors listed.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return templateDescription(args);

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content?.trim() || templateDescription(args);
  } catch {
    return templateDescription(args);
  }
}
