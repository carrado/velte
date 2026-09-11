import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Serves Firebase Auth's sign-in handler from velte.ng instead of
  // velte-52165.firebaseapp.com, so the Google popup shows our own domain
  // (2026-08-27). Firebase Hosting does this automatically; on Vercel the
  // path has to be proxied by hand.
  //
  // Paired with NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN — the rewrite alone changes
  // nothing, and the env var alone breaks sign-in outright (the popup would
  // navigate to a path that 404s). Both must name the same host, and that
  // host must be in Firebase's Authorised domains list.
  //
  // Deliberately NOT limited to production: the path is inert unless
  // authDomain points at it, and having it live everywhere means a
  // preview/prod deploy can't be the first place this is ever exercised.
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://velte-52165.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
