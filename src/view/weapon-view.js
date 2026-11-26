// Drawing code for weapons: shots, the sword's slash effect and the inventory icons.
// Reads the model, never changes it.

const weaponIcons = {}; // art key -> image
const weaponShotSheets = {}; // art key -> image
const weaponChargedSheets = {}; // art key -> image, for weapons with a charged picture
let slashEffectSheet = null;

// Call once in setup(), with await.
async function loadWeaponSprites() {
  for (const key of Object.keys(WEAPON_ART)) {
    const art = WEAPON_ART[key];
    weaponIcons[key] = await loadImageFile(art.icon);
    if (art.projectile) {
      weaponShotSheets[key] = await loadImageFile(art.projectile.sheet);
    }
    if (art.chargedProjectile) {
      weaponChargedSheets[key] = await loadImageFile(art.chargedProjectile.sheet);
    }
  }
  slashEffectSheet = await loadImageFile(SLASH_EFFECT.sheet);
}

// Draws a weapon's shot. Returns false when the shot has no picture, so the caller draws a square.
function drawWeaponShot(p) {
  const art = p.art ? WEAPON_ART[p.art] : null;
  if (!art || !art.projectile || !weaponShotSheets[p.art]) {
    return false;
  }
  const shot = getShotArt(art, p);
  const sheet = shot === art.chargedProjectile ? weaponChargedSheets[p.art] : weaponShotSheets[p.art];
  const col = getShotFrame(shot, p.age);
  const cx = p.pos.x + p.length / 2;
  const cy = p.pos.y + p.width / 2;
  push();
  translate(cx, cy);
  rotate(getShotAngle(shot, p.vel));
  const scale = getShotDrawScale(art, p);
  const w = shot.frameW * scale;
  const h = shot.frameH * scale;
  image(sheet, -w / 2, -h / 2, w, h, col * shot.frameW, 0, shot.frameW, shot.frameH);
  pop();
  return true;
}

// Draws the weapon in the player's hand, straight out from it (on the turning frame, where it would
// be for another facing: see WINDUP_FACING), and during the sword's active
// part the slash arc beside the blade. The weapon goes behind the player when it is on the up side (the
// hand is on the far side of the body), so the sketch calls this twice: once with behind true
// before drawing the player, and once with it false after.
function drawHeldWeapon(player, behind) {
  if ((getHeldWeaponFacing(player) === "up") !== behind) {
    return;
  }
  const weapon = getHeldWeapon(player);
  if (weapon === null || !weaponIcons[weapon.art]) {
    return;
  }
  const hand = getHandPosition(player);
  const grip = HELD_WEAPON.grip;
  push();
  translate(hand.x, hand.y);
  rotate(radians(getHeldWeaponAngle(player)));
  image(weaponIcons[weapon.art], -grip.x, -grip.y, 16, 16);
  const progress = getSlashEffectProgress(player);
  if (progress !== null && slashEffectSheet !== null) {
    tint(255, 255 - 200 * progress);
    image(slashEffectSheet, SLASH_EFFECT.offset.x, SLASH_EFFECT.offset.y, SLASH_EFFECT.size, SLASH_EFFECT.size);
    noTint();
  }
  pop();
}

// The two weapons the player holds, bottom left. The one that is out has a bright frame and the
// other is dimmed. Q swaps them.
const WEAPON_HUD = Object.freeze({ x: 20, y: 620, size: 56, gap: 12 });

function drawWeaponHud(player) {
  const { x, y, size, gap } = WEAPON_HUD;
  const slots = getWeaponHudSlots(player);
  push();
  for (let i = 0; i < slots.length; i++) {
    const sx = x + i * (size + gap);
    const { item, active } = slots[i];
    noStroke();
    fill(0, 0, 0, 170);
    rect(sx, y, size, size);
    if (item !== null) {
      if (!active) {
        tint(255, 110);
      }
      drawItemSprite(item, sx + 6, y + 6, size - 12);
      noTint();
    }
    noFill();
    stroke(active ? 255 : 110);
    strokeWeight(active ? 3 : 1);
    rect(sx, y, size, size);
  }
  noStroke();
  fill(255);
  textSize(18);
  textAlign(LEFT, CENTER);
  const out = player.getActiveWeapon();
  text("[Q] " + (out === null ? "No weapon" : out.name), x, y + size + 16);
  pop();
}

// A small bar under the player that fills as a shot (or the sword's spin) charges, in the weapon's
// colour. It flashes
// white at full charge. Nothing is drawn when not charging.
function drawChargeBar(player) {
  if (!player.isCharging()) {
    return;
  }
  const weapon = player.getActiveWeapon();
  const ratio = player.getChargeRatio();
  const [r, g, b] = ELEMENT_COLORS[weapon.element] || SWORD_CHARGE_COLOR;
  const { width, height, gap } = CHARGE_BAR;
  const x = player.pos.x + player.length / 2 - width / 2;
  const y = player.pos.y + player.width + gap;
  push();
  noStroke();
  fill(0, 0, 0, 170);
  rect(x - 1, y - 1, width + 2, height + 2);
  if (ratio >= 1 && Math.floor(frameCount / 4) % 2 === 0) {
    fill(255);
  } else {
    fill(r, g, b);
  }
  rect(x, y, width * ratio, height);
  pop();
}
