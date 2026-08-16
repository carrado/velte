import { BuyerHomeHero } from "@/components/buyer/BuyerHomeHero";
import { BuyerHomeRecentChats } from "@/components/buyer/BuyerHomeRecentChats";
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
   specifics — "Browse when you know what you want, Ask Velte when you
   don't" as a search-first Home, with the full catalog living at its own
   Discover destination — Home is now: hero (Ask Velte + quick actions),
   your own in-flight activity, and a SMALL taste of the catalog, not the
   whole thing. See /buyer/discover for the full browse grid this page
   used to render directly, and BuyerBottomNav's own comment for the
   nav-target half of this change.

   BuyerHomeRecentChats added 2026-08-15 (AI-agent pivot, "the chat history
   is the dashboard") — sits right under the hero, ahead of active
   requests, since a buyer's own past /chat conversations are now the most
   central, most frequently-relevant thing to resurface here. */
export default async function BuyerHomePage() {
  // Capped/rotating preview feed (same one "/" uses), not the full
  // /buyer/discover catalog — a teaser, not a second Discover. Best-effort:
  // a backend hiccup shows no teaser row rather than taking Home down.
  const items = await getMarketplacePreview().catch(() => []);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-6">
      <BuyerHomeHero />
      <BuyerHomeRecentChats />
      <BuyerHomeActiveRequests />
      <BuyerHomeDiscoverTeaser items={items} />
    </div>
  );
}
