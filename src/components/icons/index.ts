/**
 * Velte's custom line-icon set — replaces lucide-react across the app.
 * Every icon shares the `createIcon` factory in `./base.tsx` (24x24 stroke
 * grid, `currentColor`, `size`/`strokeWidth` props matching lucide's own
 * API), so call sites are a 1:1 swap. See [[custom_icon_system]].
 */
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
