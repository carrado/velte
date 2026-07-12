import { BadgeCheck } from "lucide-react";

// Shown in place of the WhatsApp CTA when a logged-in vendor's search turns
// up their own listing/store — there's nobody to chat with (and the chat
// click would bill them their own lead).
export function OwnListingBadge({ label }: { label: string }) {
  return (
    <div className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-orange-50 border border-orange-100 py-2 text-xs font-semibold text-orange-600">
      <BadgeCheck size={14} className="shrink-0" />
      {label}
    </div>
  );
}
