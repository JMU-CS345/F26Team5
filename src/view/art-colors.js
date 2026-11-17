// Palette hex values for code that draws shapes (rarity frames, effects).
// This mirrors src/view/palette.js. Keep the values the same, and drop this file once
// palette.js is merged and the view code can use PALETTE directly.
const ART_COLORS = Object.freeze({
  ink: "#1a1626",
  stoneLight: "#9a97ab",
  goldDark: "#8a5a14",
  gold: "#d19a2a",
  goldLight: "#f0cf5a",
  fireDark: "#8f2a1d",
  fire: "#d9482b",
  fireLight: "#f2873a",
  waterDark: "#1f3f73",
  water: "#3a73c4",
  waterLight: "#7cc0ec",
  leaf: "#3f8a3f",
  leafLight: "#86c35a",
  violetDark: "#3a1f5c",
  violet: "#6a3fa0",
  violetLight: "#a97bd8",
  bone: "#e8e2d0",
  white: "#f6f2ea",
  ice: "#bfe8f0"
});

// Frame color per item rarity, matching the frames in assets/item/rarity-frames.png.
const RARITY_COLORS = Object.freeze({
  common: ART_COLORS.bone,
  uncommon: ART_COLORS.leafLight,
  rare: ART_COLORS.waterLight,
  epic: ART_COLORS.violetLight,
  legendary: ART_COLORS.goldLight
});
