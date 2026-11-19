// Layout math for the 9-slice panel (assets/ui/panel.png). Pure, no drawing.
// The picture is 24x24 art pixels: an 8 pixel corner, an 8 pixel edge and an 8 pixel center.
const PANEL_ART = Object.freeze({
  size: 24,
  corner: 8,
  scale: 2, // same 2x zoom as the world
  inset: 6 // art pixels of frame (outline, bevel, bands) before the flat inside
});

// The panel size on screen can never be smaller than its two corners.
function panelMinSize() {
  return 2 * PANEL_ART.corner * PANEL_ART.scale;
}

// The nine pieces to draw: source rect in the picture and destination rect on screen.
// Corners keep their size, edges stretch along one side, the center stretches both ways.
function panelSlices(x, y, w, h) {
  const width = Math.max(panelMinSize(), Math.round(w));
  const height = Math.max(panelMinSize(), Math.round(h));
  const left = Math.round(x);
  const top = Math.round(y);
  const c = PANEL_ART.corner;
  const cs = c * PANEL_ART.scale; // corner size on screen
  const srcXs = [0, c, PANEL_ART.size - c];
  const srcWs = [c, PANEL_ART.size - 2 * c, c];
  const dstXs = [left, left + cs, left + width - cs];
  const dstWs = [cs, width - 2 * cs, cs];
  const dstYs = [top, top + cs, top + height - cs];
  const dstHs = [cs, height - 2 * cs, cs];
  const slices = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      slices.push({
        sx: srcXs[col], sy: srcXs[row], sw: srcWs[col], sh: srcWs[row],
        dx: dstXs[col], dy: dstYs[row], dw: dstWs[col], dh: dstHs[row]
      });
    }
  }
  return slices;
}

// The area inside the frame where text and slots go, with a little padding.
function panelContentRect(x, y, w, h, padding = 8) {
  const edge = PANEL_ART.inset * PANEL_ART.scale + padding;
  return {
    x: Math.round(x) + edge,
    y: Math.round(y) + edge,
    w: Math.max(0, Math.round(w) - 2 * edge),
    h: Math.max(0, Math.round(h) - 2 * edge)
  };
}
