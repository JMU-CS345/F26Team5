// Drawing code for the class selection menu. Reads the model, never changes it.
// The class buttons are p5 DOM buttons, made in sketch.js.

const MODEL_BUTTON_W = 200;
const MODEL_BUTTON_GAP = 30;
const MENU_BUTTON_H = 80;
const MODEL_PREVIEW_SCALE = 5;
const CLASS_COLORS = {
  Fire: [230, 90, 40],
  Ice: [90, 180, 240],
  Mind: [170, 110, 230]
};

function drawClassMenu() {
  drawPixelText("Mage Quest", width / 2, height / 2 - 272, 64, UI_COLORS.goldLight, "center");
  drawPixelText("Choose your class", width / 2, height / 2 - 184, 24, UI_COLORS.white, "center");
  drawPixelText(
    "Click a class or press 1, 2 or 3", width / 2, height / 2 + 112, 16, UI_COLORS.stoneLight,
    "center"
  );
}

// Shows the chosen class during a run, under the HUD boxes.
function drawClassLabel(mageClass) {
  const c = CLASS_COLORS[mageClass];
  drawPixelText(mageClass + " Mage", 20, 100, 16, color(c[0], c[1], c[2]));
}

// Top of the model buttons, a bit below the middle of the canvas.
function modelButtonY() {
  return height / 2 + 90;
}

// Center x of the nth model button and preview.
function modelSlotCenterX(i) {
  const count = PLAYER_MODEL_NAMES.length;
  const total = count * MODEL_BUTTON_W + (count - 1) * MODEL_BUTTON_GAP;
  return CANVAS_WIDTH / 2 - total / 2 + i * (MODEL_BUTTON_W + MODEL_BUTTON_GAP) + MODEL_BUTTON_W / 2;
}

function drawModelMenu() {
  drawPixelText("Mage Quest", width / 2, height / 2 - 272, 64, UI_COLORS.goldLight, "center");
  drawPixelText(
    "Choose your playermodel", width / 2, height / 2 - 184, 24, UI_COLORS.white, "center"
  );

  // Each model standing and facing down, feet on one shared line above the buttons.
  PLAYER_MODEL_NAMES.forEach((name, i) => {
    const model = PLAYER_MODELS[name];
    const w = model.spriteW * MODEL_PREVIEW_SCALE;
    const h = model.spriteH * MODEL_PREVIEW_SCALE;
    image(
      playerSheets[name],
      modelSlotCenterX(i) - w / 2, modelButtonY() - 20 - h, w, h,
      0, 0, model.spriteW, model.spriteH
    );
  });

  drawPixelText(
    "Click a model or press 1 or 2", width / 2, height / 2 + 192, 16, UI_COLORS.stoneLight,
    "center"
  );
}
