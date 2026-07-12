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
        listingConfig: {
          presetGroups: [],
          serviceNamePlaceholder:
            "e.g., Deluxe room — nightly, 2-bedroom short-let…",
          serviceDescriptionPlaceholder:
            "Describe the space, amenities, check-in process, and nightly rate…",
        },
      },
      {
        value: "event_planning_services",
        label: "Event Planning Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Events & Catering"],
          serviceNamePlaceholder: "e.g., Full wedding planning package",
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
        listingConfig: {
          presetGroups: [],
          productCategoryId: "books",
        },
      },
      {
        value: "toys_kids_items",
        label: "Toys & Kids' Items",
        classification: "retail",
        listingConfig: { productCategoryId: "toys" },
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
        listingConfig: {
          presetGroups: ["Repairs & Technical"],
          productCategoryId: "electronics",
        },
      },
      {
        value: "home_electronics_appliances",
        label: "Home Electronics & Appliances",
        classification: "both",
        listingConfig: {
          presetGroups: ["Repairs & Technical"],
          productCategoryId: "electronics",
        },
      },
      {
        value: "gaming_consoles",
        label: "Gaming & Consoles",
        classification: "retail",
        listingConfig: { productCategoryId: "electronics" },
      },
      {
        value: "software_development_it",
        label: "Software Development & IT Services",
        classification: "service",
        listingConfig: {
          presetGroups: [],
          serviceNamePlaceholder: "e.g., Business website design & build",
          serviceDescriptionPlaceholder:
            "Describe what you build, your process, and delivery timeline…",
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
      {
        value: "computer_repairs_it_support",
        label: "Computer Repairs & IT Support",
        classification: "service",
        listingConfig: { presetGroups: ["Repairs & Technical"] },
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
        value: "hairdressing_barbing",
        label: "Hairdressing & Barbing",
        classification: "both",
        listingConfig: {
          presetGroups: ["Beauty & Personal Care"],
          serviceNamePlaceholder: "e.g., Braids, fade cut, wig installation…",
        },
      },
      {
        value: "makeup_artistry",
        label: "Makeup Artistry",
        classification: "service",
        listingConfig: {
          presetGroups: ["Beauty & Personal Care"],
          serviceNamePlaceholder: "e.g., Bridal makeup — full glam",
        },
      },
      {
        value: "spa_massage",
        label: "Spa & Massage",
        classification: "service",
        listingConfig: {
          presetGroups: ["Beauty & Personal Care", "Health & Wellness"],
        },
      },
      {
        value: "nail_care",
        label: "Nail Care",
        classification: "service",
        listingConfig: { presetGroups: ["Beauty & Personal Care"] },
      },
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
        listingConfig: {
          presetGroups: ["Health & Wellness"],
          productCategoryId: "health",
        },
      },
      {
        value: "medical_equipment_supplies",
        label: "Medical Equipment & Supplies",
        classification: "retail",
        listingConfig: { productCategoryId: "health" },
      },
      {
        value: "clinics_hospitals",
        label: "Clinics & Hospitals",
        classification: "service",
        listingConfig: { presetGroups: ["Health & Wellness"] },
      },
      {
        value: "dental_services",
        label: "Dental Services",
        classification: "service",
        listingConfig: { presetGroups: ["Health & Wellness"] },
      },
      {
        value: "diagnostic_lab_services",
        label: "Diagnostic & Lab Services",
        classification: "service",
        listingConfig: { presetGroups: ["Health & Wellness"] },
      },
      {
        value: "fitness_gyms",
        label: "Fitness & Gyms",
        classification: "service",
        listingConfig: {
          presetGroups: ["Health & Wellness", "Training & Lessons"],
          serviceNamePlaceholder:
            "e.g., Monthly gym membership, personal training…",
        },
      },
      {
        value: "nutrition_dietetics",
        label: "Nutrition & Dietetics",
        classification: "service",
        listingConfig: { presetGroups: ["Health & Wellness"] },
      },
      {
        value: "traditional_herbal_medicine",
        label: "Traditional & Herbal Medicine",
        classification: "both",
        listingConfig: { presetGroups: ["Health & Wellness"] },
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
        listingConfig: {
          presetGroups: ["Home Services"],
          productCategoryId: "home-kitchen",
          serviceNamePlaceholder: "e.g., Custom wardrobe — made to order",
        },
      },
      {
        value: "home_decor_furnishings",
        label: "Home Decor & Furnishings",
        classification: "retail",
        listingConfig: { productCategoryId: "home-kitchen" },
      },
      {
        value: "kitchenware_appliances",
        label: "Kitchenware & Appliances",
        classification: "retail",
        listingConfig: { productCategoryId: "home-kitchen" },
      },
      {
        value: "bedding_linens",
        label: "Bedding & Linens",
        classification: "retail",
        listingConfig: { productCategoryId: "home-kitchen" },
      },
      {
        value: "interior_design_services",
        label: "Interior Design Services",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
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
        listingConfig: { presetGroups: ["Home Services"] },
      },
      {
        value: "architecture_engineering_design",
        label: "Architecture & Engineering Design",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "plumbing_services",
        label: "Plumbing Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Home Services", "Repairs & Technical"],
        },
      },
      {
        value: "electrical_installation_services",
        label: "Electrical Installation Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Home Services", "Repairs & Technical"],
        },
      },
      {
        value: "painting_decorating_services",
        label: "Painting & Decorating Services",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
      },
      {
        value: "real_estate_property_sales",
        label: "Real Estate & Property Sales",
        classification: "service",
        listingConfig: {
          presetGroups: [],
          serviceNamePlaceholder: "e.g., 3-bedroom flat for rent in Ikeja",
        },
      },
      {
        value: "property_management",
        label: "Property Management",
        classification: "service",
        listingConfig: { presetGroups: [] },
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
        listingConfig: {
          presetGroups: ["Auto Services"],
          productNamePlaceholder: "e.g., Toyota Corolla brake pads",
        },
      },
      {
        value: "vehicle_sales",
        label: "Vehicle Sales",
        classification: "retail",
        listingConfig: {
          productNamePlaceholder: "e.g., Toyota Camry 2015 — foreign used",
        },
      },
      {
        value: "auto_repair_mechanic",
        label: "Auto Repair & Mechanic Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Auto Services"],
          serviceNamePlaceholder: "e.g., Full engine service",
        },
      },
      {
        value: "car_wash_detailing",
        label: "Car Wash & Detailing",
        classification: "service",
        listingConfig: { presetGroups: ["Auto Services"] },
      },
      {
        value: "tyre_sales_vulcanizing",
        label: "Tyre Sales & Vulcanizing",
        classification: "both",
        listingConfig: { presetGroups: ["Auto Services"] },
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
        listingConfig: {
          presetGroups: ["Repairs & Technical", "Home Services"],
          serviceNamePlaceholder: "e.g., 5kVA solar installation",
        },
      },
      {
        value: "appliance_repair",
        label: "Appliance Repair",
        classification: "service",
        listingConfig: { presetGroups: ["Repairs & Technical"] },
      },
      {
        value: "shoe_bag_repair_cobbling",
        label: "Shoe & Bag Repair (Cobbling)",
        classification: "service",
        listingConfig: { presetGroups: ["Repairs & Technical"] },
      },
      {
        value: "watch_repair",
        label: "Watch Repair",
        classification: "service",
        listingConfig: { presetGroups: ["Repairs & Technical"] },
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
        listingConfig: { presetGroups: [] },
      },
      {
        value: "accounting_bookkeeping",
        label: "Accounting & Bookkeeping",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "legal_services",
        label: "Legal Services",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "marketing_advertising",
        label: "Marketing & Advertising",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "graphic_design_branding",
        label: "Graphic Design & Branding",
        classification: "service",
        listingConfig: {
          presetGroups: ["Media & Photography"],
          serviceNamePlaceholder: "e.g., Logo & full brand identity design",
        },
      },
      {
        value: "photography_videography",
        label: "Photography & Videography",
        classification: "service",
        listingConfig: {
          presetGroups: ["Media & Photography"],
          serviceNamePlaceholder:
            "e.g., Wedding photography — full-day coverage",
        },
      },
      {
        value: "printing_publishing",
        label: "Printing & Publishing",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "recruitment_hr_services",
        label: "Recruitment & HR Services",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "translation_interpretation",
        label: "Translation & Interpretation",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "virtual_assistance_admin",
        label: "Virtual Assistance & Admin Support",
        classification: "service",
        listingConfig: { presetGroups: [] },
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
        listingConfig: { presetGroups: ["Training & Lessons"] },
      },
      {
        value: "vocational_skills_training",
        label: "Vocational & Skills Training",
        classification: "service",
        listingConfig: {
          presetGroups: ["Training & Lessons"],
          serviceNamePlaceholder: "e.g., 8-week fashion design training",
        },
      },
      {
        value: "online_courses_elearning",
        label: "Online Courses & E-learning",
        classification: "service",
        listingConfig: { presetGroups: ["Training & Lessons"] },
      },
      {
        value: "daycare_creche",
        label: "Daycare & Creche",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "educational_materials",
        label: "Educational Materials & Publishing",
        classification: "retail",
        listingConfig: { productCategoryId: "books" },
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
        listingConfig: {
          productNamePlaceholder: "e.g., 50kg bag of rice, basket of tomatoes…",
        },
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
        listingConfig: { presetGroups: [] },
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
        listingConfig: { presetGroups: [] },
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
        listingConfig: {
          presetGroups: ["Logistics & Transport"],
          serviceNamePlaceholder: "e.g., Same-day delivery within Lagos",
        },
      },
      {
        value: "ride_hailing_car_hire",
        label: "Ride-hailing & Car Hire",
        classification: "service",
        listingConfig: { presetGroups: ["Logistics & Transport"] },
      },
      {
        value: "haulage_trucking",
        label: "Haulage & Trucking",
        classification: "service",
        listingConfig: { presetGroups: ["Logistics & Transport"] },
      },
      {
        value: "moving_relocation_services",
        label: "Moving & Relocation Services",
        classification: "service",
        listingConfig: { presetGroups: ["Logistics & Transport"] },
      },
      {
        value: "freight_forwarding_clearing",
        label: "Freight Forwarding & Clearing",
        classification: "service",
        listingConfig: { presetGroups: ["Logistics & Transport"] },
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
        listingConfig: { presetGroups: [] },
      },
      {
        value: "insurance_services",
        label: "Insurance Services",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "bureau_de_change_forex",
        label: "Bureau de Change / Forex",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "investment_wealth_advisory",
        label: "Investment & Wealth Advisory",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "cooperative_societies",
        label: "Cooperative Societies",
        classification: "service",
        listingConfig: { presetGroups: [] },
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
        listingConfig: {
          presetGroups: ["Media & Photography"],
          serviceNamePlaceholder: "e.g., Studio recording session",
        },
      },
      {
        value: "film_video_production",
        label: "Film & Video Production",
        classification: "service",
        listingConfig: { presetGroups: ["Media & Photography"] },
      },
      {
        value: "event_centers_rentals",
        label: "Event Centers & Rentals",
        classification: "service",
        listingConfig: {
          presetGroups: ["Events & Catering"],
          serviceNamePlaceholder: "e.g., 500-seat event hall rental",
        },
      },
      {
        value: "dj_mc_services",
        label: "DJ & MC Services",
        classification: "service",
        listingConfig: {
          presetGroups: ["Events & Catering", "Media & Photography"],
        },
      },
      {
        value: "art_craft_sales",
        label: "Art & Craft Sales",
        classification: "both",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "content_creation_influencer",
        label: "Content Creation & Influencer Services",
        classification: "service",
        listingConfig: { presetGroups: ["Media & Photography"] },
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
        listingConfig: { productCategoryId: "fashion" },
      },
      {
        value: "furniture_manufacturing",
        label: "Furniture Manufacturing",
        classification: "both",
        listingConfig: {
          presetGroups: ["Home Services"],
          productCategoryId: "home-kitchen",
        },
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
        listingConfig: {
          presetGroups: ["Home Services"],
          serviceNamePlaceholder: "e.g., Deep cleaning — 3-bedroom flat",
        },
      },
      {
        value: "laundry_dry_cleaning",
        label: "Laundry & Dry Cleaning",
        classification: "service",
        listingConfig: {
          presetGroups: ["Home Services"],
          serviceNamePlaceholder: "e.g., Wash & fold — per basket",
        },
      },
      {
        value: "fumigation_pest_control",
        label: "Fumigation & Pest Control",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
      },
      {
        value: "domestic_staffing",
        label: "Domestic Staffing (Nanny, Cook, etc.)",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
      },
      {
        value: "gardening_landscaping",
        label: "Gardening & Landscaping",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
      },
      {
        value: "security_services",
        label: "Security Services",
        classification: "service",
        listingConfig: { presetGroups: ["Home Services"] },
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
        listingConfig: { presetGroups: [] },
      },
      {
        value: "ngos_nonprofits",
        label: "NGOs & Nonprofits",
        classification: "service",
        listingConfig: { presetGroups: [] },
      },
      {
        value: "community_associations",
        label: "Community Associations",
        classification: "service",
        listingConfig: { presetGroups: [] },
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
        listingConfig: { presetGroups: [] },
      },
      // "Other" keeps no listingConfig on purpose — with no sector signal, the
      // full preset list is the honest default.
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

// Store.sectors holds display LABELS (not slugs — see the Store editor), so
// resolving a store back to its category (e.g. for the public storefront's
// hero theme) needs a label -> category id lookup rather than SECTOR_BY_VALUE.
export const SECTOR_CATEGORY_BY_LABEL: Record<string, string> =
  Object.fromEntries(
    SECTOR_TAXONOMY.flatMap((c) => c.sectors.map((s) => [s.label, c.id])),
  );
