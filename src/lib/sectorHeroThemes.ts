import {
  Utensils,
  ShoppingBag,
  Shirt,
  Cpu,
  Sparkles,
  HeartPulse,
  Sofa,
  HardHat,
  Car,
  Wrench,
  Briefcase,
  GraduationCap,
  Wheat,
  Truck,
  Landmark,
  Palette,
  Factory,
  Home,
  Users,
  Store as StoreIcon,
  type LucideIcon,
} from "lucide-react";
import { SECTOR_CATEGORY_BY_LABEL } from "@/lib/sectors";

export interface SectorHeroTheme {
  /** Tailwind `from-x via-y to-z` gradient stops for the generated hero. */
  gradient: string;
  /** Large, faint background icon evoking the sector. */
  icon: LucideIcon;
}

const DEFAULT_THEME: SectorHeroTheme = {
  gradient: "from-orange-400 via-amber-300 to-orange-200",
  icon: StoreIcon,
};

// One mood per sector CATEGORY (not leaf sector) — a vendor with no gallery
// photos still gets a hero that feels like it was designed for their kind of
// business, rather than a generic placeholder.
const THEME_BY_CATEGORY: Record<string, SectorHeroTheme> = {
  food_hospitality: {
    gradient: "from-amber-400 via-orange-300 to-rose-200",
    icon: Utensils,
  },
  retail_trade: {
    gradient: "from-sky-400 via-cyan-300 to-blue-200",
    icon: ShoppingBag,
  },
  fashion_apparel: {
    gradient: "from-fuchsia-400 via-pink-300 to-rose-200",
    icon: Shirt,
  },
  electronics_technology: {
    gradient: "from-indigo-500 via-blue-400 to-violet-300",
    icon: Cpu,
  },
  beauty_personal_care: {
    gradient: "from-pink-400 via-fuchsia-300 to-purple-200",
    icon: Sparkles,
  },
  health_wellness: {
    gradient: "from-emerald-400 via-teal-300 to-cyan-200",
    icon: HeartPulse,
  },
  home_living: {
    gradient: "from-amber-400 via-yellow-300 to-orange-200",
    icon: Sofa,
  },
  building_construction: {
    gradient: "from-slate-500 via-stone-400 to-orange-200",
    icon: HardHat,
  },
  automotive: {
    gradient: "from-slate-600 via-slate-400 to-sky-300",
    icon: Car,
  },
  repairs_technical: {
    gradient: "from-zinc-500 via-orange-300 to-amber-200",
    icon: Wrench,
  },
  professional_business_services: {
    gradient: "from-slate-600 via-blue-400 to-sky-300",
    icon: Briefcase,
  },
  education_training: {
    gradient: "from-blue-500 via-indigo-400 to-violet-300",
    icon: GraduationCap,
  },
  agriculture_agroprocessing: {
    gradient: "from-lime-400 via-green-300 to-yellow-200",
    icon: Wheat,
  },
  transportation_logistics: {
    gradient: "from-cyan-500 via-sky-400 to-blue-300",
    icon: Truck,
  },
  finance_insurance: {
    gradient: "from-emerald-500 via-green-400 to-teal-300",
    icon: Landmark,
  },
  arts_media_entertainment: {
    gradient: "from-purple-500 via-fuchsia-400 to-pink-300",
    icon: Palette,
  },
  manufacturing_industrial: {
    gradient: "from-gray-600 via-slate-400 to-zinc-300",
    icon: Factory,
  },
  home_services_domestic: {
    gradient: "from-teal-400 via-cyan-300 to-sky-200",
    icon: Home,
  },
  religious_community_nonprofit: {
    gradient: "from-violet-500 via-indigo-400 to-purple-300",
    icon: Users,
  },
  other_miscellaneous: DEFAULT_THEME,
};

/** Resolves a store's hero theme from its sector labels — first match wins. */
export function getStoreHeroTheme(sectors: string[]): SectorHeroTheme {
  for (const label of sectors) {
    const categoryId = SECTOR_CATEGORY_BY_LABEL[label];
    if (categoryId && THEME_BY_CATEGORY[categoryId]) {
      return THEME_BY_CATEGORY[categoryId];
    }
  }
  return DEFAULT_THEME;
}
