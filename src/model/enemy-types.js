// What each kind of enemy is: stats, which behaviors it uses, and what it looks like.
// Model code: no p5 drawing calls. To add an enemy, add a row to ENEMY_TYPES. A new row is
// checked by validateEnemyTypes() and by spec/enemy-contract.spec.js with no new specs.
//
// Fields:
//   length, width  hitbox in pixels. The sprite is stretched to fill it.
//   speed          pixels per frame at 60 fps (0 for a turret)
//   maxHealth      health when spawned
//   detectionRange pixels. It only acts when the player is this close.
//   contactDamage  damage when it touches the player
//   move           a key of ENEMY_MOVES (enemy-behaviors.js)
//   attack         null, or { kind, cooldown, damage, speed, color } and optionally
//                  count and spread (degrees) for a fan. kind is a key of ENEMY_ATTACKS.
//   boss           true shows a health bar at the top of the screen
//   phases         optional list like [{ below: 0.5, speed: 1.6, move: "chase", attack: {...} }].
//                  While health / maxHealth is below `below`, the phase's speed, move and
//                  attack replace the base ones. Every key except below is optional. List
//                  them from the highest below to the lowest. The lowest matching one wins.
//   lootTable      optional name of a loot pool, for the loot system to read
//   sprite         { frameTime, frames: [{ sheet, x, y }] } in 16x16 cells, or null
//   color          [r, g, b] square drawn when there is no sprite
//   wanderSpeed    only for move "wanderChase"
//   keepRange      only for move "keepDistance"

const ENEMY_SPRITE_SIZE = 16; // every sprite cell is 16x16 pixels in its sheet

const JELLY_SHEET = "assets/enemy/Jelly.png";
const CREATURE_SHEET = "assets/enemy/tiny-creatures.png";

// A frame of the Tiny Creatures sheet by tile number, 10 tiles per row counting from 0.
function creatureFrame(tile) {
  return { sheet: CREATURE_SHEET, x: (tile % 10) * 16, y: Math.floor(tile / 10) * 16 };
}

const ENEMY_TYPES = Object.freeze({
  Jelly: {
    length: 16,
    width: 16,
    speed: 1,
    maxHealth: 3,
    detectionRange: 200,
    contactDamage: 1,
    move: "chase",
    attack: null,
    boss: false,
    color: [220, 80, 80],
    sprite: {
      frameTime: 20,
      frames: [
        { sheet: JELLY_SHEET, x: 0, y: 16 },
        { sheet: JELLY_SHEET, x: 16, y: 16 }
      ]
    }
  },
  Zombie: {
    length: 16,
    width: 16,
    speed: 0.75,
    maxHealth: 6,
    detectionRange: 160,
    contactDamage: 1,
    move: "wanderChase",
    wanderSpeed: 0.25,
    attack: null,
    boss: false,
    color: [90, 140, 90],
    sprite: { frameTime: 20, frames: [creatureFrame(0), creatureFrame(99)] }
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
    attack: { kind: "shoot", cooldown: 110, damage: 1, speed: 2.5, color: [235, 235, 220] },
    boss: false,
    color: [235, 235, 220],
    sprite: { frameTime: 20, frames: [creatureFrame(1)] }
  },
  Bat: {
    length: 16,
    width: 16,
    speed: 1.4,
    maxHealth: 2,
    detectionRange: 220,
    contactDamage: 1,
    move: "erratic",
    attack: null,
    boss: false,
    color: [140, 90, 60],
    sprite: { frameTime: 8, frames: [creatureFrame(132), creatureFrame(138)] }
  },
  Eyeball: {
    length: 16,
    width: 16,
    speed: 0,
    maxHealth: 4,
    detectionRange: 280,
    contactDamage: 1,
    move: "none",
    attack: {
      kind: "shoot",
      cooldown: 120,
      damage: 1,
      speed: 2,
      count: 3,
      spread: 20,
      color: [240, 90, 120]
    },
    boss: false,
    color: [240, 90, 120],
    sprite: { frameTime: 20, frames: [creatureFrame(5)] }
  },
  Demon: {
    length: 32,
    width: 32,
    speed: 1,
    maxHealth: 40,
    detectionRange: 400,
    contactDamage: 2,
    move: "chase",
    attack: { kind: "shoot", cooldown: 75, damage: 1, speed: 3, color: [200, 60, 220] },
    phases: [
      {
        below: 0.5,
        speed: 1.6,
        attack: {
          kind: "shoot",
          cooldown: 50,
          damage: 1,
          speed: 3.5,
          count: 3,
          spread: 20,
          color: [255, 120, 60]
        }
      }
    ],
    lootTable: "boss",
    boss: true,
    color: [150, 30, 160],
    sprite: { frameTime: 20, frames: [creatureFrame(123)] }
  }
});

const ENEMY_TYPE_NAMES = Object.freeze(Object.keys(ENEMY_TYPES));

// Makes an enemy of the named type. Throws on an unknown name so a typo is loud.
function createEnemy(typeName, x, y) {
  if (!ENEMY_TYPE_NAMES.includes(typeName)) {
    throw new Error("Unknown enemy type: " + typeName);
  }
  return new Enemy(x, y, typeName);
}

function isNumberAtLeast(value, min) {
  return typeof value === "number" && value >= min;
}

function isColor(value) {
  return Array.isArray(value) && value.length === 3 && value.every((c) => isNumberAtLeast(c, 0));
}

// Checks one attack table, used for the base attack and for each phase attack.
function checkEnemyAttack(attackTable, bad) {
  const attack = attackTable || {};
  if (!Object.keys(ENEMY_ATTACKS).includes(attack.kind)) {
    bad("attack.kind is not in ENEMY_ATTACKS: " + attack.kind);
  }
  for (const key of ["cooldown", "damage", "speed"]) {
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
  if (!isColor(attack.color)) {
    bad("attack.color must be [r, g, b]");
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

// Returns a list of problems with an enemy table. An empty list means it is valid.
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
    if (type.move === "keepDistance" && !isNumberAtLeast(type.keepRange, 1)) {
      bad("keepDistance needs keepRange above 0");
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
      }
    }
    if (type.sprite === null) {
      if (!isColor(type.color)) {
        bad("needs a sprite or a color");
      }
    } else {
      const sprite = type.sprite || {};
      if (!isNumberAtLeast(sprite.frameTime, 1)) {
        bad("sprite.frameTime must be a number of at least 1");
      }
      const frames = sprite.frames;
      if (!Array.isArray(frames) || frames.length === 0) {
        bad("sprite.frames must be a non-empty list");
      } else {
        for (const frame of frames) {
          if (!frame.sheet || !isNumberAtLeast(frame.x, 0) || !isNumberAtLeast(frame.y, 0)) {
            bad("each sprite frame needs sheet, x and y");
          }
        }
      }
    }
  }
  return problems;
}
