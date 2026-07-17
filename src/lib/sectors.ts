// Sector taxonomy — the source of truth for the signup sector picker AND the
// Store editor's sector-chip suggestions (same canonical User.sectors list,
// see SectorMultiSelect). Each leaf's `classification` drives listing shape
// per-listing in the Add-Offering wizard: "retail" (can post products, incl.
// general goods), "food" (also product-based, but keeps its own value since
// dashboard copy branches on it via useVendorSectorCapabilities), "service"
// (no stock/products, job-based).
// Matching itself stays embeddings-first (see marketplace model) — this list
// exists for vendor self-description, search filters, and this derivation,
// not as a hard taxonomy the AI is constrained to.
//
// `listingConfig` tailors the Add-Offering wizard's content per sector (which
// service-detail preset groups show, category pre-fill, placeholder copy) —
// see SectorListingConfig in @/types/sectors. It never changes the wizard's
// block structure; that stays a function of `classification` alone.
//
// Synced against the marketing waitlist's WAITLIST_SECTOR_TAXONOMY
// (master branch, src/lib/sectors.ts) so a waitlist vendor's chosen sector
// slug matches what real signup stores — Finance & Insurance and the
// NGOs & Nonprofits leaf stay excluded (out of pilot scope), and Event
// Planning / Ushering stay broken out into their own "Event Services"
// category here rather than nested inside Food & Hospitality, for clarity
// in the sector picker and the Add-Offering wizard's preset grouping.
import type { SectorCategory, SectorLeaf } from "@/types/sectors";

export const SECTOR_TAXONOMY: SectorCategory[] = [
  {
    id: "food_hospitality",
    label: "Food & Hospitality",
    sectors: [
      {
        value: "restaurants_quick_service",
        label: "Restaurants & Quick Service",
        classification: "food",
      },
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
        value: "bars_lounges_nightlife",
        label: "Bars, Lounges & Nightlife",
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
      {
        value: "hotels_shortlets",
        label: "Hotels & Short-lets",
        classification: "service",
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
    id: "retail_trade",
    label: "Retail Trade & General Goods",
    sectors: [
      {
        value: "groceries_supermarket",
        label: "Groceries & Supermarket",
        classification: "retail",
      },
      {
        value: "provision_stores_kiosks",
        label: "Provision Stores & Kiosks",
        classification: "retail",
      },
      {
        value: "wholesale_distribution",
        label: "Wholesale & Distribution",
        classification: "retail",
      },
      {
        value: "stationery_books",
        label: "Stationery & Books",
        classification: "both",
      },
      {
        value: "toys_kids_items",
        label: "Toys & Kids' Items",
        classification: "retail",
      },
      {
        value: "gift_items_souvenirs",
        label: "Gift Items & Souvenirs",
        classification: "retail",
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
        value: "computers_laptops",
        label: "Computers & Laptops",
        classification: "both",
      },
      {
        value: "home_electronics_appliances",
        label: "Home Electronics & Appliances",
        classification: "both",
      },
      {
        value: "gaming_consoles",
        label: "Gaming & Consoles",
        classification: "retail",
      },
      {
        value: "software_development_it",
        label: "Software Development & IT Services",
        classification: "service",
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
      {
        value: "computer_repairs_it_support",
        label: "Computer Repairs & IT Support",
        classification: "service",
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
        value: "makeup_artistry",
        label: "Makeup Artistry",
        classification: "service",
      },
      {
        value: "spa_massage",
        label: "Spa & Massage",
        classification: "service",
      },
      { value: "nail_care", label: "Nail Care", classification: "service" },
      {
        value: "perfumes_fragrances",
        label: "Perfumes & Fragrances",
        classification: "retail",
      },
    ],
  },
  {
    id: "home_living",
    label: "Home & Living",
    sectors: [
      { value: "furniture", label: "Furniture", classification: "both" },
      {
        value: "home_decor_furnishings",
        label: "Home Decor & Furnishings",
        classification: "retail",
      },
      {
        value: "kitchenware_appliances",
        label: "Kitchenware & Appliances",
        classification: "retail",
      },
      {
        value: "bedding_linens",
        label: "Bedding & Linens",
        classification: "retail",
      },
      {
        value: "interior_design_services",
        label: "Interior Design Services",
        classification: "service",
      },
    ],
  },
  {
    id: "building_construction",
    label: "Building & Construction",
    sectors: [
      {
        value: "construction_contracting",
        label: "Construction & Contracting",
        classification: "service",
      },
      {
        value: "architecture_engineering_design",
        label: "Architecture & Engineering Design",
        classification: "service",
      },
      {
        value: "plumbing_services",
        label: "Plumbing Services",
        classification: "service",
      },
      {
        value: "electrical_installation_services",
        label: "Electrical Installation Services",
        classification: "service",
      },
      {
        value: "painting_decorating_services",
        label: "Painting & Decorating Services",
        classification: "service",
      },
      {
        value: "real_estate_property_sales",
        label: "Real Estate & Property Sales",
        classification: "service",
      },
      {
        value: "property_management",
        label: "Property Management",
        classification: "service",
      },
    ],
  },
  {
    id: "automotive",
    label: "Automotive",
    sectors: [
      {
        value: "auto_parts_accessories",
        label: "Auto Parts & Accessories",
        classification: "both",
      },
      {
        value: "vehicle_sales",
        label: "Vehicle Sales",
        classification: "retail",
      },
      {
        value: "auto_repair_mechanic",
        label: "Auto Repair & Mechanic Services",
        classification: "service",
      },
      {
        value: "car_wash_detailing",
        label: "Car Wash & Detailing",
        classification: "service",
      },
      {
        value: "tyre_sales_vulcanizing",
        label: "Tyre Sales & Vulcanizing",
        classification: "both",
      },
      {
        value: "motorcycle_keke_sales",
        label: "Motorcycle & Tricycle (Keke) Sales",
        classification: "retail",
      },
    ],
  },
  {
    id: "repairs_technical",
    label: "Repairs & Technical Services",
    sectors: [
      {
        value: "generator_sales_repair",
        label: "Generator Sales & Repair",
        classification: "both",
      },
      {
        value: "solar_installation",
        label: "Solar Panel Installation & Repair",
        classification: "both",
      },
      {
        value: "appliance_repair",
        label: "Appliance Repair",
        classification: "service",
      },
      {
        value: "shoe_bag_repair_cobbling",
        label: "Shoe & Bag Repair (Cobbling)",
        classification: "service",
      },
      {
        value: "watch_repair",
        label: "Watch Repair",
        classification: "service",
      },
    ],
  },
  {
    id: "professional_business_services",
    label: "Professional & Business Services",
    sectors: [
      {
        value: "consulting_advisory",
        label: "Consulting & Advisory",
        classification: "service",
      },
      {
        value: "accounting_bookkeeping",
        label: "Accounting & Bookkeeping",
        classification: "service",
      },
      {
        value: "legal_services",
        label: "Legal Services",
        classification: "service",
      },
      {
        value: "marketing_advertising",
        label: "Marketing & Advertising",
        classification: "service",
      },
      {
        value: "graphic_design_branding",
        label: "Graphic Design & Branding",
        classification: "service",
      },
      {
        value: "photography_videography",
        label: "Photography & Videography",
        classification: "service",
      },
      {
        value: "printing_publishing",
        label: "Printing & Publishing",
        classification: "service",
      },
      {
        value: "recruitment_hr_services",
        label: "Recruitment & HR Services",
        classification: "service",
      },
      {
        value: "translation_interpretation",
        label: "Translation & Interpretation",
        classification: "service",
      },
      {
        value: "virtual_assistance_admin",
        label: "Virtual Assistance & Admin Support",
        classification: "service",
      },
    ],
  },
  {
    id: "education_training",
    label: "Education & Training",
    sectors: [
      {
        value: "schools_tutorial_centers",
        label: "Schools & Tutorial Centers",
        classification: "service",
      },
      {
        value: "vocational_skills_training",
        label: "Vocational & Skills Training",
        classification: "service",
      },
      {
        value: "online_courses_elearning",
        label: "Online Courses & E-learning",
        classification: "service",
      },
      {
        value: "daycare_creche",
        label: "Daycare & Creche",
        classification: "service",
      },
    ],
  },
  {
    id: "transportation_logistics",
    label: "Transportation & Logistics",
    sectors: [
      {
        value: "logistics_courier_services",
        label: "Logistics & Courier Services",
        classification: "service",
      },
      {
        value: "ride_hailing_car_hire",
        label: "Ride-hailing & Car Hire",
        classification: "service",
      },
      {
        value: "haulage_trucking",
        label: "Haulage & Trucking",
        classification: "service",
      },
      {
        value: "moving_relocation_services",
        label: "Moving & Relocation Services",
        classification: "service",
      },
      {
        value: "freight_forwarding_clearing",
        label: "Freight Forwarding & Clearing",
        classification: "service",
      },
    ],
  },
  {
    id: "arts_media_entertainment",
    label: "Arts, Media & Entertainment",
    sectors: [
      {
        value: "music_audio_production",
        label: "Music & Audio Production",
        classification: "service",
      },
      {
        value: "film_video_production",
        label: "Film & Video Production",
        classification: "service",
      },
      {
        value: "content_creation_influencer",
        label: "Content Creation & Influencer Services",
        classification: "service",
      },
    ],
  },
  {
    id: "home_services_domestic",
    label: "Home Services & Domestic Help",
    sectors: [
      {
        value: "cleaning_services",
        label: "Cleaning Services",
        classification: "service",
      },
      {
        value: "laundry_dry_cleaning",
        label: "Laundry & Dry Cleaning",
        classification: "service",
      },
      {
        value: "fumigation_pest_control",
        label: "Fumigation & Pest Control",
        classification: "service",
      },
      {
        value: "domestic_staffing",
        label: "Domestic Staffing (Nanny, Cook, etc.)",
        classification: "service",
      },
      {
        value: "gardening_landscaping",
        label: "Gardening & Landscaping",
        classification: "service",
      },
      {
        value: "security_services",
        label: "Security Services",
        classification: "service",
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
