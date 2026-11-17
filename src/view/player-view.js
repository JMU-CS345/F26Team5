// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

// Walking rows on every sheet. The weapon rows are the same order, 4 rows lower.
const FACING_ROW = { down: 0, up: 1, right: 2, left: 3 };
const WEAPON_ROW_OFFSET = 4;
const STEP_TIME = 8; // game frames per walk frame

const playerSheets = {}; // model name -> loaded image

// Call once in setup(), with await.
async function loadPlayerSheets() {
  for (const name of PLAYER_MODEL_NAMES) {
    playerSheets[name] = await loadImageFile(PLAYER_MODELS[name].sheet);
  }
}

// Which row and column of the player's sheet to draw.
function getPlayerFrame(player) {
  const model = PLAYER_MODELS[player.modelName];
  let row = FACING_ROW[player.facing];
  if (player.isArmUp()) {
    row += WEAPON_ROW_OFFSET;
  }
  let col = 0; // standing, or the single shooting pose when the arm is up
  if (player.walkFrames > 0) {
    const cycle = model.walkCycles[player.facing];
    col = cycle[Math.floor(player.walkFrames / STEP_TIME) % cycle.length];
  }
  return { row, col };
}

function drawPlayer(player) {
  // Alive: t is 0, so full size and fully opaque. Dying: fade out and shrink.
  const t = player.deathFrames / DEATH_FRAMES;
  if (t >= 1) {
    return;
  }
  const model = PLAYER_MODELS[player.modelName];
  const sw = model.spriteW;
  const sh = model.spriteH;
  const f = getPlayerFrame(player);

  const w = lerp(sw, 0, t);
  const h = lerp(sh, 0, t);
  // The hitbox is the bottom 16x16 of the sprite. The tall sprite starts a hitbox-height
  // higher, and the short sprite sits exactly on the hitbox.
  const left = player.pos.x + (sw - w) / 2;
  const top = player.pos.y - (sh - player.width) + (sh - h) / 2;

  let alpha = lerp(255, 0, t);
  if (player.iFrames > 0 && Math.floor(player.iFrames / 3) % 2 === 0) {
    alpha = 90; // flicker while invulnerable
  }
  if (player.isDashing()) {
    alpha = 140;
  }
  tint(255, alpha);
  image(playerSheets[player.modelName], left, top, w, h, f.col * sw, f.row * sh, sw, sh);
  noTint();
  drawDodgeFlash(player);
}

// A ring spreads out from the player after a perfect dodge.
function drawDodgeFlash(player) {
  if (player.dodgeFlash <= 0) {
    return;
  }
  const t = 1 - player.dodgeFlash / DODGE_FLASH_FRAMES;
  const center = player.getCenter();
  push();
  noFill();
  stroke(140, 220, 255, lerp(255, 0, t));
  strokeWeight(lerp(4, 1, t));
  circle(center.x, center.y, lerp(16, 56, t));
  pop();
}

// The slash is a simple arc that sweeps across the swing. Final art can replace it.
function drawMeleeAttack(player) {
  const attack = player.attack;
  if (attack !== null && attack.phase() !== "windup") {
    const center = player.getCenter();
    const half = radians(attack.plan.arc / 2);
    const heading = attack.dir.heading();
    let from = heading - half;
    let to = lerp(from, heading + half, attack.getSweep());
    if (attack.step % 2 === 1 && attack.kind === "swing") {
      from = heading + half; // every other swing comes back the other way
      to = lerp(from, heading - half, attack.getSweep());
    }
    const fade = map(attack.frame, 0, attack.plan.total, 255, 60);
    const size = attack.plan.reach * 2;
    push();
    if (attack.kind === "spin") {
      from = heading;
      to = heading + TWO_PI * attack.getSweep();
    }
    if (typeof drawEffect === "function" && attack.kind === "swing") {
      const tip = p5.Vector.fromAngle(heading, attack.plan.reach * 0.7);
      const started = frameCount - (attack.frame - attack.plan.windup);
      drawEffect("slash", center.x + tip.x, center.y + tip.y, started, 2, heading);
    }
    noStroke();
    fill(255, 255, 255, fade * 0.35);
    arc(center.x, center.y, size, size, min(from, to), max(from, to), PIE);
    noFill();
    stroke(255, 255, 255, fade);
    strokeWeight(3);
    arc(center.x, center.y, size, size, min(from, to), max(from, to));
    pop();
  }
  drawSpinCharge(player);
}

// A ring grows around the player while melee is held, and flashes when the spin is ready.
function drawSpinCharge(player) {
  if (player.chargeFrames < 8) {
    return;
  }
  const center = player.getCenter();
  const fraction = min(1, player.chargeFrames / SPIN_CHARGE_FRAMES);
  push();
  noFill();
  strokeWeight(2);
  stroke(255, 255, 255, 200);
  if (player.isCharged() && Math.floor(frameCount / 4) % 2 === 0) {
    stroke(255, 220, 80);
  }
  arc(center.x, center.y, 40, 40, -HALF_PI, -HALF_PI + TWO_PI * fraction);
  pop();
}

function drawHealthBar(player) {
  noStroke();
  fill(60);
  rect(20, 20, 240, 28);
  fill(220, 50, 50);
  rect(20, 20, map(player.health, 0, player.maxHealth, 0, 240), 28);
  fill(255);
  textSize(24);
  textAlign(LEFT, CENTER);
  text(player.health + " / " + player.maxHealth, 276, 34);
}

function goldHudText(inventory) {
  return `Gold: ${inventory.gold}`;
}

function drawGoldHud(inventory) {
  noStroke();
  fill(255);
  textSize(24);
  textAlign(LEFT, CENTER);
  text(goldHudText(inventory), 400, 34);
}

function drawInventoryHudButton(active = false) {
  push();
  fill(0);
  stroke(255);
  strokeWeight(active ? 2 : 1);
  rect(
    INVENTORY_HUD_BUTTON.x,
    INVENTORY_HUD_BUTTON.y,
    INVENTORY_HUD_BUTTON.w,
    INVENTORY_HUD_BUTTON.h
  );
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(
    active ? "Close Inventory" : "Inventory [I]",
    INVENTORY_HUD_BUTTON.x + INVENTORY_HUD_BUTTON.w / 2,
    INVENTORY_HUD_BUTTON.y + INVENTORY_HUD_BUTTON.h / 2
  );
  pop();
}

// The Restart button is a p5 DOM button, made in sketch.js.
function drawDeathScreen() {
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(220, 50, 50);
  textAlign(CENTER, CENTER);
  textSize(72);
  text("You died", width / 2, height / 2 - 60);
}
