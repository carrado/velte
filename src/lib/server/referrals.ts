import { backendData } from "./backend";
import type { MyReferrals } from "@/types/referral";

export async function fetchMyReferrals(cookie: string): Promise<MyReferrals> {
  return backendData<MyReferrals>("/referrals/me", { cookie });
}
