// The inventory screen: a paper doll on the left, the 10x6 bag grid on the right, and a
// Diablo-style tooltip. Reads inventory and hold state without changing them.

const TOOLTIP_COLORS = Object.freeze({
  white: UI_COLORS.white,
  grey: UI_COLORS.stoneLight,
  gold: UI_COLORS.goldLight,
  green: UI_COLORS.leafLight,
  red: UI_COLORS.fireLight
});
const TOOLTIP_WIDTH = 230;
const TOOLTIP_LINE_HEIGHT = 18;

// The background of an item's cells: its rarity colour, dim. Gear without rarity is grey.
function itemBackground(item) {
  if (item instanceof Weapon) {
    const tint = getRarity(item.rarity).color;
    return color(tint[0], tint[1], tint[2], 70);
  }
  return color(120, 110, 140, 60);
}

function drawGridCell(slot, hasCursor) {
  push();
  stroke(UI_COLORS.stoneShadow);
  strokeWeight(1);
  fill(UI_COLORS.void);
  rect(slot.x, slot.y, slot.w, slot.h);
  if (hasCursor) {
    noFill();
    stroke(255, 220, 90);
    strokeWeight(3);
    rect(slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2);
  }
  pop();
}

// An item across all its cells, on a rarity-tinted background.
function drawGridItem(slot, selected) {
  const area = slot.itemRect;
  push();
  fill(itemBackground(slot.item));
  stroke(UI_COLORS.goldDark);
  strokeWeight(1);
  if (selected) {
    stroke(UI_COLORS.goldLight);
    strokeWeight(3);
  }
  rect(area.x + 1, area.y + 1, area.w - 2, area.h - 2);
  pop();
  const size = Math.min(area.w, area.h);
  drawItemSprite(
    slot.item, area.x + (area.w - size) / 2, area.y + (area.h - size) / 2, size
  );
  if (slot.item.locked) {
    drawPixelText("L", area.x + 4, area.y + 4, 8, UI_COLORS.goldLight);
  }
  if (slot.quantity > 1) {
    drawPixelText(
      slot.quantity, area.x + area.w - 4, area.y + area.h - 12, 8, UI_COLORS.white, "right"
    );
  }
}

function drawEquipmentSlot(slot, selection, hasCursor) {
  push();
  stroke(UI_COLORS.goldDark);
  strokeWeight(2);
  if (slot.item instanceof Weapon) {
    stroke(...getRarity(slot.item.rarity).color);
  }
  if (selection !== null && selection.item === slot.item) {
    stroke(UI_COLORS.goldLight);
    strokeWeight(4);
  }
  fill(UI_COLORS.void);
  rect(slot.x, slot.y, slot.w, slot.h);
  if (hasCursor) {
    noFill();
    stroke(255, 220, 90);
    strokeWeight(4);
    rect(slot.x - 3, slot.y - 3, slot.w + 6, slot.h + 6);
  }
  pop();
  drawPixelText(slot.label, slot.x + slot.w / 2, slot.y - 14, 8, UI_COLORS.stoneLight, "center");
  if (slot.item !== null) {
    const pad = slot.w / 8;
    drawItemSprite(slot.item, slot.x + pad, slot.y + pad, slot.w - 2 * pad);
  }
}

// The wizard stands between the equipment boxes.
function drawPaperDoll(player) {
  const model = PLAYER_MODELS[player.modelName];
  drawPlayerSprite(
    player.modelName, player.appearance, 0, FACING_ROW.down,
    300, 270, model.spriteW * 5, model.spriteH * 5, 70
  );
}

// The item in the hand: its cells follow the pointer, and the footprint it would land on is
// green when it fits, gold when it swaps with one item and red otherwise.
function drawHeldItem(inventory, held, pointerX, pointerY) {
  if (held === null) {
    return;
  }
  const size = BagGrid.itemSize(held.item);
  const col = Math.floor((pointerX - INVENTORY_BAG_X) / INVENTORY_BAG_CELL);
  const row = Math.floor((pointerY - INVENTORY_BAG_Y) / INVENTORY_BAG_CELL);
  const grid = inventory.grid;
  if (col >= 0 && row >= 0 && col < grid.columns && row < grid.rows) {
    const left = Math.min(col, grid.columns - size.w);
    const top = Math.min(row, grid.rows - size.h);
    let tint = color(220, 70, 60, 90);
    if (grid.canPlace(held.item, left, top)) {
      tint = color(80, 200, 90, 90);
    } else if (grid.entriesIn(left, top, size.w, size.h).length === 1) {
      tint = color(240, 200, 80, 90);
    }
    noStroke();
    fill(tint);
    rect(
      INVENTORY_BAG_X + left * INVENTORY_BAG_CELL, INVENTORY_BAG_Y + top * INVENTORY_BAG_CELL,
      size.w * INVENTORY_BAG_CELL, size.h * INVENTORY_BAG_CELL
    );
  }
  const x = pointerX - INVENTORY_BAG_CELL / 2;
  const y = pointerY - INVENTORY_BAG_CELL / 2;
  push();
  fill(itemBackground(held.item));
  stroke(UI_COLORS.goldLight);
  rect(x, y, size.w * INVENTORY_BAG_CELL, size.h * INVENTORY_BAG_CELL);
  pop();
  const iconSize = Math.min(size.w, size.h) * INVENTORY_BAG_CELL;
  drawItemSprite(held.item, x, y, iconSize);
}

function drawInventoryContextMenu(inventory, player, selection) {
  const menu = inventoryContextMenuLayout(inventory, player, selection);
  if (menu === null) {
    return;
  }
  push();
  fill(UI_COLORS.panel);
  stroke(UI_COLORS.goldDark);
  strokeWeight(2);
  rect(menu.x, menu.y, menu.w, menu.h);
  for (const action of menu.actions) {
    if (action.y > menu.y) {
      stroke(UI_COLORS.stoneDark);
      line(action.x, action.y, action.x + action.w, action.y);
    }
  }
  pop();
  for (const action of menu.actions) {
    let labelColor = UI_COLORS.stoneMid;
    if (action.enabled) {
      labelColor = UI_COLORS.white;
    }
    drawPixelText(action.label, action.x + 12, action.y + action.h / 2 - 8, 16, labelColor);
  }
}

// The Diablo tooltip next to an item: rarity-coloured name, base, stats, affixes, sell value
// and green or red compare lines against what is equipped.
function drawItemTooltip(inventory, item, anchorX, anchorY) {
  const lines = itemTooltipLines(item, inventory.getEquipped(equipmentNameForItem(item)));
  const boxH = lines.length * TOOLTIP_LINE_HEIGHT + 16;
  const boxX = Math.max(0, Math.min(anchorX, width - TOOLTIP_WIDTH));
  const boxY = Math.max(0, Math.min(anchorY, height - boxH));
  push();
  fill(0, 0, 0, 235);
  stroke(UI_COLORS.goldDark);
  strokeWeight(2);
  rect(boxX, boxY, TOOLTIP_WIDTH, boxH);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  for (let i = 0; i < lines.length; i++) {
    let tint = TOOLTIP_COLORS[lines[i].color];
    if (lines[i].color === "rarity") {
      tint = color(...getRarity(item.rarity).color);
    }
    fill(tint);
    text(lines[i].text, boxX + 10, boxY + 8 + i * TOOLTIP_LINE_HEIGHT, TOOLTIP_WIDTH - 20);
  }
  pop();
}

function drawInventoryInformation(infoLines) {
  if (infoLines.length === 0) {
    return;
  }
  const box = { x: 160, y: 530, w: 340, h: 120 };
  drawPanel(box.x, box.y, box.w, box.h);
  const inner = panelContentRect(box.x, box.y, box.w, box.h);
  let lineY = inner.y;
  for (const infoLine of infoLines) {
    if (lineY + 16 <= inner.y + inner.h) {
      lineY += (drawPixelParagraph(infoLine, inner.x, lineY, inner.w, 16, UI_COLORS.white) * 20);
    }
  }
}

// held is the item in the hand (see bag-actions.js) or null.
function drawInventoryMenu(
  inventory,
  player,
  held = null,
  selection = null,
  infoLines = [],
  pointerX = 0,
  pointerY = 0,
  cursorSlot = null
) {
  noStroke();
  fill(0, 0, 0, 210);
  rect(0, 0, width, height);

  const panelX = INVENTORY_PANEL.x;
  const panelY = INVENTORY_PANEL.y;
  drawPanel(panelX, panelY, INVENTORY_PANEL.w, INVENTORY_PANEL.h);

  drawPixelText("Inventory", panelX + 40, panelY + 36, 32, UI_COLORS.goldLight);
  drawPixelText(
    "Arrows move, Enter pick up or place, R sort, L lock, X drop, Q drink, Esc close",
    panelX + 40, panelY + 82, 8, UI_COLORS.stoneLight
  );
  drawPixelText(
    "Gold: " + inventory.gold, panelX + INVENTORY_PANEL.w - 40, panelY + 42, 16,
    UI_COLORS.goldLight, "right"
  );

  drawPixelText("Equipment", 210, panelY + 138, 24, UI_COLORS.white);
  drawPaperDoll(player);
  const layout = inventoryUiLayout(inventory);
  for (const slot of layout.equipmentSlots) {
    const hasCursor = cursorSlot !== null && cursorSlot.kind === "equipment"
      && cursorSlot.equipmentName === slot.equipmentName;
    drawEquipmentSlot(slot, selection, hasCursor);
  }

  drawPixelText("Bag", INVENTORY_BAG_X, panelY + 138, 24, UI_COLORS.white);
  drawPixelText(
    inventory.size + " items", INVENTORY_BAG_X + 100, panelY + 146, 16, UI_COLORS.goldLight
  );
  for (const slot of layout.bagSlots) {
    const hasCursor = cursorSlot !== null && cursorSlot.kind === "bag"
      && cursorSlot.index === slot.index;
    drawGridCell(slot, hasCursor);
  }
  for (const slot of layout.bagSlots) {
    const isOrigin = slot.entry !== null && slot.entry.col === slot.col
      && slot.entry.row === slot.row;
    if (isOrigin) {
      drawGridItem(slot, selection !== null && selection.item === slot.item);
    }
  }

  drawInventoryInformation(infoLines);
  drawInventoryContextMenu(inventory, player, selection);
  let tipSlot = inventorySlotAt(inventory, pointerX, pointerY);
  if (tipSlot === null || tipSlot.item === null) {
    tipSlot = cursorSlot;
  }
  if (held === null && tipSlot !== null && tipSlot.item !== null) {
    const area = tipSlot.itemRect || tipSlot;
    drawItemTooltip(inventory, tipSlot.item, area.x + area.w + 8, area.y);
  }
  drawHeldItem(inventory, held, pointerX, pointerY);
}
