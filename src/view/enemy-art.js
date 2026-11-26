// What each kind of enemy looks like: sprite sheets, which cell of a sheet is which frame, and
// which frame to show. ENEMY_ART is keyed by enemy type name, like ENEMY_TYPES in
// model/enemy-types.js, which holds only stats and behavior. This file draws nothing, so
// Jasmine can load it. validateEnemyArt() and spec/enemy-contract.spec.js check a new entry.
// Load it after enemy-types.js.
//
// An entry is { sprite, projectile, zap, strike }. All are optional.
//   sprite      { frameTime, frames: [{ sheet, x, y }] } in 16x16 cells. Without one the enemy
//               is a square in the type's color. A frame may add w and h (pixels, default 16)
//               and ax (the art x that sits at the hitbox center, default w / 2). The sprite may
//               add scale (screen pixels per art pixel, default hitbox length / 16) and
//               states: { windup: [frames], attack: [frames], recover: [frames] } used while in
//               that state.
//               directions: { down, up, left, right } each { hop: [frames], attack: [frames] }
//               picks art by which side the player is on (no flipping). hop plays in the
//               "hop" and "bounce" states, and hop[0] is shown while resting.
//               walk: { down, up, left, right } each { still, cycle }, for enemies that walk
//               like the player does. still is the standing frame. While enemy.walkFrames is
//               above 0, cycle plays, one frame per frameTime. Facing is the side the enemy
//               looks (the player's side, or the way it walks for type.facing "travel"), and
//               the art is never flipped. A set may also have run (a cycle played instead of
//               cycle while the enemy is in the "run" state) and act (one frame shown while it
//               is winding up, attacking or recovering: the attack pose). The sprite may add
//               runFrameTime (frames per run frame, default frameTime).
//               walkCycle: frames for art with only one view (a boss). They play while the
//               enemy is walking, and frames[0] is shown standing still. states still apply.
//               noFlip: true keeps a plain sprite from being mirrored when the enemy faces left.
//               aimFrames: a ring of frames chosen by the angle to the player.
//               A frame's ay is the art y that sits at the hitbox bottom (default h).
//   projectile  { frameTime, frames: [{ sheet, x, y, w, h }] }, an animated picture for the
//               shots this type fires. Without it a shot is a square in the attack's color.
//               It may add rotate: true. Then frames face down and are turned to the direction
//               of flight, and diagonalFrames (also facing down and to the left) are used for
//               shots that fly diagonally.
//   zap         { frameTime, frames: [{ sheet, x, y, w, h }] }, for an enemy with a zap attack:
//               the bolt drawn in front of it while the bolt is out. The frames face down and
//               are turned to whichever of the four sides the enemy faces. They start at the
//               enemy's hitbox edge and reach out as far as the frame is tall.
//   strike      { frameTime, body: [frames], impact: [small, big] }, for an enemy with a strike
//               attack: the bolt from the sky is body frames stacked up from the spot, and the
//               impact frames are drawn on the spot (ax and ay, the art pixel that sits on the
//               spot, default the middle of the frame).

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

// Ghoul art: 16x32 cells, three columns (0 is standing, 1 and 2 are the steps). Rows of 32 pixels:
// walking down, up, right, left, then running down, up, right, left (red eyes).
const GHOUL_SHEET = "assets/enemy/Ghoul.png";

function ghoulFrame(col, row) {
  return { sheet: GHOUL_SHEET, x: col * 16, y: row * 32, w: 16, h: 32 };
}

// One Ghoul direction: the walk row and the run row of that direction. The cycle is the player's:
// step, standing, other step, standing.
function ghoulWalk(walkRow, runRow) {
  const cycle = [1, 0, 2, 0];
  return {
    still: ghoulFrame(0, walkRow),
    cycle: cycle.map((col) => ghoulFrame(col, walkRow)),
    run: cycle.map((col) => ghoulFrame(col, runRow))
  };
}

// Peeper Jr. art: eight 16x16 eye frames at y = 16, in the same order as the Spark Bark's. The
// 8x8 shot is at the bottom left, from y = 32.
const PEEPER_SHEET = "assets/enemy/Peeper.png";

function peeperFrame(index) {
  return { sheet: PEEPER_SHEET, x: index * 16, y: 16 };
}

// Demon Knight art: 64x64 cells. Walking is five frames in the top row, shooting is six in the
// second row (two plain, three charging and one firing). The 16x16 shot is at the bottom left.
const DEMON_KNIGHT_SHEET = "assets/enemy/Demon Knight.png";

function knightFrame(col, row) {
  return { sheet: DEMON_KNIGHT_SHEET, x: col * 64, y: row * 64, w: 64, h: 64 };
}

// Blockette art: 16x16 cells, two frames per row: walking down, up, right, left. The shield is on
// the side it faces.
const BLOCKETTE_SHEET = "assets/enemy/Blockette.png";

function blocketteWalk(row) {
  return {
    still: { sheet: BLOCKETTE_SHEET, x: 0, y: row * 16 },
    cycle: [0, 1].map((col) => ({ sheet: BLOCKETTE_SHEET, x: col * 16, y: row * 16 }))
  };
}

// Shadow Wizard Money Gang art, one sheet for all three. Each wizard has rows for walking down,
// up, right and left (two frames each), a row of four attack poses (down, right, up, left), and
// the art for its attack:
//   purple  16x16 cells, rows from y = 16, and the magic bolt (16x16) at y = 96
//   yellow  16x32 cells, rows from y = 128, the lightning (16x32, four frames) at y = 288
//   green   32x32 cells, rows from y = 336, the lightning body (16x32, two frames) at y = 496 and
//           the impact (a small one and a big one) at y = 532
const WIZARD_SHEET = "assets/enemy/Shadow Wizard Money Gang.png";
const WIZARD_POSE_ORDER = ["down", "right", "up", "left"]; // the order of an attack pose row

// The walk sets of one wizard colour. w and h are the cell size, firstRow the y of the walk row
// facing down, and poseRow the y of the attack pose row.
function wizardWalk(w, h, firstRow, poseRow) {
  const walk = {};
  ["down", "up", "right", "left"].forEach((dir, row) => {
    const y = firstRow + row * h;
    walk[dir] = {
      still: { sheet: WIZARD_SHEET, x: 0, y: y, w: w, h: h },
      cycle: [0, 1].map((col) => ({ sheet: WIZARD_SHEET, x: col * w, y: y, w: w, h: h })),
      act: { sheet: WIZARD_SHEET, x: WIZARD_POSE_ORDER.indexOf(dir) * w, y: poseRow, w: w, h: h }
    };
  });
  return walk;
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
  Ghoul: {
    // 16x32 art on a 16x16 hitbox: his feet stand on the bottom of the hitbox and he rises above it.
    // He looks the way he walks. Red eyes, and a faster cycle, while he hunts.
    sprite: {
      frameTime: 12,
      runFrameTime: 7,
      scale: 1,
      frames: [ghoulFrame(0, 0)],
      walk: {
        down: ghoulWalk(0, 4),
        up: ghoulWalk(1, 5),
        right: ghoulWalk(2, 6),
        left: ghoulWalk(3, 7)
      }
    }
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
  PeeperJr: {
    // The eye turns to look at the player, like the Spark Bark's. Frame 0 looks at the viewer,
    // then the frames turn through left, to the back of the eye, and round through right.
    sprite: {
      frameTime: 8,
      frames: [peeperFrame(0)],
      aimFrames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => peeperFrame(i))
    },
    projectile: {
      frameTime: 8,
      frames: [{ sheet: PEEPER_SHEET, x: 0, y: 32, w: 8, h: 8 }]
    }
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
  DemonKnight: {
    // 64x64 on a 64x64 hitbox, drawn at full size. He stomps (the five walking frames) and only
    // faces front. While he charges a shot the glowing frames play, and the firing pose follows.
    sprite: {
      frameTime: 8,
      scale: 1,
      noFlip: true,
      frames: [knightFrame(0, 0)],
      walkCycle: [0, 1, 2, 3, 4].map((col) => knightFrame(col, 0)),
      states: {
        windup: [knightFrame(2, 1), knightFrame(3, 1), knightFrame(4, 1)],
        recover: [knightFrame(5, 1)]
      }
    },
    projectile: {
      frameTime: 8,
      frames: [{ sheet: DEMON_KNIGHT_SHEET, x: 0, y: 128, w: 16, h: 16 }]
    }
  },
  Blockette: {
    sprite: {
      frameTime: 12,
      frames: [{ sheet: BLOCKETTE_SHEET, x: 0, y: 0 }],
      walk: {
        down: blocketteWalk(0),
        up: blocketteWalk(1),
        right: blocketteWalk(2),
        left: blocketteWalk(3)
      }
    }
  },
  ShadowWizardPurple: {
    sprite: {
      frameTime: 14,
      scale: 1,
      frames: [{ sheet: WIZARD_SHEET, x: 0, y: 16, w: 16, h: 16 }],
      walk: wizardWalk(16, 16, 16, 80)
    },
    projectile: {
      frameTime: 6,
      rotate: true,
      // The bolt faces down. The shots only fly along the four sides, but a rotating shot needs
      // diagonal frames, so it gets the same picture.
      frames: [{ sheet: WIZARD_SHEET, x: 0, y: 96, w: 16, h: 16 }],
      diagonalFrames: [{ sheet: WIZARD_SHEET, x: 0, y: 96, w: 16, h: 16 }]
    }
  },
  ShadowWizardYellow: {
    sprite: {
      frameTime: 14,
      scale: 1,
      frames: [{ sheet: WIZARD_SHEET, x: 0, y: 128, w: 16, h: 32 }],
      walk: wizardWalk(16, 32, 128, 256)
    },
    zap: {
      frameTime: 2,
      frames: [0, 1, 2, 3].map((i) => ({ sheet: WIZARD_SHEET, x: i * 16, y: 288, w: 16, h: 32 }))
    }
  },
  ShadowWizardGreen: {
    sprite: {
      frameTime: 16,
      scale: 1,
      frames: [{ sheet: WIZARD_SHEET, x: 0, y: 336, w: 32, h: 32 }],
      walk: wizardWalk(32, 32, 336, 464)
    },
    strike: {
      frameTime: 3,
      // The two body frames join end to end, so they stack into a bolt as tall as it needs to be.
      body: [0, 1].map((i) => ({ sheet: WIZARD_SHEET, x: i * 16, y: 496, w: 16, h: 32 })),
      impact: [
        { sheet: WIZARD_SHEET, x: 0, y: 532, w: 32, h: 28, ax: 16, ay: 12 },
        { sheet: WIZARD_SHEET, x: 32, y: 532, w: 32, h: 28, ax: 16, ay: 14 }
      ]
    }
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
    const set = sprite.walk[dirName];
    list = list.concat(set.still, set.cycle, set.run || [], set.act || []);
  }
  return list.concat(sprite.aimFrames || [], sprite.walkCycle || []);
}

// True in the states where an enemy is making an attack, so the art shows the attack pose.
function isAttackingState(state) {
  return state === "windup" || state === "attack" || state === "recover";
}

// The frame to draw for this enemy right now. tick is any counter that grows each frame.
function enemySpriteFrame(enemy, sprite, tick) {
  if (sprite.aimFrames) {
    return sprite.aimFrames[aimFrameIndex(enemy.facingAngle, sprite.aimFrames.length)];
  }
  let frames = sprite.frames;
  if (sprite.walk) {
    const set = sprite.walk[enemy.facingDir];
    if (set.act && isAttackingState(enemy.state)) {
      return set.act;
    }
    if (enemy.walkFrames === 0) {
      return set.still;
    }
    if (set.run && enemy.state === "run") {
      const runTime = sprite.runFrameTime || sprite.frameTime;
      return set.run[Math.floor(enemy.walkFrames / runTime) % set.run.length];
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
  } else if (sprite.walkCycle) {
    if (enemy.walkFrames === 0) {
      return sprite.frames[0];
    }
    return sprite.walkCycle[Math.floor(enemy.walkFrames / sprite.frameTime) % sprite.walkCycle.length];
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
  if (art.zap) {
    list = list.concat(art.zap.frames);
  }
  if (art.strike) {
    list = list.concat(art.strike.body, art.strike.impact);
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
          if (set.run !== undefined) {
            checkSpriteFrames(set.run, "sprite.walk." + dirName + ".run", bad);
          }
          if (set.act !== undefined) {
            checkSpriteFrames([set.act], "sprite.walk." + dirName + ".act", bad);
          }
        }
        if (sprite.runFrameTime !== undefined && !isNumberAtLeast(sprite.runFrameTime, 1)) {
          bad("sprite.runFrameTime must be a number of at least 1");
        }
      }
      if (sprite.walkCycle !== undefined) {
        checkSpriteFrames(sprite.walkCycle, "sprite.walkCycle", bad);
      }
      if (sprite.states !== undefined) {
        for (const stateName of Object.keys(sprite.states)) {
          checkSpriteFrames(sprite.states[stateName], "sprite.states." + stateName, bad);
        }
      }
    }
    if (entry.zap !== undefined) {
      if (!isNumberAtLeast(entry.zap.frameTime, 1)) {
        bad("zap.frameTime must be a number of at least 1");
      }
      checkSpriteFrames(entry.zap.frames, "zap.frames", bad);
    }
    if (entry.strike !== undefined) {
      if (!isNumberAtLeast(entry.strike.frameTime, 1)) {
        bad("strike.frameTime must be a number of at least 1");
      }
      checkSpriteFrames(entry.strike.body, "strike.body", bad);
      checkSpriteFrames(entry.strike.impact, "strike.impact", bad);
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
