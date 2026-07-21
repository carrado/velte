"use client";

import { useEffect, useState } from "react";

export default function FaqCountUp({
  value,
  duration = 900,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display}</>;
}
