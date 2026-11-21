// Item-drop placement, shadow, rarity beam and name label. The item itself is rendered by
// item-view.js.

function isGearDrop(drop) {
  return drop.item instanceof Weapon || drop.item instanceof Armor;
}

// Armor has no rarity yet, so it counts as common.
function dropRarity(drop) {
  if (drop.item.rarity === undefined) {
    return "common";
  }
  return drop.item.rarity;
}

// A tall light beam in the rarity colour over rare and better gear.
function drawDropBeam(drop, rarityColor) {
  const pulse = map(Math.sin(drop.age * 0.1), -1, 1, 40, 90);
  const centerX = drop.x + drop.size / 2;
  noStroke();
  fill(rarityColor[0], rarityColor[1], rarityColor[2], pulse * 0.5);
  rect(centerX - 5, drop.y - 80, 10, 80 + drop.size);
  fill(rarityColor[0], rarityColor[1], rarityColor[2], pulse);
  rect(centerX - 2, drop.y - 80, 4, 80 + drop.size);
}

function drawItemDrop(drop) {
  const drawY = drop.y + drop.bobOffset + drop.bounceOffset;
  noStroke();
  if (isGearDrop(drop) && dropRarity(drop) !== "common") {
    const glow = getRarity(dropRarity(drop)).color;
    fill(glow[0], glow[1], glow[2], 70);
    ellipse(drop.x + drop.size / 2, drop.y + drop.size / 2, drop.size * 2, drop.size * 2);
  }
  if (isGearDrop(drop) && isRareOrBetter(dropRarity(drop))) {
    drawDropBeam(drop, getRarity(dropRarity(drop)).color);
  }
  fill(0, 0, 0, 80);
  rect(drop.x + 2, drop.y + drop.size + 4, drop.size - 4, 3);
  drawItemSprite(drop.item, drop.x, drawY, drop.size);
  if (isGearDrop(drop)) {
    const tint = getRarity(dropRarity(drop)).color;
    drawPixelText(
      drop.item.name, drop.x + drop.size / 2, drawY - 12, 8, color(tint[0], tint[1], tint[2]),
      "center"
    );
  }
}
