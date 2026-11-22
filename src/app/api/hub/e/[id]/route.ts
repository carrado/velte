import { verifyAssetRef, maskMediaBuffer } from "@/lib/server/posterProxy";

// GET /api/hub/e/[id]
// Kept for backward compatibility with existing links.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!id) {
    return new Response(null, { status: 400 });
  }

  let imageUrl: string;
  try {
    ({ url: imageUrl } = verifyAssetRef(id));
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
    return new Response(null, {
      status: upstream.status >= 500 ? 502 : upstream.status,
    });
  }

  const rawBytes = Buffer.from(await upstream.arrayBuffer());
  const maskedBytes = maskMediaBuffer(rawBytes, id);

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
