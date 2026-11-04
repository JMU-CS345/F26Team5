// Turns held keys into a direction. The sketch passes in p5's keyIsDown.
// Key codes: A 65, D 68, S 83, W 87, arrows 37 left, 38 up, 39 right, 40 down.
function getMoveDirection(isDown) {
  let x = 0;
  let y = 0;
  if (isDown(65) || isDown(37)) {
    x -= 1;
  }
  if (isDown(68) || isDown(39)) {
    x += 1;
  }
  if (isDown(87) || isDown(38)) {
    y -= 1;
  }
  if (isDown(83) || isDown(40)) {
    y += 1;
  }
  return new p5.Vector(x, y);
}
