// What each kind of enemy is: stats and which behaviors it uses. What it looks like is in
// src/view/enemy-art.js.
// Model code: no p5 drawing calls. To add an enemy, add a row to ENEMY_TYPES. A new row is
// checked by validateEnemyTypes() and by spec/enemy-contract.spec.js with no new specs.
//
// Fields:
//   length, width  hitbox in pixels. The art is drawn to fit it.
//   speed          pixels per frame at 60 fps (0 for a turret)
//   maxHealth      health when spawned
//   detectionRange pixels. It only acts when the player is this close.
//   contactDamage  damage when it touches the player
//   move           a key of ENEMY_MOVES (enemy-behaviors.js). Hopping and bouncing moves go
//                  straight at the player through anything. The others follow the tiles around
//                  walls. Every other enemy needs a clear line of sight to shoot or to use
//                  sightSpeed.
//   noKnockback    optional, true for an enemy that is never shoved by a hit or by contact. Bosses
//                  and the Spark Bark have it.
//   facing         optional. "travel" means the enemy faces the way it walks instead of turning to
//                  the player, and only turns to the player to attack. Needed by anything whose
//                  front matters (a shield) or that walks about without chasing.
//   blocksFront    optional, true for an enemy that shrugs off any hit coming at its front (a hit
//                  that lands on its back or its sides still hurts). It needs facing "travel".
//   patrol         only for move "patrol": either "follow" or a list of { dx, dy } tile offsets
//                  from where the enemy spawned. "follow" walks with the wall, a pit or an obstacle
//                  on its right hand: straight on until something is in the way, then round the
//                  edge of it, forever. A list is a route: it walks to each stop in turn, along the
//                  tiles, and loops forever (a leg it cannot reach is skipped). An enemy can have
//                  its own route (enemy.patrolPath), and a room template can give one to each
//                  patroller it draws (see "patrols" in room-templates.js). A route wins over type.patrol.
//   flies          optional, true for an enemy that crosses pits and never falls into one.
//                  Other enemies keep out of pits, and die if a shove carries them over one
//                  (bosses are too big to fall).
//   vision         optional. "line" means it only sees the player along the row or column of
//                  tiles it faces, up to detectionRange away. It faces the way it walks, and
//                  runs to the spot where it last saw the player. Left out, it senses a circle.
//   sightSpeed     optional, wanderChase only: the speed while the player is in sight. Must be at
//                  least speed, which is then the speed of hunting the last known spot.
//   attack         null, or { kind, cooldown, damage, ... }. kind is a key of ENEMY_ATTACKS.
//                  shoot also needs speed and color, and may have count and spread (degrees),
//                  windup (frames of shaking before the shot, aim locked at the start),
//                  lead (0 to 1, how far ahead of a walking player to aim), aimSteps (the aim
//                  snaps to this many evenly spaced directions, 8 for the four cardinals and
//                  four diagonals), inLine (true: with aimSteps, only shoot when the player is
//                  standing in the path the snapped shot would fly along, so it never misses
//                  by shooting along a side while the player is off at an angle) and stare
//                  (frames the player must stay in sight before the enemy shoots; losing sight
//                  starts the count again).
//                  Every shoot may also have recover (frames standing still after the shot, for
//                  the art) and volleys: a list of { count, spread } that it fires in turn, over
//                  and over, instead of count and spread.
//                  melee needs reach (pixels from the enemy's center), windup and recover
//                  (frames) and no speed or color.
//                  zap is a short range lightning bolt in front of the enemy. It needs reach
//                  (pixels from the enemy's center), windup and recover (frames) and may have
//                  thickness (pixels, default reach) and active (frames the bolt can hurt, default
//                  10). It turns to the nearest of the four sides toward the player and hurts
//                  whoever is in the bolt. The detectionRange is how close the player must be.
//                  sideRaise (pixels, default 0) lifts the bolt, its picture and the box that
//                  hurts, when it points left or right, so it leaves the hands of a tall sprite.
//                  strike calls lightning down on the spot where the player stands once windup
//                  frames are over. The bolt only marks the spot for delay frames, then hurts
//                  anyone there for active frames. It may have size (pixels, default 16) and
//                  recover.
//                  cooldown is the least time between the starts of two shots or swings.
//                  Both kinds need a clear line of sight to the player, except for a bouncing
//                  enemy, which ignores walls.
//   weakTo         optional list of elements ("Fire", "Ice", "Mind") that hurt it ELEMENT_WEAK_MULTIPLIER
//                  times as much. resists is the same for elements that hurt it
//                  ELEMENT_RESIST_MULTIPLIER times as much. Neutral hits (the sword) and other
//                  elements do normal damage. An element cannot be in both lists.
//   boss           true shows a health bar at the top of the screen
//   phases         optional list like [{ below: 0.5, speed: 1.6, move: "chase", attack: {...} }].
//                  While health / maxHealth is below `below`, the phase's speed, move and
//                  attack replace the base ones. Every key except below is optional. List
//                  them from the highest below to the lowest. The lowest matching one wins.
//   lootTable      optional name of a loot pool in LOOT_TABLES (money.js). Every enemy drops gold
//                  by its power, and a pool scales that: "boss" pays three times as much
//   color          [r, g, b] square drawn when the type has no sprite in enemy-art.js
//   wanderSpeed    only for move "wanderChase"
//   keepRange      only for move "keepDistance"
//   hopRest, hopFrames, hopSpeed  only for the move "hop": frames resting,
//                  frames dashing, and pixels per frame while dashing
//   bounce         the move "bounce" needs a melee attack and a speed above 0. It never rests.

const ENEMY_TYPES = Object.freeze({
  Jelly: {
    length: 16,
    width: 16,
    speed: 1,
    maxHealth: 3,
    detectionRange: 200,
    contactDamage: 1,
    move: "hop",
    hopRest: 40,
    hopFrames: 14,
    hopSpeed: 2.2,
    attack: null,
    boss: false,
    weakTo: ["Ice"],
    resists: ["Fire"],
    color: [220, 80, 80]
  },
  Ghoul: {
    length: 16,
    width: 16, // the art is 16x32, but he is tall rather than wide, so the hitbox stays 16x16
    speed: 0.75,
    maxHealth: 6,
    detectionRange: 160,
    contactDamage: 1,
    move: "wanderChase",
    wanderSpeed: 0.25,
    sightSpeed: 1.2,
    vision: "line",
    attack: null,
    boss: false,
    weakTo: ["Fire"],
    resists: ["Mind"],
    color: [90, 140, 90]
  },
  Skeleton: {
    length: 16,
    width: 16,
    speed: 0.6,
    maxHealth: 3,
    detectionRange: 260,
    contactDamage: 1,
    move: "keepDistance",
    keepRange: 110,
    attack: { kind: "shoot", cooldown: 110, damage: 1, speed: 2.5, windup: 18, lead: 0.5,
      color: [235, 235, 220] },
    boss: false,
    weakTo: ["Mind"],
    resists: ["Ice"],
    color: [235, 235, 220]
  },
  Bat: {
    length: 16,
    width: 16,
    speed: 1.4,
    maxHealth: 2,
    detectionRange: 220,
    contactDamage: 1,
    move: "erratic",
    flies: true,
    attack: null,
    boss: false,
    weakTo: ["Fire"],
    color: [140, 90, 60]
  },
  PeeperJr: {
    length: 16,
    width: 16,
    speed: 0,
    maxHealth: 4,
    detectionRange: 280,
    contactDamage: 1,
    move: "none", // a turret that turns to track the player. It can be knocked back.
    attack: {
      kind: "shoot",
      cooldown: 120,
      damage: 1,
      speed: 2,
      count: 3,
      spread: 20,
      windup: 16,
      color: [200, 40, 50]
    },
    boss: false,
    weakTo: ["Ice"],
    resists: ["Mind"],
    color: [200, 40, 50]
  },
  Bouncer: {
    length: 32,
    width: 32,
    speed: 1.1, // it bounces after the player the whole time, along one axis at a time
    maxHealth: 5,
    detectionRange: 220,
    contactDamage: 1,
    move: "bounce",
    noKnockback: true,
    attack: { kind: "melee", cooldown: 34, damage: 1, reach: 34, windup: 8, recover: 12 },
    boss: false,
    weakTo: ["Mind"],
    resists: ["Ice"],
    color: [90, 90, 200]
  },
  SparkBark: {
    length: 16,
    width: 16,
    speed: 0,
    maxHealth: 4,
    detectionRange: 240,
    contactDamage: 1,
    move: "none", // a turret
    noKnockback: true,
    // Once the player has stayed in sight for `stare` frames it fires one spark along the
    // nearest of the eight directions to the player.
    attack: { kind: "shoot", cooldown: 30, damage: 1, speed: 2.2, windup: 14, aimSteps: 8, stare: 90,
      color: [120, 220, 90] },
    boss: false,
    weakTo: ["Fire"],
    resists: ["Ice"],
    color: [120, 220, 90]
  },
  DemonKnight: {
    length: 64,
    width: 64,
    speed: 1,
    maxHealth: 40,
    detectionRange: 400,
    contactDamage: 2,
    move: "chase", // stomps after the player
    noKnockback: true,
    // Now and then it stops, charges up, and fires one shot at the player.
    attack: { kind: "shoot", cooldown: 120, damage: 1, speed: 3, windup: 20, recover: 10, lead: 0.5,
      color: [200, 60, 220] },
    phases: [
      {
        below: 0.5,
        speed: 1.6,
        // Second phase: a spread of three shots, then a spread of two, and round again.
        attack: {
          kind: "shoot",
          cooldown: 75,
          damage: 1,
          speed: 3.5,
          volleys: [
            { count: 3, spread: 20 },
            { count: 2, spread: 20 }
          ],
          windup: 14,
          recover: 10,
          lead: 0.5,
          color: [255, 120, 60]
        }
      }
    ],
    lootTable: "boss",
    boss: true,
    weakTo: ["Ice"],
    resists: ["Fire"],
    color: [150, 30, 160]
  },

  Blockette: {
    length: 16,
    width: 16,
    speed: 0.5,
    maxHealth: 4,
    detectionRange: 0, // it never notices the player: it just walks its route
    contactDamage: 1,
    move: "patrol",
    // Walks with a wall, pit or obstacle on its right hand, so it goes round the edge of the room
    // and round anything standing in it. A room template can give it a route instead.
    patrol: "follow",
    facing: "travel", // its shield is on the side it walks toward
    blocksFront: true,
    attack: null,
    boss: false,
    weakTo: ["Mind"],
    resists: ["Fire"],
    color: [60, 150, 60]
  },

  // The Shadow Wizard Money Gang. None of them chase: they amble about and attack a player they see.
  ShadowWizardPurple: {
    length: 16,
    width: 16,
    speed: 0.4,
    maxHealth: 3,
    detectionRange: 200,
    contactDamage: 1,
    move: "wander",
    facing: "travel",
    // A magic bolt along whichever of the four directions the player is nearest to, but only once the
    // player is standing in that line (inLine), so it never fires and misses.
    attack: { kind: "shoot", cooldown: 110, damage: 1, speed: 2.4, windup: 20, recover: 12, aimSteps: 4,
      inLine: true, color: [150, 110, 255] },
    boss: false,
    weakTo: ["Fire"],
    resists: ["Mind"],
    color: [90, 60, 200]
  },
  ShadowWizardYellow: {
    length: 16,
    width: 16, // the art is 16x32, but the hitbox stays 16x16
    speed: 0.4,
    maxHealth: 4,
    detectionRange: 56, // only close up
    contactDamage: 1,
    move: "wander",
    facing: "travel",
    // Short range lightning toward the nearest of the four sides. It reaches 40 pixels from the
    // wizard's middle, which is 32 pixels past its hitbox, the length of the lightning art.
    // sideRaise lifts it 4 pixels when it points left or right, to come out of his hands.
    attack: { kind: "zap", cooldown: 90, damage: 1, reach: 40, thickness: 16, windup: 24, active: 10, recover: 14,
      sideRaise: 4 },
    boss: false,
    weakTo: ["Ice"],
    resists: ["Fire"],
    color: [250, 160, 60]
  },
  ShadowWizardGreen: {
    length: 32,
    width: 32,
    speed: 0.3,
    maxHealth: 6,
    detectionRange: 220,
    contactDamage: 1,
    move: "wander",
    facing: "travel",
    // Raises its hands, then lightning lands on the spot the player is standing on. The spot is
    // marked for `delay` frames first, so the player can step away.
    attack: { kind: "strike", cooldown: 150, damage: 2, windup: 30, delay: 28, active: 12, size: 24, recover: 12 },
    boss: false,
    weakTo: ["Mind"],
    resists: ["Ice"],
    color: [0, 160, 0]
  }
});

const ENEMY_TYPE_NAMES = Object.freeze(Object.keys(ENEMY_TYPES));

// Makes an enemy of the named type. Throws on an unknown name so a typo is loud.
// Pass spawnIn as true in the game so the enemy is harmless for a moment while it appears.
function createEnemy(typeName, x, y, spawnIn = false) {
  if (!ENEMY_TYPE_NAMES.includes(typeName)) {
    throw new Error("Unknown enemy type: " + typeName);
  }
  const enemy = new Enemy(x, y, typeName);
  if (spawnIn) {
    enemy.spawnTimer = ENEMY_SPAWN_FRAMES;
  }
  return enemy;
}

function isNumberAtLeast(value, min) {
  return typeof value === "number" && value >= min;
}

function isColor(value) {
  return Array.isArray(value) && value.length === 3 && value.every((c) => isNumberAtLeast(c, 0));
}

// The numbers each kind of attack must have, all above 0.
const ENEMY_ATTACK_KEYS = Object.freeze({
  shoot: ["cooldown", "damage", "speed"],
  melee: ["cooldown", "damage", "reach", "windup", "recover"],
  zap: ["cooldown", "damage", "reach", "windup", "recover"],
  strike: ["cooldown", "damage", "windup", "delay", "active"]
});

// Checks one attack table, used for the base attack and for each phase attack.
function checkEnemyAttack(attackTable, bad) {
  const attack = attackTable || {};
  if (!Object.keys(ENEMY_ATTACKS).includes(attack.kind)) {
    bad("attack.kind is not in ENEMY_ATTACKS: " + attack.kind);
  }
  const attackKeys = ENEMY_ATTACK_KEYS[attack.kind] || ENEMY_ATTACK_KEYS.shoot;
  for (const key of attackKeys) {
    if (!isNumberAtLeast(attack[key], 0.01)) {
      bad("attack." + key + " must be a number above 0");
    }
  }
  if (attack.count !== undefined && !isNumberAtLeast(attack.count, 1)) {
    bad("attack.count must be at least 1");
  }
  if (attack.spread !== undefined && !isNumberAtLeast(attack.spread, 0)) {
    bad("attack.spread must be at least 0");
  }
  if (attack.kind === "zap" || attack.kind === "strike") {
    for (const key of ["thickness", "active", "size"]) {
      if (attack[key] !== undefined && !isNumberAtLeast(attack[key], 1)) {
        bad("attack." + key + " must be a number of at least 1");
      }
    }
    if (attack.recover !== undefined && !isNumberAtLeast(attack.recover, 0)) {
      bad("attack.recover must be at least 0");
    }
  }
  if (attack.sideRaise !== undefined && (attack.kind !== "zap" || !isNumberAtLeast(attack.sideRaise, 0))) {
    bad("attack.sideRaise must be a number of at least 0, and only a zap has one");
  }
  if (attack.kind === "shoot") {
    if (attack.windup !== undefined && !isNumberAtLeast(attack.windup, 0)) {
      bad("attack.windup must be at least 0");
    }
    if (attack.recover !== undefined && !isNumberAtLeast(attack.recover, 0)) {
      bad("attack.recover must be at least 0");
    }
    if (attack.volleys !== undefined) {
      const good =
        Array.isArray(attack.volleys) &&
        attack.volleys.length > 0 &&
        attack.volleys.every((v) => v && isNumberAtLeast(v.count, 1) && isNumberAtLeast(v.spread, 0));
      if (!good) {
        bad("attack.volleys must be a non-empty list of { count, spread }");
      }
    }
    if (attack.lead !== undefined && !(isNumberAtLeast(attack.lead, 0) && attack.lead <= 1)) {
      bad("attack.lead must be between 0 and 1");
    }
    if (attack.aimSteps !== undefined && !(Number.isInteger(attack.aimSteps) && attack.aimSteps >= 2)) {
      bad("attack.aimSteps must be a whole number of at least 2");
    }
    if (attack.inLine !== undefined && (typeof attack.inLine !== "boolean" || attack.aimSteps === undefined)) {
      bad("attack.inLine must be true or false, and needs aimSteps");
    }
    if (attack.stare !== undefined && !isNumberAtLeast(attack.stare, 1)) {
      bad("attack.stare must be a number of at least 1");
    }
    if (!isColor(attack.color)) {
      bad("attack.color must be [r, g, b]");
    }
  }
}

// Checks a phases list: below values between 0 and 1 and falling, plus the optional overrides.
function checkEnemyPhases(phases, bad) {
  if (!Array.isArray(phases) || phases.length === 0) {
    bad("phases must be a non-empty list");
    return;
  }
  const phaseBad = (message) => bad("phase " + message);
  let lastBelow = 1;
  for (const phase of phases) {
    if (typeof phase !== "object" || phase === null) {
      bad("each phase must be an object");
      continue;
    }
    if (!(typeof phase.below === "number" && phase.below > 0 && phase.below < 1)) {
      phaseBad("below must be a number above 0 and below 1");
    } else if (phase.below >= lastBelow) {
      phaseBad("below values must get smaller down the list");
    } else {
      lastBelow = phase.below;
    }
    if (phase.move !== undefined && !Object.keys(ENEMY_MOVES).includes(phase.move)) {
      phaseBad("move is not in ENEMY_MOVES: " + phase.move);
    }
    if (phase.speed !== undefined && !isNumberAtLeast(phase.speed, 0)) {
      phaseBad("speed must be a number of at least 0");
    }
    if (phase.attack !== undefined && phase.attack !== null) {
      checkEnemyAttack(phase.attack, phaseBad);
    }
  }
}

// True for "follow", or for a list of at least one { dx, dy } whole-number tile offset where some
// offset is not 0, 0.
function isPatrolPath(path) {
  return (
    path === "follow" ||
    Array.isArray(path) &&
    path.length > 0 &&
    path.every((p) => p && Number.isInteger(p.dx) && Number.isInteger(p.dy)) &&
    path.some((p) => p.dx !== 0 || p.dy !== 0)
  );
}

// Returns a list of problems with an enemy table. An empty list means it is valid.
// How much more or less a hit of this element hurts an enemy type. Null (the sword) is neutral.
const ELEMENT_WEAK_MULTIPLIER = 2;
const ELEMENT_RESIST_MULTIPLIER = 0.5;

function getElementMultiplier(type, element) {
  if (element === null || element === undefined) {
    return 1;
  }
  if (Array.isArray(type.weakTo) && type.weakTo.includes(element)) {
    return ELEMENT_WEAK_MULTIPLIER;
  }
  if (Array.isArray(type.resists) && type.resists.includes(element)) {
    return ELEMENT_RESIST_MULTIPLIER;
  }
  return 1;
}

function validateEnemyTypes(types = ENEMY_TYPES) {
  const problems = [];
  for (const name of Object.keys(types)) {
    const type = types[name];
    const bad = (message) => problems.push(name + ": " + message);

    if (!isNumberAtLeast(type.length, 1) || !isNumberAtLeast(type.width, 1)) {
      bad("length and width must be numbers of at least 1");
    }
    if (!isNumberAtLeast(type.maxHealth, 1)) {
      bad("maxHealth must be a number of at least 1");
    }
    for (const key of ["speed", "detectionRange", "contactDamage"]) {
      if (!isNumberAtLeast(type[key], 0)) {
        bad(key + " must be a number of at least 0");
      }
    }
    if (typeof type.boss !== "boolean") {
      bad("boss must be true or false");
    }
    if (!Object.keys(ENEMY_MOVES).includes(type.move)) {
      bad("move is not in ENEMY_MOVES: " + type.move);
    }
    if (type.move === "wanderChase" && !isNumberAtLeast(type.wanderSpeed, 0.01)) {
      bad("wanderChase needs wanderSpeed above 0");
    }
    if (type.vision !== undefined && type.vision !== "line") {
      bad('vision must be "line" or left out');
    }
    if (type.sightSpeed !== undefined && !isNumberAtLeast(type.sightSpeed, type.speed)) {
      bad("sightSpeed must be at least speed");
    }
    if (type.facing !== undefined && type.facing !== "travel") {
      bad('facing must be "travel" or left out');
    }
    for (const key of ["weakTo", "resists"]) {
      const list = type[key];
      if (list !== undefined
          && (!Array.isArray(list) || list.some((e) => !Object.keys(ELEMENT_STAT).includes(e)))) {
        bad(key + " must be a list of elements (Fire, Ice or Mind) or left out");
      }
    }
    if (Array.isArray(type.weakTo) && Array.isArray(type.resists)
        && type.weakTo.some((e) => type.resists.includes(e))) {
      bad("an element cannot be in both weakTo and resists");
    }
    if (type.blocksFront !== undefined && typeof type.blocksFront !== "boolean") {
      bad("blocksFront must be true or false");
    }
    if (type.blocksFront && type.facing !== "travel") {
      bad('blocksFront needs facing "travel", or the shield would turn to the player');
    }
    if (type.noKnockback !== undefined && typeof type.noKnockback !== "boolean") {
      bad("noKnockback must be true or false");
    }
    if (type.move === "patrol" && !isPatrolPath(type.patrol)) {
      bad('patrol needs "follow" or a patrol list of { dx, dy } tile offsets, not all zero');
    }
    if (type.move === "keepDistance" && !isNumberAtLeast(type.keepRange, 1)) {
      bad("keepDistance needs keepRange above 0");
    }
    if (type.move === "hop") {
      for (const key of ["hopRest", "hopFrames", "hopSpeed"]) {
        if (!isNumberAtLeast(type[key], 0.01)) {
          bad(type.move + " needs " + key + " above 0");
        }
      }
    }
    if (type.move === "bounce") {
      if (!(type.attack && type.attack.kind === "melee")) {
        bad("bounce needs a melee attack");
      }
      if (!isNumberAtLeast(type.speed, 0.01)) {
        bad("bounce needs speed above 0");
      }
    }
    if (type.attack !== null) {
      checkEnemyAttack(type.attack, bad);
    }
    if (type.phases !== undefined) {
      checkEnemyPhases(type.phases, bad);
    }
    if (type.lootTable !== undefined) {
      if (typeof type.lootTable !== "string" || type.lootTable === "") {
        bad("lootTable must be a non-empty string");
      } else if (typeof LOOT_TABLES === "object" && !(type.lootTable in LOOT_TABLES)) {
        bad("lootTable " + type.lootTable + " is not in LOOT_TABLES");
      }
    }
  }
  return problems;
}
