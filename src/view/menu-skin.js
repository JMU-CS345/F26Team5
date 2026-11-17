// The shared look of every menu screen: a solid panel, fixed rows, a clear cursor and a hint
// bar along the bottom. drawPanel(x, y, w, h) comes from the art-ui panel (panel-view.js).

const SKIN_PANEL_FILL = [28, 26, 46];
const SKIN_BORDER = [150, 140, 210];
const SKIN_GOLD = [255, 220, 90];
const SKIN_TEXT = [230, 230, 240];
const SKIN_DIM = [100, 100, 125];
const SKIN_ON_GOLD = [30, 26, 10];
const SKIN_ROW_H = 44;
const SKIN_PAD = 24;
const SKIN_HINT_H = 40;
const SKIN_SHADOW = 6;
const VOLUME_SEGMENTS = 10;

// The height of a panel that holds count rows.
function menuPanelHeight(count) {
  return count * SKIN_ROW_H + SKIN_PAD * 2;
}

// A panel with a bar along the bottom of the screen that says which keys work here.
function drawFooterHint(message) {
  noStroke();
  fill(14, 12, 26);
  rect(0, height - SKIN_HINT_H, width, SKIN_HINT_H);
  fill(...SKIN_BORDER);
  rect(0, height - SKIN_HINT_H, width, 2);
  fill(190, 190, 215);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(message, width / 2, height - SKIN_HINT_H / 2 + 1);
}

function drawPanelTitle(message, y) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text(message, width / 2, y);
}

// A filled bar behind the row plus an arrow at its left end.
function drawCursor(x, y, w) {
  noStroke();
  fill(...SKIN_GOLD);
  rect(x, y, w, SKIN_ROW_H - 4);
  fill(...SKIN_ON_GOLD);
  const mid = y + (SKIN_ROW_H - 4) / 2;
  triangle(x + 10, mid - 8, x + 10, mid + 8, x + 22, mid);
}

function rowTextColor(menu, i) {
  if (!menu.isEnabled(menu.items[i])) {
    return SKIN_DIM;
  }
  if (i === menu.index) {
    return SKIN_ON_GOLD;
  }
  return SKIN_TEXT;
}

// One row of a menu. y is the top of the row. The label is centered or left aligned.
function drawMenuRow(menu, i, x, y, w, align) {
  if (i === menu.index) {
    drawCursor(x, y, w);
  }
  noStroke();
  fill(...rowTextColor(menu, i));
  textSize(26);
  textAlign(align, CENTER);
  const mid = y + (SKIN_ROW_H - 4) / 2;
  if (align === LEFT) {
    text(menu.labelOf(menu.items[i]), x + 36, mid);
  } else {
    text(menu.labelOf(menu.items[i]), x + w / 2, mid);
  }
}

// A panel with the menu's rows centered in it. y is the top of the panel.
function drawMenuPanel(menu, y, w) {
  const x = width / 2 - w / 2;
  drawPanel(x, y, w, menuPanelHeight(menu.items.length));
  menu.items.forEach((item, i) => {
    drawMenuRow(menu, i, x + SKIN_PAD, y + SKIN_PAD + i * SKIN_ROW_H, w - SKIN_PAD * 2, CENTER);
  });
}

// Ten segments, filled up to value (0 to 1).
function drawVolumeBar(x, midY, w, value, selected) {
  const gap = 3;
  const segW = (w - gap * (VOLUME_SEGMENTS - 1)) / VOLUME_SEGMENTS;
  const filled = round(value * VOLUME_SEGMENTS);
  noStroke();
  for (let s = 0; s < VOLUME_SEGMENTS; s++) {
    if (s < filled && selected) {
      fill(...SKIN_ON_GOLD);
    } else if (s < filled) {
      fill(...SKIN_GOLD);
    } else if (selected) {
      fill(150, 120, 40);
    } else {
      fill(60, 58, 90);
    }
    rect(x + s * (segW + gap), midY - 11, segW, 22);
  }
}

// A box with a check in it, then On or Off beside it.
function drawToggle(rightX, midY, on, selected) {
  let ink = SKIN_TEXT;
  if (selected) {
    ink = SKIN_ON_GOLD;
  }
  noFill();
  stroke(...ink);
  strokeWeight(2);
  rect(rightX - 90, midY - 12, 24, 24);
  if (on) {
    line(rightX - 85, midY, rightX - 80, midY + 6);
    line(rightX - 80, midY + 6, rightX - 70, midY - 6);
  }
  noStroke();
  fill(...ink);
  textAlign(RIGHT, CENTER);
  textSize(24);
  if (on) {
    text("On", rightX, midY);
  } else {
    text("Off", rightX, midY);
  }
}

// Yes or No side by side, with the cursor bar on the chosen one.
function drawConfirmDialog(dialog) {
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);
  const w = 560;
  const h = 190;
  const x = width / 2 - w / 2;
  const y = height / 2 - h / 2;
  drawPanel(x, y, w, h);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text(dialog.message, width / 2, y + 60);
  const buttonW = 180;
  dialog.menu.items.forEach((item, i) => {
    const bx = width / 2 - buttonW - 20 + i * (buttonW + 40);
    drawMenuRow(dialog.menu, i, bx, y + 100, buttonW, CENTER);
  });
  drawFooterHint("Left and Right move, Enter pick, Esc cancel");
}

// Draws over everything. alpha is 0 when the fade is done.
function drawScreenFade(alpha) {
  if (alpha <= 0) {
    return;
  }
  noStroke();
  fill(0, alpha);
  rect(0, 0, width, height);
}
