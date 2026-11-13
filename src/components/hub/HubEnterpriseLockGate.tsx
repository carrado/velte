"use client";

import Link from "next/link";
import { CrownIcon, LockIcon } from "@/components/icons";

interface HubEnterpriseLockGateProps {
  featureName: string;
  description: string;
  benefits?: string[];
}

export function HubEnterpriseLockGate({
  featureName,
  description,
  benefits = [
    "Full 30-day conversion funnel analytics & drop-off telemetry",
    "Category performance leaderboard & competitor CTR benchmarks",
    "Direct community forum access with verified founder badge",
    "₦0 lead fees on all buyer inquiries with direct WhatsApp handoff",
  ],
}: HubEnterpriseLockGateProps) {
  return (
    <div className="min-h-screen bg-canvas pb-20 pt-6 text-ink">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Lock Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-surface p-8 sm:p-12 shadow-xl">
          {/* Background Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
          />

          <div className="relative flex flex-col items-center text-center">
            {/* Crown & Lock Visual */}
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30 ring-8 ring-amber-500/15">
              <CrownIcon size={38} weight="fill" className="drop-shadow-sm" />
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-amber-500 ring-2 ring-amber-500/30">
                <LockIcon size={15} weight="bold" />
              </div>
            </div>

            {/* Badge */}
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Enterprise Exclusive
            </span>

            {/* Title & Description */}
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Unlock {featureName}
            </h1>
            <p className="mt-3 max-w-xl text-base text-gray-500 dark:text-ink/70 leading-relaxed">
              {description}
            </p>

            {/* Feature Highlights Grid */}
            <div className="mt-8 w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-canvas p-6 text-left shadow-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-ink/50">
                Included with Vendor Enterprise:
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-ink/80"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      ✓
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call to Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <CrownIcon size={18} weight="fill" />
                <span>Upgrade to Enterprise</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
