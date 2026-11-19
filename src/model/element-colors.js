// Element colors. No p5 drawing calls, so Jasmine can test it without a canvas.
// The views read these to color shots and tint enemies.

const ELEMENT_COLORS = Object.freeze({
  Fire: [255, 120, 40],
  Ice: [120, 200, 255],
  Mind: [190, 120, 255]
});

// The plain yellow shot, used when there is no element.
const DEFAULT_SHOT_COLOR = Object.freeze([255, 220, 80]);

// Returns a fresh [r, g, b] for an element. A null or unknown element gets the default.
function elementColor(element) {
  if (!Object.hasOwn(ELEMENT_COLORS, element)) {
    return DEFAULT_SHOT_COLOR.slice();
  }
  return ELEMENT_COLORS[element].slice();
}
