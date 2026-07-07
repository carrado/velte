import { api } from "@/lib/api-client";
import type { MyReferrals } from "@/types/referral";

export function fetchMyReferrals(): Promise<MyReferrals> {
  return api.get<MyReferrals>("/api/referrals");
}
