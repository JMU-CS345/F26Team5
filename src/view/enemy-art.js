// What each kind of enemy looks like: sprite sheets, which cell of a sheet is which frame, and
// which frame to show. ENEMY_ART is keyed by enemy type name, like ENEMY_TYPES in
// model/enemy-types.js, which holds only stats and behavior. This file draws nothing, so
// Jasmine can load it. validateEnemyArt() and spec/enemy-contract.spec.js check a new entry.
// Load it after enemy-types.js.
//
// An entry is { sprite, projectile }. Both are optional.
//   sprite      { frameTime, frames: [{ sheet, x, y }] } in 16x16 cells. Without one the enemy
//               is a square in the type's color. A frame may add w and h (pixels, default 16)
//               and ax (the art x that sits at the hitbox center, default w / 2). The sprite may
//               add scale (screen pixels per art pixel, default hitbox length / 16) and
//               states: { windup: [frames], attack: [frames] } used while in that state.
//               directions: { down, up, left, right } each { hop: [frames], attack: [frames] }
//               picks art by which side the player is on (no flipping). hop plays in the
//               "hop" and "bounce" states, and hop[0] is shown while resting.
//               walk: { down, up, left, right } each { still, cycle }, for enemies that walk
//               like the player does. still is the standing frame. While enemy.walkFrames is
//               above 0, cycle plays, one frame per frameTime. Facing is the side the
//               player is on, and the art is never flipped.
//               aimFrames: a ring of frames chosen by the angle to the player.
//               A frame's ay is the art y that sits at the hitbox bottom (default h).
//   projectile  { frameTime, frames: [{ sheet, x, y, w, h }] }, an animated picture for the
//               shots this type fires. Without it a shot is a square in the attack's color.
//               It may add rotate: true. Then frames face down and are turned to the direction
//               of flight, and diagonalFrames (also facing down and to the left) are used for
//               shots that fly diagonally.

const ENEMY_SPRITE_SIZE = 16; // every sprite cell is 16x16 pixels in its sheet

const JELLY_SHEET = "assets/enemy/Jelly.png";
const CREATURE_SHEET = "assets/enemy/tiny-creatures.png";

// A frame of the Tiny Creatures sheet by tile number, 10 tiles per row counting from 0.
function creatureFrame(tile) {
  return { sheet: CREATURE_SHEET, x: (tile % 10) * 16, y: Math.floor(tile / 10) * 16 };
}

// Skeleton art, 16x16 cells: rows are walking down, up, right and left (2 or 3 frames each).
// The 8x8 shot frames sit at the bottom, from y = 64.
const SKELETON_SHEET = "assets/enemy/Skulleton.png";

function skeletonFrame(col, row) {
  return { sheet: SKELETON_SHEET, x: col * 16, y: row * 16 };
}

// One Skeleton direction, laid out like the player's walk: column 0 is standing, and the cycle
// goes step, standing, step, standing.
function skeletonWalk(row, cycleColumns) {
  return { still: skeletonFrame(0, row), cycle: cycleColumns.map((col) => skeletonFrame(col, row)) };
}

const BAT_SHEET = "assets/enemy/Bat.png";

// The two flying frames of the Bat, side by side in 16x16 cells.
function batFrame(index) {
  return { sheet: BAT_SHEET, x: index * 16, y: 16 };
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

const ENEMY_ART = Object.freeze({
  Jelly: {
    sprite: {
      frameTime: 20,
      frames: [
        { sheet: JELLY_SHEET, x: 0, y: 16 },
        { sheet: JELLY_SHEET, x: 16, y: 16 }
      ]
    }
  },
  Zombie: {
    sprite: { frameTime: 20, frames: [creatureFrame(0), creatureFrame(99)] }
  },
  Skeleton: {
    sprite: {
      frameTime: 10,
      frames: [skeletonFrame(0, 0)],
      walk: {
        down: skeletonWalk(0, [1, 0, 2, 0]),
        up: skeletonWalk(1, [1, 0, 2, 0]),
        right: skeletonWalk(2, [1, 0]),
        left: skeletonWalk(3, [1, 0])
      }
    },
    projectile: {
      frameTime: 8,
      frames: [
        { sheet: SKELETON_SHEET, x: 0, y: 64, w: 8, h: 8 },
        { sheet: SKELETON_SHEET, x: 8, y: 64, w: 8, h: 8 }
      ]
    }
  },
  Bat: {
    sprite: { frameTime: 8, frames: [batFrame(0), batFrame(1)] }
  },
  Eyeball: {
    sprite: { frameTime: 20, frames: [creatureFrame(5)] }
  },
  Bouncer: {
    // Four directions, each with 2 hop frames and a sword frame, drawn at full size. Hop cells
    // are 32x32 with the feet on the bottom row. The sword frames are bigger, with the blade
    // reaching out the way he faces. A frame's ax and ay are the art pixel that sits at the
    // bottom center of the hitbox.
    sprite: {
      frameTime: 8,
      scale: 1,
      frames: bouncerHops(0),
      directions: {
        down: {
          hop: bouncerHops(0),
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 130, w: 32, h: 46, ax: 17, ay: 28 }]
        },
        up: {
          hop: bouncerHops(32),
          // On the sheet the two swords meet tip to tip at rows 175 and 176: the forwards sword
          // hangs down from his hand, and the backwards sword points up from his hilt.
          attack: [{ sheet: BOUNCER_SHEET, x: 0, y: 176, w: 32, h: 48, ax: 17 }]
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
    // The Tracking Player row: 8 frames, each 16 wide and 32 tall, standing on the hitbox.
    // The trunk has one eye and each frame looks a different way. aimFrames goes from looking
    // at the viewer, through left to the back of the tree, then right (see aimFrameIndex).
    sprite: {
      frameTime: 8,
      frames: [sparkBarkFrame(0)],
      aimFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => sparkBarkFrame(i))
    },
    projectile: {
      frameTime: 6,
      rotate: true,
      // Facing down, then facing down and to the left. Both are 16x16 cells.
      frames: [
        { sheet: SPARK_BARK_SHEET, x: 0, y: 64, w: 16, h: 16 },
        { sheet: SPARK_BARK_SHEET, x: 16, y: 64, w: 16, h: 16 }
      ],
      diagonalFrames: [
        { sheet: SPARK_BARK_SHEET, x: 32, y: 64, w: 16, h: 16 },
        { sheet: SPARK_BARK_SHEET, x: 48, y: 64, w: 16, h: 16 }
      ]
    }
  },
  Demon: {
    sprite: { frameTime: 20, frames: [creatureFrame(123)] }
  }
});

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
  for (const dirName of Object.keys(sprite.walk || {})) {
    list = list.concat(sprite.walk[dirName].still, sprite.walk[dirName].cycle);
  }
  return list.concat(sprite.aimFrames || []);
}

// The frame to draw for this enemy right now. tick is any counter that grows each frame.
function enemySpriteFrame(enemy, sprite, tick) {
  if (sprite.aimFrames) {
    return sprite.aimFrames[aimFrameIndex(enemy.facingAngle, sprite.aimFrames.length)];
  }
  let frames = sprite.frames;
  if (sprite.walk) {
    const set = sprite.walk[enemy.facingDir];
    if (enemy.walkFrames === 0) {
      return set.still;
    }
    return set.cycle[Math.floor(enemy.walkFrames / sprite.frameTime) % set.cycle.length];
  }
  if (sprite.directions) {
    const set = sprite.directions[enemy.facingDir];
    frames = [set.hop[0]]; // still while resting, winding up or recovering
    if (enemy.state === "hop" || enemy.state === "bounce") {
      frames = set.hop;
    } else if (enemy.state === "attack") {
      frames = set.attack;
    }
  } else if (sprite.states && sprite.states[enemy.state]) {
    frames = sprite.states[enemy.state];
  }
  return frames[Math.floor(tick / sprite.frameTime) % frames.length];
}

// Every frame of an art entry: its sprite and its projectile pictures, so the loader can fetch
// each sheet.
function allArtFrames(art) {
  let list = art.sprite ? allSpriteFrames(art.sprite) : [];
  if (art.projectile) {
    list = list.concat(art.projectile.frames, art.projectile.diagonalFrames || []);
  }
  return list;
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

// Returns a list of problems with the enemy art. An empty list means it is valid. types is
// the table the art belongs to, since a type with no sprite needs a color to be drawn as.
function validateEnemyArt(art = ENEMY_ART, types = ENEMY_TYPES) {
  const problems = [];
  for (const name of Object.keys(art)) {
    if (!types[name]) {
      problems.push(name + ": art for an enemy type that does not exist");
    }
  }
  for (const name of Object.keys(types)) {
    const bad = (message) => problems.push(name + ": " + message);
    const entry = art[name] || {};
    const sprite = entry.sprite;
    if (sprite === undefined || sprite === null) {
      if (!isColor(types[name].color)) {
        bad("needs a sprite or a color");
      }
    } else {
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
      if (sprite.walk !== undefined) {
        for (const dirName of ["down", "up", "left", "right"]) {
          const set = sprite.walk[dirName] || {};
          checkSpriteFrames(set.still ? [set.still] : undefined, "sprite.walk." + dirName + ".still", bad);
          checkSpriteFrames(set.cycle, "sprite.walk." + dirName + ".cycle", bad);
        }
      }
      if (sprite.states !== undefined) {
        for (const stateName of Object.keys(sprite.states)) {
          checkSpriteFrames(sprite.states[stateName], "sprite.states." + stateName, bad);
        }
      }
    }
    const projectile = entry.projectile;
    if (projectile !== undefined) {
      if (!isNumberAtLeast(projectile.frameTime, 1)) {
        bad("projectile.frameTime must be a number of at least 1");
      }
      checkSpriteFrames(projectile.frames, "projectile.frames", bad);
      if (projectile.rotate) {
        checkSpriteFrames(projectile.diagonalFrames, "projectile.diagonalFrames", bad);
      }
    }
  }
  return problems;
}
