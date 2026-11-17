// Drawing code for projectiles.
// Reads the model, never changes it.

function drawProjectile(p) {
  noStroke();
  fill(PALETTE.goldLight);
  rect(p.pos.x, p.pos.y, p.length, p.width);
}
