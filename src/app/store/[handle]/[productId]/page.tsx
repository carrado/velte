import { redirect, notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import { getActorAuth, getOptionalBuyerId } from "@/lib/server/buyerGuards";
import { getOptionalUserId } from "@/lib/server/guards";

/** Legacy /store/:handle/:productId → /{slug}. */
export default async function LegacyStoreProductRedirect({
  params,
}: {
  params: Promise<{ handle: string; productId: string }>;
}) {
  const { handle, productId } = await params;
  const vendorUserId = await getOptionalUserId();
  const buyerId = await getOptionalBuyerId();
  if (!vendorUserId && !buyerId) {
    redirect(`/auth/login?redirect=/store/${handle}/${productId}`);
  }
  try {
    const actor = await getActorAuth();
    const data = await getPublicProduct(handle, productId, actor?.cookie);
    const slug = data.product.slug || data.product.id;
    redirect(`/${slug}`);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) notFound();
    throw err;
  }
}
