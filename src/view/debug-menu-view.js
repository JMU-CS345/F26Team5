// Draws the debug menu (controller/debug-menu.js) as a panel down the left of the screen. Reads the
// menu, never changes it.

const DEBUG_PANEL = Object.freeze({ x: 16, y: 72, w: 300, h: 628 });
const DEBUG_ROW_HEIGHT = 28;
const DEBUG_VISIBLE_ROWS = 16;

function drawDebugMenu(menu) {
  const { x, y, w, h } = DEBUG_PANEL;
  push();
  noStroke();
  fill(0, 0, 0, 220);
  rect(x, y, w, h);
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(x, y, w, h);
  noStroke();

  fill(255, 220, 90);
  textAlign(LEFT, TOP);
  textSize(20);
  text("DEBUG MENU", x + 16, y + 12);

  // The category, with arrows to show A and D change it.
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("<  " + menu.categories[menu.tab].name + "  >", x + w / 2, y + 58);
  fill(150);
  textSize(12);
  text((menu.tab + 1) + " of " + menu.categories.length, x + w / 2, y + 80);

  // The entries, scrolled so the picked one stays in view.
  const entries = menu.entries;
  const first = constrain(menu.row - Math.floor(DEBUG_VISIBLE_ROWS / 2), 0,
    Math.max(0, entries.length - DEBUG_VISIBLE_ROWS));
  const listTop = y + 100;
  textAlign(LEFT, CENTER);
  textSize(16);
  for (let i = 0; i < DEBUG_VISIBLE_ROWS && first + i < entries.length; i++) {
    const index = first + i;
    const rowY = listTop + i * DEBUG_ROW_HEIGHT;
    if (index === menu.row) {
      fill(255, 255, 255, 50);
      rect(x + 8, rowY, w - 16, DEBUG_ROW_HEIGHT - 2);
      fill(255, 220, 90);
      text(">", x + 14, rowY + DEBUG_ROW_HEIGHT / 2);
    }
    fill(index === menu.row ? 255 : 200);
    text(debugEntryLabel(entries[index]), x + 34, rowY + DEBUG_ROW_HEIGHT / 2);
  }
  fill(150);
  textAlign(RIGHT, CENTER);
  textSize(12);
  text((menu.row + 1) + " / " + entries.length, x + w - 14, listTop + DEBUG_VISIBLE_ROWS * DEBUG_ROW_HEIGHT + 8);

  // What the last entry did, then the keys.
  const footerY = y + h - 72;
  fill(120, 230, 140);
  textAlign(LEFT, TOP);
  textSize(14);
  text(menu.message, x + 16, footerY - 24, w - 32, 20);
  fill(170);
  textSize(12);
  text("W/S or Up/Down: pick   A/D or Left/Right: category\nEnter or Space: do it   Esc, ` or F4: close\nThe room keeps running while this is open.",
    x + 16, footerY, w - 32, 66);
  pop();
}
