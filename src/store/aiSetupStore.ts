// store/aiSetupStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIConfig } from "@/types/ai-setup";

interface AISetupState {
  // Core state
  isComplete: boolean;
  config: AIConfig | null;

  // Actions
  markComplete: () => void;
  clearSetup: () => void;
  setConfig: (config: AIConfig) => void;
  updateConfig: (updates: Partial<AIConfig>) => void;
}

export const useAISetupStore = create<AISetupState>()(
  persist(
    (set) => ({
      isComplete: false,
      config: null,

      markComplete: () => set({ isComplete: true }),

      clearSetup: () =>
        set({
          isComplete: false,
          config: null,
        }),

      setConfig: (config) => set({ config }),

      updateConfig: (updates) =>
        set((state) => ({
          config: state.config ? { ...state.config, ...updates } : null,
        })),
    }),
    {
      name: "ai-setup-storage",
      skipHydration: true,
    },
  ),
);
