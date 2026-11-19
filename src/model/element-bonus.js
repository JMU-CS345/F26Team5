// Class-match bonus. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load this after player-stats.js in index.html.

const CLASS_MATCH_DAMAGE_MULT = 1.25; // damage multiplier when the element matches the class
const CLASS_MATCH_DURATION_MULT = 1.25; // status duration multiplier when it matches

// True only when an element is set and equals the player's class element.
function isClassMatch(element, mageClass) {
  if (!element) {
    return false;
  }
  return element === mageClass;
}

// Damage with the class bonus applied when the element matches. Mismatches are unchanged.
function classMatchDamage(damage, element, mageClass) {
  if (!isClassMatch(element, mageClass)) {
    return damage;
  }
  return damage * CLASS_MATCH_DAMAGE_MULT;
}
