import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Shared by VendorResultCard (product/service description) and
// StoreResultCard (vendor description) — clamps to 2 lines and only shows a
// "See more" toggle when the text actually overflows that clamp, so a short
// description never grows a pointless toggle. Each card renders its own
// instance of this component, so expanding one card's description never
// affects any other card on the same results page.
export function ExpandableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={cn(!expanded && "line-clamp-2", className)}>
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="text-[12px] font-semibold text-orange-600 hover:text-orange-700"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
