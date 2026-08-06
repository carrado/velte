import { NextResponse } from "next/server";
import { backendData, BackendError } from "@/lib/server/backend";

// Branded short-link redirector for a single product's photo — WhatsApp's
// click-to-chat pre-fill (wa.me?text=) can only carry text, no attachment
// param, so buildWhatsappLink drops a velte.ng/s/p/<id> link into the
// message instead of a long raw Cloudinary URL. Unlike /s/[code] (a static
// build-time JSON lookup), this resolves LIVE by product id on every
// request — there's no fixed set of these to pre-generate, and a vendor
// swapping their product photo should redirect to the new one immediately,
// not a stale baked-in URL from whenever the message was sent.
//
// Deliberately server-resolved by id, never a client-supplied URL — the
// only possible redirect targets are Velte's own product photos, so this
// can't be turned into an open redirect the way a `?u=<url>` param could.
// A missing/suspended/hidden product still lands somewhere useful (the
// homepage) rather than a dead 404, same convention as /s/[code].
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { mainImageUrl } = await backendData<{ mainImageUrl: string }>(
      `/store/products/${encodeURIComponent(id)}/image`,
    );
    return NextResponse.redirect(mainImageUrl, { status: 302 });
  } catch (err) {
    if (!(err instanceof BackendError)) {
      console.error(`[s/p/${id}] image lookup failed:`, err);
    }
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }
}
