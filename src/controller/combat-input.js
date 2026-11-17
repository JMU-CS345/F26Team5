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

// Classic aims along the held movement keys (8 ways) and keeps that aim while standing,
// strafing or shooting. Twin-stick aims with the arrows, else the movement keys, else it
// keeps the last aim, so a melee swing goes where the player is pointing or walking.
function aimPlayer(player, input, bindings = getBindings()) {
  if (bindings.fire === undefined) {
    if (input.fireDir.magSq() > 0) {
      player.setAim(input.fireDir);
    } else if (input.move && input.move.magSq() > 0) {
      player.setAim(input.move);
    }
    return;
  }
  const shooting = input.fireDir.magSq() > 0;
  if (input.move && input.move.magSq() > 0 && !input.strafe && !shooting) {
    player.setAim(input.move);
  }
  if (shooting) {
    input.fireDir = player.aim.copy();
  }
}

// A key press that starts a swing or a dash.
function pressCombatKey(player, action) {
  if (action === "melee") {
    player.bufferMelee();
  }
  if (action === "dash") {
    player.bufferDash();
  }
}
