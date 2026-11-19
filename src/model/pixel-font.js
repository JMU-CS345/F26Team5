// Layout of the bitmap font sheet (assets/ui/pixel-font.png). Pure math, no drawing.
// The sheet is 16 columns by 6 rows of 8x8 cells, starting at the space character (ASCII 32).
const PIXEL_FONT = Object.freeze({
  cell: 8,
  columns: 16,
  firstCode: 32,
  lastCode: 127,
  fallback: "?"
});

// Where a character sits on the sheet, as a column and row. Unknown characters give "?".
function pixelGlyphCell(character) {
  let code = PIXEL_FONT.fallback.charCodeAt(0);
  if (typeof character === "string" && character.length === 1) {
    const wanted = character.charCodeAt(0);
    if (wanted >= PIXEL_FONT.firstCode && wanted <= PIXEL_FONT.lastCode) {
      code = wanted;
    }
  }
  const index = code - PIXEL_FONT.firstCode;
  return { col: index % PIXEL_FONT.columns, row: Math.floor(index / PIXEL_FONT.columns) };
}

// Width in screen pixels. Every glyph is one square cell, so size is the cell size on screen.
// Use multiples of 8 so the art pixels stay sharp.
function measurePixelText(str, size) {
  return String(str).length * size;
}

// Breaks text into lines that fit maxWidth, at spaces. A word wider than a line gets its own line.
function wrapPixelText(str, maxWidth, size) {
  const perLine = Math.max(1, Math.floor(maxWidth / size));
  const lines = [];
  let line = "";
  for (const word of String(str).split(" ")) {
    const joined = line === "" ? word : line + " " + word;
    if (joined.length <= perLine || line === "") {
      line = joined;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}
