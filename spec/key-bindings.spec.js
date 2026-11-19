describe("key bindings", function () {
  it("binds the Classic actions", function () {
    const b = getPreset("classic");
    expect(b.melee).toBe(74);
    expect(b.fire).toBe(75);
    expect(b.dash).toBe(32);
    expect(b.strafe).toBe(16);
    expect(b.interact).toBe(69);
    expect(b.inventory).toBe(73);
    expect(b.pause).toBe(27);
  });

  it("binds the Twin-stick actions", function () {
    const b = getPreset("twinstick");
    expect(b.fireUp).toBe(38);
    expect(b.fireDown).toBe(40);
    expect(b.fireLeft).toBe(37);
    expect(b.fireRight).toBe(39);
    expect(b.melee).toBe(32);
    expect(b.dash).toBe(16);
    expect(b.interact).toBe(69);
  });

  it("uses WASD to move in both presets", function () {
    for (const name of CONTROL_PRESET_IDS) {
      const b = getPreset(name);
      expect([b.moveUp, b.moveLeft, b.moveDown, b.moveRight]).toEqual([87, 65, 83, 68]);
    }
  });

  it("binds every key to one action only", function () {
    for (const name of CONTROL_PRESET_IDS) {
      const codes = Object.values(getPreset(name));
      expect(new Set(codes).size).toBe(codes.length);
      for (const code of codes) {
        expect(typeof code).toBe("number");
      }
    }
  });

  it("finds the action for a key", function () {
    const b = getPreset("twinstick");
    expect(actionForKey(32, b)).toBe("melee");
    expect(actionForKey(999, b)).toBeNull();
  });

  it("rebinds an action to a free key", function () {
    const b = rebindAction(getPreset("classic"), "melee", 72);
    expect(b.melee).toBe(72);
    expect(actionForKey(74, b)).toBeNull();
  });

  it("swaps with the action that already owns the key", function () {
    const b = rebindAction(getPreset("classic"), "melee", 75);
    expect(b.melee).toBe(75);
    expect(b.fire).toBe(74);
    expect(new Set(Object.values(b)).size).toBe(Object.keys(b).length);
  });

  it("does not change the preset when rebinding", function () {
    rebindAction(getPreset("classic"), "melee", 72);
    expect(getPreset("classic").melee).toBe(74);
  });

  it("falls back to Classic for an unknown preset", function () {
    expect(getPreset("nope")).toEqual(getPreset("classic"));
  });
});

describe("controls setting", function () {
  afterEach(function () {
    localStorage.removeItem(SETTINGS_KEY);
  });

  it("picks the bindings from the controls setting", function () {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ controls: "twinstick" }));
    expect(refreshBindings().fireUp).toBe(38);
    localStorage.removeItem(SETTINGS_KEY);
    expect(refreshBindings().fire).toBe(75);
  });
});
