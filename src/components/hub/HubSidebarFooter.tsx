import Link from "next/link";
import { cn } from "@/lib/utils";

export function HubSidebarFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "px-2 py-3 text-[11px] text-gray-400 space-y-1.5 leading-relaxed select-none text-center lg:text-left",
        className,
      )}
    >
      <p className="text-gray-500 font-medium text-center lg:text-left">
        &copy; 2026 Velte Technologies
      </p>
      <nav
        aria-label="Legal & Information"
        className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-1 text-gray-400"
      >
        <Link
          href="/privacy"
          className="hover:text-ink hover:underline transition-colors"
        >
          Privacy
        </Link>
        <span aria-hidden="true" className="text-gray-300">
          &middot;
        </span>
        <Link
          href="/terms"
          className="hover:text-ink hover:underline transition-colors"
        >
          Terms and Conditions
        </Link>
        <span aria-hidden="true" className="text-gray-300">
          &middot;
        </span>
        <Link
          href="/privacy"
          className="hover:text-ink hover:underline transition-colors"
        >
          Cookies
        </Link>
      </nav>
    </footer>
  );
}
