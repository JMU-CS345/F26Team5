describe("integerScale", () => {
  it("returns 1 when the window is exactly the base size", () => {
    expect(integerScale(1280, 720, 1280, 720)).toBe(1);
  });

  it("rounds down to a whole number when the window is larger", () => {
    expect(integerScale(1920, 1080, 1280, 720)).toBe(1);
    expect(integerScale(2560, 1440, 1280, 720)).toBe(2);
    expect(integerScale(3000, 1500, 1280, 720)).toBe(2);
    expect(integerScale(3840, 2160, 1280, 720)).toBe(3);
  });

  it("is limited by the tighter side", () => {
    expect(integerScale(5000, 800, 1280, 720)).toBe(1);
    expect(integerScale(1300, 2200, 1280, 720)).toBe(1);
  });

  it("falls back to a fractional scale below 1x", () => {
    expect(integerScale(640, 360, 1280, 720)).toBe(0.5);
    expect(integerScale(1000, 900, 1280, 720)).toBeCloseTo(0.78125, 5);
  });

  it("never returns a negative scale", () => {
    expect(integerScale(0, 0, 1280, 720)).toBe(0);
  });
});
