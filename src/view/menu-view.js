// Drawing code for the title, character select, pause, settings and credits screens.
// Reads the model, never changes it. Every menu is a Menu from src/model/menu.js.

const MODEL_PREVIEW_SCALE = 5;
const CLASS_COLORS = {
  Fire: [230, 90, 40],
  Ice: [90, 180, 240],
  Mind: [170, 110, 230]
};
const CLASS_BLURBS = {
  Fire: "Burns hot. Damage scales with Resolve.",
  Ice: "Hardy and steady. Damage scales with Constitution.",
  Mind: "Sharp thinker. Damage scales with Intelligence."
};
const MENU_HIGHLIGHT = [255, 220, 90];
const MENU_ROW_HEIGHT = 56;
const CREDITS_LINE_HEIGHT = 34;
const CREDITS_TOP = 110;
const CREDITS_BOTTOM = 640;

function drawGameTitle(y) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, y);
}

function drawMenuHint(message) {
  noStroke();
  fill(180);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(message, width / 2, height - 50);
}

// A vertical list centered on the screen. The selected row gets a box and a bright color.
function drawMenuList(menu, topY) {
  textAlign(CENTER, CENTER);
  textSize(30);
  menu.items.forEach((item, i) => {
    const y = topY + i * MENU_ROW_HEIGHT;
    const selected = i === menu.index;
    if (selected) {
      noFill();
      stroke(...MENU_HIGHLIGHT);
      strokeWeight(2);
      rect(width / 2 - 230, y - 22, 460, 44);
    }
    noStroke();
    if (!menu.isEnabled(item)) {
      fill(90);
    } else if (selected) {
      fill(...MENU_HIGHLIGHT);
    } else {
      fill(230);
    }
    text(menu.labelOf(item), width / 2, y);
  });
}

function drawTitleScreen(menu) {
  drawGameTitle(height / 2 - 170);
  drawMenuList(menu, height / 2 - 20);
  drawMenuHint("Up and Down to move, Enter to choose");
}

// Center x of the nth of count cards, spread across the screen.
function cardCenterX(i, count) {
  return width / 2 + (i - (count - 1) / 2) * 260;
}

// The model's standing sprite, feet on the line at footY.
function drawModelPreview(name, centerX, footY) {
  const model = PLAYER_MODELS[name];
  const w = model.spriteW * MODEL_PREVIEW_SCALE;
  const h = model.spriteH * MODEL_PREVIEW_SCALE;
  image(playerSheets[name], centerX - w / 2, footY - h, w, h, 0, 0, model.spriteW, model.spriteH);
}

function drawSelectionBox(centerX, topY, w, h) {
  noFill();
  stroke(...MENU_HIGHLIGHT);
  strokeWeight(3);
  rect(centerX - w / 2, topY, w, h);
  noStroke();
}

// The class screen. The menu holds one item per class.
function drawClassMenu(menu, modelName) {
  drawGameTitle(height / 2 - 250);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Choose your class", width / 2, height / 2 - 180);
  drawModelPreview(modelName, width / 2, height / 2 - 20);

  const count = MAGE_CLASSES.length;
  MAGE_CLASSES.forEach((mageClass, i) => {
    const x = cardCenterX(i, count);
    noStroke();
    fill(...CLASS_COLORS[mageClass]);
    rect(x - 110, height / 2 + 20, 220, 90);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text(i + 1 + ". " + mageClass, x, height / 2 + 65);
    if (i === menu.index) {
      drawSelectionBox(x, height / 2 + 14, 232, 102);
      fill(255);
      textSize(20);
      text(CLASS_BLURBS[mageClass], width / 2, height / 2 + 150);
    }
  });
  drawMenuHint("Left and Right to choose, Enter to confirm, Esc to go back");
}

// Shows the chosen class during a run, top right.
function drawClassLabel(mageClass) {
  noStroke();
  fill(...CLASS_COLORS[mageClass]);
  textSize(24);
  textAlign(RIGHT, CENTER);
  text(mageClass + " Mage", width - 20, 34);
}

function drawPauseMenu(menu) {
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(56);
  text("Paused", width / 2, height / 2 - 170);
  drawMenuList(menu, height / 2 - 60);
  drawMenuHint("Up and Down to move, Enter to choose, Esc to resume");
}

// Settings rows are menu items with function labels. Below them, the controls in use.
function drawSettingsScreen(menu, settings) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("Settings", width / 2, 70);
  const listTop = 150;
  drawMenuList(menu, listTop);

  const presetTop = listTop + menu.items.length * MENU_ROW_HEIGHT + 10;
  const preset = CONTROL_PRESETS[settings.controls];
  noStroke();
  fill(200);
  textSize(20);
  text(preset.name + " controls", width / 2, presetTop);
  fill(160);
  textSize(18);
  preset.lines.forEach((line, i) => {
    text(line, width / 2, presetTop + 32 + i * 26);
  });
  drawMenuHint("Up and Down to move, Left and Right to change, Esc to go back");
}

// The credits scroll up from the bottom. scroll is how many pixels they have moved.
function drawCreditsScreen(lines, scroll) {
  noStroke();
  textAlign(CENTER, CENTER);
  lines.forEach((line, i) => {
    const y = CREDITS_BOTTOM - scroll + i * CREDITS_LINE_HEIGHT;
    if (y < CREDITS_TOP || y > CREDITS_BOTTOM || line.text === "") {
      return;
    }
    const alpha = map(y, CREDITS_TOP, CREDITS_TOP + 60, 0, 255, true);
    if (line.style === "title") {
      fill(255, alpha);
      textSize(48);
    } else if (line.style === "heading") {
      fill(...MENU_HIGHLIGHT, alpha);
      textSize(28);
    } else if (line.style === "small") {
      fill(170, alpha);
      textSize(16);
    } else {
      fill(235, alpha);
      textSize(24);
    }
    text(line.text, width / 2, y);
  });
  fill(0);
  rect(0, 0, width, CREDITS_TOP - 20);
  rect(0, CREDITS_BOTTOM + 20, width, height);
  fill(255);
  textSize(32);
  text("Credits", width / 2, 50);
  drawMenuHint("Up and Down to scroll, Esc to go back");
}
