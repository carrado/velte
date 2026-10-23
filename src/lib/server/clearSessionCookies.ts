import { NextResponse } from "next/server";

// A session cookie is only dropped when the clear uses the same attributes
// the backend set it with (httpOnly, Secure, SameSite). `cookies.delete(name)`
// omits those, and the browser keeps the dead cookie. Must stay in step with
// velte-backend `sessionCookieOptions`.
export function clearSessionCookies(
  response: NextResponse,
  names: readonly string[],
) {
  if (names.length === 0) return response;
  const isProd =
    process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";
  for (const name of names) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
