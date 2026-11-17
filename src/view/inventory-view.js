// Slot-based inventory overlay. Reads inventory and drag state without changing them.

function drawInventorySlot(slot, drag, selection = null) {
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
  if (isSelected) {
    stroke(UI_COLORS.goldLight);
    strokeWeight(4);
  }
  fill(UI_COLORS.void);
  rect(slot.x, slot.y, slot.w, slot.h);
  pop();
  if (slot.item === null || isDragged) {
    return;
  }

  drawItemSprite(slot.item, slot.x + 10, slot.y + 8, slot.w - 20);
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
  pointerY = 0
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
  drawPixelText("Press I to resume", panelX + 40, panelY + 82, 16, UI_COLORS.stoneLight);
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
    drawInventorySlot(slot, visibleDrag, selection);
  }

  drawPixelText("Bag", 650, panelY + 138, 24, UI_COLORS.white);
  drawPixelText(
    "Drag to equip, or click", 650, panelY + 172, 16, UI_COLORS.stoneLight
  );
  for (const slot of layout.bagSlots) {
    drawInventorySlot(slot, visibleDrag, selection);
  }
  drawInventoryInformation(infoLines);
  drawInventoryContextMenu(inventory, player, selection);
  drawDraggedInventoryItem(visibleDrag, pointerX, pointerY);
}
