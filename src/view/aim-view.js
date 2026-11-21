// A red ring under the current auto-aim target. Reads the model, never changes it.

function drawAimRing(target) {
  if (target === null || target.isDead()) {
    return;
  }
  const bounds = target.getBounds();
  push();
  noFill();
  stroke(200, 30, 30, 220);
  strokeWeight(2);
  ellipse(bounds.x + bounds.w / 2, bounds.y + bounds.h, bounds.w + 8, bounds.h / 2 + 4);
  pop();
}
