// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

const layerImages = {}; // layer name -> loaded key-colored sheet
const recolorCache = new Map(); // recolorKey -> recolored sheet

// Call once in setup(), with await. The sheets come from layer-data.js (data: addresses),
// because Firefox will not let a page read pixels from picture files opened from disk.
async function loadPlayerSheets() {
  const model = PLAYER_MODELS[PLAYER_MODEL_NAMES[0]];
  for (const name of model.layers) {
    layerImages[name] = await loadImageFile(LAYER_DATA[name]);
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
function getLayerSheet(layerName, colors) {
  const key = recolorKey(layerName, colors);
  if (!recolorCache.has(key)) {
    recolorCache.set(key, recolorLayer(layerImages[layerName], recolorPairs(layerName, colors)));
  }
  return recolorCache.get(key);
}

// Draws every layer of one frame cell into the box at left, top. colors comes from
// wizardColors. Used in the game and for the preview on the customization screen.
function drawWizardFrame(colors, col, row, left, top, w, h) {
  for (const name of layersForStyle(colors.hatStyle)) {
    const sheet = getLayerSheet(name, colors);
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
  const colors = wizardColors(player.mageClass, player.appearance);

  tint(255, lerp(255, 0, t));
  push();
  if (f.flip) {
    // Mirror around the sprite's own center, so left uses the right-facing frame.
    translate(origin.left + SPRITE_W / 2, 0);
    scale(-1, 1);
    translate(-(origin.left + SPRITE_W / 2), 0);
  }
  drawWizardFrame(colors, f.col, f.row, origin.left, origin.top, SPRITE_W, SPRITE_H);
  pop();
  noTint();
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
