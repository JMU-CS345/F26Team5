// Player model data: the one layered wizard. No p5 drawing calls, so Jasmine can test it
// without a canvas. Load this before game.js, player.js and the view files.

// Every layer sheet has the same grid: one column per frame in FRAME_ORDER, one row per
// direction. Left is drawn by flipping right.
const SPRITE_W = 24;
const SPRITE_H = 28;
const SPRITE_ROWS = Object.freeze({ down: 0, up: 1, right: 2 });

// First column and frame count of each animation state.
const FRAME_TABLE = Object.freeze({
  idle: { start: 0, frames: 1 },
  walk: { start: 1, frames: 4 },
  swing: { start: 5, frames: 3 }, // windup, active, recover
  cast: { start: 8, frames: 2 },
  dash: { start: 10, frames: 1 },
  hurt: { start: 11, frames: 1 },
  ko: { start: 12, frames: 2 }
});

// Drawn bottom to top.
const PLAYER_LAYERS = Object.freeze(["robe", "body", "hat", "hood", "eyes", "flame"]);
const HAT_STYLES = Object.freeze(["pointed", "hood"]);
const DEFAULT_HAT_STYLE = "pointed";
const HAT_STYLE_LABELS = Object.freeze({ pointed: "Pointed", hood: "Hood" });

const PLAYER_MODELS = Object.freeze({
  Wizard: {
    spriteW: SPRITE_W,
    spriteH: SPRITE_H,
    layerDir: "assets/player/layers/",
    frameTable: FRAME_TABLE,
    layers: PLAYER_LAYERS
  }
});

// Kept so other code (and the menus) can still ask for the model name.
const PLAYER_MODEL_NAMES = Object.freeze(Object.keys(PLAYER_MODELS));

// Colors the layer PNGs are drawn in. A recolor swaps these for the chosen colors.
const KEY_RAMP = Object.freeze([[70, 70, 70], [140, 140, 140], [210, 210, 210]]);
const KEY_FLAME = Object.freeze([[255, 245, 160], [255, 160, 30], [222, 70, 30]]);
const KEY_SKIN = Object.freeze([232, 184, 144]);
const KEY_EYES = Object.freeze([26, 22, 38]);
const KEY_RUNE = Object.freeze([200, 40, 44]);
const KEY_HOOD_EYES = Object.freeze([255, 150, 30]);

// Dark, mid and light of the robe, hat and hood, and core, mid and outer of the flame.
const CLASS_LOOKS = Object.freeze({
  Fire: {
    robe: [[120, 28, 24], [196, 52, 38], [236, 112, 56]],
    hat: [[104, 24, 22], [178, 40, 34], [226, 96, 48]],
    hood: [[58, 16, 20], [96, 26, 30], [150, 48, 44]],
    flame: [[255, 245, 160], [255, 160, 30], [222, 70, 30]]
  },
  Ice: {
    robe: [[30, 70, 130], [60, 132, 196], [150, 210, 240]],
    hat: [[26, 56, 108], [48, 106, 172], [130, 190, 230]],
    hood: [[20, 36, 70], [36, 68, 112], [80, 132, 176]],
    flame: [[235, 252, 255], [130, 215, 255], [50, 130, 220]]
  },
  Mind: {
    robe: [[70, 36, 120], [122, 76, 184], [186, 148, 235]],
    hat: [[56, 28, 96], [98, 56, 160], [168, 128, 220]],
    hood: [[38, 22, 70], [70, 44, 112], [120, 88, 170]],
    flame: [[250, 235, 255], [205, 140, 255], [130, 60, 220]]
  }
});

// The start-of-run look for a class. Unknown classes get the Fire look.
// eyes is null until the player picks a color: dark under a hat, orange in a hood.
function defaultAppearance(mageClass, hatStyle = DEFAULT_HAT_STYLE) {
  let look = CLASS_LOOKS.Fire;
  if (CLASS_LOOKS[mageClass]) {
    look = CLASS_LOOKS[mageClass];
  }
  let style = DEFAULT_HAT_STYLE;
  if (HAT_STYLES.includes(hatStyle)) {
    style = hatStyle;
  }
  return {
    skin: KEY_SKIN.slice(),
    robe: look.robe.map((c) => c.slice()),
    hat: look.hat.map((c) => c.slice()),
    hood: look.hood.map((c) => c.slice()),
    hatStyle: style,
    eyes: null,
    flame: look.flame.map((c) => c.slice())
  };
}

// The skin color, a shaded skin and a nose color, the way the body layer is drawn.
function skinRamp(skin) {
  return [
    skin.slice(),
    [Math.floor(skin[0] * 0.8), Math.floor(skin[1] * 0.75), Math.floor(skin[2] * 0.75)],
    [Math.floor(skin[0] * 0.92), Math.floor(skin[1] * 0.82), Math.floor(skin[2] * 0.82)]
  ];
}

// Which layers draw for a hat style. The eyes layer is the face under a hat.
function layersForStyle(hatStyle) {
  if (hatStyle === "hood") {
    return ["robe", "body", "hood", "flame"];
  }
  return ["robe", "body", "hat", "eyes", "flame"];
}

function eyeColorFor(appearance) {
  if (appearance.eyes) {
    return appearance.eyes;
  }
  if (appearance.hatStyle === "hood") {
    return KEY_HOOD_EYES;
  }
  return KEY_EYES;
}

// The color swaps for one layer as [from, to] pairs, or [] when the layer is not recolored.
function recolorPairs(layerName, appearance) {
  const pairs = [];
  const addRamp = (keys, colors) => {
    for (let i = 0; i < keys.length; i++) {
      pairs.push([keys[i], colors[i]]);
    }
  };
  if (layerName === "robe") {
    addRamp(KEY_RAMP, appearance.robe);
  } else if (layerName === "hat") {
    addRamp(KEY_RAMP, appearance.hat);
  } else if (layerName === "hood") {
    addRamp(KEY_RAMP, appearance.hood);
    pairs.push([KEY_RUNE, appearance.flame[1]]);
    pairs.push([KEY_HOOD_EYES, eyeColorFor(appearance)]);
  } else if (layerName === "flame") {
    addRamp(KEY_FLAME, appearance.flame);
  } else if (layerName === "eyes") {
    pairs.push([KEY_EYES, eyeColorFor(appearance)]);
  } else if (layerName === "body") {
    addRamp(skinRamp(KEY_SKIN), skinRamp(appearance.skin));
  }
  return pairs;
}

// A string that is the same for the same swaps, used to cache recolored layers.
function recolorKey(layerName, appearance) {
  return layerName + ":" + JSON.stringify(recolorPairs(layerName, appearance));
}

// Where to draw the sprite so its feet sit on the hitbox, centered on it.
// pos is the hitbox top-left, hitW and hitH the hitbox size (16x16 for the player).
function spriteOrigin(pos, hitW, hitH) {
  return {
    left: pos.x - (SPRITE_W - hitW) / 2,
    top: pos.y - (SPRITE_H - hitH)
  };
}

const STEP_TIME = 8; // game frames per walk frame
const CAST_STEP_TIME = 6; // game frames per cast frame
const HURT_POSE_FRAMES = 12; // frames of the hurt pose after a hit
const KO_STEP_TIME = 12; // dying frames before the second KO frame

// Which frame to draw: { state, index, col, row, flip }. Pure reading of the player.
function playerFrame(player) {
  let state = "idle";
  let index = 0;
  if (player.isDead()) {
    state = "ko";
    if (player.deathFrames >= KO_STEP_TIME) {
      index = 1;
    }
  } else if (player.isDashing()) {
    state = "dash";
  } else if (player.attack !== null) {
    state = "swing";
    const phase = player.attack.phase();
    if (phase === "active") {
      index = 1;
    } else if (phase === "recovery") {
      index = 2;
    }
  } else if (player.iFrames > HIT_IFRAMES - HURT_POSE_FRAMES) {
    state = "hurt";
  } else if (player.isArmUp()) {
    state = "cast";
    index = Math.floor(player.walkFrames / CAST_STEP_TIME) % 2;
  } else if (player.walkFrames > 0) {
    state = "walk";
    index = Math.floor(player.walkFrames / STEP_TIME) % FRAME_TABLE.walk.frames;
  }
  let facing = player.facing;
  let flip = false;
  if (facing === "left") {
    facing = "right";
    flip = true;
  }
  return {
    state: state,
    index: index,
    col: FRAME_TABLE[state].start + index,
    row: SPRITE_ROWS[facing],
    flip: flip
  };
}
