"use client";

import { useEffect } from "react";
import { isSessionSettled, syncSession } from "@/lib/sessionSync";

/**
 * Hydrates both vendor and buyer session identity on first load.
 * Subsequent page transitions skip the request because session is already cached in memory.
 */
export function IdentitySessionSync() {
  useEffect(() => {
    if (isSessionSettled()) return;
    void syncSession();
  }, []);

  return null;
}
