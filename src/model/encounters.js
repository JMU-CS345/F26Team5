// Encounter recipes: which enemies a room gets, and where they stand. Pure model code, seeded
// through rng.js, so the same seed gives the same room. No p5 calls.
// Load after rng.js, tile-types.js and enemy-types.js, before template-room.js.

// Every enemy type has one job in a fight. A boss is not listed: bosses are drawn into a room.
const ENEMY_ROLES = Object.freeze({
  Zombie: "chaser",
  Bouncer: "chaser",
  Jelly: "swarm",
  Bat: "swarm",
  Skeleton: "ranged",
  Eyeball: "turret",
  SparkBark: "turret"
});
const MELEE_ROLES = Object.freeze(["chaser", "swarm"]); // these walk up to the player
const RANGED_ROLES = Object.freeze(["ranged", "turret"]); // these stay back and shoot

// The types that can fill each role. weights is for dungeon tier 1, 2 and 3.
const ROLE_TYPES = Object.freeze({
  chaser: [
    { type: "Zombie", weights: [4, 3, 3] },
    { type: "Bouncer", weights: [1, 2, 3] }
  ],
  swarm: [
    { type: "Jelly", weights: [3, 3, 2] },
    { type: "Bat", weights: [2, 3, 3] }
  ],
  ranged: [{ type: "Skeleton", weights: [1, 1, 1] }],
  turret: [
    { type: "Eyeball", weights: [3, 2, 2] },
    { type: "SparkBark", weights: [1, 2, 3] }
  ]
});

const MAX_TURRETS_PER_WAVE = 2;
const MAX_OF_ONE_TYPE = 3;
const MAX_BOUNCERS_PER_WAVE = 1; // a Bouncer is big and hits hard
const SPAWN_DOOR_DISTANCE = 5; // fallback floor spots stay this many tiles from every door

// How many enemies a room holds and how many waves they come in, by size class. waves is the
// lowest and highest wave count; extraWaveAtTier3 adds one wave in dungeon 3.
const ROOM_BUDGETS = Object.freeze({
  small: { min: 4, max: 5, waves: [1, 2], extraWaveAtTier3: false },
  medium: { min: 6, max: 8, waves: [2, 2], extraWaveAtTier3: true },
  large: { min: 9, max: 12, waves: [3, 3], extraWaveAtTier3: true }
});

// A recipe is a list of role counts, weights is for dungeon tier 1, 2 and 3.
function recipe(name, chaser, swarm, ranged, turret, weights) {
  return Object.freeze({ name, counts: { chaser, swarm, ranged, turret }, weights });
}

const ENCOUNTER_RECIPES = Object.freeze([
  recipe("duo-chaser-archer", 1, 0, 1, 0, [3, 2, 1]),
  recipe("duo-chaser-eye", 1, 0, 0, 1, [3, 2, 1]),
  recipe("duo-swarm-archer", 0, 1, 1, 0, [3, 2, 1]),
  recipe("duo-swarm-eye", 0, 1, 0, 1, [3, 2, 1]),

  recipe("trio-pair-archer", 2, 0, 1, 0, [3, 3, 2]),
  recipe("trio-mixed-eye", 1, 1, 0, 1, [3, 3, 2]),
  recipe("trio-swarm-archer", 0, 2, 1, 0, [3, 2, 2]),
  recipe("trio-swarm-eye", 0, 2, 0, 1, [2, 2, 1]),
  recipe("trio-chaser-pair-shots", 1, 0, 2, 0, [2, 3, 3]),

  recipe("quad-pair-archer-eye", 2, 0, 1, 1, [3, 3, 3]),
  recipe("quad-mixed-line", 1, 1, 1, 1, [3, 3, 3]),
  recipe("quad-swarm-line", 0, 2, 1, 1, [3, 2, 2]),
  recipe("quad-chaser-shots", 1, 0, 2, 1, [2, 3, 3]),
  recipe("quad-pair-eyes", 2, 0, 0, 2, [2, 3, 3]),
  recipe("quad-mixed-archers", 1, 2, 1, 0, [2, 2, 2]),

  recipe("five-classic", 2, 0, 1, 2, [3, 3, 3]),
  recipe("five-mixed", 2, 1, 1, 1, [3, 3, 3]),
  recipe("five-swarm-line", 0, 3, 1, 1, [3, 2, 1]),
  recipe("five-mixed-swarm", 1, 2, 1, 1, [3, 3, 2]),
  recipe("five-trio-chasers", 3, 0, 1, 1, [1, 3, 3]),
  recipe("five-crossfire", 1, 1, 2, 1, [2, 3, 3]),

  recipe("six-bruisers", 2, 1, 2, 1, [3, 3, 3]),
  recipe("six-guard", 3, 0, 1, 2, [2, 3, 3]),
  recipe("six-mixed", 2, 2, 1, 1, [3, 3, 3]),
  recipe("six-swarm-guns", 0, 3, 2, 1, [3, 2, 1]),
  recipe("six-siege", 2, 0, 2, 2, [1, 3, 3]),
  recipe("six-crowd", 1, 2, 2, 1, [2, 3, 3]),

  recipe("seven-wall", 3, 1, 2, 1, [1, 3, 3]),
  recipe("seven-mixed", 2, 2, 2, 1, [2, 3, 3]),
  recipe("seven-siege", 2, 1, 2, 2, [1, 3, 3]),
  recipe("seven-pack", 3, 0, 2, 2, [1, 2, 3]),
  recipe("seven-crowd", 2, 2, 1, 2, [2, 3, 3])
]);

function recipeSize(r) {
  return r.counts.chaser + r.counts.swarm + r.counts.ranged + r.counts.turret;
}

// Rule check for a list of enemy type names (one wave). Returns a list of problems, empty when
// the wave is fine.
function waveProblems(typeNames) {
  const problems = [];
  const roleCount = { chaser: 0, swarm: 0, ranged: 0, turret: 0 };
  const typeCount = {};
  for (const name of typeNames) {
    roleCount[ENEMY_ROLES[name]]++;
    typeCount[name] = (typeCount[name] || 0) + 1;
  }
  if (roleCount.chaser + roleCount.swarm < 1) {
    problems.push("needs a chaser or a swarm enemy");
  }
  if (roleCount.ranged + roleCount.turret < 1) {
    problems.push("needs a ranged or a turret enemy");
  }
  if (roleCount.turret > MAX_TURRETS_PER_WAVE) {
    problems.push("has more than " + MAX_TURRETS_PER_WAVE + " turrets");
  }
  for (const name of Object.keys(typeCount)) {
    if (typeCount[name] > MAX_OF_ONE_TYPE) {
      problems.push("has more than " + MAX_OF_ONE_TYPE + " " + name);
    }
  }
  return problems;
}

// The same rules for a recipe's role counts. Returns a list of problems.
function recipeProblems(r) {
  const problems = [];
  for (const role of Object.keys(r.counts)) {
    if (r.counts[role] > MAX_OF_ONE_TYPE) {
      problems.push(r.name + ": more than " + MAX_OF_ONE_TYPE + " " + role);
    }
  }
  if (r.counts.chaser + r.counts.swarm < 1) {
    problems.push(r.name + ": needs a chaser or a swarm enemy");
  }
  if (r.counts.ranged + r.counts.turret < 1) {
    problems.push(r.name + ": needs a ranged or a turret enemy");
  }
  if (r.counts.turret > MAX_TURRETS_PER_WAVE) {
    problems.push(r.name + ": too many turrets");
  }
  return problems;
}

function tierIndex(tier) {
  return Math.min(Math.max(Math.floor(tier), 1), 3) - 1;
}

// How many enemies to put in a room and how many waves to split them into: a list of wave
// sizes, biggest first. tier is the dungeon number, 1 to 3.
function planWaveSizes(sizeName, tier, rng) {
  const budget = ROOM_BUDGETS[sizeName];
  const total = randInt(rng, budget.min, budget.max) + (tier - 1);
  let waves = randInt(rng, budget.waves[0], budget.waves[1]);
  if (tier >= 3 && budget.extraWaveAtTier3) {
    waves++;
  }
  const sizes = [];
  for (let i = 0; i < waves; i++) {
    sizes.push(Math.floor(total / waves));
  }
  for (let i = 0; i < total % waves; i++) {
    sizes[i]++;
  }
  return sizes;
}

// One recipe that has exactly this many enemies, picked by the tier weights.
function pickRecipe(size, tier, rng) {
  const fits = ENCOUNTER_RECIPES.filter((r) => recipeSize(r) === size);
  const entries = fits.map((r) => ({ weight: r.weights[tierIndex(tier)], recipe: r }));
  return weightedPick(entries, rng).recipe;
}

// The enemy type names of one wave: each role slot of the recipe gets a type.
function pickWaveTypes(r, tier, rng) {
  const types = [];
  for (const role of Object.keys(r.counts)) {
    for (let i = 0; i < r.counts[role]; i++) {
      const open = ROLE_TYPES[role].filter((entry) => {
        const used = types.filter((t) => t === entry.type).length;
        const cap = entry.type === "Bouncer" ? MAX_BOUNCERS_PER_WAVE : MAX_OF_ONE_TYPE;
        return used < cap;
      });
      const entries = open.map((entry) => ({ weight: entry.weights[tierIndex(tier)], type: entry.type }));
      types.push(weightedPick(entries, rng).type);
    }
  }
  return types;
}

// What the spawn code needs to know about a template: its tiles, doors and spawn spots.
// parsed is the result of parseRoomTemplate. Returns
//   { grid, melee, ranged, open }
//   open  every floor tile you can walk to from a door, as { col, row }
function buildEncounterLayout(parsed) {
  const seen = new Set();
  const stack = [];
  const isFloor = (col, row) => {
    return row >= 0 && col >= 0 && row < parsed.rows && col < parsed.cols
      && parsed.grid[row][col] === TILE.FLOOR;
  };
  const visit = (col, row) => {
    if (isFloor(col, row) && !seen.has(row * parsed.cols + col)) {
      seen.add(row * parsed.cols + col);
      stack.push({ col, row });
    }
  };
  for (const door of parsed.doors) {
    for (const tile of door.tiles) {
      visit(tile.col + 1, tile.row);
      visit(tile.col - 1, tile.row);
      visit(tile.col, tile.row + 1);
      visit(tile.col, tile.row - 1);
    }
  }
  while (stack.length > 0) {
    const { col, row } = stack.pop();
    visit(col + 1, row);
    visit(col - 1, row);
    visit(col, row + 1);
    visit(col, row - 1);
  }
  const open = [];
  for (let row = 0; row < parsed.rows; row++) {
    for (let col = 0; col < parsed.cols; col++) {
      if (seen.has(row * parsed.cols + col)) {
        open.push({ col, row });
      }
    }
  }
  const reachable = (spot) => seen.has(spot.row * parsed.cols + spot.col);
  return {
    grid: parsed.grid,
    cols: parsed.cols,
    rows: parsed.rows,
    doors: parsed.doors,
    melee: parsed.spots.melee.filter(reachable),
    ranged: parsed.spots.ranged.filter(reachable),
    open
  };
}

// Tiles from a spot to the nearest door tile.
function doorDistance(layout, spot) {
  let best = Infinity;
  for (const door of layout.doors) {
    for (const tile of door.tiles) {
      best = Math.min(best, Math.hypot(tile.col - spot.col, tile.row - spot.row));
    }
  }
  return best;
}

// True when an enemy of this type fits on the tile without touching a wall, a pit or a tile
// another enemy of the wave already took. A 32 pixel enemy needs the 3x3 tiles around it.
function spotFits(layout, typeName, spot, taken) {
  const big = ENEMY_TYPES[typeName].length > TILE_SIZE;
  const span = big ? 1 : 0;
  for (let row = spot.row - span; row <= spot.row + span; row++) {
    for (let col = spot.col - span; col <= spot.col + span; col++) {
      const inside = row >= 0 && col >= 0 && row < layout.rows && col < layout.cols;
      if (!inside || layout.grid[row][col] !== TILE.FLOOR || taken.has(row * layout.cols + col)) {
        return false;
      }
    }
  }
  return true;
}

function takeSpot(layout, typeName, spot, taken) {
  const span = ENEMY_TYPES[typeName].length > TILE_SIZE ? 1 : 0;
  for (let row = spot.row - span; row <= spot.row + span; row++) {
    for (let col = spot.col - span; col <= spot.col + span; col++) {
      taken.add(row * layout.cols + col);
    }
  }
}

// Where one enemy stands: a drawn spot of its kind first, then any open floor tile 5 or more
// tiles from every door, then the open tile farthest from the doors. Returns null if nothing fits.
function findSpot(layout, typeName, rng, taken) {
  const drawn = RANGED_ROLES.includes(ENEMY_ROLES[typeName]) ? layout.ranged : layout.melee;
  const fits = (spot) => spotFits(layout, typeName, spot, taken);
  const fromDrawn = shuffle(drawn, rng).filter(fits);
  if (fromDrawn.length > 0) {
    return fromDrawn[0];
  }
  const fitting = layout.open.filter(fits);
  const far = fitting.filter((spot) => doorDistance(layout, spot) >= SPAWN_DOOR_DISTANCE);
  if (far.length > 0) {
    return pick(far, rng);
  }
  fitting.sort((a, b) => doorDistance(layout, b) - doorDistance(layout, a));
  if (fitting.length > 0) {
    return fitting[0];
  }
  return null;
}

// Turns type names into spawn spots [{ type, col, row }]. Big enemies are placed first so they
// get room. A Bouncer that fits nowhere is swapped for a Zombie.
function placeWave(typeNames, layout, rng) {
  const taken = new Set();
  const ordered = typeNames.slice().sort((a, b) => {
    return ENEMY_TYPES[b].length - ENEMY_TYPES[a].length;
  });
  const spawns = [];
  for (const name of ordered) {
    let typeName = name;
    let spot = findSpot(layout, typeName, rng, taken);
    if (spot === null && typeName === "Bouncer") {
      typeName = "Zombie";
      spot = findSpot(layout, typeName, rng, taken);
    }
    if (spot !== null) {
      takeSpot(layout, typeName, spot, taken);
      spawns.push({ type: typeName, col: spot.col, row: spot.row });
    }
  }
  return spawns;
}

// The whole fight of one room: a list of waves, each a list of spawn spots.
// options: { sizeName: "small"|"medium"|"large", tier: 1 to 3 (default 1), rng }
function planEncounter(layout, options) {
  const { sizeName, tier = 1, rng } = options;
  return planWaveSizes(sizeName, tier, rng).map((size) => {
    const chosen = pickRecipe(size, tier, rng);
    return placeWave(pickWaveTypes(chosen, tier, rng), layout, rng);
  });
}
