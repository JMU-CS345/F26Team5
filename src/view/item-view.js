// Shared item sprite rendering for world drops, inventory slots, and dragged items.
// Icons come from the 16x16 sheets listed in src/model/item-icons.js.

const ITEM_SPRITE_COLORS = {
  weapon: [220, 80, 70],
  armor: [80, 150, 230],
  consumable: [80, 210, 110],
  gold: [245, 195, 45]
};

const itemSheets = {}; // sheet path -> loaded image

async function loadItemSprites() {
  for (const path of [WEAPON_ICON_SHEET, ITEM_ICON_SHEET, RARITY_FRAME_SHEET]) {
    itemSheets[path] = await loadImageFile(path);
  }
}

// Draws one 16x16 cell of an icon sheet scaled to size x size.
function drawIconCell(cell, x, y, size) {
  image(itemSheets[cell.sheet], x, y, size, size, cell.x, cell.y, cell.w, cell.h);
}

function itemSpriteColor(item) {
  if (item instanceof Weapon) {
    return ITEM_SPRITE_COLORS.weapon;
  }
  if (item instanceof Armor) {
    return ITEM_SPRITE_COLORS.armor;
  }
  if (item instanceof Consumable) {
    return ITEM_SPRITE_COLORS.consumable;
  }
  return ITEM_SPRITE_COLORS.gold;
}

function drawItemSprite(item, x, y, size) {
  const cell = itemIconCell(item);
  if (cell !== null && itemSheets[cell.sheet]) {
    // Scale by a whole number so the pixels stay square.
    const scale = Math.max(1, Math.floor(size / ICON_SIZE));
    const drawSize = ICON_SIZE * scale;
    const drawX = Math.round(x + (size - drawSize) / 2);
    const drawY = Math.round(y + (size - drawSize) / 2);
    drawIconCell(cell, drawX, drawY, drawSize);
    const frame = rarityFrameCell(item.rarity);
    if (frame !== null) {
      drawIconCell(frame, drawX, drawY, drawSize);
    }
    return;
  }

  push();
  fill(...itemSpriteColor(item));
  stroke(255, 255, 255, 150);
  strokeWeight(1);
  rect(x, y, size, size);
  pop();
}
