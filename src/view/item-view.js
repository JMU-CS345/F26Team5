// Shared item sprite rendering for world drops, inventory slots, and dragged items.
// Replace this placeholder implementation when real item sprites are available.

const ITEM_SPRITE_COLORS = {
  weapon: [220, 80, 70],
  armor: [80, 150, 230],
  consumable: [80, 210, 110],
  gold: [245, 195, 45]
};

const itemSprites = {};

async function loadItemSprites() {
  itemSprites.gold = await loadImageFile("assets/item/gold-coin.png");
  itemSprites.consumable = await loadImageFile("assets/item/potion.png");
  itemSprites.weapon = await loadImageFile("assets/item/weapon.png");
  itemSprites.armor = await loadImageFile("assets/item/armor.png");
}

function itemSpriteImage(item) {
  if (item instanceof Weapon && item.art !== null && weaponIcons[item.art]) {
    return weaponIcons[item.art]; // weapons with their own icon (see weapon-art.js)
  }
  if (item instanceof Weapon) {
    return itemSprites.weapon;
  }
  if (item instanceof Armor) {
    return itemSprites.armor;
  }
  if (item instanceof Gold) {
    return itemSprites.gold;
  }
  if (item instanceof Consumable) {
    return itemSprites.consumable;
  }
  return null;
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
  const sprite = itemSpriteImage(item);
  if (sprite !== null) {
    const scale = Math.min(size / sprite.width, size / sprite.height);
    const drawWidth = Math.max(1, Math.round(sprite.width * scale));
    const drawHeight = Math.max(1, Math.round(sprite.height * scale));
    const drawX = Math.round(x + (size - drawWidth) / 2);
    const drawY = Math.round(y + (size - drawHeight) / 2);
    image(sprite, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  push();
  fill(...itemSpriteColor(item));
  stroke(255, 255, 255, 150);
  strokeWeight(1);
  rect(x, y, size, size);
  pop();
}
