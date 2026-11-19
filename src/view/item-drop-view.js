// Item-drop placement and shadow. The item itself is rendered by item-view.js.

function drawItemDrop(drop) {
  const drawY = drop.y + drop.bobOffset;
  noStroke();
  if (isEquippableWeapon(drop.item) && drop.item.rarity !== "common") {
    const glow = getRarity(drop.item.rarity).color;
    fill(glow[0], glow[1], glow[2], 70);
    ellipse(drop.x + drop.size / 2, drop.y + drop.size / 2, drop.size * 2, drop.size * 2);
  }
  fill(0, 0, 0, 80);
  rect(drop.x + 2, drop.y + drop.size + 4, drop.size - 4, 3);
  drawItemSprite(drop.item, drop.x, drawY, drop.size);
}
