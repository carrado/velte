export type ReferralStatus = "pending" | "credited";

export interface ReferralStats {
  totalReferred: number;
  pending: number;
  credited: number;
  totalEarnedKobo: number;
}

export interface ReferralListItem {
  id: string;
  refereeName: string;
  status: ReferralStatus;
  bonusKobo: number;
  createdAt: string;
  creditedAt: string | null;
}

export interface MyReferrals {
  code: string;
  stats: ReferralStats;
  referrals: ReferralListItem[];
}
