describe("palette", () => {
  it("has about 32 colors", () => {
    const count = Object.keys(PALETTE).length;
    expect(count).toBeGreaterThanOrEqual(28);
    expect(count).toBeLessThanOrEqual(36);
  });

  it("makes every color a valid #rrggbb hex string", () => {
    for (const name of Object.keys(PALETTE)) {
      expect(PALETTE[name]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("has no two names with the same color", () => {
    const hexes = Object.values(PALETTE);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("has unique names", () => {
    const names = Object.keys(PALETTE);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
  });

  it("names the colors the other art branches rely on", () => {
    for (const name of ["ink", "stoneDark", "fire", "water", "leaf", "gold", "white"]) {
      expect(PALETTE[name]).toBeDefined();
    }
  });

  it("converts a name to rgb", () => {
    expect(paletteRgb("ink")).toEqual([0x1a, 0x16, 0x26]);
  });

  it("orders each shade ramp from dark to light", () => {
    const brightness = (name) => paletteRgb(name).reduce((a, b) => a + b, 0);
    for (const ramp of [
      ["stoneShadow", "stoneDark", "stoneMid", "stoneLight"],
      ["woodDark", "wood", "woodLight", "woodHighlight"],
      ["fireDark", "fire", "fireLight"],
      ["waterDark", "water", "waterLight"],
      ["leafDark", "leaf", "leafLight"]
    ]) {
      for (let i = 1; i < ramp.length; i++) {
        expect(brightness(ramp[i])).toBeGreaterThan(brightness(ramp[i - 1]));
      }
    }
  });
});
