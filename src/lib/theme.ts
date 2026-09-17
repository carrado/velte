// Light/dark theme: storage contract + the pre-paint script (2026-09-10).
//
// Client-safe and dependency-free on purpose — the same module is imported by
// the ROOT LAYOUT (a server component, for the inline script string) and by
// the provider/toggle in the browser, so it must not pull in React or touch
// `window` at module scope.

export const THEME_STORAGE_KEY = "velte-theme";

/** Three real states, not two.
 *
 *  "system" is not a synonym for a default — it is a standing instruction to
 *  keep following the device, including when the device flips at sunset. A
 *  two-state toggle cannot express that, and a buyer who once tapped Dark
 *  could never get back to "just do what my phone does". */
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The class the whole dark palette hangs off — see globals.css's `.dark`
 *  block, and the `@custom-variant dark` that makes `dark:` utilities key off
 *  the same class. */
export const DARK_CLASS = "dark";

/**
 * Runs synchronously during HTML parsing, BEFORE anything paints.
 *
 * This exists for one reason: the server cannot know this browser's theme.
 * The preference is in localStorage and the device setting is only readable
 * from the client, so server-rendered HTML is always theme-less. Without
 * this, every single page load would paint the LIGHT app first and then snap
 * to dark once React hydrated — the white flash that makes retrofitted dark
 * modes feel broken, and it would hit on every navigation that remounts the
 * document.
 *
 * Deliberately tiny, dependency-free, and wrapped in try/catch: it runs
 * before anything else on the page, so it must not be able to throw (Safari
 * private mode throws on localStorage access) and must not be worth the
 * parse cost of anything larger. Same pre-paint inline-script pattern
 * chat/layout.tsx already uses for its resume gate.
 *
 * Sets BOTH the class (what the CSS keys off) and `data-theme` (what the
 * toggle can read back without waiting for React) — and, importantly,
 * `color-scheme` on the element itself, so the browser's own scrollbars and
 * form controls are dark from the very first frame too rather than flashing
 * light furniture around a dark page.
 */
export const THEME_PRE_PAINT_SCRIPT = `
try {
  var k = ${JSON.stringify(THEME_STORAGE_KEY)};
  var stored = localStorage.getItem(k);
  var pref = (stored === "light" || stored === "dark" || stored === "system") ? stored : "system";
  var dark = pref === "dark" || (pref === "system" && window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);
  var root = document.documentElement;
  root.classList.toggle(${JSON.stringify(DARK_CLASS)}, dark);
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
} catch (e) {}
`
  .replace(/\s+/g, " ")
  .trim();

/** The theme actually in force, given a preference and what the device says.
 *  Pure, so the provider and the pre-paint script can't drift on the rule. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}

/** Applies a resolved theme to the document. Kept here rather than inside the
 *  provider so it stays the single definition of "what it means to be in dark
 *  mode" — the pre-paint script above does exactly this, and the two have to
 *  agree or the first paint disagrees with the first render. */
export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    // Private mode / storage disabled — following the device is the right
    // fallback, and it's what the pre-paint script did too.
    return "system";
  }
}

export function storePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Nothing to do and nothing worth telling the buyer: the theme still
    // applies for this session, it just won't be remembered.
  }
}
