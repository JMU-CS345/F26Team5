// Drawing code for projectiles.
// Reads the model, never changes it.

function drawProjectile(p) {
  const c = elementColor(p.element);
  noStroke();
  if (p.element) {
    fill(c[0], c[1], c[2]);
  } else {
    fill(PALETTE.goldLight); // weapon shots without an element keep the plain gold
  }
  rect(p.pos.x, p.pos.y, p.length, p.width);
}
