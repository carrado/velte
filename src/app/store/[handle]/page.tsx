import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getPublicStore } from "@/lib/server/store";
import { formatMetadataImageUrl } from "@/lib/media";
import { BackendError, backendData } from "@/lib/server/backend";
import { AUTH_COOKIE } from "@/lib/server/session";
import { BUYER_AUTH_COOKIE } from "@/lib/server/buyerSession";
import { getOptionalUserId } from "@/lib/server/guards";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";
import { buildChatLink } from "@/lib/chatLink";
import type { PublicStore, PublicStoreTab } from "@/types/store";
import type { User } from "@/types/user";
import type { Buyer } from "@/types/buyer";
import StoreNavbar from "./_components/StoreNavbar";
import StoreHero from "./_components/StoreHero";
import StoreFooter from "./_components/StoreFooter";
import StoreTabs from "./_components/StoreTabs";
import StoreMobileBottomNav from "./_components/StoreMobileBottomNav";
import { isEnterpriseVendor } from "@/lib/enterprise";
import { IdentitySessionSync } from "@/components/chat/IdentitySessionSync";
import { HubNotificationsSync } from "@/components/hub/HubNotificationsSync";

async function getServerSession(): Promise<{
  vendor: User | null;
  buyer: Buyer | null;
}> {
  try {
    const jar = await cookies();
    const vendorToken = jar.get(AUTH_COOKIE)?.value;
    const buyerToken = jar.get(BUYER_AUTH_COOKIE)?.value;

    if (!vendorToken && !buyerToken) {
      return { vendor: null, buyer: null };
    }

    const parts: string[] = [];
    if (vendorToken) parts.push(`${AUTH_COOKIE}=${vendorToken}`);
    if (buyerToken) parts.push(`${BUYER_AUTH_COOKIE}=${buyerToken}`);

    const data = await backendData<{
      vendor: (User & { _id?: string }) | null;
      buyer: (Buyer & { _id?: string }) | null;
    }>("/auth/me", { cookie: parts.join("; ") });

    const vendor = data.vendor
      ? { ...data.vendor, id: data.vendor.id ?? data.vendor._id }
      : null;
    const buyer = data.buyer
      ? { ...data.buyer, id: data.buyer.id ?? data.buyer._id }
      : null;

    return { vendor: vendor as User | null, buyer: buyer as Buyer | null };
  } catch {
    return { vendor: null, buyer: null };
  }
}

// Public storefront — server-rendered for SEO and link previews. This is the
// page the AI hands buyers off to. A real site shell (Navbar with a "Find on
// Velte" link +
// sign-in/vendor-aware account slot, a rich hero carrying the store's own
// photos or a sector-themed generated background, the catalog body, and a
// vendor-profile footer) rather than a bare listing page. Styling follows the
// app palette: #F1F5F9 background, white cards, orange accents — #023337 is
// text-only, never a surface.

async function fetchStore(handle: string): Promise<PublicStore | null> {
  try {
    return await getPublicStore(handle);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const store = await fetchStore(handle);
  if (!store) return { title: "Store not found · Velte" };
  const description =
    store.description ||
    `${store.name} on Velte — chat with this vendor directly.`;
  const rawImage = store.gallery[0] ?? store.avatar ?? undefined;
  const image = formatMetadataImageUrl(rawImage);
  return {
    title: `${store.name} · Velte`,
    description,
    alternates: {
      canonical: `/store/${store.handle}`,
    },
    openGraph: {
      title: store.name,
      description,
      url: `/store/${store.handle}`,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title: store.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** LocalBusiness structured data — every field comes straight off the same
 * store record the page renders, never invented (no fabricated street
 * address/geo — PublicStore only ever carries a free-text `area`). */
function storeJsonLd(store: PublicStore) {
  const telephone = store.whatsapp
    ? `+${normalizeWhatsappNumber(store.whatsapp)}`
    : undefined;
  const rawImage = store.gallery[0] ?? store.avatar ?? undefined;
  const image = formatMetadataImageUrl(rawImage);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    description: store.description || undefined,
    url: `https://velte.ng/store/${store.handle}`,
    ...(image ? { image } : {}),
    ...(telephone ? { telephone } : {}),
    ...(store.area
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: store.area,
            addressCountry: "NG",
          },
        }
      : {}),
  };
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const store = await fetchStore(handle);
  if (!store) notFound();

  const { vendor: initialVendor, buyer: initialBuyer } =
    await getServerSession();
  const currentUserId = initialVendor?.id ?? (await getOptionalUserId());
  const isOwn = currentUserId != null && currentUserId === store.vendorId;
  const initialIsLoggedIn = Boolean(initialVendor || initialBuyer);

  const isEnterprise = isEnterpriseVendor(store);
  const whatsappHref = isEnterprise
    ? buildChatLink({
        vendorId: store.vendorId,
        source: "browse",
        message: `Hi ${store.name}! I found your store on Velte.`,
      })
    : null;

  const goods = store.products;

  return (
    <div className="min-h-screen bg-canvas">
      <IdentitySessionSync />
      <HubNotificationsSync />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(store)) }}
      />
      <StoreNavbar initialVendor={initialVendor} initialBuyer={initialBuyer} />

      <StoreHero
        handle={store.handle}
        name={store.name}
        avatar={store.avatar}
        gallery={store.gallery}
        productImages={
          goods.map((p) => p.mainImageUrl).filter(Boolean) as string[]
        }
        area={store.area}
        state={store.state}
        country={store.country}
        locations={store.locations}
        storeType={store.storeType}
        sectors={store.sectors}
        goodsCount={goods.length}
        enterprise={isEnterpriseVendor(store)}
        description={store.description}
        ratingAvg={store.ratingAvg ?? null}
        ratingCount={store.ratingCount ?? 0}
        whatsappHref={whatsappHref}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* ── Main Catalog and Categories ─────────────────────────────────── */}
        <StoreTabs
          goods={goods}
          storeName={store.name}
          storeHandle={store.handle}
          whatsapp={store.whatsapp}
          vendorId={store.vendorId}
          isOwn={isOwn}
          isEnterprise={isEnterprise}
          sectors={store.sectors}
          description={store.description}
          adverts={store.adverts}
          sidebar={null}
          initialIsLoggedIn={initialIsLoggedIn}
          gallery={store.gallery}
          locations={store.locations}
          area={store.area}
          state={store.state}
          country={store.country}
          companyLocation={store.companyLocation}
          storeType={store.storeType}
          reviews={store.reviews}
          ratingAvg={store.ratingAvg}
          ratingCount={store.ratingCount}
          ratingDistribution={store.ratingDistribution}
        />
      </div>

      <StoreFooter
        name={store.name}
        handle={store.handle}
        area={store.area}
        state={store.state}
        sectors={store.sectors}
      />

      {/* ── Mobile Bottom Navigation Bar ───────────────────────────────── */}
      <StoreMobileBottomNav />
    </div>
  );
}
