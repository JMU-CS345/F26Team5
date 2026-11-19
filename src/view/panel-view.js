// Draws the shared stone panel frame. Reads the layout model, never changes it.

let panelImage = null;

// Call once in setup(), with await.
async function loadPanelImage() {
  panelImage = await loadImageFile("assets/ui/panel.png");
}

// Draws a 9-slice panel with its top left at (x, y). Use for every window and box.
function drawPanel(x, y, w, h) {
  if (panelImage === null) {
    return;
  }
  for (const s of panelSlices(x, y, w, h)) {
    if (s.dw > 0 && s.dh > 0) {
      image(panelImage, s.dx, s.dy, s.dw, s.dh, s.sx, s.sy, s.sw, s.sh);
    }
  }
}
