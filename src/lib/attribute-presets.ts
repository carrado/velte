import type { AttributePresetGroup } from "@/types/product";
import { SECTOR_BY_VALUE } from "@/lib/sectors";

/* Curated attribute / service-detail suggestions so vendors fill a checklist
   instead of inventing field names. Everything added here ends up in the text
   that gets embedded for AI matching — richer details = better matches.
   Names are the fixed keys; `example` only seeds the placeholder.
   `important: true` marks the 1-2 fields per group that most affect match
   quality (see AttributePreset's own doc comment) — surfaced to vendors as a
   nudge, not a hard requirement. */

// ── Services — grouped by sector, vendors scroll and fill what applies ───────

export const SERVICE_DETAIL_PRESETS: AttributePresetGroup[] = [
  {
    group: "General",
    items: [
      { name: "Duration", example: "about 2 hours", important: true },
      { name: "Coverage Area", example: "Lagos mainland", important: true },
      { name: "Availability", example: "Mon–Sat, 9am–6pm" },
      { name: "Experience", example: "5+ years" },
      { name: "Home Service", example: "Yes — we come to you" },
      {
        name: "Response Time",
        example: "within 24 hours",
        important: true,
      },
      { name: "Payment Terms", example: "50% upfront" },
      { name: "Warranty", example: "30 days on all work" },
      { name: "Booking Notice", example: "book 24 hours ahead" },
    ],
  },
  {
    group: "Phone & Gadget Repairs",
    items: [
      {
        name: "Device Types",
        example: "phones, tablets, smartwatches",
        important: true,
      },
      {
        name: "Screen Replacement",
        example: "original or aftermarket screens available",
      },
      { name: "Diagnosis Fee", example: "₦2,000 — waived if we repair" },
      {
        name: "Turnaround Time",
        example: "same day for most repairs",
        important: true,
      },
      { name: "Data Backup", example: "we back up your data before repair" },
      {
        name: "Repair Warranty",
        example: "14 days",
        important: true,
      },
      { name: "Pickup & Delivery", example: "available within Ikeja" },
    ],
  },
  {
    group: "Computer & IT Repairs",
    items: [
      {
        name: "Device Types",
        example: "laptops, desktops, printers",
        important: true,
      },
      {
        name: "Services Offered",
        example: "hardware repair, software troubleshooting, virus removal",
        important: true,
      },
      { name: "Diagnosis Fee", example: "free diagnosis" },
      {
        name: "Turnaround Time",
        example: "24–48 hours",
        important: true,
      },
      { name: "Data Recovery", example: "available" },
      { name: "On-site Support", example: "available for offices" },
      { name: "Repair Warranty", example: "30 days" },
    ],
  },
  {
    group: "Appliance & Generator Repair",
    items: [
      {
        name: "Appliance Types",
        example: "fridges, ACs, generators, washing machines",
        important: true,
      },
      {
        name: "Brands Serviced",
        example: "LG, Samsung, Sumec Firman",
        important: true,
      },
      { name: "Diagnosis Fee", example: "₦3,000, waived if we repair" },
      {
        name: "Turnaround Time",
        example: "same day or next day",
        important: true,
      },
      { name: "Parts Policy", example: "original parts only" },
      { name: "Home Visit", example: "available" },
      { name: "Repair Warranty", example: "30 days" },
    ],
  },
  {
    group: "Shoe & Bag Repair",
    items: [
      {
        name: "Repair Types",
        example: "sole replacement, stitching, zip repair",
        important: true,
      },
      {
        name: "Materials Used",
        example: "matching leather/thread",
        important: true,
      },
      {
        name: "Turnaround Time",
        example: "2–3 days",
        important: true,
      },
      { name: "Pickup & Delivery", example: "available" },
      { name: "Cleaning Included", example: "yes" },
    ],
  },
  {
    group: "Watch & Jewelry Repair",
    items: [
      {
        name: "Repair Types",
        example: "battery change, strap replacement, resizing",
        important: true,
      },
      {
        name: "Brands Serviced",
        example: "Rolex, Casio, generic",
        important: true,
      },
      {
        name: "Turnaround Time",
        example: "same day for battery/strap",
        important: true,
      },
      { name: "Water Resistance Testing", example: "available" },
      { name: "Warranty", example: "30 days on repairs" },
    ],
  },
  {
    group: "Fashion & Tailoring",
    items: [
      { name: "Turnaround Time", example: "1–2 weeks", important: true },
      { name: "Measurement", example: "home visit or send measurements" },
      {
        name: "Fabric",
        example: "customer provides or we source",
        important: true,
      },
      { name: "Fittings Included", example: "2 fittings" },
      { name: "Styles", example: "agbada, kaftan, suits", important: true },
      { name: "Rush Orders", example: "48-hour express available" },
    ],
  },
  {
    group: "Makeup Artistry",
    items: [
      {
        name: "Services Offered",
        example: "bridal, editorial, everyday makeup",
        important: true,
      },
      {
        name: "Products Used",
        example: "hypoallergenic, high-end brands",
        important: true,
      },
      {
        name: "Location",
        example: "home service or in-studio",
        important: true,
      },
      { name: "Group Bookings", example: "bridal parties welcome" },
      { name: "Trial Session", example: "available before event" },
    ],
  },
  {
    group: "Spa & Massage",
    items: [
      {
        name: "Services Offered",
        example: "Swedish, deep tissue, facials",
        important: true,
      },
      {
        name: "Session Duration",
        example: "45–90 minutes",
        important: true,
      },
      {
        name: "Location",
        example: "home service or in-spa",
        important: true,
      },
      { name: "Products Used", example: "organic/hypoallergenic options" },
      { name: "Packages", example: "single session or monthly plan" },
    ],
  },
  {
    group: "Nail Care",
    items: [
      {
        name: "Services Offered",
        example: "manicure, pedicure, gel, acrylics",
        important: true,
      },
      { name: "Session Duration", example: "45 minutes", important: true },
      {
        name: "Location",
        example: "home service or in-salon",
        important: true,
      },
      { name: "Nail Art", example: "available" },
      { name: "Hygiene", example: "sterilized tools, single-use files" },
    ],
  },
  {
    group: "Barbing & Hair Styling",
    items: [
      {
        name: "Services Offered",
        example: "haircuts, shaves, braiding, weaving",
        important: true,
      },
      {
        name: "Location",
        example: "home service or in-shop",
        important: true,
      },
      { name: "Session Duration", example: "30–45 minutes" },
      { name: "Hygiene", example: "sterilized clippers, single-use blades" },
      { name: "Group Bookings", example: "available for events/parties" },
    ],
  },
  {
    group: "Construction & Contracting",
    items: [
      {
        name: "Project Types",
        example: "residential, commercial, renovation",
        important: true,
      },
      { name: "Team Size", example: "10–20 workers" },
      {
        name: "Materials Sourcing",
        example: "we source or client provides",
        important: true,
      },
      {
        name: "Timeline",
        example: "varies by project — quote provided",
        important: true,
      },
      { name: "Site Visit", example: "free site assessment" },
      { name: "Licensed & Insured", example: "yes" },
      { name: "Payment Terms", example: "milestone-based" },
    ],
  },
  {
    group: "Architecture & Engineering",
    items: [
      {
        name: "Services Offered",
        example: "architectural design, structural engineering, drawings",
        important: true,
      },
      { name: "Software Used", example: "AutoCAD, Revit" },
      {
        name: "Project Types",
        example: "residential, commercial",
        important: true,
      },
      { name: "Site Visit", example: "included" },
      {
        name: "Approval Support",
        example: "assist with building plan approval",
      },
      {
        name: "Timeline",
        example: "2–4 weeks for drawings",
        important: true,
      },
    ],
  },
  {
    group: "Plumbing Services",
    items: [
      {
        name: "Services Offered",
        example: "pipe fitting, leak repair, borehole plumbing",
        important: true,
      },
      {
        name: "Emergency Callout",
        example: "available 24/7",
        important: true,
      },
      { name: "Materials", example: "client provides or we source" },
      { name: "Diagnosis Fee", example: "free quote visit" },
      {
        name: "Warranty",
        example: "30 days on work",
        important: true,
      },
    ],
  },
  {
    group: "Electrical Services",
    items: [
      {
        name: "Services Offered",
        example: "wiring, installation, fault fixing",
        important: true,
      },
      {
        name: "Certifications",
        example: "licensed electrician",
        important: true,
      },
      {
        name: "Emergency Callout",
        example: "available",
        important: true,
      },
      { name: "Materials", example: "we source cables & fittings" },
      { name: "Warranty", example: "90 days on installation" },
    ],
  },
  {
    group: "Painting & Decorating",
    items: [
      {
        name: "Services Offered",
        example: "interior, exterior, wallpaper",
        important: true,
      },
      { name: "Paint Brands Used", example: "Dulux, Sandtex" },
      {
        name: "Coverage Area",
        example: "per room / whole building",
        important: true,
      },
      { name: "Materials Included", example: "paint & tools included" },
      {
        name: "Timeline",
        example: "2–5 days depending on size",
        important: true,
      },
    ],
  },
  {
    group: "Interior Design",
    items: [
      {
        name: "Services Offered",
        example: "space planning, furnishing, styling",
        important: true,
      },
      {
        name: "Design Style",
        example: "modern, minimalist, luxury",
        important: true,
      },
      {
        name: "Budget Tiers",
        example: "available for different budgets",
        important: true,
      },
      { name: "3D Renderings", example: "included" },
      { name: "Timeline", example: "2–6 weeks" },
    ],
  },
  {
    group: "Solar Installation",
    items: [
      {
        name: "Services Offered",
        example: "system design, installation, maintenance",
        important: true,
      },
      {
        name: "System Sizes Handled",
        example: "1kVA – 20kVA+",
        important: true,
      },
      { name: "Brands Installed", example: "e.g. Blue Camel, Felicity" },
      { name: "Free Site Survey", example: "available" },
      {
        name: "Installation Warranty",
        example: "1–2 years",
        important: true,
      },
    ],
  },
  {
    group: "Cleaning Services",
    items: [
      {
        name: "Cleaning Types",
        example: "post-construction, deep clean, regular",
        important: true,
      },
      { name: "Team Size", example: "2–5 cleaners" },
      {
        name: "Equipment",
        example: "we bring everything",
        important: true,
      },
      {
        name: "Frequency",
        example: "one-time, weekly or monthly",
        important: true,
      },
      {
        name: "Eco-Friendly Products",
        example: "available on request",
      },
    ],
  },
  {
    group: "Laundry & Dry Cleaning",
    items: [
      {
        name: "Services Offered",
        example: "wash & fold, dry cleaning, ironing",
        important: true,
      },
      {
        name: "Turnaround Time",
        example: "24–48 hours",
        important: true,
      },
      {
        name: "Pickup & Delivery",
        example: "available",
        important: true,
      },
      {
        name: "Special Fabric Care",
        example: "available for delicate items",
      },
      { name: "Pricing", example: "per item or per kg" },
    ],
  },
  {
    group: "Pest Control & Fumigation",
    items: [
      {
        name: "Pest Types Treated",
        example: "rodents, termites, bedbugs, mosquitoes",
        important: true,
      },
      {
        name: "Chemicals Used",
        example: "child/pet-safe options available",
        important: true,
      },
      { name: "Free Inspection", example: "yes" },
      {
        name: "Warranty",
        example: "30–90 days pest-free guarantee",
        important: true,
      },
      { name: "Follow-up Visits", example: "included" },
    ],
  },
  {
    group: "Gardening & Landscaping",
    items: [
      {
        name: "Services Offered",
        example: "lawn care, landscaping design, tree trimming",
        important: true,
      },
      { name: "Team Size", example: "2–4 gardeners" },
      {
        name: "Frequency",
        example: "one-time or scheduled maintenance",
        important: true,
      },
      {
        name: "Equipment",
        example: "we bring everything",
        important: true,
      },
      { name: "Materials", example: "plants/turf sourced on request" },
    ],
  },
  {
    group: "Security Services",
    items: [
      {
        name: "Services Offered",
        example: "guards, CCTV installation, access control",
        important: true,
      },
      {
        name: "Staffing",
        example: "armed/unarmed guards available",
        important: true,
      },
      {
        name: "Coverage",
        example: "24/7 or specific hours",
        important: true,
      },
      {
        name: "Response Time",
        example: "for alarm/CCTV monitoring",
      },
      { name: "Licensed & Vetted", example: "staff background-checked" },
    ],
  },
  {
    group: "Catering Services",
    items: [
      { name: "Capacity", example: "up to 200 guests", important: true },
      {
        name: "Menu Options",
        example: "Nigerian & continental",
        important: true,
      },
      { name: "Tasting Session", example: "available before booking" },
      { name: "Staff Included", example: "servers and setup crew" },
      { name: "Advance Notice", example: "2 weeks minimum" },
      {
        name: "Dietary Options",
        example: "vegetarian, halal available",
        important: true,
      },
    ],
  },
  {
    group: "Event Planning",
    items: [
      {
        name: "Event Types",
        example: "weddings, corporate, birthdays",
        important: true,
      },
      {
        name: "Services Offered",
        example: "full planning, day-of coordination",
        important: true,
      },
      {
        name: "Vendor Network",
        example: "caterers, decorators, MCs included",
      },
      {
        name: "Budget Tiers",
        example: "available for different budgets",
        important: true,
      },
      { name: "Advance Notice", example: "1–3 months minimum" },
    ],
  },
  {
    group: "Ushering Services",
    items: [
      {
        name: "Team Size",
        example: "e.g. team of 6",
        important: true,
      },
      {
        name: "Uniform/Attire",
        example: "provided",
        important: true,
      },
      {
        name: "Event Types",
        example: "weddings, corporate, church events",
        important: true,
      },
      { name: "Advance Notice", example: "1 week minimum" },
      {
        name: "Additional Roles",
        example: "gift reception, guest coordination",
      },
    ],
  },
  {
    group: "Courier & Delivery",
    items: [
      { name: "Delivery Areas", example: "Lagos & Ogun", important: true },
      {
        name: "Same-Day Delivery",
        example: "orders before 2pm",
        important: true,
      },
      {
        name: "Package Limits",
        example: "up to 50kg",
        important: true,
      },
      { name: "Tracking", example: "WhatsApp updates" },
      { name: "Vehicle Type", example: "bike / van" },
    ],
  },
  {
    group: "Ride-hailing & Car Hire",
    items: [
      {
        name: "Vehicle Types",
        example: "sedan, SUV, bus",
        important: true,
      },
      {
        name: "Hire Duration",
        example: "hourly, daily, event-based",
        important: true,
      },
      { name: "Driver Included", example: "yes" },
      {
        name: "Coverage Area",
        example: "within state or interstate",
        important: true,
      },
      { name: "Fuel Policy", example: "included or extra" },
    ],
  },
  {
    group: "Haulage & Trucking",
    items: [
      {
        name: "Vehicle Types",
        example: "flatbed, container truck, tanker",
        important: true,
      },
      {
        name: "Load Capacity",
        example: "up to 30 tons",
        important: true,
      },
      {
        name: "Coverage Area",
        example: "interstate routes",
        important: true,
      },
      { name: "Loading/Offloading", example: "labor included" },
      { name: "Tracking", example: "available" },
    ],
  },
  {
    group: "Moving & Relocation",
    items: [
      {
        name: "Services Offered",
        example: "packing, loading, transport, unpacking",
        important: true,
      },
      { name: "Team Size", example: "3–6 movers", important: true },
      {
        name: "Coverage Area",
        example: "local or interstate",
        important: true,
      },
      { name: "Packing Materials", example: "included" },
      { name: "Insurance", example: "available for valuables" },
    ],
  },
  {
    group: "Freight Forwarding & Clearing",
    items: [
      {
        name: "Services Offered",
        example: "customs clearing, air/sea freight, documentation",
        important: true,
      },
      {
        name: "Shipping Routes",
        example: "China, UK, US",
        important: true,
      },
      {
        name: "Clearing Time",
        example: "varies by port/cargo type",
        important: true,
      },
      { name: "Licensed Agent", example: "yes" },
      { name: "Tracking", example: "available" },
    ],
  },
  {
    group: "Auto Repair & Mechanic",
    items: [
      {
        name: "Vehicle Types",
        example: "cars & SUVs, trucks",
        important: true,
      },
      {
        name: "Services Offered",
        example: "engine repair, diagnostics, brake service",
        important: true,
      },
      { name: "Genuine Parts", example: "sourced on request" },
      { name: "Diagnostics", example: "computerized diagnostics" },
      { name: "Roadside Service", example: "available 24/7" },
      {
        name: "Warranty",
        example: "30 days on repairs",
        important: true,
      },
    ],
  },
  {
    group: "Car Wash & Detailing",
    items: [
      {
        name: "Services Offered",
        example: "exterior wash, interior detailing, waxing",
        important: true,
      },
      {
        name: "Vehicle Types",
        example: "cars, SUVs, buses",
        important: true,
      },
      { name: "Duration", example: "30–90 minutes" },
      {
        name: "Mobile Service",
        example: "we come to you",
        important: true,
      },
      { name: "Packages", example: "basic wash to full detailing" },
    ],
  },
  {
    group: "Tyre Services",
    items: [
      {
        name: "Services Offered",
        example: "tyre sales, vulcanizing, wheel alignment",
        important: true,
      },
      {
        name: "Tyre Brands Sold",
        example: "Dunlop, Michelin, generic",
        important: true,
      },
      { name: "Emergency Callout", example: "available" },
      { name: "Wheel Balancing", example: "available" },
      {
        name: "Warranty",
        example: "on new tyres, per manufacturer",
        important: true,
      },
    ],
  },
  {
    group: "Auto Parts Sales & Fitting",
    items: [
      {
        name: "Parts Sold",
        example: "engine parts, body parts, electricals",
        important: true,
      },
      {
        name: "Fitting Service",
        example: "available on-site",
        important: true,
      },
      {
        name: "Genuine vs Aftermarket",
        example: "both available",
        important: true,
      },
      {
        name: "Sourcing",
        example: "can order specific parts on request",
      },
    ],
  },
  {
    group: "Schools & Tutorial Centers",
    items: [
      {
        name: "Subjects/Levels",
        example: "primary, secondary, WAEC/JAMB prep",
        important: true,
      },
      {
        name: "Class Format",
        example: "one-on-one or small group",
        important: true,
      },
      { name: "Materials", example: "included" },
      {
        name: "Class Size",
        example: "max 10 students",
        important: true,
      },
      { name: "Progress Reports", example: "provided" },
    ],
  },
  {
    group: "Vocational & Skills Training",
    items: [
      {
        name: "Skills Taught",
        example: "tailoring, catering, hairdressing, etc.",
        important: true,
      },
      {
        name: "Course Duration",
        example: "8-week course",
        important: true,
      },
      {
        name: "Certificate",
        example: "issued on completion",
        important: true,
      },
      { name: "Materials", example: "included" },
      {
        name: "Practical Sessions",
        example: "hands-on training included",
      },
    ],
  },
  {
    group: "Online Courses & E-learning",
    items: [
      {
        name: "Course Topics",
        example: "coding, business, languages",
        important: true,
      },
      {
        name: "Format",
        example: "live classes or self-paced",
        important: true,
      },
      { name: "Platform Used", example: "Zoom, Google Classroom" },
      {
        name: "Certificate",
        example: "issued on completion",
        important: true,
      },
      { name: "Access Duration", example: "lifetime access or limited" },
    ],
  },
  {
    group: "Photography & Videography",
    items: [
      { name: "Deliverables", example: "50 edited photos", important: true },
      { name: "Coverage Hours", example: "6 hours", important: true },
      { name: "Crew", example: "photographer + assistant" },
      { name: "Raw Files", example: "available on request" },
      {
        name: "Delivery Time",
        example: "5 working days",
        important: true,
      },
    ],
  },
  {
    group: "Music & Audio Production",
    items: [
      {
        name: "Services Offered",
        example: "recording, mixing, mastering",
        important: true,
      },
      {
        name: "Studio Equipment",
        example: "professional-grade",
        important: true,
      },
      { name: "Session Rate", example: "per hour or per track" },
      { name: "Genres Covered", example: "Afrobeats, gospel, hip-hop" },
      {
        name: "Delivery Time",
        example: "3–7 days",
        important: true,
      },
    ],
  },
  {
    group: "Film & Video Production",
    items: [
      {
        name: "Services Offered",
        example: "commercials, documentaries, music videos",
        important: true,
      },
      { name: "Crew Size", example: "2–8 people", important: true },
      { name: "Equipment", example: "4K cameras, drones" },
      { name: "Editing Included", example: "yes" },
      {
        name: "Delivery Time",
        example: "1–3 weeks",
        important: true,
      },
    ],
  },
  {
    group: "Content Creation & Influencer Services",
    items: [
      {
        name: "Services Offered",
        example: "UGC content, brand campaigns, social media content",
        important: true,
      },
      {
        name: "Platforms",
        example: "Instagram, TikTok, YouTube",
        important: true,
      },
      { name: "Follower Reach", example: "audience size on request" },
      { name: "Content Types", example: "photos, reels, reviews" },
      {
        name: "Turnaround Time",
        example: "3–5 days",
        important: true,
      },
    ],
  },
  {
    group: "Health & Wellness",
    items: [
      {
        name: "Consultation",
        example: "free first consultation",
        important: true,
      },
      { name: "Home Visits", example: "available", important: true },
      { name: "Packages", example: "per session or monthly plan" },
    ],
  },
  {
    group: "Software & IT Development",
    items: [
      {
        name: "Project Type",
        example: "web app, mobile app, or custom system",
        important: true,
      },
      {
        name: "Tech Stack",
        example: "React, Node.js, Flutter",
        important: true,
      },
      { name: "Timeline", example: "6–8 weeks", important: true },
      {
        name: "Post-Launch Support",
        example: "3 months free maintenance",
      },
      {
        name: "Payment Milestones",
        example: "30% upfront, 40% midpoint, 30% on delivery",
      },
      { name: "NDA Available", example: "yes, on request" },
      { name: "Hosting & Deployment", example: "we handle server setup" },
    ],
  },
  {
    group: "Real Estate & Property",
    items: [
      {
        name: "Property Type",
        example: "duplex, flat, land, office space",
        important: true,
      },
      {
        name: "Transaction Type",
        example: "sale, rent, or lease",
        important: true,
      },
      {
        name: "Documentation",
        example: "C of O, governor's consent available",
        important: true,
      },
      {
        name: "Inspection",
        example: "physical inspection available on request",
      },
      { name: "Agency Fee", example: "10% of annual rent" },
      {
        name: "Management Services",
        example: "rent collection, maintenance, tenant vetting",
      },
    ],
  },
  {
    group: "Hospitality & Lodging",
    items: [
      {
        name: "Room Types",
        example: "standard, deluxe, suite",
        important: true,
      },
      {
        name: "Amenities",
        example: "Wi-Fi, AC, 24hr power/generator",
        important: true,
      },
      {
        name: "Check-in / Check-out",
        example: "12pm check-in, 11am check-out",
      },
      { name: "Minimum Stay", example: "1 night minimum" },
      {
        name: "Cancellation Policy",
        example: "free cancellation 24hrs before",
        important: true,
      },
      { name: "Meals Included", example: "breakfast included" },
    ],
  },
  {
    group: "Consulting & Advisory",
    items: [
      {
        name: "Specialization",
        example: "business strategy, finance, operations",
        important: true,
      },
      {
        name: "Engagement Type",
        example: "one-off session or retainer",
        important: true,
      },
      { name: "Session Format", example: "in-person, video call, or on-site" },
      { name: "Industry Focus", example: "retail, fintech, agriculture" },
      {
        name: "Deliverables",
        example: "written report and action plan",
        important: true,
      },
    ],
  },
  {
    group: "Accounting & Financial Services",
    items: [
      {
        name: "Services Offered",
        example: "bookkeeping, tax filing, payroll",
        important: true,
      },
      {
        name: "Business Size Served",
        example: "SMEs and startups",
        important: true,
      },
      { name: "Software Used", example: "QuickBooks, Sage, Excel" },
      {
        name: "Filing Frequency",
        example: "monthly, quarterly, annually",
        important: true,
      },
      { name: "Audit Support", example: "available on request" },
    ],
  },
  {
    group: "Legal Services",
    items: [
      {
        name: "Practice Areas",
        example: "corporate law, property, family law",
        important: true,
      },
      {
        name: "Consultation Fee",
        example: "₦15,000 per session",
        important: true,
      },
      { name: "Court Representation", example: "available" },
      { name: "Document Preparation", example: "contracts, agreements, wills" },
      {
        name: "Bar Certification",
        example: "called to the Nigerian Bar, 2015",
        important: true,
      },
    ],
  },
  {
    group: "Marketing & Advertising",
    items: [
      {
        name: "Services Offered",
        example: "social media management, SEO, ad campaigns",
        important: true,
      },
      {
        name: "Platforms Covered",
        example: "Instagram, Facebook, Google Ads",
        important: true,
      },
      {
        name: "Contract Length",
        example: "monthly retainer or per-campaign",
        important: true,
      },
      { name: "Reporting", example: "monthly performance report" },
      { name: "Ad Spend Management", example: "we manage your ad budget" },
    ],
  },
  {
    group: "Design & Branding",
    items: [
      {
        name: "Services Offered",
        example: "logo design, brand identity, packaging",
        important: true,
      },
      {
        name: "Revisions Included",
        example: "3 rounds of revisions",
        important: true,
      },
      { name: "File Formats", example: "AI, PSD, PNG, PDF" },
      {
        name: "Turnaround Time",
        example: "5–7 working days",
        important: true,
      },
      { name: "Brand Guidelines", example: "full brand book included" },
    ],
  },
  {
    group: "Printing & Publishing",
    items: [
      {
        name: "Print Services",
        example: "flyers, banners, business cards, book printing",
        important: true,
      },
      {
        name: "Materials",
        example: "matte, glossy, cardstock",
        important: true,
      },
      { name: "Minimum Order", example: "50 units" },
      {
        name: "Turnaround Time",
        example: "2–3 working days",
        important: true,
      },
      { name: "Design Included", example: "we design or you provide artwork" },
    ],
  },
  {
    group: "Recruitment & HR",
    items: [
      {
        name: "Services Offered",
        example: "candidate sourcing, background checks, payroll setup",
        important: true,
      },
      {
        name: "Industries Served",
        example: "tech, hospitality, manufacturing",
        important: true,
      },
      { name: "Placement Fee", example: "10% of annual salary" },
      {
        name: "Guarantee Period",
        example: "replacement guarantee within 90 days",
      },
      {
        name: "Roles Covered",
        example: "entry-level to executive",
        important: true,
      },
    ],
  },
  {
    group: "Translation & Interpretation",
    items: [
      {
        name: "Languages",
        example: "English, French, Hausa, Yoruba, Igbo",
        important: true,
      },
      {
        name: "Service Type",
        example: "document translation or live interpretation",
        important: true,
      },
      {
        name: "Certified Translation",
        example: "available for official documents",
      },
      {
        name: "Turnaround Time",
        example: "24–48 hours",
        important: true,
      },
      { name: "Rate", example: "per word or per hour" },
    ],
  },
  {
    group: "Virtual Assistance & Admin",
    items: [
      {
        name: "Services Offered",
        example: "email management, scheduling, data entry",
        important: true,
      },
      {
        name: "Availability",
        example: "part-time or full-time",
        important: true,
      },
      { name: "Time Zone Coverage", example: "WAT business hours" },
      {
        name: "Tools Used",
        example: "Google Workspace, Trello, Slack",
        important: true,
      },
      { name: "Confidentiality", example: "NDA signed on request" },
    ],
  },
  {
    group: "Childcare & Daycare",
    items: [
      {
        name: "Age Groups Accepted",
        example: "6 months – 5 years",
        important: true,
      },
      {
        name: "Operating Hours",
        example: "Mon–Fri, 7am–6pm",
        important: true,
      },
      { name: "Staff-to-Child Ratio", example: "1:5" },
      { name: "Meals Provided", example: "breakfast and lunch included" },
      { name: "Curriculum", example: "early learning activities included" },
      {
        name: "Safety",
        example: "CCTV monitored, first-aid trained staff",
        important: true,
      },
    ],
  },
  {
    group: "Domestic Staffing",
    items: [
      {
        name: "Role Type",
        example: "nanny, cook, cleaner, driver",
        important: true,
      },
      {
        name: "Live-in or Live-out",
        example: "live-in available",
        important: true,
      },
      { name: "Experience", example: "5+ years verified experience" },
      {
        name: "Background Check",
        example: "guarantor and ID verified",
        important: true,
      },
      { name: "Languages Spoken", example: "English, Pidgin" },
      { name: "Trial Period", example: "2-week trial available" },
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

// ── Food — dish/menu-item details, grouped by sector like services above ────
// `isFood` listings (see AddProductPage.tsx) previously fell through to
// GENERAL_PRODUCT_PRESETS below — Brand, Material, Weight, Warranty, Country
// of Origin — none of which mean anything for a plate of jollof rice or a
// birthday cake. This mirrors SERVICE_DETAIL_PRESETS' own shape (sector-
// configured groups, General always last) instead, so a dish gets dish-
// shaped questions.

export const FOOD_DETAIL_PRESETS: AttributePresetGroup[] = [
  {
    group: "General",
    items: [
      {
        name: "Portion Size",
        example: "serves 1, serves 2–3",
        important: true,
      },
      {
        name: "Dietary Info",
        example: "vegetarian, halal, no pork",
        important: true,
      },
      { name: "Spice Level", example: "mild, medium, hot" },
      { name: "Key Ingredients", example: "rice, chicken, pepper sauce" },
      { name: "Packaging", example: "takeaway pack included" },
      { name: "Shelf Life", example: "best eaten same day" },
      { name: "Prep Time", example: "ready in 20 minutes" },
    ],
  },
  {
    group: "Restaurant Dishes",
    items: [
      {
        name: "Spice Level",
        example: "mild, medium, hot",
        important: true,
      },
      {
        name: "Portion Size",
        example: "regular, large, family size",
        important: true,
      },
      { name: "Dietary Info", example: "vegetarian, halal, no pork" },
      { name: "Key Ingredients", example: "rice, chicken, pepper sauce" },
      { name: "Add-ons Available", example: "extra protein, sides" },
      { name: "Prep Time", example: "ready in 15–20 minutes" },
    ],
  },
  {
    group: "Bakery Items",
    items: [
      {
        name: "Flavor",
        example: "red velvet, chocolate, vanilla",
        important: true,
      },
      {
        name: "Size/Weight",
        example: "serves 10, 1kg",
        important: true,
      },
      {
        name: "Dietary Info",
        example: "eggless, vegan, gluten-free options",
        important: true,
      },
      { name: "Shelf Life", example: "best eaten within 3 days" },
      { name: "Custom Orders", example: "custom designs available" },
      { name: "Advance Notice", example: "24–48 hours for custom cakes" },
    ],
  },
  {
    group: "Drinks & Nightlife",
    items: [
      {
        name: "Drink Type",
        example: "cocktails, beer, spirits, mocktails",
        important: true,
      },
      {
        name: "Alcohol Content",
        example: "e.g. 5% ABV, non-alcoholic",
        important: true,
      },
      { name: "Volume/Size", example: "e.g. 33cl, 75cl", important: true },
      { name: "Serving Style", example: "bottle, glass, jug" },
      { name: "Mixers Included", example: "yes" },
    ],
  },
  {
    group: "Street Food",
    items: [
      {
        name: "Spice Level",
        example: "mild, medium, hot",
        important: true,
      },
      {
        name: "Portion Size",
        example: "regular, large",
        important: true,
      },
      { name: "Packaging", example: "wrapped, takeaway pack" },
      { name: "Dietary Info", example: "vegetarian available" },
      { name: "Key Ingredients", example: "suya spice, groundnut" },
    ],
  },
  {
    group: "Confectionery & Snacks",
    items: [
      {
        name: "Pack Size",
        example: "e.g. 10 pieces, 500g",
        important: true,
      },
      {
        name: "Flavor",
        example: "e.g. chocolate, coconut",
        important: true,
      },
      { name: "Shelf Life", example: "best before 2 weeks", important: true },
      { name: "Dietary Info", example: "nut-free, halal" },
      { name: "Packaging", example: "individually wrapped" },
    ],
  },
];

/** Sector-tailored food/dish presets — same shape and lookup rule as
 * getServiceDetailPresets: the sector's configured groups with General
 * always last, full list when unconfigured. A "food_both" sector (e.g.
 * catering) can list a food group here alongside a service group in the same
 * `presetGroups` array — this only ever resolves names that exist in
 * FOOD_DETAIL_PRESETS, getServiceDetailPresets only resolves names that
 * exist in SERVICE_DETAIL_PRESETS, so the two never collide. */
export function getFoodDetailPresets(
  sectorValue?: string,
): AttributePresetGroup[] {
  const configured = sectorValue
    ? SECTOR_BY_VALUE[sectorValue]?.listingConfig?.presetGroups
    : undefined;
  if (!configured) return FOOD_DETAIL_PRESETS;
  const byName = new Map(FOOD_DETAIL_PRESETS.map((g) => [g.group, g]));
  const general = byName.get("General")!;
  const specific = configured
    .map((name) => byName.get(name))
    .filter((g): g is AttributePresetGroup => Boolean(g) && g !== general);
  return [...specific, general];
}

// ── Products — keyed by retail category id, General always appended ──────────

export const GENERAL_PRODUCT_PRESETS: AttributePresetGroup = {
  group: "General",
  items: [
    { name: "Brand", example: "e.g. Samsung", important: true },
    { name: "Color", example: "e.g. Black", important: true },
    { name: "Material", example: "e.g. stainless steel" },
    { name: "Size", example: "e.g. Medium" },
    { name: "Weight", example: "e.g. 1.2kg" },
    {
      name: "Condition",
      example: "brand new / UK used",
      important: true,
    },
    { name: "Warranty", example: "e.g. 1 year" },
    { name: "Country of Origin", example: "e.g. Nigeria" },
  ],
};

export const PRODUCT_PRESETS_BY_CATEGORY: Record<string, AttributePresetGroup> =
  {
    electronics: {
      group: "Electronics",
      items: [
        { name: "Model", example: "e.g. Spark 10 Pro", important: true },
        { name: "Storage", example: "e.g. 128GB", important: true },
        { name: "RAM", example: "e.g. 8GB" },
        { name: "Screen Size", example: "e.g. 6.5 inches" },
        {
          name: "Battery",
          example: "e.g. 5000mAh",
          important: true,
        },
        { name: "Connectivity", example: "e.g. Wi-Fi, Bluetooth 5.0" },
        { name: "Power", example: "e.g. 220V" },
        { name: "What's in the Box", example: "e.g. charger, earphones" },
      ],
    },
    fashion: {
      group: "Fashion",
      items: [
        {
          name: "Sizes Available",
          example: "e.g. S, M, L, XL",
          important: true,
        },
        {
          name: "Fabric",
          example: "e.g. 100% cotton",
          important: true,
        },
        { name: "Gender", example: "men / women / unisex", important: true },
        { name: "Fit", example: "e.g. slim fit" },
        { name: "Occasion", example: "e.g. casual, formal" },
        { name: "Care", example: "e.g. hand wash only" },
        { name: "Length", example: "e.g. ankle length" },
      ],
    },
    accessories: {
      group: "Accessories",
      items: [
        {
          name: "Compatibility",
          example: "e.g. fits iPhone 13–15",
          important: true,
        },
        {
          name: "Dimensions",
          example: "e.g. 20cm × 12cm",
          important: true,
        },
        { name: "Strap Type", example: "e.g. adjustable leather" },
        { name: "Water Resistance", example: "e.g. splash-proof" },
      ],
    },
    "home-kitchen": {
      group: "Home & Kitchen",
      items: [
        {
          name: "Dimensions",
          example: "e.g. 60cm × 40cm",
          important: true,
        },
        { name: "Capacity", example: "e.g. 5 litres", important: true },
        { name: "Power", example: "e.g. 1500W", important: true },
        { name: "Pieces in Set", example: "e.g. 6 pieces" },
        { name: "Care Instructions", example: "e.g. dishwasher safe" },
      ],
    },
    sports: {
      group: "Sports",
      items: [
        { name: "Sport Type", example: "e.g. football", important: true },
        { name: "Sizes Available", example: "e.g. 40–45", important: true },
        {
          name: "Age Range",
          example: "e.g. adults",
          important: true,
        },
        { name: "Set Includes", example: "e.g. pump included" },
      ],
    },
    toys: {
      group: "Toys",
      items: [
        { name: "Age Range", example: "e.g. 3–7 years", important: true },
        { name: "Batteries", example: "e.g. 2× AA, included" },
        {
          name: "Pieces",
          example: "e.g. 120 pieces",
          important: true,
        },
        { name: "Safety", example: "e.g. non-toxic plastic", important: true },
      ],
    },
    health: {
      group: "Health",
      items: [
        { name: "Strength", example: "e.g. 500mg", important: true },
        { name: "Pack Size", example: "e.g. 30 tablets" },
        {
          name: "Form",
          example: "tablet / syrup / cream",
          important: true,
        },
        { name: "Age Suitability", example: "e.g. adults only" },
        { name: "Storage", example: "e.g. store below 25°C" },
        { name: "NAFDAC Number", example: "e.g. A4-1234", important: true },
      ],
    },
    books: {
      group: "Books",
      items: [
        { name: "Author", example: "e.g. Chimamanda Adichie", important: true },
        { name: "Format", example: "paperback / hardcover", important: true },
        { name: "Pages", example: "e.g. 320" },
        {
          name: "Language",
          example: "e.g. English",
          important: true,
        },
        { name: "Publisher", example: "e.g. Farafina" },
        { name: "ISBN", example: "e.g. 978-…" },
      ],
    },
    // Not a real vendor-selectable category (shoes still file under the
    // "Fashion" category) — only ever reached via a sector's
    // attributeCategoryId override, see shoes_footwear in sectors.ts.
    footwear: {
      group: "Footwear",
      items: [
        { name: "Brand", example: "e.g. Nike, Adidas, Puma", important: true },
        {
          name: "Shoe Size",
          example: "e.g. UK 8 / US 9 / EU 42",
          important: true,
        },
        { name: "Gender", example: "men's / women's / unisex" },
        {
          name: "Style",
          example: "sneakers, loafers, boots, sandals, heels",
          important: true,
        },
        { name: "Closure Type", example: "lace-up, slip-on, velcro, buckle" },
        { name: "Upper Material", example: "leather, canvas, mesh, suede" },
        { name: "Sole Material", example: "rubber, EVA" },
      ],
    },
    // Only ever reached via jewelry_watches' attributeCategoryId override —
    // the real vendor category is still "Accessories".
    jewelry: {
      group: "Jewelry & Watches",
      items: [
        {
          name: "Brand",
          example: "e.g. Rolex, Casio, handmade/generic",
          important: true,
        },
        {
          name: "Material",
          example: "gold, silver, stainless steel",
          important: true,
        },
        {
          name: "Gemstone",
          example: "diamond, cubic zirconia, none",
          important: true,
        },
        { name: "Watch Movement", example: "quartz, automatic, mechanical" },
        { name: "Water Resistance", example: "e.g. 50m, not water resistant" },
        { name: "Adjustable Size", example: "yes — resizable" },
      ],
    },
    // Only ever reached via bags_accessories' attributeCategoryId override —
    // the real vendor category is still "Accessories".
    bags: {
      group: "Bags",
      items: [
        {
          name: "Brand",
          example: "e.g. Louis Vuitton, generic",
          important: true,
        },
        {
          name: "Material",
          example: "leather, canvas, synthetic",
          important: true,
        },
        { name: "Strap Type", example: "adjustable, shoulder, hand-carry" },
        {
          name: "Dimensions",
          example: "e.g. 30cm × 20cm × 10cm",
          important: true,
        },
        { name: "Closure Type", example: "zip, magnetic snap, drawstring" },
        {
          name: "Water Resistance",
          example: "splash-proof, not water resistant",
        },
      ],
    },
    // Only ever reached via textile_fabric_sales' attributeCategoryId
    // override — the real vendor category is still "Fashion".
    textiles: {
      group: "Textiles & Fabric",
      items: [
        {
          name: "Fabric Type",
          example: "ankara, lace, aso-oke, chiffon, cotton",
          important: true,
        },
        { name: "Width", example: "e.g. 45 inches" },
        {
          name: "Pattern",
          example: "plain, printed, embroidered",
          important: true,
        },
        {
          name: "Unit Sold",
          example: "per yard / per full piece",
          important: true,
        },
        { name: "Care Instructions", example: "e.g. hand wash only" },
      ],
    },
    // Only ever reached via an attributeCategoryId override (groceries,
    // provision stores, wholesale) — no dedicated backend category exists.
    groceries: {
      group: "Groceries & FMCG",
      items: [
        { name: "Pack Size", example: "e.g. 1kg, 50cl", important: true },
        { name: "Expiry Date", example: "e.g. Dec 2026", important: true },
        {
          name: "Unit Sold",
          example: "per piece, carton, or bag",
          important: true,
        },
        { name: "Storage", example: "store in a cool, dry place" },
        { name: "Dietary Info", example: "sugar-free, halal" },
      ],
    },
    "beauty-cosmetics": {
      group: "Beauty & Cosmetics",
      items: [
        {
          name: "Skin/Hair Type",
          example: "oily, dry, all skin types",
          important: true,
        },
        { name: "Volume/Size", example: "e.g. 50ml", important: true },
        {
          name: "Key Ingredients",
          example: "shea butter, vitamin C",
          important: true,
        },
        { name: "Scent", example: "floral, unscented" },
        { name: "Expiry Date", example: "e.g. 2027" },
      ],
    },
    "furniture-decor": {
      group: "Furniture & Home Decor",
      items: [
        {
          name: "Dimensions",
          example: "e.g. 200cm × 90cm × 80cm",
          important: true,
        },
        {
          name: "Material",
          example: "e.g. solid wood, upholstered fabric",
          important: true,
        },
        {
          name: "Assembly Required",
          example: "self-assembly, instructions included",
        },
        { name: "Set Includes", example: "e.g. 1 sofa + 2 chairs" },
        {
          name: "Style",
          example: "modern, rustic, minimalist",
          important: true,
        },
      ],
    },
    vehicles: {
      group: "Vehicles",
      items: [
        {
          name: "Make & Model",
          example: "e.g. Toyota Camry 2015",
          important: true,
        },
        { name: "Mileage", example: "e.g. 85,000 km", important: true },
        {
          name: "Fuel Type",
          example: "petrol, diesel, hybrid",
          important: true,
        },
        { name: "Transmission", example: "automatic, manual" },
        {
          name: "Registration Status",
          example: "papers available, Tokunbo/Nigerian used",
        },
      ],
    },
    "auto-parts": {
      group: "Auto Parts & Tyres",
      items: [
        {
          name: "Compatible Vehicles",
          example: "e.g. Toyota Corolla 2010–2015",
          important: true,
        },
        {
          name: "Part Condition",
          example: "new, foreign used (Tokunbo)",
          important: true,
        },
        {
          name: "Part Type",
          example: "e.g. brake pads, alternator",
          important: true,
        },
        { name: "Tyre Size", example: "e.g. 195/65R15" },
        { name: "Brand", example: "e.g. Michelin, Bosch" },
        { name: "Warranty", example: "e.g. 6 months" },
        { name: "Fitting Service", example: "available on purchase" },
      ],
    },
    "power-energy": {
      group: "Power & Energy Equipment",
      items: [
        {
          name: "Capacity/Wattage",
          example: "e.g. 3.5kVA",
          important: true,
        },
        {
          name: "Fuel Type",
          example: "petrol, diesel, solar",
          important: true,
        },
        { name: "Panel Wattage", example: "e.g. 300W per panel" },
        { name: "Battery Type", example: "lithium, lead-acid" },
        {
          name: "Installation Included",
          example: "yes, with 1-year warranty",
          important: true,
        },
      ],
    },
    gaming: {
      group: "Gaming",
      items: [
        {
          name: "Platform",
          example: "PS5, Xbox Series X, PC",
          important: true,
        },
        {
          name: "Condition",
          example: "brand new, fairly used",
          important: true,
        },
        {
          name: "Storage",
          example: "e.g. 1TB",
          important: true,
        },
        { name: "Included Accessories", example: "2 controllers, HDMI cable" },
        { name: "Region", example: "region-free, UK/US region" },
        { name: "Game Titles Included", example: "e.g. FIFA 25, GTA V" },
      ],
    },
    stationery: {
      group: "Stationery",
      items: [
        { name: "Pack/Set Size", example: "e.g. 12 pieces", important: true },
        {
          name: "Item Type",
          example: "e.g. exercise books, pens, files",
          important: true,
        },
        { name: "Paper Type", example: "A4, glossy, recycled" },
        { name: "Grade/Age Level", example: "primary, secondary, tertiary" },
        { name: "Brand", example: "e.g. Croxley, Bic" },
      ],
    },
    gifts: {
      group: "Gifts & Souvenirs",
      items: [
        {
          name: "Occasion",
          example: "wedding, birthday, corporate",
          important: true,
        },
        {
          name: "Personalization",
          example: "engraving/customization available",
          important: true,
        },
        {
          name: "Packaging",
          example: "gift-wrapped included",
          important: true,
        },
        { name: "Set Includes", example: "e.g. mug + card + box" },
        { name: "Delivery Timeline", example: "ready in 2-3 days" },
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
