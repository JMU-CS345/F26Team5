// Player stats model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load this before player.js in index.html.

// Stat keys.
const STAT_KEYS = Object.freeze(["health", "speed", "resolve", "constitution", "intelligence"]);

// Which stat scales damage for each element.
const ELEMENT_STAT = Object.freeze({
  Fire: "resolve",
  Ice: "constitution",
  Mind: "intelligence"
});

// A damage stat of 1 means no bonus. Each extra point adds this fraction of base damage.
const DAMAGE_PER_STAT_POINT = 0.25;

// Starting values shared by every class.
const BASE_STATS = Object.freeze({
  health: 5,
  speed: 2, // pixels per frame at 60 fps
  resolve: 1,
  constitution: 1,
  intelligence: 1
});

// Each class changes a few stats from the base. Numbers are first-pass tuning.
const CLASS_STAT_BONUSES = Object.freeze({
  Fire: { resolve: 2 },
  Ice: { constitution: 2 },
  Mind: { intelligence: 2 }
});

// Returns a fresh stats object for a class (or the plain base when class is null).
function getStatsForClass(mageClass) {
  const stats = { ...BASE_STATS };
  const bonuses = CLASS_STAT_BONUSES[mageClass] || {};
  for (const key of Object.keys(bonuses)) {
    stats[key] += bonuses[key];
  }
  return stats;
}

// Damage for an attack of a given element, scaled by the matching stat.
// Unknown elements (or null) are not scaled.
function scaleDamage(baseDamage, element, stats) {
  const key = ELEMENT_STAT[element];
  if (!key) {
    return baseDamage;
  }
  return baseDamage * (1 + (stats[key] - 1) * DAMAGE_PER_STAT_POINT);
}