import { SECTOR_CATEGORY_BY_LABEL } from "@/lib/sectors";
import {
  CpuIllustration,
  PartyPopperIllustration,
  ShirtIllustration,
  SparklesIllustration,
  StoreIllustration,
  UtensilsIllustration,
} from "@/components/icons";
import type { IconComponent } from "@/types/common";

export interface SectorHeroTheme {
  /** Tailwind `from-x via-y to-z` gradient stops for the generated hero. */
  gradient: string;
  /** Large, faint background illustration evoking the sector — one of the
   *  fixed-palette `*Illustration` components, not the duotone icon set
   *  (see [[custom_icon_system]]); StoreHero renders it at low opacity so
   *  its own orange/ink palette stays a subtle texture against whichever
   *  gradient the category below picked, rather than clashing with it. */
  icon: IconComponent;
}

const DEFAULT_THEME: SectorHeroTheme = {
  gradient: "from-orange-400 via-amber-300 to-orange-200",
  icon: StoreIllustration,
};

// One mood per sector CATEGORY (not leaf sector) — a vendor with no gallery
// photos still gets a hero that feels like it was designed for their kind of
// business, rather than a generic placeholder. Enugu pilot scope: only the
// categories currently in SECTOR_TAXONOMY have a theme.
const THEME_BY_CATEGORY: Record<string, SectorHeroTheme> = {
  electronics_technology: {
    gradient: "from-indigo-500 via-blue-400 to-violet-300",
    icon: CpuIllustration,
  },
  fashion_apparel: {
    gradient: "from-fuchsia-400 via-pink-300 to-rose-200",
    icon: ShirtIllustration,
  },
  beauty_personal_care: {
    gradient: "from-pink-400 via-fuchsia-300 to-purple-200",
    icon: SparklesIllustration,
  },
  event_services: {
    gradient: "from-violet-500 via-purple-400 to-fuchsia-300",
    icon: PartyPopperIllustration,
  },
  food_hospitality: {
    gradient: "from-amber-400 via-orange-300 to-rose-200",
    icon: UtensilsIllustration,
  },
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
