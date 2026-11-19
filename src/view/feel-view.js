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

// A few short lines fly out of the hit, mostly the way the swing went. If the effect
// sprites are loaded they are drawn on top.
function drawHitSparks(feel) {
  push();
  strokeCap(SQUARE);
  for (const s of feel.sparks) {
    const t = s.age / SPARK_FRAMES;
    let count = 5;
    if (s.big) {
      count = 8;
    }
    stroke(255, 240, 160, lerp(255, 0, t));
    strokeWeight(2);
    for (let i = 0; i < count; i++) {
      const angle = s.dir.heading() + map(i, 0, count - 1, -1.2, 1.2);
      const from = lerp(3, 10, t);
      const to = lerp(8, 18, t);
      line(
        s.x + cos(angle) * from, s.y + sin(angle) * from,
        s.x + cos(angle) * to, s.y + sin(angle) * to
      );
    }
    if (typeof drawEffect === "function") {
      drawEffect("hitSpark", s.x, s.y, frameCount - s.age, 2, s.dir.heading());
    }
  }
  pop();
}
