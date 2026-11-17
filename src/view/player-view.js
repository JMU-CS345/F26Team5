// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

// Walking rows on every sheet. The weapon rows are the same order, 4 rows lower.
const FACING_ROW = { down: 0, up: 1, right: 2, left: 3 };
const WEAPON_ROW_OFFSET = 4;
const STEP_TIME = 8; // game frames per walk frame

const playerSheets = {}; // model name -> default image, used by the model menu
const playerClassSheets = {}; // sheet path -> loaded image

// Call once in setup(), with await.
async function loadPlayerSheets() {
  for (const name of PLAYER_MODEL_NAMES) {
    const model = PLAYER_MODELS[name];
    playerSheets[name] = await loadImageFile(model.sheet);
    playerClassSheets[model.sheet] = playerSheets[name];
    for (const mageClass of Object.keys(model.classSheets)) {
      const path = model.classSheets[mageClass];
      if (!playerClassSheets[path]) {
        playerClassSheets[path] = await loadImageFile(path);
      }
    }
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

  tint(255, lerp(255, 0, t));
  const sheet = playerClassSheets[playerSheetPath(player.modelName, player.mageClass)];
  image(sheet, left, top, w, h, f.col * sw, f.row * sh, sw, sh);
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
