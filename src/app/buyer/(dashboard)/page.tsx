import { BuyerHomeHero } from "@/components/buyer/BuyerHomeHero";
import { BuyerHomeActiveRequests } from "@/components/buyer/BuyerHomeActiveRequests";
import { BuyerHomeDiscoverTeaser } from "@/components/buyer/BuyerHomeDiscoverTeaser";
import { getMarketplacePreview } from "@/lib/server/store";

/* The buyer dashboard's actual Home — previously "Home" in BuyerBottomNav
   just navigated a buyer away to the public /marketplace page, out of this
   whole dashboard shell entirely. That's fixed (this route stays inside
   the dashboard chrome), but Home itself has since split again: it used
   to carry the FULL browse catalog directly, which made it just a second
   /marketplace with a hero glued on top. Per the buyer-redesign brief's
   core reframe ("stop thinking of Velte as marketplace + AI search + buyer
   requests, make it a buyer's personal commerce assistant") and its §1/§19
   specifics — "Browse when you know what you want, Ask Velux when you
   don't" as a search-first Home, with the full catalog living at its own
   Discover destination — Home is now: hero (Ask Velux + quick actions),
   your own in-flight activity, and a SMALL taste of the catalog, not the
   whole thing. See /buyer/discover for the full browse grid this page
   used to render directly, and BuyerBottomNav's own comment for the
   nav-target half of this change. */
export default async function BuyerHomePage() {
  // Capped/rotating preview feed (same one "/" uses), not the full
  // /buyer/discover catalog — a teaser, not a second Discover. Best-effort:
  // a backend hiccup shows no teaser row rather than taking Home down.
  const items = await getMarketplacePreview().catch(() => []);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-6">
      <BuyerHomeHero />
      <BuyerHomeActiveRequests />
      <BuyerHomeDiscoverTeaser items={items} />
    </div>
  );
}
