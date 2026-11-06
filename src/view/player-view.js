// Drawing code for the player, health bar and death screen.
// Reads the model, never changes it.

function drawPlayer(player) {
  noStroke();
  // Alive: t is 0, so full size and fully opaque. Dying: fade out and shrink.
  const t = player.deathFrames / DEATH_FRAMES;
  const l = lerp(player.length, 0, t);
  const w = lerp(player.width, 0, t);
  const offsetX = (player.length - l) / 2; // keeps the rectangle centered while it shrinks
  const offsetY = (player.width - w) / 2;
  fill(80, 160, 255, lerp(255, 0, t));
  rect(player.pos.x + offsetX, player.pos.y + offsetY, l, w);
}

function drawHealthBar(player) {
  noStroke();
  fill(60);
  rect(10, 10, 120, 14);
  fill(220, 50, 50);
  rect(10, 10, map(player.health, 0, player.maxHealth, 0, 120), 14);
  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);
  text(player.health + " / " + player.maxHealth, 138, 17);
}

// The Restart button is a p5 DOM button, made in sketch.js.
function drawDeathScreen() {
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(220, 50, 50);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("You died", width / 2, height / 2 - 30);
}
