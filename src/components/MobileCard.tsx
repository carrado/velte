import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface MobileCardField {
  label: string;
  value: ReactNode;
}

interface MobileCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  initials?: { text: string; className: string };
  fields: MobileCardField[];
  gridCols?: 2 | 3;
  footer?: ReactNode;
  className?: string;
}

export default function MobileCard({
  title,
  subtitle,
  badge,
  action,
  initials,
  fields,
  gridCols = 2,
  footer,
  className,
}: MobileCardProps) {
  return (
    <div className={cn("bg-white border-b border-gray-100 p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {initials && (
            <div
              className={cn(
                "w-10 h-10 rounded border flex items-center justify-center text-xs font-bold flex-shrink-0",
                initials.className,
              )}
            >
              {initials.text}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {(badge || action) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {badge}
            {action}
          </div>
        )}
      </div>
      <div
        className={cn(
          "grid gap-3 text-xs",
          gridCols === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {fields.map((field, i) => (
          <div key={i}>
            <p className="text-gray-400">{field.label}</p>
            <div className="font-medium text-gray-700 mt-0.5">
              {field.value}
            </div>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-3 pt-3 border-t border-gray-100">{footer}</div>
      )}
    </div>
  );
}
