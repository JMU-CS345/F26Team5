// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

// Walking rows on every sheet. The weapon rows are the same order, 4 rows lower.
const FACING_ROW = { down: 0, up: 1, right: 2, left: 3 };
const WEAPON_ROW_OFFSET = 4;
const STEP_TIME = 8; // game frames per walk frame
// The "turning before attack" row, one frame per facing, used for the first part of a sword swing.
const TURN_ROW = 8;
const TURN_COLUMN = { down: 0, up: 1, right: 2, left: 3 };

const playerSheets = {}; // model name -> loaded image
// model name -> { pants, shirt, eyes }: white layers drawn over the body and tinted to the
// player's chosen colors (#23).
const appearanceLayers = {};

// Call once in setup(), with await.
async function loadPlayerSheets() {
  for (const name of PLAYER_MODEL_NAMES) {
    playerSheets[name] = await loadImageFile(PLAYER_ART[name].sheet);
    const paths = PLAYER_ART[name].layerSheets;
    appearanceLayers[name] = {};
    for (const layer of APPEARANCE_LAYER_ORDER) {
      appearanceLayers[name][layer] = await loadImageFile(paths[layer]);
    }
  }
}

// Draws one frame of a player with their look: the body sheet tinted to the body color, then
// the pants, shirt and eye layers on top, each tinted to its own color. Every layer is cut from
// the same (col, row) cell as the body, so they always line up. alpha fades the whole thing
// (the death animation). Used in the game and for the preview on the customization screen.
function drawPlayerSprite(modelName, appearance, col, row, x, y, w, h, alpha = 255) {
  const model = PLAYER_ART[modelName];
  const sx = col * model.spriteW;
  const sy = row * model.spriteH;
  const layers = [[playerSheets[modelName], getAppearanceColor(appearance, "body")]];
  for (const layer of APPEARANCE_LAYER_ORDER) {
    layers.push([appearanceLayers[modelName][layer], getAppearanceColor(appearance, layer)]);
  }
  for (const [picture, color] of layers) {
    tint(color[0], color[1], color[2], alpha);
    image(picture, x, y, w, h, sx, sy, model.spriteW, model.spriteH);
  }
  noTint();
}

// Which row and column of the player's sheet to draw.
function getPlayerFrame(player) {
  const model = PLAYER_ART[player.modelName];
  const phase = player.getSlashPhase();
  if (phase === "windup" || phase === "spin") {
    // The turning frame: before a swing, and for every quarter turn of a spin.
    return { row: TURN_ROW, col: TURN_COLUMN[player.facing] };
  }
  if (phase !== null) {
    return { row: FACING_ROW[player.facing] + WEAPON_ROW_OFFSET, col: 0 }; // arm out while swinging
  }
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
  // Alive: t is 0, so full size and fully opaque. Dying: fade out and shrink. Falling into a
  // pit: shrink only, then the respawn brings the player back at full size.
  const deathT = player.deathFrames / DEATH_FRAMES;
  if (deathT >= 1) {
    return;
  }
  const fallT = player.isFalling() ? Math.min(player.fallFrames / PLAYER_FALL_FRAMES, 1) : 0;
  const t = Math.max(deathT, fallT);
  const model = PLAYER_ART[player.modelName];
  const sw = model.spriteW;
  const sh = model.spriteH;
  const f = getPlayerFrame(player);

  const w = lerp(sw, 0, t);
  const h = lerp(sh, 0, t);
  // The hitbox is the bottom 16x16 of the sprite. The tall sprite starts a hitbox-height
  // higher, and the short sprite sits exactly on the hitbox.
  const left = player.pos.x + (sw - w) / 2;
  const top = player.pos.y - (sh - player.width) + (sh - h) / 2;

  drawPlayerSprite(player.modelName, player.appearance, f.col, f.row, left, top, w, h,
    lerp(255, 0, deathT));
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
