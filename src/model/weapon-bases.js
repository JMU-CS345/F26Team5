// The kinds of weapon the generator can roll. Model code: no p5 drawing calls.
// To add a base, add a row to WEAPON_BASES. validateWeaponBases() and
// spec/weapon-bases.spec.js check every row with no new specs.
//
// Fields:
//   id, name   unique id and the name shown on the card
//   kind       "melee" or "ranged"
//   blurb      one line on how it plays
//   stats      { statName: [min, max] }. A roll lands between min and max.
//     melee:   damage, reach (px), swingFrames, knockback, arc (degrees)
//     ranged:  damage, fireRate (frames between shots), shotSpeed (px per frame),
//              range (px), projectileCount, spread (degrees), pierce
//
// Ranged damage and fire rate stay below melee on purpose: shooting is safe, so it is weaker.

const MELEE_STAT_NAMES = Object.freeze(["damage", "reach", "swingFrames", "knockback", "arc"]);
const RANGED_STAT_NAMES = Object.freeze([
  "damage", "fireRate", "shotSpeed", "range", "projectileCount", "spread", "pierce"
]);
// Stats that must roll to a whole number.
const WHOLE_NUMBER_STATS = Object.freeze(["swingFrames", "fireRate", "projectileCount", "pierce"]);

const WEAPON_BASES = Object.freeze([
  {
    id: "dagger", name: "Dagger", kind: "melee",
    blurb: "Fast and short. Hits often, pushes little.",
    stats: {
      damage: [1.0, 1.8], reach: [18, 24], swingFrames: [8, 11], knockback: [1, 2],
      arc: [60, 80]
    }
  },
  {
    id: "sword", name: "Sword", kind: "melee",
    blurb: "Balanced swing with a wide arc.",
    stats: {
      damage: [2.0, 3.0], reach: [28, 34], swingFrames: [14, 18], knockback: [3, 4],
      arc: [100, 130]
    }
  },
  {
    id: "spear", name: "Spear", kind: "melee",
    blurb: "A long, narrow thrust.",
    stats: {
      damage: [2.0, 3.2], reach: [44, 54], swingFrames: [16, 20], knockback: [2, 3],
      arc: [20, 35]
    }
  },
  {
    id: "axe", name: "Axe", kind: "melee",
    blurb: "Wide, heavy swing that throws enemies back.",
    stats: {
      damage: [3.0, 4.2], reach: [26, 32], swingFrames: [22, 28], knockback: [6, 8],
      arc: [140, 170]
    }
  },
  {
    id: "hammer", name: "Hammer", kind: "melee",
    blurb: "Slow slam that sends a shockwave all around.",
    stats: {
      damage: [4.0, 5.5], reach: [28, 34], swingFrames: [32, 40], knockback: [9, 12],
      arc: [200, 260]
    }
  },
  {
    id: "wand", name: "Wand", kind: "ranged",
    blurb: "Fast single shot.",
    stats: {
      damage: [0.8, 1.4], fireRate: [10, 14], shotSpeed: [6, 7.5], range: [200, 260],
      projectileCount: [1, 1], spread: [0, 2], pierce: [0, 0]
    }
  },
  {
    id: "staff", name: "Staff", kind: "ranged",
    blurb: "Slow, heavy orb.",
    stats: {
      damage: [2.0, 3.0], fireRate: [32, 42], shotSpeed: [3.5, 4.5], range: [220, 280],
      projectileCount: [1, 1], spread: [0, 0], pierce: [0, 0]
    }
  },
  {
    id: "tome", name: "Tome", kind: "ranged",
    blurb: "Casts a three-way spread.",
    stats: {
      damage: [0.7, 1.2], fireRate: [22, 28], shotSpeed: [4.5, 5.5], range: [160, 210],
      projectileCount: [3, 3], spread: [24, 34], pierce: [0, 0]
    }
  },
  {
    id: "orb", name: "Orb", kind: "ranged",
    blurb: "Slow, drifting shot that covers a lot of ground.",
    stats: {
      damage: [1.3, 2.0], fireRate: [34, 44], shotSpeed: [2.2, 3.0], range: [260, 340],
      projectileCount: [1, 1], spread: [0, 0], pierce: [0, 0]
    }
  },
  {
    id: "scepter", name: "Scepter", kind: "ranged",
    blurb: "Shots pass through several enemies.",
    stats: {
      damage: [1.1, 1.8], fireRate: [20, 26], shotSpeed: [5, 6], range: [240, 300],
      projectileCount: [1, 1], spread: [0, 3], pierce: [2, 3]
    }
  }
]);

// The stat names a weapon kind ("melee" or "ranged") has.
function statNamesFor(kind) {
  if (kind === "melee") {
    return MELEE_STAT_NAMES;
  }
  return RANGED_STAT_NAMES;
}

const WEAPON_BASE_IDS = Object.freeze(WEAPON_BASES.map((base) => base.id));

function getWeaponBase(id) {
  return WEAPON_BASES.find((base) => base.id === id) || null;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// Checks a list of bases and returns a list of problems (empty if all is well). Each problem
// starts with the base's id. Same idea as validateEnemyTypes.
function validateWeaponBases(bases = WEAPON_BASES) {
  const problems = [];
  const ids = new Set();
  let melee = 0;
  let ranged = 0;
  bases.forEach((base, i) => {
    let label = "base #" + (i + 1);
    if (base && typeof base.id === "string" && base.id !== "") {
      label = base.id;
    }
    const bad = (message) => problems.push(label + ": " + message);

    if (ids.has(base.id)) {
      bad("the id is used by another base too");
    }
    ids.add(base.id);
    if (typeof base.name !== "string" || base.name === "") {
      bad("needs a name");
    }
    if (base.kind !== "melee" && base.kind !== "ranged") {
      bad("kind must be melee or ranged");
      return;
    }
    if (base.kind === "melee") {
      melee++;
    } else {
      ranged++;
    }
    const names = statNamesFor(base.kind);
    const stats = base.stats || {};
    for (const name of names) {
      const range = stats[name];
      if (!Array.isArray(range) || range.length !== 2
          || !isFiniteNumber(range[0]) || !isFiniteNumber(range[1])) {
        bad("stats." + name + " must be [min, max]");
        continue;
      }
      if (range[0] > range[1]) {
        bad("stats." + name + " has min above max");
      }
      if (range[0] < 0) {
        bad("stats." + name + " must not be negative");
      }
      if (WHOLE_NUMBER_STATS.includes(name)
          && (!Number.isInteger(range[0]) || !Number.isInteger(range[1]))) {
        bad("stats." + name + " must use whole numbers");
      }
    }
    for (const name of Object.keys(stats)) {
      if (!names.includes(name)) {
        bad("stats." + name + " is not a " + base.kind + " stat");
      }
    }
  });
  if (melee < 5 || ranged < 5) {
    problems.push("need at least 5 melee and 5 ranged bases");
  }
  return problems;
}
