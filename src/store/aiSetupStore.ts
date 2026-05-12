// store/aiSetupStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIConfig, WhatsAppNumber } from "@/types/ai-setup";

interface AISetupState {
  // Core state
  isComplete: boolean;
  metaConnected: boolean;
  wabaConfigured: boolean;
  selectedNumberId: string | null;
  selectedNumber: WhatsAppNumber | null;
  aiConfig: AIConfig | null;

  // Actions
  markComplete: () => void;
  clearSetup: () => void;
  setConfig: (aiConfig: AIConfig) => void;
  updateConfig: (updates: Partial<AIConfig>) => void;
  setWabaConfigured: (val: boolean) => void; // ← add
  setSelectedNumber: (n: WhatsAppNumber | null) => void;
}

export const useAISetupStore = create<AISetupState>()(
  persist(
    (set) => ({
      isComplete: false,
      aiConfig: null,
      metaConnected: false,
      wabaConfigured: false,
      selectedNumberId: null,
      selectedNumber: null,

      markComplete: () => set({ isComplete: true }),

      clearSetup: () =>
        set({
          isComplete: false,
          aiConfig: null,
          metaConnected: false,
          wabaConfigured: false,
          selectedNumberId: null,
        }),

      setConfig: (aiConfig) => set({ aiConfig }),

      updateConfig: (updates) =>
        set((state) => ({
          aiConfig: state.aiConfig ? { ...state.aiConfig, ...updates } : null,
        })),

      setWabaConfigured: (val) => set({ wabaConfigured: val }),
      setSelectedNumber: (n) =>
        set({ selectedNumber: n, selectedNumberId: n?.numberId ?? null }),
    }),
    {
      name: "ai-setup-storage",
      skipHydration: true,
    },
  ),
);
