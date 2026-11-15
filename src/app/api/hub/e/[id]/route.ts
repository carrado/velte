import { verifyPosterToken } from "@/lib/server/posterProxy";

// GET /api/hub/e/[id]
// [id] is an HMAC-signed, 30-second-lived opaque token that encodes the
// actual image URL.  The raw origin URL is never sent to the browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!id) {
    return new Response(null, { status: 400 });
  }

  // Block any attempt to load or download the image by pasting the URL in another tab
  const dest = _request.headers.get("sec-fetch-dest");
  const mode = _request.headers.get("sec-fetch-mode");
  if (dest === "document" || mode === "navigate") {
    return new Response(null, { status: 403 });
  }

  let imageUrl: string;
  try {
    ({ url: imageUrl } = verifyPosterToken(id));
  } catch {
    return new Response(null, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl, {
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(null, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/webp";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
