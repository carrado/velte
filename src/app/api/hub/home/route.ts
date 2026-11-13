import { NextResponse } from "next/server";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { backendData } from "@/lib/server/backend";
import { fail, getOptionalVendorAuth } from "@/lib/server/guards";
import { listVendorOrders } from "@/lib/server/cart";
import { getWalletStats } from "@/lib/server/wallet";
import type {
  HubContext,
  HubHome,
  HubListingBoost,
  HubTimelineItem,
  HubVendorAdvert,
} from "@/types/hub";
import type { BuyerRequest } from "@/types/buyerRequest";

// GET /api/hub/home
// Consolidated single endpoint for the Hub.
// Uses cookie to identify if the caller is viewing as a vendor or a buyer.
// For vendors, aggregates storefront context, adverts, boosts, live business
// performance (orders, sales, leads), and enriched timeline into a single payload.
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  const vendorOnly = scope === "vendor";
  const buyerOnly = scope === "buyer";

  const vendorAuth = !buyerOnly ? await getOptionalVendorAuth() : null;
  const buyerAuth = !vendorOnly ? await getOptionalBuyerAuth() : null;

  // If vendorAuth is present (or vendorOnly), load the consolidated vendor hub
  if (vendorAuth) {
    const cookie = vendorAuth.cookie;
    try {
      const [
        homeRes,
        contextRes,
        advertsRes,
        boostsRes,
        ordersRes,
        walletRes,
        buyerRequestsRes,
      ] = await Promise.allSettled([
        backendData<HubHome>("/hub/home", { cookie }),
        backendData<HubContext>("/hub/context", { cookie }),
        backendData<HubVendorAdvert[]>("/hub/adverts/mine", { cookie }),
        backendData<HubListingBoost[]>("/hub/boosts", { cookie }),
        listVendorOrders(cookie),
        getWalletStats(cookie, 1),
        backendData<{ requests: BuyerRequest[] }>("/vendor/buyer-requests", {
          cookie,
        }),
      ]);

      const homeData = homeRes.status === "fulfilled" ? homeRes.value : null;
      const contextData =
        contextRes.status === "fulfilled" ? contextRes.value : null;
      const advertsData =
        advertsRes.status === "fulfilled" ? (advertsRes.value ?? []) : [];
      const boostsData =
        boostsRes.status === "fulfilled" ? (boostsRes.value ?? []) : [];
      const orders =
        ordersRes.status === "fulfilled" ? (ordersRes.value ?? []) : [];
      const walletStats =
        walletRes.status === "fulfilled" ? walletRes.value : null;
      const requests =
        buyerRequestsRes.status === "fulfilled"
          ? (buyerRequestsRes.value?.requests ?? [])
          : [];

      // Calculate live 30-day and previous 30-day performance
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      const validOrders = orders.filter(
        (o) =>
          o.status === "paid" ||
          o.status === "accepted" ||
          o.status === "dispatched" ||
          o.status === "delivered" ||
          o.status === "confirmed",
      );

      const currentOrders = validOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return !isNaN(t) && t >= thirtyDaysAgo;
      });

      const previousOrders = validOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return !isNaN(t) && t >= sixtyDaysAgo && t < thirtyDaysAgo;
      });

      const currentSalesKobo = currentOrders.reduce(
        (sum, o) => sum + (o.totalKobo || o.subtotalKobo || 0),
        0,
      );
      const previousSalesKobo = previousOrders.reduce(
        (sum, o) => sum + (o.totalKobo || o.subtotalKobo || 0),
        0,
      );

      const hasLiveOrders = orders.length > 0;
      const salesCurrent = hasLiveOrders
        ? currentSalesKobo
        : (homeData?.performance?.salesKobo?.current ?? 0);
      const salesPrevious = hasLiveOrders
        ? previousSalesKobo
        : (homeData?.performance?.salesKobo?.previous ?? 0);

      // Calculate leads from wallet stats + buyer requests
      const currentRequestsCount = requests.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return !isNaN(t) && t >= thirtyDaysAgo;
      }).length;
      const previousRequestsCount = requests.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return !isNaN(t) && t >= sixtyDaysAgo && t < thirtyDaysAgo;
      }).length;

      const liveLeadsCurrent =
        (walletStats?.monthLeads ?? 0) + currentRequestsCount;
      const liveLeadsPrevious = previousRequestsCount;

      const leadsCurrent =
        liveLeadsCurrent > 0 || walletStats != null
          ? liveLeadsCurrent
          : (homeData?.performance?.leads?.current ?? 0);
      const leadsPrevious =
        liveLeadsCurrent > 0 || walletStats != null
          ? liveLeadsPrevious
          : (homeData?.performance?.leads?.previous ?? 0);

      const computedOrdersCount = currentOrders.length || validOrders.length;

      // Filter active boosts and synthesize into timeline if not already present
      const activeBoosts = boostsData.filter((b) => b.status === "active");
      const activeBoostProductIds = new Set(
        activeBoosts.map((b) => b.productId).filter(Boolean),
      );

      const matchedProductIds = new Set<string>();
      const enrichedTimeline = (homeData?.timeline ?? []).map((item) => {
        const prodId = item.listing?.productId || item.id;
        const isBoosted =
          item.boosted || Boolean(prodId && activeBoostProductIds.has(prodId));

        if (isBoosted) {
          if (prodId) matchedProductIds.add(prodId);
          return {
            ...item,
            boosted: true,
            sponsored: true,
          };
        }
        return item;
      });

      const missingBoosts = activeBoosts.filter(
        (b) => !matchedProductIds.has(b.productId),
      );

      const synthesizedItems: HubTimelineItem[] = missingBoosts.map(
        (boost) => ({
          id: `boost-${boost.id}`,
          tier: homeData?.enterprise ? "enterprise" : "basic",
          vendorId: homeData?.store?.handle ?? "vendor",
          kind: "product" as const,
          at: boost.startsAt || new Date().toISOString(),
          title: boost.productName,
          body: homeData?.store?.name
            ? `Featured product from ${homeData.store.name}`
            : "Sponsored product listing",
          imageUrl: boost.productImage,
          storeName: homeData?.store?.name ?? "Vendor",
          storeHandle: homeData?.store?.handle ?? null,
          avatar: homeData?.store?.avatar ?? null,
          verified: Boolean(homeData?.store?.verified),
          sponsored: true,
          boosted: true,
          sectors: [],
          place: null,
          images: boost.productImage ? [boost.productImage] : [],
          ratingAvg: null,
          ratingCount: 0,
          whatsapp: null,
          social: null,
          fastDelivery: false,
          favourite: false,
          trusted: false,
          sentiment: null,
          reviewableOrderId: null,
          listing: {
            productId: boost.productId,
            name: boost.productName,
            kind: "product" as const,
            quoteOnRequest: false,
            price: boost.productPrice ?? boost.costKobo ?? 0,
            priceMax: null,
            currency: "NGN",
            description: null,
            images: boost.productImage ? [boost.productImage] : [],
            attributes: [],
            checkoutEligible: true,
          },
        }),
      );

      const finalTimeline = [...synthesizedItems, ...enrichedTimeline];

      const consolidatedPayload: HubHome = {
        role: "vendor",
        enterprise: homeData?.enterprise ?? false,
        premium: true, // A vendor is automatically a premium buyer across all surfaces
        sectors: homeData?.sectors ?? [],
        featured: homeData?.featured ?? [],
        timeline: finalTimeline,
        community: homeData?.community ?? [],
        buyerBroadcasts: homeData?.buyerBroadcasts ?? [],
        broadcastPrefs: homeData?.broadcastPrefs ?? {
          promoEnabled: true,
          promoSectors: [],
        },
        context: contextData,
        adverts: advertsData,
        boosts: boostsData,
        activeBoosts,
        performance: {
          leads: {
            current: leadsCurrent,
            previous: leadsPrevious,
          },
          salesKobo: {
            current: salesCurrent,
            previous: salesPrevious,
          },
          ordersCount: computedOrdersCount,
          isLive: hasLiveOrders || walletStats != null,
        },
      };

      return NextResponse.json(consolidatedPayload);
    } catch (err) {
      return fail(err, "Couldn't load the Hub.");
    }
  }

  // If buyerAuth is present (and not vendor), load buyer Hub data
  if (buyerAuth) {
    try {
      const data = await backendData<HubHome>("/hub/home?audience=buyer", {
        cookie: buyerAuth.cookie,
      });
      return NextResponse.json(data);
    } catch (err) {
      return fail(err, "Couldn't load the Hub.");
    }
  }

  return NextResponse.json(
    { error: "Sign in to open the Hub.", code: "auth_required" },
    { status: 401 },
  );
}
