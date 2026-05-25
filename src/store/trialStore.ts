import { create } from "zustand";

interface TrialUrgencyState {
  isMedium: boolean;
  isUrgent: boolean;
  setUrgency: (isMedium: boolean, isUrgent: boolean) => void;
}

export const useTrialStore = create<TrialUrgencyState>()((set) => ({
  isMedium: false,
  isUrgent: false,
  setUrgency: (isMedium, isUrgent) => set({ isMedium, isUrgent }),
}));
