// Combat effect animations in assets/effects/effects.png. Model code: no p5 drawing calls.
// Each effect is one row of 16x16 cells. frameTime is game frames per cell. A looping effect
// (a shot in flight) repeats until its owner removes it. Other effects play once and are done.

const EFFECT_SHEET = "assets/effects/effects.png";
const EFFECT_CELL = 16;

function effectRow(row, frames, frameTime, loops) {
  const cells = [];
  for (let i = 0; i < frames; i++) {
    cells.push({ x: i * EFFECT_CELL, y: row * EFFECT_CELL });
  }
  return { sheet: EFFECT_SHEET, frames: frames, frameTime: frameTime, loops: loops, cells: cells };
}

// The slash arc is drawn facing right. Rotate it for other directions.
const EFFECT_FRAMES = Object.freeze({
  slash: effectRow(0, 3, 3, false),
  fireShot: effectRow(1, 2, 6, true),
  iceShot: effectRow(2, 2, 6, true),
  mindShot: effectRow(3, 2, 6, true),
  hitSpark: effectRow(4, 3, 3, false),
  deathPoof: effectRow(5, 4, 5, false)
});

const EFFECT_NAMES = Object.freeze(Object.keys(EFFECT_FRAMES));

// The shot effect for a mage class, or null for an unknown class.
function shotEffectName(mageClass) {
  const names = { Fire: "fireShot", Ice: "iceShot", Mind: "mindShot" };
  return names[mageClass] || null;
}

// Game frames a one-shot effect lasts.
function effectDuration(name) {
  const effect = EFFECT_FRAMES[name];
  return effect.frames * effect.frameTime;
}

// True once a one-shot effect has played every frame. A looping effect is never done.
function effectIsDone(name, age) {
  return !EFFECT_FRAMES[name].loops && age >= effectDuration(name);
}

// Which frame to show at an age in game frames. Loops wrap, one-shots hold the last frame.
function effectFrameIndex(name, age) {
  const effect = EFFECT_FRAMES[name];
  const step = Math.floor(Math.max(0, age) / effect.frameTime);
  if (effect.loops) {
    return step % effect.frames;
  }
  return Math.min(step, effect.frames - 1);
}

// The sheet cell { sheet, x, y, w, h } to draw at an age.
function effectCell(name, age) {
  const effect = EFFECT_FRAMES[name];
  const cell = effect.cells[effectFrameIndex(name, age)];
  return { sheet: effect.sheet, x: cell.x, y: cell.y, w: EFFECT_CELL, h: EFFECT_CELL };
}
