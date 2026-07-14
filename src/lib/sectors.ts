// Sector taxonomy — the source of truth for the signup sector picker AND the
// Store editor's sector-chip suggestions. Classification drives the derived
// businessType at signup: "retail" (can post products, incl. general goods),
// "food" (also product-based, but keeps its own value since dashboard copy
// branches on it via useIsFood), "service" (no stock/products, job-based).
// Matching itself stays embeddings-first (see marketplace model) — this list
// exists for vendor self-description, search filters, and this derivation,
// not as a hard taxonomy the AI is constrained to.
//
// `listingConfig` tailors the Add-Offering wizard's content per sector (which
// service-detail preset groups show, category pre-fill, placeholder copy) —
// see SectorListingConfig in @/types/sectors. It never changes the wizard's
// block structure; that stays a function of `classification` alone.
import type { SectorCategory, SectorLeaf } from "@/types/sectors";

// Enugu pilot scope: only the categories currently live on the marketing
// waitlist are kept here — everything else was removed outright rather than
// hidden behind a filter, since there are no real signups yet to orphan.
// Order and grouping mirror the waitlist's own WAITLIST_SECTOR_TAXONOMY
// (marketing repo's src/lib/sectors.ts) so the two stay easy to eyeball
// against each other — including "Event Services" as its own category here
// too, rather than leaving Event Planning buried inside Food & Hospitality.
export const SECTOR_TAXONOMY: SectorCategory[] = [
  {
    id: "electronics_technology",
    label: "Electronics & Technology",
    sectors: [
      {
        value: "phones_accessories",
        label: "Phones & Accessories",
        classification: "both",
        listingConfig: {
          presetGroups: ["Repairs & Technical"],
          productCategoryId: "electronics",
          productNamePlaceholder:
            "e.g., Samsung Galaxy A16, iPhone 13 charger…",
        },
      },
      {
        value: "phone_gadget_repairs",
        label: "Phone & Gadget Repairs",
        classification: "service",
        listingConfig: {
          presetGroups: ["Repairs & Technical"],
          serviceNamePlaceholder: "e.g., iPhone screen replacement",
          serviceDescriptionPlaceholder:
            "Describe what you repair, the parts you use, and turnaround time…",
        },
      },
    ],
  },
  {
    id: "fashion_apparel",
    label: "Fashion & Apparel",
    sectors: [
      {
        value: "clothing_apparel",
        label: "Clothing & Apparel",
        classification: "retail",
        listingConfig: {
          productCategoryId: "fashion",
          productNamePlaceholder: "e.g., Men's senator wear, Ankara gown…",
        },
      },
      {
        value: "shoes_footwear",
        label: "Shoes & Footwear",
        classification: "retail",
        listingConfig: { productCategoryId: "fashion" },
      },
      {
        value: "bags_accessories",
        label: "Bags & Accessories",
        classification: "retail",
        listingConfig: { productCategoryId: "accessories" },
      },
      {
        value: "jewelry_watches",
        label: "Jewelry & Watches",
        classification: "both",
        listingConfig: {
          presetGroups: ["Fashion & Tailoring", "Repairs & Technical"],
          productCategoryId: "accessories",
        },
      },
      {
        value: "tailoring_fashion_design",
        label: "Tailoring & Fashion Design",
        classification: "both",
        listingConfig: {
          presetGroups: ["Fashion & Tailoring"],
          productCategoryId: "fashion",
          serviceNamePlaceholder: "e.g., Custom agbada — sewn to measure",
          serviceDescriptionPlaceholder:
            "Describe what you sew, fittings included, and turnaround time…",
        },
      },
      {
        value: "textile_fabric_sales",
        label: "Textile & Fabric Sales",
        classification: "retail",
        listingConfig: { productCategoryId: "fashion" },
      },
    ],
  },
  {
    id: "beauty_personal_care",
    label: "Beauty & Personal Care",
    sectors: [
      {
        value: "cosmetics_skincare_retail",
        label: "Cosmetics & Skincare Retail",
        classification: "retail",
      },
      {
        value: "perfumes_fragrances",
        label: "Perfumes & Fragrances",
        classification: "retail",
      },
    ],
  },
  {
    id: "event_services",
    label: "Event Services",
    sectors: [
      {
        value: "event_planning_services",
        label: "Event Planning Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Events & Catering"],
          serviceNamePlaceholder: "e.g., Full wedding planning package",
        },
      },
      {
        value: "ushering_services",
        label: "Ushering Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Events & Catering"],
          serviceNamePlaceholder: "e.g., Wedding ushering — team of 6",
          serviceDescriptionPlaceholder:
            "Describe your team size, uniform/attire, and how bookings work…",
        },
      },
    ],
  },
  {
    id: "food_hospitality",
    label: "Food & Hospitality",
    sectors: [
      {
        value: "catering_event_food",
        label: "Catering & Event Food",
        classification: "food_both",
        listingConfig: {
          presetGroups: ["Events & Catering"],
          serviceNamePlaceholder: "e.g., Full-service wedding catering",
          serviceDescriptionPlaceholder:
            "Describe the menu options, staff included, setup, and how bookings work…",
        },
      },
      {
        value: "bakery_pastries",
        label: "Bakery & Pastries",
        classification: "food",
      },
      {
        value: "street_food_local_delicacies",
        label: "Street Food & Local Delicacies",
        classification: "food",
      },
      {
        value: "confectionery_snacks",
        label: "Confectionery & Snacks",
        classification: "food",
      },
    ],
  },
];

/** Flat lookup helpers — the sector picker and description generator work off these. */
export const ALL_SECTORS: SectorLeaf[] = SECTOR_TAXONOMY.flatMap(
  (c) => c.sectors,
);

export const SECTOR_BY_VALUE: Record<string, SectorLeaf> = Object.fromEntries(
  ALL_SECTORS.map((s) => [s.value, s]),
);

// Store.sectors holds display LABELS (not slugs — see the Store editor), so
// resolving a store back to its category (e.g. for the public storefront's
// hero theme) needs a label -> category id lookup rather than SECTOR_BY_VALUE.
export const SECTOR_CATEGORY_BY_LABEL: Record<string, string> =
  Object.fromEntries(
    SECTOR_TAXONOMY.flatMap((c) => c.sectors.map((s) => [s.label, c.id])),
  );
