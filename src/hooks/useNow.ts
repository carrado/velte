"use client";

import { useEffect, useState } from "react";

/** The current time, re-read every `intervalMs` — so a countdown ("2h left")
 *  stays honest while a page is left open. A "2h left" that silently becomes
 *  wrong is worse than no number. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
