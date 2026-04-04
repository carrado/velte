/**
 * Extracts the first character of a name to use as an initial.
 * @param name - The input name string.
 * @param uppercase - Whether to return the initial in uppercase (default: true).
 * @returns The first character of the name, or an empty string if the name is invalid.
 */
export function getInitial(name: string, uppercase: boolean = true): string {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  const initial = trimmed[0];
  return uppercase ? initial.toUpperCase() : initial;
}
