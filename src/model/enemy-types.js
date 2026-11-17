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
//   boss           true shows a health bar at the top of the screen
//   phases         optional list like [{ below: 0.5, speed: 1.6, move: "chase", attack: {...} }].
//                  While health / maxHealth is below `below`, the phase's speed, move and
//                  attack replace the base ones. Every key except below is optional. List
//                  them from the highest below to the lowest. The lowest matching one wins.
//   lootTable      optional name of a loot pool: "elite" or "boss" (see LOOT_TABLES in
//                  loot-drops.js). Leave it out and the enemy drops nothing.
//   sprite         { frameTime, frames: [{ sheet, x, y }] } in 16x16 cells, or null.
//                  A frame may add w and h (pixels, default 16) and ax (the art x that sits
//                  at the hitbox center, default w / 2). The sprite may add scale (screen
//                  pixels per art pixel, default hitbox length / 16) and
//                  states: { windup: [frames], attack: [frames] } used while in that state.
//                  directions: { down, up, left, right } each { hop: [frames], attack: [frames] }
//                  picks art by which side the player is on (no flipping).
//                  aimFrames: a ring of frames chosen by the angle to the player.
//                  A frame's ay is the art y that sits at the hitbox bottom (default h).
//   color          [r, g, b] square drawn when there is no sprite
//   wanderSpeed    only for move "wanderChase"
//   keepRange      only for move "keepDistance"
//   hopRest, hopFrames, hopSpeed  only for moves "hop" and "hopSwing": frames resting,
//                  frames dashing, and pixels per frame while dashing

const ENEMY_SPRITE_SIZE = 16; // every sprite cell is 16x16 pixels in its sheet

const JELLY_SHEET = "assets/enemy/Jelly.png";
const CREATURE_SHEET = "assets/enemy/creatures-16bit.png";

// A frame of the Tiny Creatures sheet by tile number, 10 tiles per row counting from 0.
function creatureFrame(tile) {
  return { sheet: CREATURE_SHEET, x: (tile % 10) * 16, y: Math.floor(tile / 10) * 16 };
}

const BOUNCER_SHEET = "assets/enemy/Bouncer.png";
const SPARK_BARK_SHEET = "assets/enemy/Spark Bark.png";

function sparkBarkFrame(index) {
  return { sheet: SPARK_BARK_SHEET, x: index * 16, y: 16, w: 16, h: 32 };
}

// The two hop frames of one Bouncer direction row. y is the top of the row's 32x32 cells.
function bouncerHops(y) {
  return [
    { sheet: BOUNCER_SHEET, x: 0, y: y, w: 32, h: 32 },
    { sheet: BOUNCER_SHEET, x: 32, y: y, w: 32, h: 32 }
  ];
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
    lootTable: "elite",
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
    lootTable: "elite",
    boss: false,
    color: [90, 90, 200],
    // Four directions, each with 2 hop frames and a sword frame, drawn at half size. Hop cells
    // are 32x32 with the feet on the bottom row. A frame's ax and ay are the art pixel that
    // sits at the bottom center of the hitbox.
    sprite: {
      frameTime: 6,
      scale: 0.5,
      frames: bouncerHops(0),
      directions: {
        down: {
          hop: bouncerHops(0),
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 130, w: 32, h: 47, ax: 17, ay: 28 }]
        },
        up: {
          hop: bouncerHops(32),
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 177, w: 32, h: 45, ax: 17 }]
        },
        right: {
          hop: bouncerHops(64),
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 226, w: 48, h: 30, ax: 15 }]
        },
        left: {
          hop: bouncerHops(96),
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 258, w: 42, h: 30, ax: 32 }]
        }
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
    lootTable: "elite",
    boss: false,
    color: [120, 220, 90],
    // The Tracking Player row: 8 frames, each 16 wide and 32 tall, standing on the hitbox.
    // The trunk has one eye and each frame looks a different way. aimFrames goes from looking
    // at the viewer, through left to the back of the tree, then right (see aimFrameIndex).
    sprite: {
      frameTime: 8,
      frames: [sparkBarkFrame(0)],
      aimFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => sparkBarkFrame(i))
    }
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

// Which of count frames to show for an angle in radians (0 is right, y grows down). Frame 0
// looks straight down the screen, and the frames then turn through left, up and right.
function aimFrameIndex(angle, count) {
  const step = (2 * Math.PI) / count;
  const index = Math.round((angle - Math.PI / 2) / step);
  return ((index % count) + count) % count;
}

// Every frame a sprite can show, so the loader can fetch each sheet.
function allSpriteFrames(sprite) {
  let list = sprite.frames.slice();
  for (const stateName of Object.keys(sprite.states || {})) {
    list = list.concat(sprite.states[stateName]);
  }
  for (const dirName of Object.keys(sprite.directions || {})) {
    list = list.concat(sprite.directions[dirName].hop, sprite.directions[dirName].attack);
  }
  return list.concat(sprite.aimFrames || []);
}

// The frame to draw for this enemy right now. tick is any counter that grows each frame.
function enemySpriteFrame(enemy, sprite, tick) {
  if (sprite.aimFrames) {
    return sprite.aimFrames[aimFrameIndex(enemy.facingAngle, sprite.aimFrames.length)];
  }
  let frames = sprite.frames;
  if (sprite.directions) {
    const set = sprite.directions[enemy.facingDir];
    frames = [set.hop[0]]; // still while resting, winding up or recovering
    if (enemy.state === "hop") {
      frames = set.hop;
    } else if (enemy.state === "attack") {
      frames = set.attack;
    }
  } else if (sprite.states && sprite.states[enemy.state]) {
    frames = sprite.states[enemy.state];
  }
  return frames[Math.floor(tick / sprite.frameTime) % frames.length];
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
    for (const key of ["ax", "ay"]) {
      if (frame[key] !== undefined && !isNumberAtLeast(frame[key], 0)) {
        bad("sprite frame " + key + " must be at least 0");
      }
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
      if (sprite.scale !== undefined && !isNumberAtLeast(sprite.scale, 0.01)) {
        bad("sprite.scale must be a number above 0");
      }
      checkSpriteFrames(sprite.frames, "sprite.frames", bad);
      if (sprite.aimFrames !== undefined) {
        checkSpriteFrames(sprite.aimFrames, "sprite.aimFrames", bad);
      }
      if (sprite.directions !== undefined) {
        for (const dirName of ["down", "up", "left", "right"]) {
          const set = sprite.directions[dirName] || {};
          checkSpriteFrames(set.hop, "sprite.directions." + dirName + ".hop", bad);
          checkSpriteFrames(set.attack, "sprite.directions." + dirName + ".attack", bad);
        }
      }
      if (sprite.states !== undefined) {
        for (const stateName of Object.keys(sprite.states)) {
          checkSpriteFrames(sprite.states[stateName], "sprite.states." + stateName, bad);
        }
      }
    }
  }
  return problems;
}
