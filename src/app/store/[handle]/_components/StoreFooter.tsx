import Link from "next/link";
import { MapPin, Store as StoreIcon } from "lucide-react";

export interface StoreFooterProps {
  name: string;
  handle: string;
  area: string | null;
  sectors: string[];
}

// Deliberately no About/Contact/Privacy — this isn't a real company site, it's
// a vendor's storefront on Velte. What belongs here is the vendor's own
// profile info (name, place, sectors) plus the platform attribution.
export default function StoreFooter({
  name,
  handle,
  area,
  sectors,
}: StoreFooterProps) {
  return (
    <footer className="border-t border-gray-200 bg-white mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#023337]">
              <StoreIcon size={16} className="text-orange-500" />
              <span className="font-bold">{name}</span>
              <span className="text-gray-400 font-normal">@{handle}</span>
            </div>
            {area && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                <MapPin size={13} className="text-orange-500" />
                {area}
              </p>
            )}
            {sectors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sectors.map((sector) => (
                  <span
                    key={sector}
                    className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-full border border-gray-100"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 shrink-0">
            Powered by{" "}
            <Link
              href="/"
              className="font-semibold text-orange-500 hover:underline"
            >
              Velte
            </Link>{" "}
            — where buyers find nearby vendors
          </p>
        </div>
      </div>
    </footer>
  );
}
