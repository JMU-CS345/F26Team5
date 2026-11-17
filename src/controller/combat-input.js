// Reads the keys once per frame into one object the player model understands.
// blocked is true while dialogue is open or a menu key is still held after closing it.

function readPlayerInput(isDown, player, blocked, bindings = getBindings()) {
  const input = {
    move: new p5.Vector(0, 0),
    fireDir: new p5.Vector(0, 0),
    meleeHeld: false,
    strafe: false
  };
  if (blocked) {
    return input;
  }
  input.move = getMoveDirection(isDown, bindings);
  input.fireDir = getFireDirection(isDown, bindings, player.facing);
  input.meleeHeld = isDown(bindings.melee);
  if (bindings.strafe !== undefined) {
    input.strafe = isDown(bindings.strafe);
  }
  return input;
}

// Classic aims where the player faces. Twin-stick aims with the arrows and remembers the
// last one, so a melee swing goes the way you last shot.
function aimPlayer(player, input, bindings = getBindings()) {
  if (bindings.fire !== undefined) {
    player.setAim(facingToVector(player.facing));
  } else {
    player.setAim(input.fireDir);
  }
}

// A key press that starts a swing. Dash joins here later.
function pressCombatKey(player, action) {
  if (action === "melee") {
    player.bufferMelee();
  }
}
