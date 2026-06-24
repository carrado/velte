// services/aiSetup.ts
import { api } from "@/lib/api-client";
import { useAISetupStore } from "@/store/aiSetupStore";
import type {
  AIConfig,
  AIConfigResponse,
  ActivateAIResponse,
  AISetupStatus,
  NumbersResponse,
  WABAConfigureResponse,
  WhatsAppNumber,
} from "@/types/ai-setup";

// ── Helper to sync server status into the store (e.g., on app load) ──
export async function syncAISetupStatusFromServer(): Promise<void> {
  try {
    const status = await getAISetupStatus();
    const store = useAISetupStore.getState();

    if (status.isComplete) {
      store.markComplete();
    } else {
      store.clearSetup();
    }

    if (status.aiConfig) {
      store.setConfig(status.aiConfig);
    }
  } catch (error) {
    console.error("Failed to sync AI setup status", error);
  }
}

// ── API calls ────────────────────────────────────────────────────────

export async function getAISetupStatus(): Promise<AISetupStatus> {
  return api.get<AISetupStatus>("/api/ai-setup/status");
}

export async function configureWABA(
  accessToken: string,
): Promise<WABAConfigureResponse> {
  return api.post<WABAConfigureResponse>("/api/ai-setup/waba/configure", {
    accessToken,
  });
}

export async function fetchWhatsAppNumbers(): Promise<WhatsAppNumber[]> {
  const data = await api.get<NumbersResponse>("/api/ai-setup/numbers");
  return data.numbers;
}

export async function selectWhatsAppNumber(numberId: string): Promise<void> {
  await api.post("/api/ai-setup/numbers/select", { numberId });
}

export async function updateAIConfig(config: AIConfig): Promise<AIConfig> {
  const data = await api.put<AIConfigResponse>("/api/ai-setup/config", config);
  useAISetupStore.getState().setConfig(data.config);
  return data.config;
}

export async function activateAI(): Promise<ActivateAIResponse> {
  const result = await api.post<ActivateAIResponse>("/api/ai-setup/activate");
  useAISetupStore.getState().markComplete();
  return result;
}

export async function disconnectAI(): Promise<void> {
  await api.del("/api/ai-setup/disconnect");
  useAISetupStore.getState().clearSetup();
}

// ── Tour session helpers (sessionStorage — not persisted across tabs/sessions) ──

const TOUR_DISMISSED_KEY = "ai-setup-tour-dismissed";

export function hasDismissedTourThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TOUR_DISMISSED_KEY) === "1";
}

export function dismissTourForSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOUR_DISMISSED_KEY, "1");
}

// ── Convenience wrapper used by the dashboard layout ──

export async function checkAISetup(): Promise<{ isSetup: boolean }> {
  const status = await getAISetupStatus();
  const store = useAISetupStore.getState();

  if (status.isComplete) {
    store.markComplete();
  } else {
    store.clearSetup();
  }

  // Persist all status fields so the page can skip its own fetch
  store.setWabaConfigured(status.wabaConfigured ?? false);
  if (status.selectedNumber) store.setSelectedNumber(status.selectedNumber);
  if (status.aiConfig) store.setConfig(status.aiConfig);

  return { isSetup: !!status.isComplete };
}
