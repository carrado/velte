import { NextResponse } from "next/server";

import { generateAdvertPoster } from "@/lib/server/ai/generateAdvertPoster";
import { backendData, BackendError } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";

// OpenAI image gen + Cloudinary upload regularly exceed Vercel's default.
export const maxDuration = 120;

type Quota = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt?: string | null;
};

// Vendor AI advert poster — consumes a Lagos-day slot on velte-backend,
// generates image + editable copy here, refunds the slot if generation fails.
export async function POST(req: Request) {
  const vendorAuth = await getOptionalVendorAuth();
  if (!vendorAuth) {
    return NextResponse.json(
      { error: "Sign in as a vendor." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    storeName?: unknown;
    prompt?: unknown;
    instructions?: unknown;
    productName?: unknown;
    palette?: unknown;
  } | null;

  const storeName =
    typeof body?.storeName === "string" && body.storeName.trim()
      ? body.storeName.trim().slice(0, 80)
      : null;
  const prompt =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim().slice(0, 800)
      : null;
  const instructions =
    typeof body?.instructions === "string" && body.instructions.trim()
      ? body.instructions.trim().slice(0, 800)
      : null;
  const productName =
    typeof body?.productName === "string" && body.productName.trim()
      ? body.productName.trim().slice(0, 120)
      : null;
  const palette = Array.isArray(body?.palette)
    ? body.palette
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
        .slice(0, 3)
    : null;

  if (!storeName) {
    return NextResponse.json(
      { error: "Store name is required." },
      { status: 400 },
    );
  }
  if (!prompt && !instructions) {
    return NextResponse.json(
      {
        error:
          "Add your offer or poster instructions so we know what to generate.",
      },
      { status: 400 },
    );
  }

  let quota: Quota | null = null;
  try {
    quota = await backendData<Quota>("/hub/ai-poster/consume", {
      method: "POST",
      cookie: vendorAuth.cookie,
      body: {},
    });
  } catch (err) {
    if (err instanceof BackendError) {
      const extra = err.data as {
        code?: string;
        remaining?: number;
        limit?: number;
        used?: number;
        resetsAt?: string | null;
      } | null;
      return NextResponse.json(
        {
          error: err.message,
          code: extra?.code ?? "ai_poster_limit",
          remaining: extra?.remaining ?? 0,
          limit: extra?.limit,
          used: extra?.used,
          resetsAt: extra?.resetsAt ?? null,
        },
        { status: err.status },
      );
    }
    return fail(err, "Couldn't check AI poster allowance.");
  }

  try {
    const result = await generateAdvertPoster({
      storeName,
      prompt: prompt || instructions || "",
      instructions,
      productName,
      palette,
    });
    // Bytes only — the browser uploads to Cloudinary via the advert profile.
    return NextResponse.json({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      headlines: result.headlines,
      blurb: result.blurb,
      remaining: quota.remaining,
      limit: quota.limit,
      used: quota.used,
      resetsAt: quota.resetsAt ?? null,
    });
  } catch (err) {
    // Refund the slot so a failed OpenAI call never burns quota.
    try {
      await backendData<Quota>("/hub/ai-poster/refund", {
        method: "POST",
        cookie: vendorAuth.cookie,
        body: {},
      });
    } catch {
      /* best-effort — still surface the generation error */
    }
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Couldn't generate an AI poster.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
