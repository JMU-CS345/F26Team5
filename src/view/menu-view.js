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
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, height / 2 - 240);
  textSize(28);
  text("Choose your class", width / 2, height / 2 - 170);
  textSize(18);
  fill(180);
  text("Click a class or press 1, 2 or 3", width / 2, height / 2 + 120);
}

// Shows the chosen class during a run, top right.
function drawClassLabel(mageClass) {
  noStroke();
  fill(...CLASS_COLORS[mageClass]);
  textSize(24);
  textAlign(RIGHT, CENTER);
  text(mageClass + " Mage", width - 20, 34);
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
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, height / 2 - 240);
  textSize(28);
  text("Choose your playermodel", width / 2, height / 2 - 170);

  // Each model standing and facing down, feet on one shared line above the buttons.
  PLAYER_MODEL_NAMES.forEach((name, i) => {
    const model = PLAYER_ART[name];
    const w = model.spriteW * MODEL_PREVIEW_SCALE;
    const h = model.spriteH * MODEL_PREVIEW_SCALE;
    image(
      playerSheets[name],
      modelSlotCenterX(i) - w / 2, modelButtonY() - 20 - h, w, h,
      0, 0, model.spriteW, model.spriteH
    );
  });

  textSize(18);
  fill(180);
  text("Click a model or press 1 or 2", width / 2, height / 2 + 200);
}

// Customization screen (#23): a big preview of the player on the left, and one row per part
// on the right. Each row has a color picker and a hex code box. Both are p5 DOM elements, made in
// sketch.js, and are placed using the helpers below so they line up with what is drawn here.
const CUSTOMIZE_PREVIEW_SCALE = 8;
const CUSTOMIZE_PREVIEW_X = 400; // center x of the preview
const CUSTOMIZE_ROWS_X = 820; // center x of the rows
const CUSTOMIZE_ROW_GAP = 80;
const CUSTOMIZE_PANEL_W = 460;
const CUSTOMIZE_PANEL_H = 64;
const CUSTOMIZE_PICKER_W = 72;
const CUSTOMIZE_PICKER_H = 48;
const CUSTOMIZE_HEX_W = 190;

// Center y of the nth customization row.
function customizeRowY(i) {
  return 230 + i * CUSTOMIZE_ROW_GAP;
}

// Left edge of the rows' panels.
function customizePanelLeft() {
  return CUSTOMIZE_ROWS_X - CUSTOMIZE_PANEL_W / 2;
}

// Top-left corner of the color picker and the hex box on the nth row.
function customizePickerPosition(i) {
  return {
    x: customizePanelLeft() + 150,
    y: customizeRowY(i) - CUSTOMIZE_PICKER_H / 2
  };
}

function customizeHexPosition(i) {
  return {
    x: customizePanelLeft() + 150 + CUSTOMIZE_PICKER_W + 16,
    y: customizeRowY(i) - CUSTOMIZE_PICKER_H / 2
  };
}

function drawCustomizeMenu(game) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, 70);
  textSize(28);
  text("Customize your " + game.selectedClass + " Mage", width / 2, 140);

  // Preview: standing and facing down, feet on the same line for both models.
  const model = PLAYER_ART[game.selectedModel];
  const w = model.spriteW * CUSTOMIZE_PREVIEW_SCALE;
  const h = model.spriteH * CUSTOMIZE_PREVIEW_SCALE;
  drawPlayerSprite(game.selectedModel, game.appearance, 0, 0,
    CUSTOMIZE_PREVIEW_X - w / 2, 500 - h, w, h);

  APPEARANCE_PARTS.forEach((part, i) => {
    const y = customizeRowY(i);
    fill(255, 255, 255, 30);
    rect(customizePanelLeft(), y - CUSTOMIZE_PANEL_H / 2, CUSTOMIZE_PANEL_W, CUSTOMIZE_PANEL_H, 8);
    fill(255);
    textSize(24);
    textAlign(LEFT, CENTER);
    text(part.toUpperCase(), customizePanelLeft() + 24, y);
  });

  textAlign(CENTER, CENTER);
  textSize(18);
  fill(180);
  text("Click a color box to pick a color, or type a hex code like #3c78e6. Enter to start.",
    width / 2, height - 50);
}
