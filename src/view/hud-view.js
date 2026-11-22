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

// selectedWeaponSlot is "melee" or "projectile". The ranged box is highlighted by default.
function drawHud(player, selectedWeaponSlot = "projectile") {
  for (const box of weaponBoxRects()) {
    const item = player.inventory.getEquipped(box.slot);
    drawWeaponBox(box, item, box.slot === selectedWeaponSlot);
  }

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
