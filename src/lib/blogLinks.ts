// Blog links open in a new tab, as plain <a href> (2026-09-23, explicit
// request) — not Next's client-side <Link>. The blog is reading material a
// visitor opens alongside whatever they were doing (a search in /chat, the
// homepage), so it shouldn't replace that page. A plain anchor also keeps
// the blog out of the client router's prefetch/transition path entirely.
// Only the blog index's own post cards link into the blog now — every other
// entry point (Footer, MobileMenu, sitemap, llms.txt) was removed
// 2026-09-23 when the blog was hidden.

/** Spread onto an <a> that points at the blog. `noopener noreferrer`: the
 *  new tab must not get a handle back to this one (window.opener). */
export const BLOG_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
