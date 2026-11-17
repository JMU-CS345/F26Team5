describe("input with bindings", function () {
  const held = (...codes) => (code) => codes.includes(code);
  const classic = getPreset("classic");
  const twin = getPreset("twinstick");

  it("moves with WASD in both presets", function () {
    expect(getMoveDirection(held(87), classic)).toEqual(new p5.Vector(0, -1));
    expect(getMoveDirection(held(68), twin)).toEqual(new p5.Vector(1, 0));
  });

  it("follows a rebound move key", function () {
    const b = rebindAction(classic, "moveUp", 72);
    expect(getMoveDirection(held(72), b)).toEqual(new p5.Vector(0, -1));
    expect(getMoveDirection(held(87), b).magSq()).toBe(0);
  });

  it("Classic ignores arrows and fires toward facing with K", function () {
    expect(getFireDirection(held(38), classic, "up").magSq()).toBe(0);
    expect(getFireDirection(held(75), classic, "left")).toEqual(new p5.Vector(-1, 0));
    expect(getFireDirection(held(), classic, "left").magSq()).toBe(0);
    expect(getFireDirection(held(75), classic).magSq()).toBe(0);
  });

  it("Twin-stick ignores K and fires with arrows", function () {
    expect(getFireDirection(held(75), twin, "left").magSq()).toBe(0);
    expect(getFireDirection(held(40), twin)).toEqual(new p5.Vector(0, 1));
  });

  it("turns a facing name into a vector", function () {
    expect(facingToVector("up")).toEqual(new p5.Vector(0, -1));
    expect(facingToVector("right")).toEqual(new p5.Vector(1, 0));
    expect(facingToVector("down")).toEqual(new p5.Vector(0, 1));
  });

  it("notices held gameplay keys for the active preset", function () {
    expect(isGameplayInputHeld(held(74), classic)).toBe(true);
    expect(isGameplayInputHeld(held(38), classic)).toBe(false);
    expect(isGameplayInputHeld(held(38), twin)).toBe(true);
    expect(isGameplayInputHeld(held(), twin)).toBe(false);
  });

  it("does not treat E or I as gameplay input", function () {
    expect(isGameplayInputHeld(held(69, 73), classic)).toBe(false);
  });

  it("reads one input object for the player", function () {
    const player = new Player(0, 0, "Fire");
    const input = readPlayerInput(held(68, 74, 16), player, false, classic);
    expect(input.move).toEqual(new p5.Vector(1, 0));
    expect(input.meleeHeld).toBe(true);
    expect(input.strafe).toBe(true);
  });

  it("reads nothing while blocked", function () {
    const player = new Player(0, 0, "Fire");
    const input = readPlayerInput(held(68, 74), player, true, classic);
    expect(input.move.magSq()).toBe(0);
    expect(input.meleeHeld).toBe(false);
  });

  it("aims where Classic faces and where Twin-stick last shot", function () {
    const player = new Player(0, 0, "Fire");
    player.facing = "left";
    aimPlayer(player, { fireDir: new p5.Vector(0, 0) }, classic);
    expect(player.aim).toEqual(new p5.Vector(-1, 0));
    aimPlayer(player, { fireDir: new p5.Vector(0, -1) }, twin);
    expect(player.aim).toEqual(new p5.Vector(0, -1));
    aimPlayer(player, { fireDir: new p5.Vector(0, 0) }, twin);
    expect(player.aim).toEqual(new p5.Vector(0, -1)); // remembered
  });

  it("buffers melee and dash from key presses", function () {
    const player = new Player(0, 0, "Fire");
    pressCombatKey(player, "melee");
    pressCombatKey(player, "dash");
    expect(player.meleeBuffer).toBe(MELEE_BUFFER_FRAMES);
    expect(player.dashBuffer).toBe(DASH_BUFFER_FRAMES);
  });

  it("holding strafe keeps the facing while walking", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(100, 100, "Fire");
    player.facing = "up";
    player.move(new p5.Vector(1, 0), room, true);
    expect(player.facing).toBe("up");
    expect(player.pos.x).toBeGreaterThan(100);
    player.move(new p5.Vector(1, 0), room, false);
    expect(player.facing).toBe("right");
  });
});
