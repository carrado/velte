"use client";

/**
 * Compatibility shim — formerly Heroicons wrappers for the /chat tree.
 * Re-exports the Phosphor-backed barrel so existing
 * `@/components/icons/hero` imports keep working without a mass rename.
 */
export type { IconProps } from "@/types/common";
export * from "./navigation";
export * from "./actions";
export * from "./status";
export * from "./commerce";
export * from "./communication";
export * from "./people";
export * from "./media";
export * from "./system";
export * from "./extras";
export * from "./illustrations";
