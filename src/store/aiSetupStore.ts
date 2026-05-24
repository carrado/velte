import { create } from "zustand";
import type { AIConfig, WhatsAppNumber } from "@/types/ai-setup";

interface AISetupState {
  isComplete: boolean;
  metaConnected: boolean;
  wabaConfigured: boolean;
  selectedNumberId: string | null;
  selectedNumber: WhatsAppNumber | null;
  aiConfig: AIConfig | null;

  markComplete: () => void;
  clearSetup: () => void;
  setConfig: (aiConfig: AIConfig) => void;
  updateConfig: (updates: Partial<AIConfig>) => void;
  setWabaConfigured: (val: boolean) => void;
  setSelectedNumber: (n: WhatsAppNumber | null) => void;
}

export const useAISetupStore = create<AISetupState>()((set) => ({
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
}));
