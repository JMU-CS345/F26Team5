// Draws text with the bitmap font sheet. Reads the model layout, never changes it.

let pixelFontSheet = null; // white glyphs on a clear background, tinted when drawn

// Call once in setup(), with await.
async function loadPixelFont() {
  pixelFontSheet = await loadImageFile("assets/ui/pixel-font.png");
}

// Draws str with its top left at (x, y). size is the glyph size in pixels (8, 16, 24...).
// color is a palette hex string or p5 color. align is "left", "center" or "right".
function drawPixelText(str, x, y, size, color, align = "left") {
  if (pixelFontSheet === null) {
    return;
  }
  const text = String(str);
  let left = x;
  if (align === "center") {
    left = x - measurePixelText(text, size) / 2;
  }
  if (align === "right") {
    left = x - measurePixelText(text, size);
  }
  left = Math.round(left); // whole pixels keep the glyph edges sharp
  push();
  tint(color); // the sheet is white, so tint gives the glyph its color
  for (let i = 0; i < text.length; i++) {
    const glyph = pixelGlyphCell(text[i]);
    image(
      pixelFontSheet,
      left + i * size, Math.round(y), size, size,
      glyph.col * PIXEL_FONT.cell, glyph.row * PIXEL_FONT.cell, PIXEL_FONT.cell, PIXEL_FONT.cell
    );
  }
  pop();
}

// Draws word-wrapped text and returns how many lines it used.
function drawPixelParagraph(str, x, y, maxWidth, size, color, lineGap = 4) {
  const lines = wrapPixelText(str, maxWidth, size);
  for (let i = 0; i < lines.length; i++) {
    drawPixelText(lines[i], x, y + i * (size + lineGap), size, color);
  }
  return lines.length;
}
