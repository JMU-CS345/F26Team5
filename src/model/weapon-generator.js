// Makes random weapons. Model code: no p5 drawing calls.
// Load after items.js, rng.js, rarity.js, weapon-bases.js, weapon-hooks.js and affixes.js.
//
// generateWeapon(rng, options) is deterministic: the same rng state and options always give
// the same weapon. It rolls, in this order: rarity, base, base stats, affixes. Base stat
// ranges bound the roll before affixes. Affixes then push stats past them on purpose (Swift
// lowers swingFrames, of Reach raises reach), so only a common weapon is always inside its
// base ranges.

// Gold value by rarity, in the order of RARITY_IDS.
const RARITY_VALUE = Object.freeze([10, 20, 50, 120, 300]);

// Rounds a rolled stat. Whole-number stats stay whole.
function finishStat(name, value) {
  if (WHOLE_NUMBER_STATS.includes(name)) {
    return Math.round(value);
  }
  if (name === "damage") {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value * 10) / 10;
}

// Rolls every stat of a base inside its [min, max]. Returns a plain stats object.
function rollBaseStats(base, rng) {
  const stats = {};
  const names = base.kind === "melee" ? MELEE_STAT_NAMES : RANGED_STAT_NAMES;
  for (const name of names) {
    const range = base.stats[name];
    if (WHOLE_NUMBER_STATS.includes(name)) {
      stats[name] = randInt(rng, range[0], range[1]);
    } else {
      stats[name] = range[0] + rng() * (range[1] - range[0]);
    }
  }
  stats.element = null;
  return stats;
}

// Rounds the stats and keeps them inside what the Weapon constructors accept.
function finishStats(stats, kind) {
  const names = kind === "melee" ? MELEE_STAT_NAMES : RANGED_STAT_NAMES;
  const done = {};
  for (const name of names) {
    done[name] = finishStat(name, stats[name]);
  }
  if (kind === "melee") {
    done.swingFrames = Math.max(1, done.swingFrames);
    done.arc = Math.min(360, done.arc);
  } else {
    done.fireRate = Math.max(1, done.fireRate);
    done.spread = Math.min(360, done.spread);
  }
  done.element = stats.element;
  return done;
}

// options (all optional):
//   depth       how deep the room is, 0 and up (default 0)
//   source      "chest", "elite" or "boss" (default "chest")
//   minRarity   raise the lowest rarity (the bad-luck guarantee)
//   rarity      use this rarity instead of rolling one
//   kind        "melee" or "ranged" to only pick bases of that kind
//   element     "Fire", "Ice" or "Mind": the weapon has it, and no elemental prefix is rolled
// Returns a MeleeWeapon or a ProjectileWeapon.
function generateWeapon(rng, options = {}) {
  const depth = options.depth === undefined ? 0 : options.depth;
  const source = options.source === undefined ? "chest" : options.source;
  const rarityId = options.rarity === undefined
    ? rollRarity(rng, { depth: depth, source: source, minRarity: options.minRarity })
    : options.rarity;
  const rarity = getRarity(rarityId);
  const bases = options.kind === undefined
    ? WEAPON_BASES
    : WEAPON_BASES.filter((b) => b.kind === options.kind);
  const base = pick(bases, rng);

  const stats = rollBaseStats(base, rng);
  if (options.element !== undefined && options.element !== null) {
    stats.element = options.element;
  }
  const affixes = rollAffixes(
    base.kind,
    rarity.affixCount,
    rng,
    stats.element !== null
  );
  const hooks = applyAffixes(stats, base.kind, affixes);
  const final = finishStats(stats, base.kind);

  const weaponOptions = {
    ...final,
    id: base.id + "-" + randInt(rng, 0, 999999),
    name: buildWeaponName(base.name, affixes),
    value: RARITY_VALUE[RARITY_IDS.indexOf(rarityId)] + affixes.length * 5,
    description: base.blurb,
    rarity: rarityId,
    affixes: affixes.map((a) => a.id),
    baseId: base.id
  };
  if (hooks.onHit) {
    weaponOptions.onHit = hooks.onHit;
  }
  if (hooks.onFire) {
    weaponOptions.onFire = hooks.onFire;
  }
  if (base.kind === "melee") {
    return new MeleeWeapon(weaponOptions);
  }
  return new ProjectileWeapon(weaponOptions);
}
