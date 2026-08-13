import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Shared empty/prompt-state card for the buyer dashboard — one visual
// recipe (icon chip + heading + subtext + optional action) instead of a
// one-off "bg-white rounded-2xl p-6 text-center" block repeated per page,
// matching the icon-chip idiom the vendor dashboard uses everywhere
// (SectionCard, WalletStatCards, Sidebar's wallet card, etc.).
export function BuyerEmptyState({
  icon: Icon,
  iconClass = "bg-orange-50 text-orange-500",
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  iconClass?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconClass}`}
      >
        <Icon size={22} />
      </div>
      <p className="text-dash-heading font-semibold text-gray-900 mb-1">
        {title}
      </p>
      {subtitle && (
        <p className="text-dash-body text-gray-400 max-w-xs mx-auto">
          {subtitle}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
