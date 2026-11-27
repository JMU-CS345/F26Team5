// The backdrop behind the room: a dark blue gradient with snow falling over it, like the ZSNES menu.
// Drawing only, never changes the model. The flakes are made and moved by background-art.js.

let snowflakes = [];
let pageBackgroundKey = ""; // the page layout the CSS backdrop was last set for

const rgbString = (color) => "rgb(" + color.join(",") + ")";

// Call once in setup().
function buildBackground() {
  snowflakes = [];
  for (let i = 0; i < SNOW.count; i++) {
    snowflakes.push(makeSnowflake(Math.random, CANVAS_WIDTH, CANVAS_HEIGHT));
  }
}

// Gives the page behind the scaled canvas the same gradient, lined up with the canvas, so a wide or
// tall window has no flat bars: the gradient across the canvas's height, and its top and bottom
// colours above and below it. Only redone when the window changes.
function syncPageBackground() {
  const key = [pageLeft, pageTop, pageScale].join(",");
  if (key === pageBackgroundKey) {
    return;
  }
  pageBackgroundKey = key;
  const top = rgbString(BACKGROUND_TOP);
  const bottom = rgbString(BACKGROUND_BOTTOM);
  const canvasHeight = CANVAS_HEIGHT * pageScale;
  const page = document.documentElement.style;
  page.backgroundColor = bottom;
  page.backgroundImage = "linear-gradient(" + top + "," + bottom + "), linear-gradient(" + top + "," + top + ")";
  page.backgroundRepeat = "repeat-x, no-repeat";
  page.backgroundSize = "100% " + canvasHeight + "px, 100% " + pageTop + "px";
  page.backgroundPosition = "0 " + pageTop + "px, 0 0";
}

// Moves every flake one frame.
function updateBackground() {
  for (const flake of snowflakes) {
    stepSnowflake(flake, frameCount, CANVAS_WIDTH, CANVAS_HEIGHT, Math.random);
  }
  syncPageBackground();
}

// Draws the gradient, then every flake as a small white square.
function drawBackground() {
  push();
  const gradient = drawingContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rgbString(BACKGROUND_TOP));
  gradient.addColorStop(1, rgbString(BACKGROUND_BOTTOM));
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
  noStroke();
  for (const flake of snowflakes) {
    fill(255, 255, 255, flake.alpha);
    rect(Math.floor(flake.x), Math.floor(flake.y), flake.size, flake.size);
  }
  pop();
}
