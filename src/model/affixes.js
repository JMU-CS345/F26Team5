// Prefix and suffix modifiers for generated weapons, and the name they build.
// Model code: no p5 drawing calls. Load after rarity.js, weapon-bases.js and weapon-hooks.js.
//
// A name reads "Blazing Spear of Reach": prefixes first, then the base, then the suffixes.
// A weapon has at most 2 prefixes and 2 suffixes, and at most one element.
//
// Each AFFIXES row:
//   id, kind ("prefix" or "suffix"), label (the word in the name; for a suffix the text after
//   "of ", so "Reach" reads "of Reach"), element (set by the elemental prefixes), and one
//   entry per weapon kind it works on: melee and/or ranged. An entry has
//     text    a short line for the weapon card
//     stats   function(stats) that changes the rolled numbers in place
//     onHit / onFire   optional function(ctx) returning effects (see weapon-hooks.js)

const MAX_PREFIXES = 2;
const MAX_SUFFIXES = 2;

// Helpers that keep the rows below short. They change the stats object in place.
function scaleStat(stats, name, factor) {
  stats[name] = stats[name] * factor;
}

function elementalPrefix(id, label, element) {
  const both = {
    text: element + " damage",
    stats: (s) => {
      s.element = element;
      scaleStat(s, "damage", 1.1);
    }
  };
  return { id: id, kind: "prefix", label: label, element: element, melee: both, ranged: both };
}

const AFFIXES = Object.freeze([
  {
    id: "swift", kind: "prefix", label: "Swift",
    melee: { text: "Swings 20% faster", stats: (s) => scaleStat(s, "swingFrames", 0.8) },
    ranged: { text: "Fires 20% faster", stats: (s) => scaleStat(s, "fireRate", 0.8) }
  },
  {
    id: "heavy", kind: "prefix", label: "Heavy",
    melee: {
      text: "+25% damage, more knockback, slower",
      stats: (s) => {
        scaleStat(s, "damage", 1.25);
        scaleStat(s, "knockback", 1.4);
        scaleStat(s, "swingFrames", 1.15);
      }
    },
    ranged: {
      text: "+25% damage, slower shots",
      stats: (s) => {
        scaleStat(s, "damage", 1.25);
        scaleStat(s, "fireRate", 1.15);
        scaleStat(s, "shotSpeed", 0.9);
      }
    }
  },
  {
    id: "keen", kind: "prefix", label: "Keen",
    melee: { text: "+20% damage", stats: (s) => scaleStat(s, "damage", 1.2) },
    ranged: { text: "+20% damage", stats: (s) => scaleStat(s, "damage", 1.2) }
  },
  elementalPrefix("blazing", "Blazing", "Fire"),
  elementalPrefix("frozen", "Frozen", "Ice"),
  elementalPrefix("psychic", "Psychic", "Mind"),
  {
    id: "vampiric", kind: "prefix", label: "Vampiric",
    melee: { text: "Every 3rd hit heals 1", stats: () => {}, onHit: vampiricHit },
    ranged: { text: "Every 3rd hit heals 1", stats: () => {}, onHit: vampiricHit }
  },
  {
    id: "reach", kind: "suffix", label: "Reach",
    melee: { text: "+30% reach", stats: (s) => scaleStat(s, "reach", 1.3) },
    ranged: { text: "+30% range", stats: (s) => scaleStat(s, "range", 1.3) }
  },
  {
    id: "volley", kind: "suffix", label: "the Volley",
    ranged: {
      text: "+1 projectile",
      stats: (s) => {
        s.projectileCount += 1;
        s.spread = Math.max(s.spread, 10);
      }
    }
  },
  {
    id: "piercing", kind: "suffix", label: "Piercing",
    melee: {
      text: "+15% reach, +10% damage",
      stats: (s) => {
        scaleStat(s, "reach", 1.15);
        scaleStat(s, "damage", 1.1);
      }
    },
    ranged: { text: "Shots pierce 2 more enemies", stats: (s) => { s.pierce += 2; } }
  },
  {
    id: "ricochet", kind: "suffix", label: "Ricochet",
    ranged: { text: "Hits bounce to a nearby enemy", stats: () => {}, onHit: ricochetHit }
  },
  {
    id: "splitting", kind: "suffix", label: "Splitting",
    melee: { text: "Hits split into 2 shards", stats: () => {}, onHit: splittingHit },
    ranged: { text: "Hits split into 2 shards", stats: () => {}, onHit: splittingHit }
  },
  {
    id: "echoes", kind: "suffix", label: "Echoes",
    melee: { text: "Hits echo for 50% damage", stats: () => {}, onHit: echoHit },
    ranged: { text: "Shots echo for 50% damage", stats: () => {}, onFire: echoShot }
  }
]);

const AFFIX_IDS = Object.freeze(AFFIXES.map((a) => a.id));

// Affix hooks. Each follows the ctx shape in weapon-hooks.js.

function vampiricHit(ctx) {
  if (everyNth(ctx.count, 3)) {
    return [healEffect(1)];
  }
  return [];
}

// A weaker shot from the hit enemy toward the nearest other enemy.
function ricochetHit(ctx) {
  if (!ctx.target) {
    return [];
  }
  const w = hookWeapon(ctx);
  const next = nearestEnemy(ctx, ctx.target.x, ctx.target.y, 140);
  if (next === null) {
    return [];
  }
  const angle = angleBetween(ctx.target.x, ctx.target.y, next.x, next.y);
  return [projectileEffect(ctx.target.x, ctx.target.y, angle, ctx.damage * 0.6, {
    speed: w.shotSpeed, range: 140, element: w.element
  })];
}

// Two shards leave the hit point at an angle to the original attack.
function splittingHit(ctx) {
  if (!ctx.target) {
    return [];
  }
  const w = hookWeapon(ctx);
  const options = { speed: w.shotSpeed, range: 90, element: w.element };
  return [
    projectileEffect(ctx.target.x, ctx.target.y, ctx.angle + 0.6, ctx.damage * 0.5, options),
    projectileEffect(ctx.target.x, ctx.target.y, ctx.angle - 0.6, ctx.damage * 0.5, options)
  ];
}

// Melee: a second, weaker blow lands on the target a moment later.
function echoHit(ctx) {
  if (!ctx.target) {
    return [];
  }
  return [areaEffect(ctx.target.x, ctx.target.y, 28, ctx.damage * 0.5, {
    element: hookWeapon(ctx).element, delayFrames: 15
  })];
}

// Ranged: the shot is fired again a moment later at half damage.
function echoShot(ctx) {
  const w = hookWeapon(ctx);
  return [projectileEffect(ctx.source.x, ctx.source.y, ctx.angle, ctx.damage * 0.5, {
    speed: w.shotSpeed, range: w.range, element: w.element, delayFrames: 12
  })];
}

function getAffix(id) {
  return AFFIXES.find((a) => a.id === id) || null;
}

// The affixes that work on a weapon kind ("melee" or "ranged").
function affixesFor(kind) {
  return AFFIXES.filter((a) => a[kind] !== undefined);
}

// Picks affixes for a weapon. count comes from the rarity. Order of kinds: 1 affix is a random
// prefix or suffix, 2 is a prefix and a suffix, 3 adds one more of a random kind. Never picks
// the same affix twice, a second element, or more than the prefix/suffix limits.
// keepElement: true skips elemental prefixes (the weapon already has its element).
function rollAffixes(kind, count, rng, keepElement = false) {
  const chosen = [];
  const wanted = [];
  if (count === 1) {
    wanted.push(pick(["prefix", "suffix"], rng));
  } else if (count >= 2) {
    wanted.push("prefix", "suffix");
    for (let i = 2; i < count; i++) {
      wanted.push(pick(["prefix", "suffix"], rng));
    }
  }
  for (const wantedKind of wanted) {
    const room = (affixKind) => {
      let limit = MAX_SUFFIXES;
      if (affixKind === "prefix") {
        limit = MAX_PREFIXES;
      }
      return chosen.filter((a) => a.kind === affixKind).length < limit;
    };
    const allowed = (a) => {
      if (chosen.includes(a)) {
        return false;
      }
      if (a.element && (keepElement || chosen.some((c) => c.element))) {
        return false;
      }
      return room(a.kind);
    };
    let pool = affixesFor(kind).filter((a) => a.kind === wantedKind && allowed(a));
    if (pool.length === 0) {
      pool = affixesFor(kind).filter(allowed);
    }
    if (pool.length > 0) {
      chosen.push(pick(pool, rng));
    }
  }
  return chosen;
}

// "Blazing Spear of Reach": prefixes, the base name, then suffixes joined with "and".
function buildWeaponName(baseName, affixes) {
  const prefixes = affixes.filter((a) => a.kind === "prefix").map((a) => a.label);
  const suffixes = affixes.filter((a) => a.kind === "suffix").map((a) => a.label);
  let name = baseName;
  if (prefixes.length > 0) {
    name = prefixes.join(" ") + " " + name;
  }
  if (suffixes.length > 0) {
    name = name + " of " + suffixes.join(" and ");
  }
  return name;
}

// Changes a stats object with every affix (in the order given) and returns the hooks they add:
// { onHit, onFire } where each is a function or undefined.
function applyAffixes(stats, kind, affixes) {
  const onHit = [];
  const onFire = [];
  for (const affix of affixes) {
    const entry = affix[kind];
    entry.stats(stats);
    if (entry.onHit) {
      onHit.push(entry.onHit);
    }
    if (entry.onFire) {
      onFire.push(entry.onFire);
    }
  }
  return { onHit: composeHooks(onHit), onFire: composeHooks(onFire) };
}

// Checks the affix table. Returns a list of problems (empty if all is well).
function validateAffixes(affixes = AFFIXES) {
  const problems = [];
  const ids = new Set();
  for (const a of affixes) {
    const bad = (message) => problems.push(a.id + ": " + message);
    if (ids.has(a.id)) {
      bad("the id is used by another affix too");
    }
    ids.add(a.id);
    if (a.kind !== "prefix" && a.kind !== "suffix") {
      bad("kind must be prefix or suffix");
    }
    if (typeof a.label !== "string" || a.label === "") {
      bad("needs a label");
    }
    if (a.melee === undefined && a.ranged === undefined) {
      bad("must work on melee or ranged");
    }
    for (const kind of ["melee", "ranged"]) {
      if (a[kind] !== undefined) {
        if (typeof a[kind].stats !== "function" || typeof a[kind].text !== "string") {
          bad(kind + " needs text and a stats function");
        }
      }
    }
  }
  return problems;
}
