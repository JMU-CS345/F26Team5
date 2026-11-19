// Character appearance (#23). No p5 drawing calls, so Jasmine can test it without a canvas.
// Cosmetic only: nothing here changes the player's stats.
// Load this after player-models.js and before game.js and player.js.

// Order matters: it is the order of the rows on the customization screen.
const APPEARANCE_PARTS = Object.freeze(["skin", "eyes", "hair", "clothing"]);

// The choices for each part. color is RGB, or null for "no hair".
const APPEARANCE_OPTIONS = Object.freeze({
  skin: [
    { name: "Pale", color: [255, 228, 205] },
    { name: "Light", color: [241, 194, 153] },
    { name: "Tan", color: [205, 150, 105] },
    { name: "Brown", color: [150, 100, 65] },
    { name: "Dark", color: [96, 64, 44] }
  ],
  eyes: [
    { name: "Blue", color: [60, 120, 230] },
    { name: "Green", color: [50, 170, 80] },
    { name: "Brown", color: [110, 70, 35] },
    { name: "Red", color: [220, 40, 40] },
    { name: "Purple", color: [150, 80, 210] }
  ],
  hair: [
    { name: "Brown", color: [110, 70, 40] },
    { name: "Black", color: [35, 35, 40] },
    { name: "Blonde", color: [235, 205, 95] },
    { name: "Red", color: [190, 65, 30] },
    { name: "White", color: [235, 235, 240] },
    { name: "None", color: null }
  ],
  clothing: [
    { name: "Blue", color: [60, 90, 190] },
    { name: "Red", color: [180, 45, 45] },
    { name: "Green", color: [50, 130, 70] },
    { name: "Purple", color: [120, 60, 160] },
    { name: "Gray", color: [120, 120, 130] }
  ]
});

const DEFAULT_APPEARANCE = Object.freeze({
  skin: "Light",
  eyes: "Blue",
  hair: "Brown",
  clothing: "Blue"
});

// Names of the options for one part, in order.
function getAppearanceOptionNames(part) {
  return APPEARANCE_OPTIONS[part].map((option) => option.name);
}

function isValidAppearanceChoice(part, name) {
  return APPEARANCE_PARTS.includes(part) && getAppearanceOptionNames(part).includes(name);
}

// Returns a new, complete appearance. Missing or unknown choices fall back to the default,
// so a bad value can never reach the drawing code.
function makeAppearance(choices = {}) {
  const appearance = {};
  for (const part of APPEARANCE_PARTS) {
    const name = choices[part];
    appearance[part] = isValidAppearanceChoice(part, name) ? name : DEFAULT_APPEARANCE[part];
  }
  return appearance;
}

// Returns a new appearance with one part moved to the next (step 1) or previous (step -1)
// option. Wraps around at both ends. Unknown parts leave the appearance unchanged.
function cycleAppearance(appearance, part, step) {
  const result = makeAppearance(appearance);
  if (!APPEARANCE_PARTS.includes(part)) {
    return result;
  }
  const names = getAppearanceOptionNames(part);
  const index = names.indexOf(result[part]);
  result[part] = names[(index + step + names.length) % names.length];
  return result;
}

// RGB color of one part, or null (hair "None").
function getAppearanceColor(appearance, part) {
  const name = makeAppearance(appearance)[part];
  return APPEARANCE_OPTIONS[part].find((option) => option.name === name).color;
}
