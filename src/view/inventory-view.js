// Slot-based inventory overlay. Reads inventory and drag state without changing them.

function drawInventorySlot(slot, drag, selection = null, cursorSlot = null) {
  const hasCursor = cursorSlot !== null && cursorSlot.x === slot.x && cursorSlot.y === slot.y;
  const isDragged = drag !== null
    && drag.item === slot.item
    && drag.sourceKind === slot.kind
    && (slot.kind !== "equipment" || drag.equipmentName === slot.equipmentName);
  const isSelected = selection !== null
    && selection.item === slot.item
    && selection.sourceKind === slot.kind
    && (slot.kind !== "equipment" || selection.equipmentName === slot.equipmentName);

  push();
  stroke(UI_COLORS.stoneLight);
  strokeWeight(2);
  if (slot.item instanceof Weapon) {
    stroke(...getRarity(slot.item.rarity).color);
  }
  if (isSelected) {
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
  if (slot.item === null || isDragged) {
    return;
  }

  const pad = slot.w / 8;
  drawItemSprite(slot.item, slot.x + pad, slot.y + pad, slot.w - 2 * pad);
  if (slot.item.locked) {
    noStroke();
    fill(255, 215, 80);
    textAlign(LEFT, TOP);
    textSize(14);
    text("L", slot.x + 4, slot.y + 2);
  }
  if (slot.quantity > 1) {
    drawPixelText(
      slot.quantity, slot.x + slot.w - 6, slot.y + slot.h - 22, 16, UI_COLORS.white, "right"
    );
  }
}

function drawDraggedInventoryItem(drag, pointerX, pointerY) {
  if (drag === null) {
    return;
  }
  drawItemSprite(
    drag.item,
    pointerX - INVENTORY_SLOT_SIZE / 2,
    pointerY - INVENTORY_SLOT_SIZE / 2,
    INVENTORY_SLOT_SIZE
  );
}

function drawInventoryContextMenu(inventory, player, selection) {
  const menu = inventoryContextMenuLayout(inventory, player, selection);
  if (menu === null) {
    return;
  }
  push();
  fill(UI_COLORS.panel);
  stroke(UI_COLORS.stoneLight);
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

// The card for the selected item: rarity-colored border, its facts and the sell value.
function drawInventoryCard(selection) {
  if (selection === null) {
    return;
  }
  const item = selection.item;
  const lines = inventoryItemInformation(item);
  const box = { x: 650, y: 515, w: 376, h: 130 };
  let color = [255, 255, 255];
  if (item instanceof Weapon) {
    color = getRarity(item.rarity).color;
  }
  push();
  fill(0);
  stroke(...color);
  strokeWeight(2);
  rect(box.x, box.y, box.w, box.h);
  noStroke();
  textAlign(LEFT, TOP);
  fill(...color);
  textSize(18);
  text(lines[0], box.x + 12, box.y + 10, box.w - 24);
  fill(220);
  textSize(14);
  for (let index = 1; index < lines.length; index++) {
    text(lines[index], box.x + 12, box.y + 32 + (index - 1) * 17, box.w - 24);
  }
  if (item.locked) {
    fill(255, 215, 80);
    textAlign(RIGHT, TOP);
    text("Locked", box.x + box.w - 12, box.y + 12);
  }
  pop();
}

function drawInventoryInformation(infoLines) {
  if (infoLines.length === 0) {
    return;
  }
  const box = { x: 210, y: 490, w: 316, h: 160 };
  drawPanel(box.x, box.y, box.w, box.h);
  const inner = panelContentRect(box.x, box.y, box.w, box.h);
  let lineY = inner.y;
  for (const infoLine of infoLines) {
    if (lineY + 16 <= inner.y + inner.h) {
      lineY += (drawPixelParagraph(infoLine, inner.x, lineY, inner.w, 16, UI_COLORS.white) * 20);
    }
  }
}

function drawInventoryMenu(
  inventory,
  player,
  drag = null,
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
  const panelWidth = INVENTORY_PANEL.w;
  const panelHeight = INVENTORY_PANEL.h;
  drawPanel(panelX, panelY, panelWidth, panelHeight);

  drawPixelText("Inventory", panelX + 40, panelY + 36, 32, UI_COLORS.goldLight);
  drawPixelText(
    "Arrows move, Enter equip or use, Esc or I close", panelX + 40, panelY + 82, 16,
    UI_COLORS.stoneLight
  );
  drawPixelText(
    "Gold: " + inventory.gold, panelX + panelWidth - 40, panelY + 42, 16, UI_COLORS.goldLight,
    "right"
  );
  drawPixelText("Equipment", 210, panelY + 138, 24, UI_COLORS.white);

  const layout = inventoryUiLayout(inventory);
  const visibleDrag = inventoryDragMoved(drag, pointerX, pointerY) ? drag : null;
  for (const slot of layout.equipmentSlots) {
    drawPixelText(
      slot.label, slot.x + slot.w / 2, slot.y - 16, 8, UI_COLORS.stoneLight, "center"
    );
    drawInventorySlot(slot, visibleDrag, selection, cursorSlot);
  }

  drawPixelText("Bag", 650, panelY + 138, 24, UI_COLORS.white);
  drawPixelText(
    inventory.size + "/" + inventory.capacity, 740, panelY + 146, 16, UI_COLORS.goldLight
  );
  drawPixelText(
    "R sort, L lock, X drop", 650, panelY + 172, 16, UI_COLORS.stoneLight
  );
  for (const slot of layout.bagSlots) {
    drawInventorySlot(slot, visibleDrag, selection, cursorSlot);
  }
  let cardSelection = selection;
  if (cardSelection === null && cursorSlot !== null) {
    cardSelection = inventorySelectionFromSlot(cursorSlot);
  }
  drawInventoryCard(cardSelection);
  drawInventoryInformation(infoLines);
  drawInventoryContextMenu(inventory, player, selection);
  drawDraggedInventoryItem(visibleDrag, pointerX, pointerY);
}
