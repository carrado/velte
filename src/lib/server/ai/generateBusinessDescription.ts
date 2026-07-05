import type { SectorClassification } from "@/types/sectors";

// First LLM integration in the stack — kept to one file so swapping models
// or providers later stays a localized change. Groq's chat completions API
// is OpenAI-compatible, so a plain fetch avoids pulling in an SDK.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GenerateArgs {
  businessName: string;
  sectorLabel: string;
  classification: SectorClassification;
}

function templateDescription({
  businessName,
  sectorLabel,
  classification,
}: GenerateArgs): string {
  const sector = sectorLabel.toLowerCase();
  if (classification === "food") {
    return `${businessName} serves ${sector}, made fresh and ready to order. We take pride in quality ingredients and fast, friendly service.`;
  }
  if (classification === "service") {
    return `${businessName} provides ${sector}. We bring the right skills and reliable service to every job, big or small.`;
  }
  if (classification === "both") {
    return `${businessName} works in ${sector} — we sell quality products and offer the services that go with them. Whatever you need, buy it or book it with us.`;
  }
  if (classification === "food_both") {
    return `${businessName} handles ${sector} — we cook great food and cater for your events. Order a meal or book us for your next occasion.`;
  }
  return `${businessName} is a ${sector} business. We stock quality products and are ready to serve customers looking for exactly what they need.`;
}

export async function generateBusinessDescription(
  args: GenerateArgs,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templateDescription(args);

  try {
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
              "You write short business descriptions for vendors on a Nigerian marketplace app. 2-3 plain-language sentences, first person plural ('We...'), no fluff, no hashtags, no emoji, no markdown.",
          },
          {
            role: "user",
            content: `Business name: ${args.businessName}\nSector: ${args.sectorLabel}\nWrite a description that helps buyers understand what this business sells or does.`,
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
