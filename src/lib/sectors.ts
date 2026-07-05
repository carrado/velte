// Sector taxonomy — the source of truth for the signup sector picker AND the
// Store editor's sector-chip suggestions. Classification drives the derived
// businessType at signup: "retail" (can post products, incl. general goods),
// "food" (also product-based, but keeps its own value since dashboard copy
// branches on it via useIsFood), "service" (no stock/products, job-based).
// Matching itself stays embeddings-first (see marketplace model) — this list
// exists for vendor self-description, search filters, and this derivation,
// not as a hard taxonomy the AI is constrained to.
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
        featured: true,
      },
      {
        value: "catering_event_food",
        label: "Catering & Event Food",
        classification: "food_both",
      },
      {
        value: "bakery_pastries",
        label: "Bakery & Pastries",
        classification: "food",
        featured: true,
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
        featured: true,
      },
      {
        value: "event_planning_services",
        label: "Event Planning Services",
        classification: "service",
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
        featured: true,
      },
      {
        value: "phone_gadget_repairs",
        label: "Phone & Gadget Repairs",
        classification: "service",
        featured: true,
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
        featured: true,
      },
      {
        value: "hairdressing_barbing",
        label: "Hairdressing & Barbing",
        classification: "both",
        featured: true,
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
    id: "health_wellness",
    label: "Health & Wellness",
    sectors: [
      {
        value: "pharmacy_medicines",
        label: "Pharmacy & Medicines",
        classification: "both",
        featured: true,
      },
      {
        value: "medical_equipment_supplies",
        label: "Medical Equipment & Supplies",
        classification: "retail",
      },
      {
        value: "clinics_hospitals",
        label: "Clinics & Hospitals",
        classification: "service",
      },
      {
        value: "dental_services",
        label: "Dental Services",
        classification: "service",
      },
      {
        value: "diagnostic_lab_services",
        label: "Diagnostic & Lab Services",
        classification: "service",
      },
      {
        value: "fitness_gyms",
        label: "Fitness & Gyms",
        classification: "service",
      },
      {
        value: "nutrition_dietetics",
        label: "Nutrition & Dietetics",
        classification: "service",
      },
      {
        value: "traditional_herbal_medicine",
        label: "Traditional & Herbal Medicine",
        classification: "both",
      },
    ],
  },
  {
    id: "home_living",
    label: "Home & Living",
    sectors: [
      {
        value: "furniture",
        label: "Furniture",
        classification: "both",
        featured: true,
      },
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
        value: "building_materials",
        label: "Building Materials",
        classification: "retail",
        featured: true,
      },
      {
        value: "hardware_tools",
        label: "Hardware & Tools",
        classification: "retail",
      },
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
        featured: true,
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
      {
        value: "educational_materials",
        label: "Educational Materials & Publishing",
        classification: "retail",
      },
    ],
  },
  {
    id: "agriculture_agroprocessing",
    label: "Agriculture & Agro-processing",
    sectors: [
      {
        value: "crop_farming_produce",
        label: "Crop Farming & Produce Sales",
        classification: "retail",
        featured: true,
      },
      {
        value: "livestock_poultry",
        label: "Livestock & Poultry",
        classification: "retail",
      },
      {
        value: "fishery_aquaculture",
        label: "Fishery & Aquaculture",
        classification: "retail",
      },
      {
        value: "agro_processing",
        label: "Agro-processing (Milling, Packaging)",
        classification: "both",
      },
      {
        value: "farm_inputs_equipment",
        label: "Farm Inputs & Equipment",
        classification: "retail",
      },
      {
        value: "agricultural_consulting",
        label: "Agricultural Consulting Services",
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
        featured: true,
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
        featured: true,
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
        featured: true,
      },
      {
        value: "film_video_production",
        label: "Film & Video Production",
        classification: "service",
      },
      {
        value: "event_centers_rentals",
        label: "Event Centers & Rentals",
        classification: "service",
      },
      {
        value: "dj_mc_services",
        label: "DJ & MC Services",
        classification: "service",
      },
      {
        value: "art_craft_sales",
        label: "Art & Craft Sales",
        classification: "both",
      },
      {
        value: "content_creation_influencer",
        label: "Content Creation & Influencer Services",
        classification: "service",
      },
    ],
  },
  {
    id: "manufacturing_industrial",
    label: "Manufacturing & Industrial",
    sectors: [
      {
        value: "food_beverage_manufacturing",
        label: "Food & Beverage Manufacturing",
        classification: "food",
      },
      {
        value: "textile_manufacturing",
        label: "Textile Manufacturing",
        classification: "retail",
      },
      {
        value: "furniture_manufacturing",
        label: "Furniture Manufacturing",
        classification: "both",
      },
      {
        value: "plastics_packaging_manufacturing",
        label: "Plastics & Packaging Manufacturing",
        classification: "retail",
      },
      {
        value: "cosmetics_manufacturing",
        label: "Cosmetics Manufacturing",
        classification: "retail",
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
        featured: true,
      },
      {
        value: "laundry_dry_cleaning",
        label: "Laundry & Dry Cleaning",
        classification: "service",
        featured: true,
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
  {
    id: "other_miscellaneous",
    label: "Other",
    sectors: [
      {
        value: "import_export_trading",
        label: "Import & Export Trading",
        classification: "retail",
      },
      {
        value: "government_public_sector_contracting",
        label: "Government & Public Sector Contracting",
        classification: "service",
      },
      { value: "other", label: "Other", classification: "both" },
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

// Backward-compat flat suggestion list for the Store editor's "pick up to 5"
// sector chips (src/components/store/StorePage.tsx) — same shape as before
// (readonly string[] of labels), now sourced from the curated `featured`
// subset instead of a hand-maintained 12-item list.
export const SECTOR_SUGGESTIONS = ALL_SECTORS.filter((s) => s.featured).map(
  (s) => s.label,
) as readonly string[];
