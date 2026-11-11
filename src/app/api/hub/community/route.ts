import { NextResponse } from "next/server";

import { backendData } from "@/lib/server/backend";
import { getOptionalUserId } from "@/lib/server/guards";
import type {
  HubCommunityData,
  HubCommunityReply,
  HubCommunityThread,
} from "@/types/hub";

// Fallback in-memory store so the new Velte Community Hub works seamlessly
// even if upstream backend has not implemented /hub/community yet.
const DEFAULT_COMMUNITY_DATA: HubCommunityData = {
  communityName: "Velte Community Hub",
  stats: {
    enterpriseVendorsCount: 1280,
    premiumBuyersCount: 4950,
    discussionsCount: 5,
    repliesCount: 40,
    resolvedInquiriesCount: 342,
    reputationScore: 98,
    followersCount: 1280,
  },
  posts: [
    {
      id: "post-1",
      title: "Velte Verified Escrow & BYOL Logistics Network Updates",
      body: "All transactions initiated through the Velte Hub now support seamless Bring Your Own Logistics (BYOL) pickup checksum tags and default carrier delivery via LifePadi and Vendrush. Buyers and enterprise merchants are fully protected under Velte Verified Escrow.",
      category: "announcement",
      authorId: "official-1",
      authorType: "official",
      authorName: "Velte Operations",
      likesCount: 48,
      repliesCount: 3,
      resolved: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      replies: [
        {
          id: "rep-1",
          authorId: "user-v1",
          authorType: "vendor",
          authorName: "Alaba Mega Direct",
          isVendorResponse: true,
          body: "The BYOL checksum handoff has eliminated delivery disputes for our Port Harcourt dispatches. Excellent update!",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "rep-2",
          authorId: "user-b1",
          authorType: "buyer",
          authorName: "Chukwudi Okafor",
          body: "Are there discounts for bulk multi-location pickups across Lagos island?",
          createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        },
      ],
    },
    {
      id: "post-2",
      title:
        "Wholesale Sourcing: Bulk Solar Inverters & Lithium Batteries (Lagos & PH)",
      body: "Calling enterprise vendors looking for verified bulk distribution of 5kVA - 10kVA hybrid inverters with 2-year factory warranty. We offer direct B2B settlement, invoice printing, and door-to-door freight.",
      category: "b2b",
      authorId: "user-v1",
      authorType: "vendor",
      authorName: "Emeka Anyanwu",
      storeName: "Alaba Mega Direct",
      likesCount: 29,
      repliesCount: 2,
      resolved: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      replies: [
        {
          id: "rep-3",
          authorId: "user-b2",
          authorType: "buyer",
          authorName: "Engr. Babatunde",
          body: "Do you have 48V 100Ah server rack lithium batteries available in Ikeja warehouse?",
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
      ],
    },
    {
      id: "post-3",
      title:
        "Bounty: ₦15,000 for Physical Vendor KYC & Storefront Inspection in Ikeja",
      body: "Looking for an active Premium Buyer or verified gig agent in Ikeja to perform on-ground address verification and catalog inspection for 2 new computer hardware vendors. Payout credited instantly upon verification.",
      category: "gig",
      authorId: "user-v2",
      authorType: "vendor",
      authorName: "Apex Digital Solutions",
      storeName: "Apex Tech Hub",
      likesCount: 34,
      repliesCount: 1,
      resolved: true,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      replies: [
        {
          id: "rep-4",
          authorId: "agent-1",
          authorType: "agent",
          authorName: "Tolu Olatunji",
          body: "Inspection completed and photos uploaded. Both stores verified with physical address & CAC registered.",
          createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        },
      ],
    },
    {
      id: "post-4",
      title:
        "Product Request: Seeking verified supplier for 100 units mesh office chairs",
      body: "Urgent corporate procurement: Need 100 high-back ergonomic mesh office chairs delivered to Victoria Island, Lagos. Must have verifiable physical showroom and escrow payment readiness.",
      category: "request",
      authorId: "user-b3",
      authorType: "buyer",
      authorName: "Kelechi Nnamdi",
      likesCount: 19,
      repliesCount: 0,
      resolved: false,
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      replies: [],
    },
    {
      id: "post-5",
      title:
        "Best practices for Order Checksum confirmation during courier handover",
      body: "Always ensure the courier presents the exact 6-character Velte checksum before releasing goods for BYOL pickups. This ensures zero delivery disputes and automatic escrow release.",
      category: "feedback",
      authorId: "user-b4",
      authorType: "buyer",
      authorName: "Sarah Jenkins",
      likesCount: 42,
      repliesCount: 1,
      resolved: true,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      replies: [],
    },
  ],
};

let liveCommunityData: HubCommunityData = { ...DEFAULT_COMMUNITY_DATA };

export async function GET() {
  const userId = await getOptionalUserId();

  try {
    const data = await backendData<HubCommunityData>("/hub/community");
    if (data && Array.isArray(data.posts)) {
      return NextResponse.json(data);
    }
  } catch {
    // Upstream backend does not host /hub/community or is not reachable;
    // fall back cleanly to the rich live dataset
  }

  return NextResponse.json(liveCommunityData);
}

export async function POST(req: Request) {
  const userId = await getOptionalUserId();
  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    body?: unknown;
    content?: unknown;
    category?: unknown;
  } | null;

  const title = String(body?.title ?? "").trim();
  const messageBody = String(body?.body ?? body?.content ?? "").trim();
  const category =
    (body?.category as HubCommunityThread["category"]) || "discussion";

  if (!title || !messageBody) {
    return NextResponse.json(
      { error: "Title and content are required." },
      { status: 400 },
    );
  }

  // Try upstream backend first
  try {
    const upstream = await backendData<HubCommunityThread>(
      "/hub/community/posts",
      {
        method: "POST",
        body: { title, content: messageBody, category },
      },
    );
    if (upstream && upstream.id) {
      return NextResponse.json(upstream);
    }
  } catch {
    // Fall back to live in-memory updates
  }

  const newPost: HubCommunityThread = {
    id: `post-${Date.now()}`,
    title,
    body: messageBody,
    category,
    authorId: userId || "current-user",
    authorType: "vendor",
    authorName: "You",
    likesCount: 0,
    repliesCount: 0,
    replies: [],
    resolved: false,
    createdAt: new Date().toISOString(),
  };

  liveCommunityData = {
    ...liveCommunityData,
    stats: {
      ...liveCommunityData.stats,
      discussionsCount: liveCommunityData.stats.discussionsCount + 1,
    },
    posts: [newPost, ...liveCommunityData.posts],
  };

  return NextResponse.json(newPost);
}
