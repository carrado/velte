import type { BeforeInstallPromptEvent } from "@/types/common";

let _prompt: BeforeInstallPromptEvent | null = null;
const _callbacks = new Set<() => void>();

export const installPromptStore = {
  capture(e: Event) {
    e.preventDefault();
    _prompt = e as BeforeInstallPromptEvent;
    _callbacks.forEach((fn) => fn());
  },
  get(): BeforeInstallPromptEvent | null {
    return _prompt;
  },
  clear() {
    _prompt = null;
  },
  subscribe(fn: () => void): () => void {
    _callbacks.add(fn);
    return () => _callbacks.delete(fn);
  },
};
