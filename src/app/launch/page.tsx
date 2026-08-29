import { redirect } from "next/navigation";

import { getOptionalBuyerAuth } from "@/lib/server/buyerGuards";
import { getOptionalUserId } from "@/lib/server/guards";

// The installed app's entry point (2026-08-29) — `start_url` in
// site.webmanifest points here.
//
// There is ONE manifest and one scope, so there is no separate "buyer app"
// and "vendor app": whoever installs Velte installs the same thing. But the
// right place to open differs entirely by who they are, and `start_url` can
// only be one URL — so it points at a route that decides.
//
//   vendor signed in → their dashboard (wallet, matching what login itself
//                      redirects to — see auth/login/page.tsx)
//   buyer signed in  → /chat, where their conversations live
//   nobody           → /chat as well. Whoever installed this did it from the
//                      buyer surface (that is the only place the install is
//                      offered), so the search they came for is a far better
//                      landing than the marketing homepage they were getting.
//
// Why a route rather than more middleware: proxy.ts already has a
// `?source=pwa` branch on `/` that does the vendor half of this, and it is
// deliberately left in place — an app installed before today has the old
// `start_url` baked into its manifest until the browser re-fetches it, so
// that branch still serves those installs. New installs come here, where the
// logic is explicit, testable and in one obvious file.
//
// Nothing renders. Every path below redirects, so a buyer never sees a flash
// of an intermediate page.
export default async function LaunchPage() {
  const buyer = await getOptionalBuyerAuth();
  if (buyer) redirect("/chat");

  const vendorUserId = await getOptionalUserId();
  if (vendorUserId) redirect(`/${vendorUserId}/wallet`);

  redirect("/chat");
}
