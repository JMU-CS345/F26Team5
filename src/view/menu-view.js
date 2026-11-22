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
const CREDITS_LINE_HEIGHT = 34;
const CREDITS_TOP = 110;
const CREDITS_BOTTOM = 630;
const SETTINGS_TOP = 130;
const SETTINGS_LEFT_W = 600;
const TABLE_ROW_H = 32;

function drawGameTitle(y) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, y);
}

// Center x of the nth of count cards, spread across the screen.
function cardCenterX(i, count) {
  return width / 2 + (i - (count - 1) / 2) * 260;
}

// The chosen model standing and facing down, feet on the line at footY.
function drawModelPreview(modelName, appearance, centerX, footY) {
  const model = PLAYER_MODELS[modelName];
  const w = model.spriteW * MODEL_PREVIEW_SCALE;
  const h = model.spriteH * MODEL_PREVIEW_SCALE;
  drawPlayerSprite(modelName, appearance, 0, 0, centerX - w / 2, footY - h, w, h);
}

// The model screen, step 1 of the character creator. The menu holds one item per model.
function drawModelMenu(menu) {
  drawPanel(width / 2 - 440, 90, 880, 470);
  drawPanelTitle("Choose your playermodel", 140);
  const count = PLAYER_MODEL_NAMES.length;
  PLAYER_MODEL_NAMES.forEach((name, i) => {
    const x = cardCenterX(i, count);
    drawModelPreview(name, DEFAULT_APPEARANCE, x, 330);
    noStroke();
    fill(80, 80, 110);
    rect(x - 110, 375, 220, 90);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text(i + 1 + ". " + name, x, 420);
    if (i === menu.index) {
      noFill();
      stroke(...SKIN_GOLD);
      strokeWeight(4);
      rect(x - 114, 371, 228, 98);
      noStroke();
    }
  });
  drawFooterHint("Left/Right move, Enter pick, 1-2 quick pick, Esc back");
}

function drawTitleScreen(menu) {
  drawGameTitle(150);
  drawMenuPanel(menu, 260, 440);
  drawFooterHint("Up/Down move, Enter pick");
}

// The class screen. The menu holds one item per class.
function drawClassMenu(menu, modelName, appearance) {
  const panelX = width / 2 - 440;
  drawPanel(panelX, 90, 880, 470);
  drawPanelTitle("Choose your class", 140);
  drawModelPreview(modelName, appearance, width / 2, 330);

  const count = MAGE_CLASSES.length;
  MAGE_CLASSES.forEach((mageClass, i) => {
    const x = cardCenterX(i, count);
    noStroke();
    fill(...CLASS_COLORS[mageClass]);
    rect(x - 110, 375, 220, 90);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text(i + 1 + ". " + mageClass, x, 420);
    if (i === menu.index) {
      noFill();
      stroke(...SKIN_GOLD);
      strokeWeight(4);
      rect(x - 114, 371, 228, 98);
      noStroke();
      fill(...SKIN_GOLD);
      triangle(x - 12, 346, x + 12, 346, x, 364);
      fill(255);
      textSize(20);
      text(CLASS_BLURBS[mageClass], width / 2, 515);
    } else {
      fill(0, 0, 0, 110);
      rect(x - 110, 375, 220, 90);
    }
  });
  drawFooterHint("Left/Right move, Enter pick, 1-3 quick pick, Esc back");
}

// Shows the chosen class during a run, under the HUD boxes.
function drawClassLabel(mageClass) {
  const c = CLASS_COLORS[mageClass];
  drawPixelText(mageClass + " Mage", 20, 130, 16, color(c[0], c[1], c[2]));
}

function drawPauseMenu(menu) {
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  drawPanelTitle("Paused", 190);
  drawMenuPanel(menu, 250, 420);
  drawFooterHint("Up/Down move, Enter pick, Esc resume");
}

// A settings row: the name on the left, a bar, box or value on the right.
function drawSettingsRow(menu, i, x, y, w) {
  drawMenuRow(menu, i, x, y, w, LEFT);
  const item = menu.items[i];
  const selected = i === menu.index;
  const midY = y + (SKIN_ROW_H - 4) / 2;
  const rightX = x + w - 16;
  if (item.kind === "volume") {
    drawVolumeBar(rightX - 270, midY, 200, item.value(), selected);
    noStroke();
    fill(...rowTextColor(menu, i));
    textAlign(RIGHT, CENTER);
    textSize(20);
    text(round(item.value() * 100) + "%", rightX, midY);
  } else if (item.kind === "toggle") {
    drawToggle(rightX, midY, item.value(), selected);
  } else if (item.kind === "choice") {
    noStroke();
    fill(...rowTextColor(menu, i));
    textAlign(RIGHT, CENTER);
    textSize(24);
    text("< " + item.value() + " >", rightX, midY);
  }
}

// The current preset's keys as two columns.
function drawControlsTable(preset, x, y, w) {
  const rows = controlRows(preset);
  drawPanel(x, y, w, SKIN_PAD * 2 + 40 + rows.length * TABLE_ROW_H);
  noStroke();
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(24);
  text(preset.name + " controls", x + SKIN_PAD, y + SKIN_PAD + 12);
  rows.forEach((row, i) => {
    const rowY = y + SKIN_PAD + 40 + i * TABLE_ROW_H;
    if (i % 2 === 0) {
      fill(255, 255, 255, 14);
      rect(x + 8, rowY, w - 16, TABLE_ROW_H);
    }
    fill(...SKIN_GOLD);
    textSize(20);
    text(row.key, x + SKIN_PAD, rowY + TABLE_ROW_H / 2);
    fill(...SKIN_TEXT);
    text(row.action, x + SKIN_PAD + 130, rowY + TABLE_ROW_H / 2);
  });
}

// Settings rows are menu items. Beside them, the controls in use.
function drawSettingsScreen(menu, settings) {
  drawPanelTitle("Settings", 62);
  const leftX = 70;
  drawPanel(leftX, SETTINGS_TOP, SETTINGS_LEFT_W, menuPanelHeight(menu.items.length));
  menu.items.forEach((item, i) => {
    const rowY = SETTINGS_TOP + SKIN_PAD + i * SKIN_ROW_H;
    drawSettingsRow(menu, i, leftX + SKIN_PAD, rowY, SETTINGS_LEFT_W - SKIN_PAD * 2);
  });
  const tableX = leftX + SETTINGS_LEFT_W + 40;
  drawControlsTable(CONTROL_PRESETS[settings.controls], tableX, SETTINGS_TOP, width - tableX - 70);
  drawFooterHint("Up/Down move, Left/Right change, Esc back");
}

// The credits scroll up from the bottom. scroll is how many pixels they have moved.
function drawCreditsScreen(lines, scroll) {
  drawPanel(width / 2 - 380, 20, 760, height - SKIN_HINT_H - 40);
  noStroke();
  textAlign(CENTER, CENTER);
  lines.forEach((line, i) => {
    const y = CREDITS_BOTTOM - scroll + i * CREDITS_LINE_HEIGHT;
    if (y < CREDITS_TOP || y > CREDITS_BOTTOM || line.text === "") {
      return;
    }
    const fadeIn = map(y, CREDITS_TOP, CREDITS_TOP + 60, 0, 255, true);
    const fadeOut = map(y, CREDITS_BOTTOM - 40, CREDITS_BOTTOM, 255, 0, true);
    const alpha = min(fadeIn, fadeOut);
    if (line.style === "title") {
      fill(255, alpha);
      textSize(48);
    } else if (line.style === "heading") {
      fill(...SKIN_GOLD, alpha);
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
  fill(255);
  textSize(32);
  text("Credits", width / 2, 60);
  drawFooterHint("Up/Down scroll, Esc back");
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
  const model = PLAYER_MODELS[game.selectedModel];
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