// Draws chests, their open animation and the light beam. Views never change state.
// Everything is p5 shapes, so no chest art is needed.

const CHEST_BODY_COLOR = [120, 76, 40];
const CHEST_LID_COLOR = [150, 98, 52];
const CHEST_TRIM_COLOR = [235, 190, 70];
const CHEST_BEAM_HEIGHT = 110;
const CHEST_LID_OPEN_ANGLE = 105; // degrees

function chestRarityColor(chest) {
  const rarity = getRarity(chest.rarity);
  if (rarity === null) {
    return [255, 255, 255];
  }
  return rarity.color;
}

// A tall beam of light in the rarity color. Layers of narrower, brighter columns fake a glow.
function drawChestBeam(chest) {
  const strength = chest.beamStrength;
  if (strength <= 0) {
    return;
  }
  const color = chestRarityColor(chest);
  const pulse = 1 + Math.sin(chest.openFrames * 0.25) * 0.08;
  noStroke();
  for (let layer = 0; layer < 4; layer++) {
    const width = (CHEST_SIZE - layer * 3.5) * pulse;
    fill(color[0], color[1], color[2], 50 * strength + layer * 12 * strength);
    rect(chest.x - width / 2, chest.y - CHEST_BEAM_HEIGHT, width, CHEST_BEAM_HEIGHT);
  }
  fill(255, 255, 255, 120 * strength);
  rect(chest.x - 1.5, chest.y - CHEST_BEAM_HEIGHT * 0.8, 3, CHEST_BEAM_HEIGHT * 0.8);
}

function drawChest(chest) {
  const half = chest.size / 2;
  const left = chest.x - half;
  const top = chest.y - half;
  push();
  noStroke();
  fill(0, 0, 0, 80);
  rect(left + 1, top + chest.size - 1, chest.size - 2, 3);

  // The base is the lower 10 pixels, the lid the upper 6.
  fill(...CHEST_BODY_COLOR);
  rect(left, top + 6, chest.size, 10);
  if (chest.opened) {
    const color = chestRarityColor(chest);
    fill(color[0], color[1], color[2], 230);
    rect(left + 2, top + 6, chest.size - 4, 3);
  }

  // The lid turns on its back edge as it opens.
  push();
  translate(left, top + 6);
  rotate(-radians(CHEST_LID_OPEN_ANGLE * chest.lidProgress));
  fill(...CHEST_LID_COLOR);
  rect(0, -6, chest.size, 6);
  fill(...CHEST_TRIM_COLOR);
  rect(0, -1, chest.size, 1);
  pop();

  fill(...CHEST_TRIM_COLOR);
  if (!chest.opened) {
    rect(chest.x - 1.5, top + 4, 3, 5);
  }
  rect(left, top + 6, 1, 10);
  rect(left + chest.size - 1, top + 6, 1, 10);
  pop();
  drawChestBeam(chest);
}

// The "E" hint over a chest the player can open.
function drawChestPrompt(chest) {
  push();
  textAlign(CENTER, CENTER);
  textSize(10);
  noStroke();
  fill(0, 0, 0, 170);
  rect(chest.x - 8, chest.y - 28, 16, 14, 3);
  fill(255);
  text("E", chest.x, chest.y - 21);
  pop();
}
