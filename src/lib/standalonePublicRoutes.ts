// Public/marketing routes that must NOT be reachable inside the installed
// PWA (2026-08-29, per explicit request: "I don't want public pages like home
// page, FAQ, etc. visible on the PWA").
//
// A home-screen app that can wander into its own sales pitch reads as broken
// — the person already installed it, there is nothing left to pitch.
//
// The manifest's `scope` can't express this. Scope has to cover both `/chat`
// (buyers) and `/{id}/...` (vendors), which share no prefix other than `/`,
// so scope must stay `/` and every page is in it by construction. And it
// can't be enforced server-side either: the PWA shares a cookie jar with the
// ordinary browser, so a cookie marking "installed app" would hide these
// pages from the normal browser too. Whether THIS WINDOW is standalone is a
// client-side fact (display-mode), so the guard is client-side.
//
// Kept deliberately as a shared list because two things read it: the React
// guard, and the pre-paint script in the root layout that runs before any of
// this ships.
export const PWA_BLOCKED_PREFIXES = [
  "/about",
  "/blog",
  "/careers",
  "/contact",
  "/faq",
  "/how-it-works",
  "/join",
  "/pricing",
];

// NOT blocked, and each for a reason worth stating:
//   /auth/*            — /welcome's own "Sign in" CTA goes here. Block it and
//                        a logged-out vendor can never get back into the app.
//   /terms, /privacy   — legal text. Hiding it inside the app is the wrong
//                        instinct and app-store review expects it reachable.
//   /welcome           — this is where everything below redirects TO.
//   /chat, /store,
//   /track, /marketplace, /launch, /{id}/*
//                      — the actual app.
//
// "/" is handled separately (it is an exact match, not a prefix — every path
// starts with "/").

/** Should this path be hidden from the installed app? */
export function isBlockedInStandalone(pathname: string): boolean {
  if (pathname === "/") return true;
  return PWA_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
