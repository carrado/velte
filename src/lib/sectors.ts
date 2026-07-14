// Mirrors SectorPicker's SECTOR_TAXONOMY on velte-connect/teardown
// (src/lib/sectors.ts) — kept in sync manually so a waitlist vendor's chosen
// sector slug matches what real signup will store, with no translation
// needed when they're invited to onboard. `listingConfig` (wizard-only) is
// dropped; `classification` is kept because the waitlist needs it to filter
// down to the Enugu pilot's scope below.
//
// `eventRelated` mirrors the source taxonomy's `listingConfig.presetGroups`
// containing "Events & Catering" — it's the signal for which pure-service
// sectors the pilot accommodates (see WAITLIST_SECTOR_TAXONOMY).

export type SectorClassification =
  | "retail"
  | "food"
  | "food_both"
  | "service"
  | "both";

export interface SectorLeaf {
  value: string;
  label: string;
  classification: SectorClassification;
  eventRelated?: boolean;
}

export interface SectorCategory {
  id: string;
  label: string;
  sectors: SectorLeaf[];
}

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
        eventRelated: true,
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
      {
        value: "event_planning_services",
        label: "Event Planning Services",
        classification: "service",
        eventRelated: true,
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
      },
      {
        value: "shoes_footwear",
        label: "Shoes & Footwear",
        classification: "retail",
      },
      {
        value: "bags_accessories",
        label: "Bags & Accessories",
        classification: "retail",
      },
      {
        value: "jewelry_watches",
        label: "Jewelry & Watches",
        classification: "both",
      },
      {
        value: "tailoring_fashion_design",
        label: "Tailoring & Fashion Design",
        classification: "both",
      },
      {
        value: "textile_fabric_sales",
        label: "Textile & Fabric Sales",
        classification: "retail",
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
        value: "generator_solar_install_repair",
        label: "Generator & Solar Installation/Repair",
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
    id: "finance_insurance",
    label: "Finance & Insurance",
    sectors: [
      {
        value: "microfinance_loans",
        label: "Microfinance & Loans",
        classification: "service",
      },
      {
        value: "insurance_services",
        label: "Insurance Services",
        classification: "service",
      },
      {
        value: "bureau_de_change_forex",
        label: "Bureau de Change / Forex",
        classification: "service",
      },
      {
        value: "investment_wealth_advisory",
        label: "Investment & Wealth Advisory",
        classification: "service",
      },
      {
        value: "cooperative_societies",
        label: "Cooperative Societies",
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
  {
    id: "religious_community_nonprofit",
    label: "Religious, Community & Nonprofit",
    sectors: [
      {
        value: "religious_organizations",
        label: "Religious Organizations & Ministries",
        classification: "service",
      },
      {
        value: "ngos_nonprofits",
        label: "NGOs & Nonprofits",
        classification: "service",
      },
      {
        value: "community_associations",
        label: "Community Associations",
        classification: "service",
      },
    ],
  },
];

export const ALL_SECTORS: SectorLeaf[] = SECTOR_TAXONOMY.flatMap(
  (c) => c.sectors,
);

export const SECTOR_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  ALL_SECTORS.map((s) => [s.value, s.label]),
);

// Enugu pilot scope: vendors who post products (retail/food) plus
// event-related services only — no pure professional/technical/domestic
// services yet. See eventRelated above for which service sectors qualify.
function isWaitlistEligible(leaf: SectorLeaf): boolean {
  if (leaf.classification === "service") return leaf.eventRelated === true;
  return true;
}

export const WAITLIST_SECTOR_TAXONOMY: SectorCategory[] = SECTOR_TAXONOMY.map(
  (category) => ({
    ...category,
    sectors: category.sectors.filter(isWaitlistEligible),
  }),
).filter((category) => category.sectors.length > 0);
