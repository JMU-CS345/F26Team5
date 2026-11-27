// Item-drop placement and shadow. The item itself is rendered by item-view.js.

function drawItemDrop(drop) {
  if (drop instanceof MoneyDrop) {
    drawMoneyDrop(drop); // coins, ingots and gems have their own sizes and spin
    return;
  }
  const drawY = drop.y + drop.bobOffset;
  noStroke();
  fill(0, 0, 0, 80);
  rect(drop.x + 2, drop.y + drop.size + 4, drop.size - 4, 3);
  drawItemSprite(drop.item, drop.x, drawY, drop.size);
}
