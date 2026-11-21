// Zelda-style HUD: weapon boxes, hearts and gold. Reads the model, never changes it.

const hudImages = {}; // name -> loaded sheet

// Call once in setup(), with await.
async function loadHudImages() {
  hudImages.hearts = await loadImageFile("assets/ui/hearts.png");
  hudImages.coin = await loadImageFile("assets/ui/coin.png");
  hudImages.slotBox = await loadImageFile("assets/ui/slot-box.png");
}

const HEART_FRAME = { full: 0, half: 1, empty: 2 }; // column of each heart in hearts.png
const SLOT_BOX_ART = 24; // size of one box in slot-box.png

function drawHeart(kind, x, y) {
  image(hudImages.hearts, x, y, HUD.heartSize, HUD.heartSize, HEART_FRAME[kind] * 16, 0, 16, 16);
}

// One weapon box. The item sprite sits inside the 16x16 art area of the box.
function drawWeaponBox(box, item, selected) {
  let frame = 0;
  if (selected) {
    frame = 1;
  }
  image(hudImages.slotBox, box.x, box.y, box.w, box.h, frame * SLOT_BOX_ART, 0, 24, 24);
  if (item !== null) {
    drawItemSprite(item, box.x + 8, box.y + 8, box.w - 16);
  }
}

// Diablo-style health globe, bottom left. The red fill rises with health.
function drawHealthGlobe(player) {
  const radius = 46;
  const centerX = 20 + radius;
  const centerY = height - 20 - radius;
  const fillTop = map(player.health, 0, player.maxHealth, centerY + radius, centerY - radius);
  push();
  noStroke();
  fill(UI_COLORS.void);
  circle(centerX, centerY, radius * 2);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(centerX, centerY, radius - 3, 0, TWO_PI);
  drawingContext.clip();
  fill(UI_COLORS.fire);
  const level = constrain(fillTop, centerY - radius, centerY + radius);
  rect(centerX - radius, level, radius * 2, radius * 2);
  fill(255, 255, 255, 60);
  ellipse(centerX - radius / 3, centerY - radius / 3, radius / 2, radius / 3);
  drawingContext.restore();
  noFill();
  stroke(UI_COLORS.goldDark);
  strokeWeight(3);
  circle(centerX, centerY, radius * 2);
  pop();
}

// selectedWeaponSlot is "melee" or "projectile". The ranged box is highlighted by default.
function drawHud(player, selectedWeaponSlot = "projectile") {
  for (const box of weaponBoxRects()) {
    const item = player.inventory.getEquipped(box.slot);
    drawWeaponBox(box, item, box.slot === selectedWeaponSlot);
  }

  drawHealthGlobe(player);

  const hearts = heartsForHealth(player.health, player.maxHealth);
  const spots = heartPositions(hearts.length);
  for (let i = 0; i < hearts.length; i++) {
    drawHeart(hearts[i], spots[i].x, spots[i].y);
  }

  const goldSpot = goldHudPosition(hearts.length);
  image(hudImages.coin, goldSpot.x, goldSpot.y, HUD.heartSize, HUD.heartSize);
  drawPixelText(
    "x" + player.inventory.gold, goldSpot.x + HUD.heartSize + 8, goldSpot.y + 8, 16,
    UI_COLORS.goldLight
  );
}
