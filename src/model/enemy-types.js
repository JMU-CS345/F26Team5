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
//   attack         null, or { kind, cooldown, damage, ... }. kind is a key of ENEMY_ATTACKS.
//                  shoot also needs speed and color, and may have count and spread (degrees).
//                  melee needs reach, windup and recover (frames) and no speed or color.
//   boss           true shows a health bar above it
//   sprite         { frameTime, frames: [{ sheet, x, y }] } in 16x16 cells, or null.
//                  A frame may add w and h (pixels, default 16) and ax (the art x that sits
//                  at the hitbox center, default w / 2). The sprite may add scale (screen
//                  pixels per art pixel, default hitbox length / 16) and
//                  states: { windup: [frames], attack: [frames] } used while in that state.
//   color          [r, g, b] square drawn when there is no sprite
//   wanderSpeed    only for move "wanderChase"
//   keepRange      only for move "keepDistance"
//   hopRest, hopFrames, hopSpeed  only for moves "hop" and "hopSwing": frames resting,
//                  frames dashing, and pixels per frame while dashing

const ENEMY_SPRITE_SIZE = 16; // every sprite cell is 16x16 pixels in its sheet

const JELLY_SHEET = "assets/enemy/Jelly.png";
const CREATURE_SHEET = "assets/enemy/tiny-creatures.png";

// A frame of the Tiny Creatures sheet by tile number, 10 tiles per row counting from 0.
function creatureFrame(tile) {
  return { sheet: CREATURE_SHEET, x: (tile % 10) * 16, y: Math.floor(tile / 10) * 16 };
}

const BOUNCER_SHEET = "assets/enemy/Bouncer.png";
const SPARK_BARK_SHEET = "assets/enemy/Spark Bark.png";

function sparkBarkFrame(index) {
  return { sheet: SPARK_BARK_SHEET, x: index * 16, y: 16, w: 16, h: 32 };
}

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
  Bouncer: {
    length: 16,
    width: 16,
    speed: 0, // it only moves in its dashes
    maxHealth: 5,
    detectionRange: 220,
    contactDamage: 1,
    move: "hopSwing",
    hopRest: 50,
    hopFrames: 14,
    hopSpeed: 2,
    attack: { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 20, recover: 24 },
    boss: false,
    color: [90, 90, 200],
    // Art cells are 32x32 (48x32 for the sword), drawn at half size. The art faces right.
    sprite: {
      frameTime: 12,
      scale: 0.5,
      frames: [
        { sheet: BOUNCER_SHEET, x: 0, y: 64, w: 32, h: 32 },
        { sheet: BOUNCER_SHEET, x: 32, y: 64, w: 32, h: 32 }
      ],
      states: {
        attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 224, w: 48, h: 32, ax: 15 }]
      }
    }
  },
  SparkBark: {
    length: 16,
    width: 16,
    speed: 0.5,
    maxHealth: 4,
    detectionRange: 240,
    contactDamage: 1,
    move: "chase",
    attack: { kind: "shoot", cooldown: 100, damage: 1, speed: 2.2, count: 3, spread: 25,
      color: [120, 220, 90] },
    boss: false,
    color: [120, 220, 90],
    // The Tracking Player row: 8 frames, each 16 wide and 32 tall, standing on the hitbox.
    sprite: { frameTime: 8, frames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => sparkBarkFrame(i)) }
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

// Adds a problem through bad() for each thing wrong with a list of sprite frames.
function checkSpriteFrames(frames, label, bad) {
  if (!Array.isArray(frames) || frames.length === 0) {
    bad(label + " must be a non-empty list");
    return;
  }
  for (const frame of frames) {
    if (!frame.sheet || !isNumberAtLeast(frame.x, 0) || !isNumberAtLeast(frame.y, 0)) {
      bad("each sprite frame needs sheet, x and y");
    }
    for (const key of ["w", "h"]) {
      if (frame[key] !== undefined && !isNumberAtLeast(frame[key], 1)) {
        bad("sprite frame " + key + " must be at least 1");
      }
    }
    if (frame.ax !== undefined && !isNumberAtLeast(frame.ax, 0)) {
      bad("sprite frame ax must be at least 0");
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
    if (type.move === "hop" || type.move === "hopSwing") {
      for (const key of ["hopRest", "hopFrames", "hopSpeed"]) {
        if (!isNumberAtLeast(type[key], 0.01)) {
          bad(type.move + " needs " + key + " above 0");
        }
      }
    }
    if (type.move === "hopSwing" && !(type.attack && type.attack.kind === "melee")) {
      bad("hopSwing needs a melee attack");
    }
    if (type.attack !== null) {
      const attack = type.attack || {};
      if (!Object.keys(ENEMY_ATTACKS).includes(attack.kind)) {
        bad("attack.kind is not in ENEMY_ATTACKS: " + attack.kind);
      }
      let attackKeys = ["cooldown", "damage", "speed"];
      if (attack.kind === "melee") {
        attackKeys = ["cooldown", "damage", "reach", "windup", "recover"];
      }
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
      if (attack.kind !== "melee" && !isColor(attack.color)) {
        bad("attack.color must be [r, g, b]");
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
      if (sprite.scale !== undefined && !isNumberAtLeast(sprite.scale, 0.01)) {
        bad("sprite.scale must be a number above 0");
      }
      checkSpriteFrames(sprite.frames, "sprite.frames", bad);
      if (sprite.states !== undefined) {
        for (const stateName of Object.keys(sprite.states)) {
          checkSpriteFrames(sprite.states[stateName], "sprite.states." + stateName, bad);
        }
      }
    }
  }
  return problems;
}
