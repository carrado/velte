export interface TrialRemaining {
  expired: boolean;
  days: number;
  hours: number;
  totalMs: number;
}

export function getTrialRemaining(trialEndsAt: string | null): TrialRemaining {
  if (!trialEndsAt) return { expired: true, days: 0, hours: 0, totalMs: 0 };
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end))
    return { expired: true, days: 0, hours: 0, totalMs: 0 };
  const diff = end - Date.now();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, totalMs: 0 };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  return { expired: false, days, hours, totalMs: diff };
}
