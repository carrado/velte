// Canonical dish-category list for food accounts — ids must stay in sync
// with velte-backend's FOOD_CATEGORIES validation. ProductsPage keeps its own
// FOOD_MENU_SECTIONS variant (same ids, Category-shaped with bgColor) for the
// category strip; this is the plain {id,label,emoji} shape everything else
// needs.
export const NIGERIAN_FOOD_CATEGORIES = [
  { id: "rice", label: "Rice Dishes", emoji: "🍚" },
  { id: "soups", label: "Soups & Stews", emoji: "🍲" },
  { id: "swallow", label: "Swallows", emoji: "🫙" },
  { id: "grilled", label: "Grilled & BBQ", emoji: "🔥" },
  { id: "protein", label: "Proteins", emoji: "🍗" },
  { id: "snacks", label: "Snacks & Street", emoji: "🥘" },
  { id: "drinks", label: "Drinks", emoji: "🥤" },
  { id: "breakfast", label: "Breakfast", emoji: "🌅" },
  { id: "desserts", label: "Desserts & Sweets", emoji: "🍨" },
  { id: "party", label: "Party Packs", emoji: "🎉" },
];
