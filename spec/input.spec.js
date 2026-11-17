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
});
