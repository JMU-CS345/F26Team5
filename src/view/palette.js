// The one palette for all art. About 32 colors, named by material and shade.
// Dark to light inside a material: Dark, plain, Light. Stone and wood have four tones.
// Other files use PALETTE.name (a hex string) or paletteColor("name") (a p5 color).
// Do not hardcode RGB fills in view code. Add a color here instead.
const PALETTE = Object.freeze({
  void: "#0d0b14",
  ink: "#1a1626",

  stoneShadow: "#2e2a3d",
  stoneDark: "#484359",
  stoneMid: "#6c6781",
  stoneLight: "#9a97ab",

  woodDark: "#3b2418",
  wood: "#6b4226",
  woodLight: "#9c6b3a",
  woodHighlight: "#c8955a",

  goldDark: "#8a5a14",
  gold: "#d19a2a",
  goldLight: "#f0cf5a",

  fireDark: "#8f2a1d",
  fire: "#d9482b",
  fireLight: "#f2873a",

  waterDark: "#1f3f73",
  water: "#3a73c4",
  waterLight: "#7cc0ec",

  leafDark: "#1f4a2c",
  leaf: "#3f8a3f",
  leafLight: "#86c35a",

  violetDark: "#3a1f5c",
  violet: "#6a3fa0",
  violetLight: "#a97bd8",

  skin: "#e8b890",
  bone: "#e8e2d0",
  white: "#f6f2ea",
  ice: "#bfe8f0",
  blood: "#a8201f",
  panel: "#28243a",
  panelLight: "#3c3856"
});

// Returns a p5 color for a palette name. Needs a running sketch.
function paletteColor(name) {
  return color(PALETTE[name]);
}

// Returns [r, g, b] for a palette name. Works without a sketch, so specs can use it.
function paletteRgb(name) {
  const hex = PALETTE[name];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}
