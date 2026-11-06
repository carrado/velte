// A single onboarding-tour stop — spotlights one persistent shell element
// (sidebar, bottom-nav, or the mobile avatar menu) and shows a short
// summary of what it's for.
export interface OnboardingStep {
  id: string;
  // Multiple selectors because the same logical target renders as two
  // different DOM nodes depending on viewport — Sidebar (`hidden lg:flex`)
  // on desktop, BottomNav or the header avatar menu (`md:hidden`) on
  // mobile — only one of which is ever actually visible at a time. The
  // resolver picks whichever one has real layout size.
  selectors: string[];
  title: string;
  body: string;
}
