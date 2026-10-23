"use client";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/chat/GoogleSignInButton";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { modalScrimClass } from "@/lib/modalScrim";

// The Hub's locked sheet — one component for both gates, never a dead end:
// every lock names what unlocks it and offers the next tap. `auth` is for
// signed-out visitors (buyer Google sign-in inline, vendor login link);
// `upgrade` is for a signed-in account on the wrong tier (the backend's 403
// { code: "upgrade_required", capability } resolves to one of these).
export function HubLockedModal({
  variant,
  title,
  body,
  ctaLabel,
  ctaHref,
  onCta,
  onClose,
  onSignedIn,
  stacked = false,
}: {
  variant: "auth" | "upgrade";
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  onClose: () => void;
  onSignedIn?: () => void;
  /** True when this lock sits on top of a modal that is already open. */
  stacked?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        "fixed inset-0 z-[60] h-dvh w-dvw flex items-center justify-center p-4",
        modalScrimClass(stacked),
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-lg font-bold text-ink tracking-tight">{title}</p>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{body}</p>

        {variant === "auth" ? (
          <div className="mt-5 space-y-2.5">
            <GoogleSignInButton
              onSignedIn={() => {
                if (onSignedIn) onSignedIn();
                else onClose();
              }}
            />
            <Link
              href="/auth/login"
              className="block w-full px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Vendor sign-in
            </Link>
          </div>
        ) : onCta && ctaLabel ? (
          <button
            type="button"
            onClick={onCta}
            className="mt-5 block w-full px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            {ctaLabel}
          </button>
        ) : (
          ctaLabel &&
          ctaHref && (
            <Link
              href={ctaHref}
              className="mt-5 block w-full px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              {ctaLabel}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
