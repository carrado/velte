import type { ReactNode } from "react";

// The Boost page hero: slab, a real-life photo fading in from the right,
// HTML copy on the left, and a small product card on large screens. Vendor
// and buyer Hub use this same model so the three surfaces read as one.

export function HubHero({
  eyebrow,
  title,
  subtitle,
  photo = "/hub/boost-hero.jpg",
  cardImage,
  cardBadge,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  photo?: string;
  cardImage?: string;
  cardBadge?: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-none lg:rounded-2xl bg-slab text-white">
      <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover object-[70%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slab via-slab/55 to-transparent" />
      </div>
      <div className="relative flex items-center gap-6 px-5 py-7 sm:px-8 sm:py-9">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.15] tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            {subtitle}
          </p>
          {action}
        </div>
        {cardImage && (
          <div className="relative ml-auto hidden h-[148px] w-[128px] shrink-0 lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardImage}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {cardBadge && (
              <span className="absolute top-2 right-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {cardBadge}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
