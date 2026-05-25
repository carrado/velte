import { useUserStore } from "@/store/userStore";
import type { BusinessType } from "@/types/user";

export function useBusinessType(): BusinessType {
  return useUserStore((s) => s.user?.businessType ?? "retail");
}

export function useIsFood(): boolean {
  return useBusinessType() === "food";
}
