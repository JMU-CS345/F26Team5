// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

const layerImages = {}; // layer name -> loaded key-colored sheet
const recolorCache = new Map(); // recolorKey -> recolored sheet

// Call once in setup(), with await.
async function loadPlayerSheets() {
  const model = PLAYER_MODELS[PLAYER_MODEL_NAMES[0]];
  for (const name of model.layers) {
    layerImages[name] = await loadImageFile(model.layerDir + name + ".png");
  }
}

// Returns a copy of img with each [from, to] color pair swapped. Pixels not listed stay.
function recolorLayer(img, pairs) {
  const out = createImage(img.width, img.height);
  img.loadPixels();
  out.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let r = img.pixels[i];
    let g = img.pixels[i + 1];
    let b = img.pixels[i + 2];
    for (const pair of pairs) {
      const from = pair[0];
      if (from[0] === r && from[1] === g && from[2] === b) {
        r = pair[1][0];
        g = pair[1][1];
        b = pair[1][2];
        break;
      }
    }
    out.pixels[i] = r;
    out.pixels[i + 1] = g;
    out.pixels[i + 2] = b;
    out.pixels[i + 3] = img.pixels[i + 3];
  }
  out.updatePixels();
  return out;
}

// The recolored sheet of one layer, made once per layer and look.
function getLayerSheet(layerName, appearance) {
  const key = recolorKey(layerName, appearance);
  if (!recolorCache.has(key)) {
    recolorCache.set(key, recolorLayer(layerImages[layerName], recolorPairs(layerName, appearance)));
  }
  return recolorCache.get(key);
}

// Draws every layer of one frame cell into the box at left, top.
function drawWizardFrame(appearance, col, row, left, top, w, h) {
  for (const name of layersForStyle(appearance.hatStyle)) {
    const sheet = getLayerSheet(name, appearance);
    image(sheet, left, top, w, h, col * SPRITE_W, row * SPRITE_H, SPRITE_W, SPRITE_H);
  }
}

function drawPlayer(player) {
  // Alive: fully opaque. Dying: fade out over the KO frames.
  const t = player.deathFrames / DEATH_FRAMES;
  if (t >= 1) {
    return;
  }
  const f = playerFrame(player);
  const origin = spriteOrigin(player.pos, player.width, player.length);

  let alpha = lerp(255, 0, t);
  if (player.iFrames > 0 && Math.floor(player.iFrames / 3) % 2 === 0) {
    alpha = 90; // flicker while invulnerable
  }
  if (player.isDashing()) {
    alpha = 140;
  }
  tint(255, alpha);
  push();
  if (f.flip) {
    // Mirror around the sprite's own center, so left uses the right-facing frame.
    translate(origin.left + SPRITE_W / 2, 0);
    scale(-1, 1);
    translate(-(origin.left + SPRITE_W / 2), 0);
  }
  drawWizardFrame(player.appearance, f.col, f.row, origin.left, origin.top, SPRITE_W, SPRITE_H);
  pop();
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
}

function goldHudText(inventory) {
  return `Gold: ${inventory.gold}`;
}

function drawInventoryHudButton(active = false) {
  const b = INVENTORY_HUD_BUTTON;
  drawPanel(b.x, b.y, b.w, b.h);
  let label = "Items [I]"; // short, so it fits inside the panel frame at size 16
  if (active) {
    label = "Close [I]";
  }
  drawPixelText(label, b.x + b.w / 2, b.y + b.h / 2 - 8, 16, UI_COLORS.white, "center");
}

// Death screen with the run summary. Enter goes back to the title.
function drawDeathScreen(stats) {
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  drawPanel(width / 2 - 320, height / 2 - 220, 640, 400);
  fill(220, 50, 50);
  textAlign(CENTER, CENTER);
  textSize(72);
  text("You died", width / 2, height / 2 - 150);

  fill(255);
  textSize(28);
  text("Rooms cleared: " + stats.roomsCleared, width / 2, height / 2 - 60);
  text("Enemies killed: " + stats.enemiesKilled, width / 2, height / 2 - 20);
  text("Best item found: " + stats.bestItemName(), width / 2, height / 2 + 20);
  fill(255, 220, 90);
  textSize(24);
  text("Press Enter to return to the title", width / 2, height / 2 + 110);
  drawFooterHint("Enter back to title");
}
