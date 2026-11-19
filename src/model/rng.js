// Seeded random helpers shared by the dungeon generator and the loot code.
// No p5 calls. Every function takes an rng, a function that returns 0 <= n < 1.

// A small seeded random number generator (mulberry32). Same seed, same numbers, which
// makes bugs reproducible and tests stable.
function createRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A shuffled copy of a list.
function shuffle(items, rng) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A whole number from min to max, both included.
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One random item from a non-empty list.
function pick(items, rng) {
  if (items.length === 0) {
    throw new RangeError("pick needs a non-empty list");
  }
  return items[Math.floor(rng() * items.length)];
}

// One entry from a list of { weight, ... } rows, chosen in proportion to its weight.
function weightedPick(entries, rng) {
  let total = 0;
  for (const entry of entries) {
    total += entry.weight;
  }
  if (!(total > 0)) {
    throw new RangeError("weightedPick needs a positive total weight");
  }
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) {
      return entry;
    }
  }
  return entries[entries.length - 1];
}
