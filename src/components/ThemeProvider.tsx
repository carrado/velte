"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  DARK_QUERY,
  applyTheme,
  readStoredPreference,
  resolveTheme,
  storePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

// The theme's single source of truth for the whole app (2026-09-10).
//
// Wraps everything from the root layout, so the dashboard, /chat, the
// marketing pages and the public store/pay pages all read one preference —
// there is no per-surface theme and there shouldn't be.
//
// The document is already in the right theme before this mounts (the
// pre-paint script in the root layout does that); this component's job is the
// part a script can't do: react to CHANGES. Two kinds —
//   1. the buyer picking a different one, which persists and wins from then
//      on, and
//   2. the DEVICE flipping while the app is open, which must only be followed
//      while the preference is still "system".
//
// Both are read with `useSyncExternalStore` rather than state-plus-effect.
// That is not a style preference: localStorage and `matchMedia` are external
// stores that the SERVER cannot see, and this hook is the one API that lets a
// component read one without either lying during hydration or kicking off a
// cascade of setStates on mount. `getServerSnapshot` supplies the neutral
// value the server rendered with, and React re-renders with the real one
// immediately after hydrating.

// ── The device setting ──────────────────────────────────────────────────────

function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemSnapshot(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** The server has no device to ask. "Not dark" is the neutral answer, and it
 *  never reaches the screen as a flash: the pre-paint script has already put
 *  the document in the right theme by the time anything renders. */
function getSystemServerSnapshot(): boolean {
  return false;
}

// ── The stored preference ───────────────────────────────────────────────────

// Cached because `getSnapshot` must return a stable value between changes —
// re-reading localStorage on every render would be wasteful, and returning a
// fresh value each time is how this hook ends up in a render loop.
let cachedPreference: ThemePreference | null = null;
const preferenceListeners = new Set<() => void>();

function notifyPreferenceChanged(): void {
  for (const listener of preferenceListeners) listener();
}

function subscribePreference(onChange: () => void): () => void {
  preferenceListeners.add(onChange);
  // `storage` fires in the OTHER tabs, not the one that wrote — so a buyer
  // with Velte open twice gets both windows in step instead of one silently
  // disagreeing until it's reloaded.
  const onStorage = () => {
    cachedPreference = readStoredPreference();
    notifyPreferenceChanged();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  if (cachedPreference === null) cachedPreference = readStoredPreference();
  return cachedPreference;
}

function getPreferenceServerSnapshot(): ThemePreference {
  return "system";
}

// ── Provider ────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  /** What the buyer chose — including "system", which is a real choice. */
  preference: ThemePreference;
  /** What's actually on screen right now. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    getPreferenceServerSnapshot,
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    getSystemServerSnapshot,
  );

  const resolved = resolveTheme(preference, systemPrefersDark);

  // Applied in an effect because it MUTATES THE DOCUMENT, which a render must
  // never do. Runs after the first paint too, which is harmless: the pre-paint
  // script already set exactly these values, so this is a no-op write on load
  // and only does real work when something actually changes.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    // Persisted immediately, so "the one changed in the app becomes their
    // default" survives a reload, a new tab, and the PWA being reopened.
    cachedPreference = next;
    storePreference(next);
    notifyPreferenceChanged();
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Reads the theme. Throws if used outside the provider — that would be a
 *  wiring mistake, and silently returning a default would hide it. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
