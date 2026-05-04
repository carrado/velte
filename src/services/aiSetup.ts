/** Simulates a backend call to check whether an AI model is configured. */
export async function checkAISetup(): Promise<{ isSetup: boolean }> {
  await new Promise((r) => setTimeout(r, 650));
  if (typeof window === "undefined") return { isSetup: true };
  return { isSetup: localStorage.getItem("ai_setup_complete") === "true" };
}

/** Call this when the user finishes configuring their AI model. */
export function markAISetupComplete(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ai_setup_complete", "true");
  }
}

export function hasDismissedTourThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("ai_tour_dismissed") === "true";
}

export function dismissTourForSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("ai_tour_dismissed", "true");
  }
}
