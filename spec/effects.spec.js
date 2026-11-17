describe("effect frames", () => {
  const COUNTS = { slash: 3, fireShot: 2, iceShot: 2, mindShot: 2, hitSpark: 3, deathPoof: 4 };

  it("has the frame count for every effect", () => {
    for (const name of Object.keys(COUNTS)) {
      expect(EFFECT_FRAMES[name].frames).toBe(COUNTS[name]);
      expect(EFFECT_FRAMES[name].cells.length).toBe(COUNTS[name]);
    }
    expect(EFFECT_NAMES.length).toBe(6);
  });

  it("puts each effect on its own row of 16x16 cells with no gaps", () => {
    const rows = [];
    for (const name of EFFECT_NAMES) {
      const cells = EFFECT_FRAMES[name].cells;
      rows.push(cells[0].y);
      cells.forEach((cell, i) => {
        expect(cell.x).toBe(i * 16);
        expect(cell.y).toBe(cells[0].y);
      });
    }
    expect(new Set(rows).size).toBe(EFFECT_NAMES.length);
  });

  it("plays one-shot effects once and reports when they are done", () => {
    expect(effectDuration("slash")).toBe(9);
    expect(effectFrameIndex("slash", 0)).toBe(0);
    expect(effectFrameIndex("slash", 3)).toBe(1);
    expect(effectFrameIndex("slash", 8)).toBe(2);
    expect(effectFrameIndex("slash", 100)).toBe(2);
    expect(effectIsDone("slash", 8)).toBe(false);
    expect(effectIsDone("slash", 9)).toBe(true);
    expect(effectIsDone("deathPoof", 19)).toBe(false);
    expect(effectIsDone("deathPoof", 20)).toBe(true);
    expect(effectIsDone("hitSpark", 9)).toBe(true);
  });

  it("loops the element shots and never finishes them", () => {
    for (const name of ["fireShot", "iceShot", "mindShot"]) {
      expect(effectFrameIndex(name, 0)).toBe(0);
      expect(effectFrameIndex(name, 6)).toBe(1);
      expect(effectFrameIndex(name, 12)).toBe(0);
      expect(effectIsDone(name, 100000)).toBe(false);
    }
  });

  it("treats a negative age as the first frame", () => {
    expect(effectFrameIndex("hitSpark", -5)).toBe(0);
  });

  it("returns the sheet cell for an age", () => {
    expect(effectCell("hitSpark", 3)).toEqual({
      sheet: EFFECT_SHEET, x: 16, y: 64, w: 16, h: 16
    });
  });

  it("maps each mage class to a shot effect", () => {
    for (const mageClass of MAGE_CLASSES) {
      expect(EFFECT_NAMES).toContain(shotEffectName(mageClass));
    }
    expect(shotEffectName("Bard")).toBeNull();
  });
});
