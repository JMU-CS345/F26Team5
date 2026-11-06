// Turns held keys into a direction. The sketch passes in p5's keyIsDown.
// Key codes: A 65, D 68, S 83, W 87, arrows 37 left, 38 up, 39 right, 40 down.
function getMoveDirection(isDown) {
  let x = 0;
  let y = 0;
  if (isDown(65)) {
    x -= 1;
  }
  if (isDown(68)) {
    x += 1;
  }
  if (isDown(87)) {
    y -= 1;
  }
  if (isDown(83)) {
    y += 1;
  }
  return new p5.Vector(x, y);
}

function getFireDirection(isDown) {
  if (isDown(38)) {
    return new p5.Vector(0, -1);
  }
  if (isDown(40)) {
    return new p5.Vector(0, 1);
  }
  if (isDown(37)) {
    return new p5.Vector(-1, 0);
  }
  if (isDown(39)) {
    return new p5.Vector(1, 0);
  }
  return new p5.Vector(0, 0);
}
