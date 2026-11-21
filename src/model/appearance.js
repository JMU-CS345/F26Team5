// Character appearance (#23). No p5 drawing calls, so Jasmine can test it without a canvas.
// Cosmetic only: nothing here changes the player's stats.
// Load this after player-models.js and before game.js and player.js.

// Order matters: it is the order of the rows on the customization screen.
// "body" tints the playermodel's own sprite sheet. The other three are layers drawn on top.
const APPEARANCE_PARTS = Object.freeze(["body", "eyes", "shirt", "pants"]);

// The layer parts, bottom to top. Each one has a sheet in PLAYER_MODELS[model].layerSheets.
// Pants go under the shirt, and the eyes go on top of everything.
const APPEARANCE_LAYER_ORDER = Object.freeze(["pants", "shirt", "eyes"]);

// Every part is a hex color like "#f1c299". The color picker and the hex box both produce these.
const DEFAULT_APPEARANCE = Object.freeze({
  body: "#f1c299",
  eyes: "#3c78e6",
  shirt: "#3c5abe",
  pants: "#5a4632"
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

// [241, 194, 153] -> "#f1c299". Values are clamped to 0-255.
function rgbToHex(rgb) {
  return "#" + rgb.map((value) => {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    return clamped.toString(16).padStart(2, "0");
  }).join("");
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
