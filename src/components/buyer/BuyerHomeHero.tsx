"use client";

import { MessageSquarePlus, ClipboardList, Heart } from "lucide-react";

import { useBuyerSession } from "@/hooks/useBuyerSession";
import { useBuyerNavigation } from "@/components/buyer/BuyerNavigationProgressContext";
import { AskVeluxButton } from "@/components/AskVeluxButton";

/* The buyer dashboard's own "top of Home" card — same layered-glow +
   dot-texture recipe as the vendor dashboard's WalletHero and the buyer
   Profile page's identity card, so Home reads as the same designed
   surface, not a bare heading bolted above a browse grid. Deliberately
   works whether or not the buyer has verified yet — spec §3/§43:
   browsing stays fully anonymous, so an unverified visitor still gets a
   real, personal-feeling Home, just with a generic greeting. */
export function BuyerHomeHero() {
  const { buyer: shown } = useBuyerSession();
  const { navigate } = useBuyerNavigation();

  return (
    <div className="relative overflow-hidden -mx-4 sm:mx-0 rounded-none sm:rounded-3xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 bg-orange-100/70 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-14 w-56 h-56 bg-amber-50 rounded-full blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(2,51,55,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative">
        <p className="text-2xl sm:text-3xl font-black text-[#023337] tracking-tight">
          {shown?.name ? `Hi, ${shown.name} 👋` : "Welcome to Velte 👋"}
        </p>
        <p className="text-dash-body text-gray-500 mt-1 mb-5">
          What are you looking for today?
        </p>

        <AskVeluxButton
          label="Ask Velux"
          subtext="Describe what you need, in your own words or a photo"
          className="w-full justify-between mb-4"
        />

        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate("/buyer/requests/new")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-100 transition-colors text-center cursor-pointer"
          >
            <MessageSquarePlus size={17} className="text-orange-500" />
            <span className="text-dash-caption font-semibold text-orange-700 leading-tight">
              Post a Request
            </span>
          </button>
          <button
            onClick={() => navigate("/buyer/requests")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-colors text-center cursor-pointer"
          >
            <ClipboardList size={17} className="text-gray-500" />
            <span className="text-dash-caption font-semibold text-gray-600 leading-tight">
              My Requests
            </span>
          </button>
          <button
            onClick={() => navigate("/buyer/saved")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-colors text-center cursor-pointer"
          >
            <Heart size={17} className="text-gray-500" />
            <span className="text-dash-caption font-semibold text-gray-600 leading-tight">
              Saved
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
