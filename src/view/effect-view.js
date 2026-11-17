// Draws combat effects from the effect sheet. Reads effect-frames.js, never changes it.

const effectSheets = {}; // sheet path -> loaded image

// Call once in setup(), with await.
async function loadEffectSheets() {
  effectSheets[EFFECT_SHEET] = await loadImageFile(EFFECT_SHEET);
}

// Draws an effect centered on (x, y). startFrame is the frameCount when it began, so its age
// is frameCount - startFrame. scale is screen pixels per art pixel. angle is in radians and
// turns the art, which faces right.
function drawEffect(name, x, y, startFrame, scale = 1, angle = 0) {
  const age = frameCount - startFrame;
  const cell = effectCell(name, age);
  const size = cell.w * scale;
  push();
  translate(x, y);
  rotate(angle);
  image(effectSheets[cell.sheet], -size / 2, -size / 2, size, size, cell.x, cell.y, cell.w, cell.h);
  pop();
}
