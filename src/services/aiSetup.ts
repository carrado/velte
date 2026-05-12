// services/aiSetup.ts
import { apiClient } from "@/lib/api";
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

// Backend wraps every successful response as { success, data, message? }.
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function unwrap<T>(
  endpoint: string,
  init: Parameters<typeof apiClient>[1],
): Promise<T> {
  const res = await apiClient<ApiEnvelope<T>>(endpoint, init);
  return res.data;
}

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
  return unwrap<AISetupStatus>("/ai-setup/status", { method: "GET" });
}

export async function configureWABA(
  accessToken: string,
): Promise<WABAConfigureResponse> {
  return unwrap<WABAConfigureResponse>("/ai-setup/waba/configure", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

export async function fetchWhatsAppNumbers(): Promise<WhatsAppNumber[]> {
  const data = await unwrap<NumbersResponse>("/ai-setup/numbers", {
    method: "GET",
  });
  return data.numbers;
}

export async function selectWhatsAppNumber(numberId: string): Promise<void> {
  await unwrap("/ai-setup/numbers/select", {
    method: "POST",
    body: JSON.stringify({ numberId }),
  });
}

export async function updateAIConfig(config: AIConfig): Promise<AIConfig> {
  const data = await unwrap<AIConfigResponse>("/ai-setup/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  useAISetupStore.getState().setConfig(data.config);
  return data.config;
}

export async function activateAI(): Promise<ActivateAIResponse> {
  const result = await unwrap<ActivateAIResponse>("/ai-setup/activate", {
    method: "POST",
  });
  useAISetupStore.getState().markComplete();
  return result;
}

export async function disconnectAI(): Promise<void> {
  await apiClient<ApiEnvelope<unknown>>("/ai-setup/disconnect", {
    method: "DELETE",
  });
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
