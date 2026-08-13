"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-gray-200 bg-gray-200 p-0.5 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-orange-500 data-checked:bg-orange-500",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="size-3.5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
