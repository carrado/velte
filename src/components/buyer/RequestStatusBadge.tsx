import type { BuyerRequest } from "@/types/buyerRequest";

// Status label copy per spec §24, exactly — only the container became a
// pill (matching the vendor dashboard's own colored-chip idiom, e.g.
// WalletHero's auto-recharge pill, FeedbackSection's submitted banner) so
// it reads as a real status chip rather than plain colored text.
function Pill({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-dash-caption font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function RequestStatusBadge({ request }: { request: BuyerRequest }) {
  if (request.status === "expired") {
    return (
      <Pill className="bg-gray-100 text-gray-500">⚪ Request expired</Pill>
    );
  }
  if (request.status === "cancelled") {
    return (
      <Pill className="bg-gray-100 text-gray-500">⚪ Request cancelled</Pill>
    );
  }
  if (request.status === "fulfilled") {
    return <Pill className="bg-green-50 text-green-700">✅ Fulfilled</Pill>;
  }
  if (request.responseCount > 0) {
    return (
      <Pill className="bg-green-50 text-green-700">
        🟢 {request.responseCount} vendor
        {request.responseCount === 1 ? "" : "s"} responded
      </Pill>
    );
  }
  return (
    <Pill className="bg-amber-50 text-amber-700">🟡 Waiting for responses</Pill>
  );
}
