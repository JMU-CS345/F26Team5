// Turns held keys into directions. The sketch passes in p5's keyIsDown, and the key codes
// come from key-bindings.js, so both control presets work everywhere.

function getMoveDirection(isDown, bindings = getBindings()) {
  let x = 0;
  let y = 0;
  if (isDown(bindings.moveLeft)) {
    x -= 1;
  }
  if (isDown(bindings.moveRight)) {
    x += 1;
  }
  if (isDown(bindings.moveUp)) {
    y -= 1;
  }
  if (isDown(bindings.moveDown)) {
    y += 1;
  }
  return new p5.Vector(x, y);
}

// The unit vector for a facing name.
function facingToVector(facing) {
  if (facing === "up") {
    return new p5.Vector(0, -1);
  }
  if (facing === "left") {
    return new p5.Vector(-1, 0);
  }
  if (facing === "right") {
    return new p5.Vector(1, 0);
  }
  return new p5.Vector(0, 1);
}

// Twin-stick: an arrow key aims in that direction. Classic: the fire key shoots toward
// the facing direction, so pass the player's facing. Zero vector means no shot.
function getFireDirection(isDown, bindings = getBindings(), facing = null) {
  if (bindings.fire !== undefined) {
    if (facing !== null && isDown(bindings.fire)) {
      return facingToVector(facing);
    }
    return new p5.Vector(0, 0);
  }
  if (isDown(bindings.fireUp)) {
    return new p5.Vector(0, -1);
  }
  if (isDown(bindings.fireDown)) {
    return new p5.Vector(0, 1);
  }
  if (isDown(bindings.fireLeft)) {
    return new p5.Vector(-1, 0);
  }
  if (isDown(bindings.fireRight)) {
    return new p5.Vector(1, 0);
  }
  return new p5.Vector(0, 0);
}

// Any key that moves, shoots, swings or dashes. Used to wait for a release after a menu.
function isGameplayInputHeld(isDown, bindings = getBindings()) {
  const actions = ["moveUp", "moveDown", "moveLeft", "moveRight", "fire", "fireUp",
    "fireDown", "fireLeft", "fireRight", "melee", "dash"];
  return actions.some((action) => bindings[action] !== undefined && isDown(bindings[action]));
}
