import { verifyAssetRef, maskMediaBuffer } from "@/lib/server/posterProxy";

async function streamMedia(ref: string): Promise<Response> {
  if (!ref) {
    return new Response(JSON.stringify({ error: "Missing media reference" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let imageUrl: string;
  try {
    ({ url: imageUrl } = verifyAssetRef(ref));
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid media reference";
    return new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to connect to upstream media provider" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        error: `Upstream media returned status ${upstream.status}`,
      }),
      {
        status: upstream.status >= 500 ? 502 : upstream.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const rawBytes = Buffer.from(await upstream.arrayBuffer());
  // Obfuscate the media bytes header using ref mask.
  // Prevents DevTools Network tab from rendering image preview, and prevents saving or copying elsewhere.
  const maskedBytes = maskMediaBuffer(rawBytes, ref);

  return new Response(new Uint8Array(maskedBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

// POST /api/hub/media
// Accepts { ref: string }
export async function POST(req: Request): Promise<Response> {
  let ref = "";
  try {
    const text = (await req.text()).trim();
    if (text.startsWith("{")) {
      const data = JSON.parse(text);
      // Accept 'ref' (new) and 'token'/'payload'/'mediaToken' (legacy)
      ref = (data?.ref ||
        data?.token ||
        data?.payload ||
        data?.mediaToken ||
        "") as string;
    } else {
      ref = text;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return streamMedia(ref);
}

// GET /api/hub/media?ref=...
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const ref =
    searchParams.get("ref") ||
    searchParams.get("token") ||
    searchParams.get("payload") ||
    "";
  return streamMedia(ref);
}
