import type { AttributePresetGroup } from "@/types/product";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

/* Curated attribute / service-detail suggestions so vendors fill a checklist
   instead of inventing field names. Everything added here ends up in the text
   that gets embedded for AI matching — richer details = better matches.
   Names are the fixed keys; `example` only seeds the placeholder. */

// ── Services — grouped by sector, vendors scroll and fill what applies ───────

export const SERVICE_DETAIL_PRESETS: AttributePresetGroup[] = [
  {
    group: "General",
    items: [
      { name: "Duration", example: "about 2 hours" },
      { name: "Coverage Area", example: "Lagos mainland" },
      { name: "Availability", example: "Mon–Sat, 9am–6pm" },
      { name: "Experience", example: "5+ years" },
      { name: "Home Service", example: "Yes — we come to you" },
      { name: "Response Time", example: "within 24 hours" },
      { name: "Payment Terms", example: "50% upfront" },
      { name: "Warranty", example: "30 days on all work" },
      { name: "Booking Notice", example: "book 24 hours ahead" },
    ],
  },
  {
    group: "Repairs & Technical",
    items: [
      { name: "Device Types", example: "phones, laptops, TVs" },
      { name: "Diagnosis Fee", example: "₦2,000 — waived if we repair" },
      { name: "Parts Policy", example: "original parts only" },
      { name: "Turnaround Time", example: "same day for most repairs" },
      { name: "Pickup & Delivery", example: "available within Ikeja" },
      { name: "Repair Warranty", example: "14 days" },
    ],
  },
  {
    group: "Fashion & Tailoring",
    items: [
      { name: "Turnaround Time", example: "1–2 weeks" },
      { name: "Measurement", example: "home visit or send measurements" },
      { name: "Fabric", example: "customer provides or we source" },
      { name: "Fittings Included", example: "2 fittings" },
      { name: "Styles", example: "agbada, kaftan, suits" },
      { name: "Rush Orders", example: "48-hour express available" },
    ],
  },
  {
    group: "Beauty & Personal Care",
    items: [
      { name: "Location", example: "home service or in-salon" },
      { name: "Session Duration", example: "45 minutes" },
      { name: "Products Used", example: "hypoallergenic products" },
      { name: "Group Bookings", example: "bridal parties welcome" },
      { name: "Gender", example: "ladies only / unisex" },
    ],
  },
  {
    group: "Home Services",
    items: [
      { name: "Team Size", example: "2 cleaners" },
      { name: "Equipment", example: "we bring everything" },
      { name: "Free Inspection", example: "free quote visit first" },
      { name: "Frequency", example: "one-time, weekly or monthly" },
      { name: "Certifications", example: "licensed electrician" },
    ],
  },
  {
    group: "Events & Catering",
    items: [
      { name: "Capacity", example: "up to 200 guests" },
      { name: "Menu Options", example: "Nigerian & continental" },
      { name: "Staff Included", example: "servers and setup crew" },
      { name: "Tasting Session", example: "available before booking" },
      { name: "Advance Notice", example: "2 weeks minimum" },
      { name: "Setup & Teardown", example: "included" },
    ],
  },
  {
    group: "Logistics & Transport",
    items: [
      { name: "Delivery Areas", example: "Lagos & Ogun" },
      { name: "Vehicle Type", example: "bike / van / truck" },
      { name: "Same-Day Delivery", example: "orders before 2pm" },
      { name: "Package Limits", example: "up to 50kg" },
      { name: "Tracking", example: "WhatsApp updates" },
    ],
  },
  {
    group: "Auto Services",
    items: [
      { name: "Vehicle Types", example: "cars & SUVs" },
      { name: "Roadside Service", example: "available 24/7" },
      { name: "Genuine Parts", example: "sourced on request" },
      { name: "Diagnostics", example: "computerized diagnostics" },
    ],
  },
  {
    group: "Training & Lessons",
    items: [
      { name: "Class Format", example: "one-on-one or small group" },
      { name: "Course Duration", example: "8-week course" },
      { name: "Level", example: "beginner to advanced" },
      { name: "Materials", example: "included" },
      { name: "Certificate", example: "issued on completion" },
    ],
  },
  {
    group: "Media & Photography",
    items: [
      { name: "Deliverables", example: "50 edited photos" },
      { name: "Delivery Time", example: "5 working days" },
      { name: "Coverage Hours", example: "6 hours" },
      { name: "Crew", example: "photographer + assistant" },
      { name: "Raw Files", example: "available on request" },
    ],
  },
  {
    group: "Health & Wellness",
    items: [
      { name: "Consultation", example: "free first consultation" },
      { name: "Home Visits", example: "available" },
      { name: "Packages", example: "per session or monthly plan" },
    ],
  },
];

/** Sector-tailored service presets: the sector's configured groups (in their
 * configured order) with General always last. No config = the full list, so
 * unconfigured sectors keep today's behavior. `presetGroups: []` = General
 * only — right for trades none of the specialized groups fit (consulting,
 * finance, real estate…). */
export function getServiceDetailPresets(
  sectorValue?: string,
): AttributePresetGroup[] {
  const configured = sectorValue
    ? SECTOR_BY_VALUE[sectorValue]?.listingConfig?.presetGroups
    : undefined;
  if (!configured) return SERVICE_DETAIL_PRESETS;
  const byName = new Map(SERVICE_DETAIL_PRESETS.map((g) => [g.group, g]));
  const general = byName.get("General")!;
  const specific = configured
    .map((name) => byName.get(name))
    .filter((g): g is AttributePresetGroup => Boolean(g) && g !== general);
  return [...specific, general];
}

// ── Products — keyed by retail category id, General always appended ──────────

const GENERAL_PRODUCT_PRESETS: AttributePresetGroup = {
  group: "General",
  items: [
    { name: "Brand", example: "e.g. Samsung" },
    { name: "Color", example: "e.g. Black" },
    { name: "Material", example: "e.g. stainless steel" },
    { name: "Size", example: "e.g. Medium" },
    { name: "Weight", example: "e.g. 1.2kg" },
    { name: "Condition", example: "brand new / UK used" },
    { name: "Warranty", example: "e.g. 1 year" },
    { name: "Country of Origin", example: "e.g. Nigeria" },
  ],
};

const PRODUCT_PRESETS_BY_CATEGORY: Record<string, AttributePresetGroup> = {
  electronics: {
    group: "Electronics",
    items: [
      { name: "Model", example: "e.g. Spark 10 Pro" },
      { name: "Storage", example: "e.g. 128GB" },
      { name: "RAM", example: "e.g. 8GB" },
      { name: "Screen Size", example: "e.g. 6.5 inches" },
      { name: "Battery", example: "e.g. 5000mAh" },
      { name: "Connectivity", example: "e.g. Wi-Fi, Bluetooth 5.0" },
      { name: "Power", example: "e.g. 220V" },
      { name: "What's in the Box", example: "e.g. charger, earphones" },
    ],
  },
  fashion: {
    group: "Fashion",
    items: [
      { name: "Sizes Available", example: "e.g. S, M, L, XL" },
      { name: "Fabric", example: "e.g. 100% cotton" },
      { name: "Gender", example: "men / women / unisex" },
      { name: "Fit", example: "e.g. slim fit" },
      { name: "Occasion", example: "e.g. casual, formal" },
      { name: "Care", example: "e.g. hand wash only" },
      { name: "Length", example: "e.g. ankle length" },
    ],
  },
  accessories: {
    group: "Accessories",
    items: [
      { name: "Compatibility", example: "e.g. fits iPhone 13–15" },
      { name: "Dimensions", example: "e.g. 20cm × 12cm" },
      { name: "Strap Type", example: "e.g. adjustable leather" },
      { name: "Water Resistance", example: "e.g. splash-proof" },
    ],
  },
  "home-kitchen": {
    group: "Home & Kitchen",
    items: [
      { name: "Dimensions", example: "e.g. 60cm × 40cm" },
      { name: "Capacity", example: "e.g. 5 litres" },
      { name: "Power", example: "e.g. 1500W" },
      { name: "Pieces in Set", example: "e.g. 6 pieces" },
      { name: "Care Instructions", example: "e.g. dishwasher safe" },
    ],
  },
  sports: {
    group: "Sports",
    items: [
      { name: "Sport Type", example: "e.g. football" },
      { name: "Sizes Available", example: "e.g. 40–45" },
      { name: "Age Range", example: "e.g. adults" },
      { name: "Set Includes", example: "e.g. pump included" },
    ],
  },
  toys: {
    group: "Toys",
    items: [
      { name: "Age Range", example: "e.g. 3–7 years" },
      { name: "Batteries", example: "e.g. 2× AA, included" },
      { name: "Pieces", example: "e.g. 120 pieces" },
      { name: "Safety", example: "e.g. non-toxic plastic" },
    ],
  },
  health: {
    group: "Health",
    items: [
      { name: "Strength", example: "e.g. 500mg" },
      { name: "Pack Size", example: "e.g. 30 tablets" },
      { name: "Form", example: "tablet / syrup / cream" },
      { name: "Age Suitability", example: "e.g. adults only" },
      { name: "Storage", example: "e.g. store below 25°C" },
      { name: "NAFDAC Number", example: "e.g. A4-1234" },
    ],
  },
  books: {
    group: "Books",
    items: [
      { name: "Author", example: "e.g. Chimamanda Adichie" },
      { name: "Format", example: "paperback / hardcover" },
      { name: "Pages", example: "e.g. 320" },
      { name: "Language", example: "e.g. English" },
      { name: "Publisher", example: "e.g. Farafina" },
      { name: "ISBN", example: "e.g. 978-…" },
    ],
  },
};

/** Category-specific suggestions first (when we have them), General always
 * available below. */
export function getProductAttributePresets(
  categoryId: string,
): AttributePresetGroup[] {
  const specific = PRODUCT_PRESETS_BY_CATEGORY[categoryId];
  return specific
    ? [specific, GENERAL_PRODUCT_PRESETS]
    : [GENERAL_PRODUCT_PRESETS];
}
