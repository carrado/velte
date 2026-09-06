import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase client init for BUYER sign-in (2026-08-26).
//
// Scope is deliberately narrow: Firebase is the identity provider only — it
// mints an ID token the browser hands to our own backend, which verifies it
// and issues the `buyer_auth_token` session this app has always used. No
// Firestore, no Firebase hosting, no Firebase session in the app itself.
// Everything downstream of sign-in (buyerGuards, the conversation
// endpoints, the sidebar) is unchanged and knows nothing about Firebase.
//
// Lazily initialised rather than at module load, for two reasons: this
// module gets imported into a client bundle that also renders for
// anonymous buyers who never sign in, and an unset config is a legitimate
// state (a dev install with no Firebase project) that must not throw on
// import. Callers get null and render accordingly.
//
// Config values are public by design — Firebase web config identifies the
// project, it does not authorise anything. What actually protects the
// account is the ID token's signature, verified server-side against
// Google's public keys, plus the authorised-domains list in the Firebase
// console. Never put a service-account key in here; that belongs only in
// velte-backend's own env (see firebaseAuth.controller.js).

function readConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    // Optional — carried through when set so a project that also uses
    // storage/messaging doesn't need a second init somewhere else.
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

/** True when the project is configured — lets a caller show a sign-in
 *  option only where it can actually work, instead of a button that errors
 *  on click. */
export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}

function firebaseApp(): FirebaseApp | null {
  const config = readConfig();
  if (!config) return null;
  // getApps() guard, not a module-level singleton: Next's dev fast-refresh
  // re-runs module bodies, and initializeApp throws on a duplicate name.
  return getApps().length ? getApp() : initializeApp(config);
}

/** The Auth instance, or null when Firebase isn't configured. */
export function firebaseAuth(): Auth | null {
  const app = firebaseApp();
  return app ? getAuth(app) : null;
}
