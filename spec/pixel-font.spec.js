describe("pixel font", function () {
  it("finds glyph cells by character", function () {
    expect(pixelGlyphCell(" ")).toEqual({ col: 0, row: 0 });
    expect(pixelGlyphCell("0")).toEqual({ col: 0, row: 1 });
    expect(pixelGlyphCell("A")).toEqual({ col: 1, row: 2 });
    expect(pixelGlyphCell("a")).toEqual({ col: 1, row: 4 });
    expect(pixelGlyphCell("~")).toEqual({ col: 14, row: 5 });
  });

  it("keeps every printable character inside the 16 by 6 sheet", function () {
    for (let code = 32; code < 127; code++) {
      const cell = pixelGlyphCell(String.fromCharCode(code));
      expect(cell.col).toBeLessThan(16);
      expect(cell.row).toBeLessThan(6);
    }
  });

  it("falls back to the question mark for unknown characters", function () {
    const question = pixelGlyphCell("?");
    expect(pixelGlyphCell("✕")).toEqual(question);
    expect(pixelGlyphCell("\n")).toEqual(question);
    expect(pixelGlyphCell("")).toEqual(question);
    expect(pixelGlyphCell("ab")).toEqual(question);
    expect(pixelGlyphCell(undefined)).toEqual(question);
  });

  it("measures text as one cell per character", function () {
    expect(measurePixelText("", 8)).toBe(0);
    expect(measurePixelText("Gold", 8)).toBe(32);
    expect(measurePixelText("Gold", 16)).toBe(64);
  });

  it("wraps text at spaces to fit a width", function () {
    expect(wrapPixelText("one two three", 56, 8)).toEqual(["one two", "three"]);
    expect(wrapPixelText("short", 400, 8)).toEqual(["short"]);
  });

  it("puts a word wider than the line on its own line", function () {
    expect(wrapPixelText("a enormousword b", 32, 8)).toEqual(["a", "enormousword", "b"]);
  });
});
