import { buyerApi } from "@/lib/buyer-api-client";

// buyerApi, not `api` — that client's global 401 handler clears the VENDOR
// session and force-redirects to /auth/login, which would be wrong on both
// counts here (see buyer-api-client.ts's own comment). A vendor and a buyer
// session legitimately coexist in the same browser on separate cookies.
export function logoutBuyer(): Promise<{ ok: boolean }> {
  return buyerApi.post<{ ok: boolean }>("/api/buyer-auth/logout");
}
