export const NIGERIA_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
] as const;

export type NigeriaState = (typeof NIGERIA_STATES)[number];

// Nominatim returns state names like "Lagos State" or "Federal Capital
// Territory" — normalize against our canonical list so a geolocation result
// can be compared against (or written into) the signup form's state field.
export function normalizeNigeriaState(raw?: string): NigeriaState | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .trim()
    .replace(/\s+state$/i, "")
    .toLowerCase();
  return NIGERIA_STATES.find((s) => s.toLowerCase() === cleaned);
}
