describe("Element colors", function () {
  it("gives each element its own [r, g, b] color", function () {
    for (const element of ["Fire", "Ice", "Mind"]) {
      const c = elementColor(element);
      expect(c.length).toBe(3);
      for (const channel of c) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("matches the table for Fire, Ice and Mind", function () {
    expect(elementColor("Fire")).toEqual(ELEMENT_COLORS.Fire);
    expect(elementColor("Ice")).toEqual(ELEMENT_COLORS.Ice);
    expect(elementColor("Mind")).toEqual(ELEMENT_COLORS.Mind);
  });

  it("gives the three elements three different colors", function () {
    const fire = elementColor("Fire").join(",");
    const ice = elementColor("Ice").join(",");
    const mind = elementColor("Mind").join(",");
    expect(fire).not.toBe(ice);
    expect(fire).not.toBe(mind);
    expect(ice).not.toBe(mind);
  });

  it("gives null the default shot color", function () {
    expect(elementColor(null)).toEqual([255, 220, 80]);
  });

  it("gives unknown elements the default shot color too", function () {
    expect(elementColor("Earth")).toEqual(DEFAULT_SHOT_COLOR);
    expect(elementColor("toString")).toEqual(DEFAULT_SHOT_COLOR);
    expect(elementColor(undefined)).toEqual(DEFAULT_SHOT_COLOR);
  });

  it("returns a copy, so callers cannot change the table", function () {
    const c = elementColor("Fire");
    c[0] = 0;
    expect(ELEMENT_COLORS.Fire[0]).toBe(255);
    const d = elementColor(null);
    d[0] = 0;
    expect(DEFAULT_SHOT_COLOR[0]).toBe(255);
  });

  it("colors a fresh projectile with no element as the default shot", function () {
    const shot = new Projectile(0, 0, new p5.Vector(1, 0));
    expect(elementColor(shot.element)).toEqual(DEFAULT_SHOT_COLOR);
  });
});
