// Character appearance (#23). No p5 drawing calls, so Jasmine can test it without a canvas.
// Cosmetic only: nothing here changes the player's stats.
// Load this after player-models.js and before game.js and player.js.

// Order matters: it is the order of the rows on the customization screen.
// "body" tints the playermodel's own sprite sheet. The other three are layers drawn on top, in the
// order given by APPEARANCE_LAYER_ORDER in view/player-art.js.
const APPEARANCE_PARTS = Object.freeze(["body", "eyes", "shirt", "pants"]);

// Every part is a hex color like "#f0d0b0". The color picker and the hex box both produce these.
const DEFAULT_APPEARANCE = Object.freeze({
  body: "#f0d0b0",
  eyes: "#0078f8",
  shirt: "#0058f8",
  pants: "#503000"
});

// The colors each part can be, in the order A and D step through them on the customization screen:
// the 55 colors of the NES palette, in the order of the palette image. Every part uses the same list.
const NES_PALETTE = Object.freeze([
  "#000000", "#fcfcfc", "#f8f8f8", "#bcbcbc", "#7c7c7c", "#a4e4fc", "#3cbcfc", "#0078f8",
  "#0000fc", "#b8b8f8", "#6888fc", "#0058f8", "#0000bc", "#d8b8f8", "#9878f8", "#6844fc",
  "#4428bc", "#f8b8f8", "#f878f8", "#d800cc", "#940084", "#f8a4c0", "#f85898", "#e40058",
  "#a80020", "#f0d0b0", "#f87858", "#f83800", "#a81000", "#fce0a8", "#fca044", "#e45c10",
  "#881400", "#f8d878", "#f8b800", "#ac7c00", "#503000", "#d8f878", "#b8f818", "#00b800",
  "#007800", "#b8f8b8", "#58d854", "#00a800", "#006800", "#b8f8d8", "#58f898", "#00a844",
  "#005800", "#00fcfc", "#00e8d8", "#008888", "#004058", "#f8d8f8", "#787878"
]);
const APPEARANCE_PALETTES = Object.freeze({
  body: NES_PALETTE,
  eyes: NES_PALETTE,
  shirt: NES_PALETTE,
  pants: NES_PALETTE
});

// Turns "#F1C299", "f1c299", "#fc9" or " #fc9 " into "#f1c299". Returns null if it is not a
// real hex color, so a typo in the hex box can never reach the drawing code.
function normalizeHex(text) {
  if (typeof text !== "string") {
    return null;
  }
  let hex = text.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex.split("").map((digit) => digit + digit).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return "#" + hex.toLowerCase();
}

function isValidHex(text) {
  return normalizeHex(text) !== null;
}

// "#f1c299" -> [241, 194, 153]. Returns null for anything that is not a hex color.
function hexToRgb(text) {
  const hex = normalizeHex(text);
  if (hex === null) {
    return null;
  }
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

// Returns a new, complete appearance. Missing or invalid colors fall back to the default,
// and valid ones are cleaned up into "#rrggbb", so a bad value can never reach the drawing code.
function makeAppearance(choices = {}) {
  const appearance = {};
  for (const part of APPEARANCE_PARTS) {
    appearance[part] = normalizeHex(choices[part]) || DEFAULT_APPEARANCE[part];
  }
  return appearance;
}

// Returns a new appearance with one part set to a new color. An unknown part or an invalid
// color leaves the appearance unchanged.
function setAppearanceColor(appearance, part, hex) {
  const result = makeAppearance(appearance);
  const color = normalizeHex(hex);
  if (!APPEARANCE_PARTS.includes(part) || color === null) {
    return result;
  }
  result[part] = color;
  return result;
}

// RGB color of one part, as [r, g, b].
function getAppearanceColor(appearance, part) {
  return hexToRgb(makeAppearance(appearance)[part]);
}

// Where a part's current color is in its palette, or -1 if it is not one of the palette colors.
function getPaletteIndex(appearance, part) {
  const palette = APPEARANCE_PALETTES[part];
  return palette === undefined ? -1 : palette.indexOf(makeAppearance(appearance)[part]);
}

// Returns a new appearance with one part moved step places along its palette (1 for the next color,
// -1 for the previous), wrapping round at the ends. From a color that is not in the palette, 1 goes to
// the first color and -1 to the last. An unknown part leaves the appearance unchanged.
function cyclePaletteColor(appearance, part, step) {
  const palette = APPEARANCE_PALETTES[part];
  if (palette === undefined) {
    return makeAppearance(appearance);
  }
  const current = getPaletteIndex(appearance, part);
  const next = current === -1
    ? (step > 0 ? 0 : palette.length - 1)
    : (((current + step) % palette.length) + palette.length) % palette.length;
  return setAppearanceColor(appearance, part, palette[next]);
}

// What the color strip on the customization screen shows for a part: the 2 * radius + 1 colors
// around its current one, left to right, as { hex, offset, custom }. offset is how far each is from
// the current color (0 is the middle). The strip wraps round the palette. When the current color is
// not in the palette (a typed hex code) the middle one is that color, with custom true, and the
// palette carries on around it from the end on the left and the start on the right, which is
// where A and D would go from there.
function getPaletteWindow(appearance, part, radius) {
  const palette = APPEARANCE_PALETTES[part];
  const n = palette.length;
  const current = getPaletteIndex(appearance, part);
  const wrap = (i) => ((i % n) + n) % n;
  const items = [];
  for (let offset = -radius; offset <= radius; offset++) {
    if (current !== -1) {
      items.push({ hex: palette[wrap(current + offset)], offset, custom: false });
    } else if (offset === 0) {
      items.push({ hex: makeAppearance(appearance)[part], offset, custom: true });
    } else {
      items.push({ hex: palette[offset < 0 ? wrap(offset) : wrap(offset - 1)], offset, custom: false });
    }
  }
  return items;
}
