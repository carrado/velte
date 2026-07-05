import { cn } from "@/lib/utils";
import type { WizardProgressProps } from "@/types/auth";

const STEP_LABELS: Record<1 | 2, string> = {
  1: "Business & account info",
  2: "Sector & description",
};

export default function WizardProgress({ step }: WizardProgressProps) {
  return (
    <div className="mb-5">
      <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
        Step {step} of 2 — {STEP_LABELS[step]}
      </div>
      <div className="flex items-center gap-1.5">
        {([1, 2] as const).map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              s <= step ? "bg-orange-500" : "bg-black/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}
