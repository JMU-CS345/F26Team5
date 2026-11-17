// Turns an equipped weapon (or none) into the plain numbers combat uses. Missing stats fall
// back to MELEE_DEFAULTS and RANGED_DEFAULTS in items.js. No p5 drawing calls.

function pickStats(weapon, defaults) {
  const stats = {};
  for (const name of Object.keys(defaults)) {
    stats[name] = defaults[name];
    if (weapon && typeof weapon[name] === "number") {
      stats[name] = weapon[name];
    }
  }
  if (weapon && !(weapon.damage > 0)) {
    stats.damage = defaults.damage; // a weapon with no damage still has to do something
  }
  stats.element = null;
  stats.onHit = null;
  stats.onFire = null;
  if (weapon) {
    stats.element = weapon.element || null;
    stats.onHit = weapon.onHit || null;
    stats.onFire = weapon.onFire || null;
  }
  stats.weapon = weapon || null;
  return stats;
}

// Stats for the melee slot. No weapon means the starter dagger.
function getMeleeStats(weapon) {
  const stats = pickStats(weapon, MELEE_DEFAULTS);
  stats.swingFrames = Math.max(3, Math.round(stats.swingFrames));
  stats.arc = constrainNumber(stats.arc, 10, 360);
  return stats;
}

// Stats for the projectile slot. No weapon means the plain default shot.
function getRangedStats(weapon) {
  const stats = pickStats(weapon, RANGED_DEFAULTS);
  stats.fireRate = Math.max(1, Math.round(stats.fireRate));
  stats.projectileCount = Math.max(1, Math.round(stats.projectileCount));
  stats.pierce = Math.round(stats.pierce);
  return stats;
}

// p5's constrain() does not exist in the specs, so models use this.
function constrainNumber(value, low, high) {
  return Math.min(high, Math.max(low, value));
}
