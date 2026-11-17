// Picks how much to scale the game page so it fits the window.
// No p5 drawing calls, so Jasmine can test it without a canvas.

// Returns the largest whole-number scale that fits the window, so every art pixel stays
// a square block. If the window is smaller than 1x, a fractional scale is the only way to
// fit, so that is returned instead.
function integerScale(windowW, windowH, baseW, baseH) {
  const fit = Math.min(windowW / baseW, windowH / baseH);
  if (fit < 1) {
    return fit;
  }
  return Math.floor(fit);
}
