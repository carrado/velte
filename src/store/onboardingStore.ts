import { create } from "zustand";

export type OnboardingStep = 1 | 2 | 3;

interface OnboardingState {
  currentStep: OnboardingStep;
  /** True once all 3 steps are done in this session — triggers the completion modal. */
  isComplete: boolean;
  /** True while an action modal is open — tour overlay hides so it doesn't interfere. */
  overlayPaused: boolean;
  /** True once the layout has resolved the correct starting step from the server.
   *  The tour stays hidden until this is true to avoid flashing step 1. */
  initialized: boolean;

  /** Advance past the given step. Only works when currentStep === step. */
  completeStep(step: OnboardingStep): void;

  /** Jump to a step (used on init to skip already-done steps). */
  skipToStep(step: OnboardingStep): void;

  /** Hide the tour overlay while an action modal is open. */
  pauseOverlay(): void;

  /** Restore the tour overlay when the modal closes. */
  resumeOverlay(): void;

  /** Called by the layout once step detection is complete. */
  markInitialized(): void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  currentStep: 1,
  isComplete: false,
  overlayPaused: false,
  initialized: false,

  completeStep(step) {
    const state = get();
    if (state.isComplete || state.currentStep !== step) return;
    if (step === 3) {
      set({ isComplete: true });
    } else {
      set({ currentStep: (step + 1) as OnboardingStep });
    }
  },

  skipToStep(step) {
    if (!get().isComplete) {
      set({ currentStep: step });
    }
  },

  pauseOverlay() {
    set({ overlayPaused: true });
  },

  resumeOverlay() {
    set({ overlayPaused: false });
  },

  markInitialized() {
    set({ initialized: true });
  },
}));
