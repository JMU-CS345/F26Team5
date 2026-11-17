// Drawing code for projectiles.
// Reads the model, never changes it.

function drawProjectile(p) {
  const c = elementColor(p.element);
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(p.pos.x, p.pos.y, p.length, p.width);
}
