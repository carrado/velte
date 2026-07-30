"use client";

import { useEffect, useRef, useState } from "react";

// Eases the displayed number toward `target` over `durationMs` instead of
// jump-cutting — used for the wallet balance so a fresh page load (0 → real
// balance) or a top-up landing reads as motion, not a flicker. Skips the
// animation entirely when `target` hasn't actually changed (e.g. re-renders
// from unrelated state) since there's nothing to animate toward.
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
}
