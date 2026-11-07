describe("rectsOverlap", function () {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  it("is true for overlapping rects", function () {
    expect(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("is true when one rect contains the other", function () {
    expect(rectsOverlap(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
  });
  it("is false when rects only touch edges", function () {
    expect(rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
  it("is false when separated", function () {
    expect(rectsOverlap(a, { x: 50, y: 50, w: 10, h: 10 })).toBe(false);
  });
});