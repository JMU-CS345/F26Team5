// Drawing code for floating damage numbers. Reads the game feel model, never changes it.

function drawDamageNumbers(feel) {
  push();
  textAlign(CENTER, CENTER);
  textSize(16);
  strokeWeight(3);
  for (const n of feel.numbers) {
    const t = n.age / NUMBER_FRAMES;
    stroke(0, 0, 0, lerp(255, 0, t));
    fill(255, 240, 160, lerp(255, 0, t));
    text(n.text, n.x, n.y - 4 - 18 * t);
  }
  pop();
}
