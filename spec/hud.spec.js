describe("HUD layout", function () {
  it("shows one full heart per health point", function () {
    expect(heartsForHealth(5, 5)).toEqual(["full", "full", "full", "full", "full"]);
  });

  it("shows a half heart for a fractional health", function () {
    expect(heartsForHealth(3.5, 5)).toEqual(["full", "full", "full", "half", "empty"]);
  });

  it("shows empty hearts for lost health", function () {
    expect(heartsForHealth(0, 3)).toEqual(["empty", "empty", "empty"]);
    expect(heartsForHealth(1, 3)).toEqual(["full", "empty", "empty"]);
  });

  it("treats less than half a heart as empty", function () {
    expect(heartsForHealth(2.25, 3)).toEqual(["full", "full", "empty"]);
  });

  it("supports other max health values", function () {
    expect(heartsForHealth(7, 8).length).toBe(8);
    expect(heartsForHealth(4, 4.5).length).toBe(5);
    expect(heartsForHealth(0, 0)).toEqual([]);
  });

  it("never shows more than the health or fewer than the hearts allowed", function () {
    expect(heartsForHealth(99, 2)).toEqual(["full", "full"]);
    expect(heartsForHealth(-3, 2)).toEqual(["empty", "empty"]);
  });

  it("wraps hearts into rows", function () {
    const spots = heartPositions(7);
    expect(spots.length).toBe(7);
    expect(spots[0].y).toBe(spots[4].y);
    expect(spots[5].y).toBeGreaterThan(spots[0].y);
    expect(spots[5].x).toBe(spots[0].x);
  });

  it("wraps 8 hearts into two rows and puts gold under both", function () {
    const spots = heartPositions(8);
    expect(spots[4].y).toBe(spots[0].y);
    expect(spots[5].y).toBe(spots[0].y + HUD.heartStep);
    expect(spots[7].x).toBe(spots[2].x);
    expect(goldHudPosition(8).y).toBeGreaterThan(spots[7].y + HUD.heartSize - 1);
  });

  it("puts the melee box before the ranged box without overlap", function () {
    const boxes = weaponBoxRects();
    expect(boxes[0].slot).toBe("melee");
    expect(boxes[1].slot).toBe("projectile");
    expect(boxes[1].x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].w);
  });

  it("puts the gold counter below every row of hearts", function () {
    const oneRow = goldHudPosition(5);
    const twoRows = goldHudPosition(7);
    expect(oneRow.y).toBeGreaterThan(heartPositions(5)[0].y);
    expect(twoRows.y).toBeGreaterThan(oneRow.y);
  });
});
