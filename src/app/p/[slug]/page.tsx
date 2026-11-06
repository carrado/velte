import type { Metadata } from "next";
import { getPublicProductBySlug } from "@/lib/server/store";
import { BackendError } from "@/lib/server/backend";
import { getActorAuth } from "@/lib/server/buyerGuards";
import { PublicProductPageClient } from "@/components/products/PublicProductPageClient";

async function fetchProduct(slug: string) {
  try {
    const actor = await getActorAuth();
    return await getPublicProductBySlug(slug, actor?.cookie);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProduct(slug);
  if (!data) return { title: "Product not found · Velte" };
  const { product, store } = data;
  const description =
    product.description || `${product.name} from ${store.name} on Velte.`;
  const image = product.mainImageUrl ?? undefined;
  const canonical = `/${product.slug || slug}`;
  return {
    title: `${product.name} · ${store.name} · Velte`,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      images: image,
    },
  };
}

export default async function PublicProductSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Data load is client-side (same query key as Hub nav prefetch) so a
  // Hub → product click lands from cache. Metadata still resolves server-side.
  return <PublicProductPageClient slug={slug} />;
}
