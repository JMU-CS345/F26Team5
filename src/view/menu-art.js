// Colours for the playermodel and class screens. This file draws nothing, so Jasmine can load it.

const CLASS_COLORS = {
  Fire: [230, 90, 40],
  Ice: [90, 180, 240],
  Mind: [170, 110, 230]
};
const MENU_ACCENT = [100, 112, 148]; // a neutral slate for the arrows, cards and title on the playermodel screen: no class yet
const MENU_CARD_BASE = Object.freeze([16, 16, 32]); // the dark a card is before it takes on the accent colour
const MENU_TINT_WHITE = Object.freeze([255, 255, 255]);
const MENU_TINT_STRENGTH = 0.5; // how far from white towards the class colour the backdrop goes
const MENU_TINT_EASE = 0.12; // the share of the way to the target colour the backdrop moves each frame

// A colour part of the way from one colour to another: amount 0 is `from`, 1 is `to`.
function blendToward(from, to, amount) {
  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount));
}

// The colour the translucent backdrop is heading for: white on the playermodel screen (no class
// highlighted), and a light wash of the highlighted class's colour on the class screen.
function getMenuTintTarget(highlightedClass) {
  const color = CLASS_COLORS[highlightedClass];
  return color === undefined ? MENU_TINT_WHITE.slice() : blendToward(MENU_TINT_WHITE, color, MENU_TINT_STRENGTH);
}

// The backdrop's colour one frame later: moves from `current` toward `target` by `ease` of the way,
// so a change of class fades in rather than jumping. Close enough snaps to the target.
function stepMenuTint(current, target, ease = MENU_TINT_EASE) {
  return current.map((channel, i) => {
    const next = channel + (target[i] - channel) * ease;
    return Math.abs(target[i] - next) < 0.5 ? target[i] : next;
  });
}

// The colour the arrows, cards, dots and motes are heading for: slate on the playermodel screen
// (no class highlighted) and the highlighted class's own colour on the class screen.
function getMenuAccentTarget(highlightedClass) {
  const color = CLASS_COLORS[highlightedClass];
  return color === undefined ? MENU_ACCENT.slice() : color.slice();
}

// The fill of a card: dark, with some of the accent colour mixed in so the cards change colour with
// the class. A selected card takes more of it.
function getCardFill(accent, selected) {
  return blendToward(MENU_CARD_BASE.slice(), accent, selected ? 0.3 : 0.16);
}
