// The scrolling backdrop behind the room. Drawing only, never changes the model.

const BACKGROUND_TILE_SIZE = 128;
const BACKGROUND_SPEED = new p5.Vector(0.3, 0.15); // pixels per frame
let backgroundTile;
let backgroundOffset;

// Call once in setup(). Draws a placeholder tile with p5 until we have a free-use image.
// To use art instead: load it with loadImage and set backgroundTile to it. Keep it
// seamless, since the tile repeats.
function buildBackground() {
  backgroundOffset = createVector(0, 0);
  backgroundTile = createGraphics(BACKGROUND_TILE_SIZE, BACKGROUND_TILE_SIZE);
  backgroundTile.background(28, 24, 48);
  backgroundTile.noStroke();
  for (let i = 0; i < 40; i++) {
    backgroundTile.fill(random(150, 230), random(150, 230), random(200, 255), random(150, 255));
    backgroundTile.circle(
      random(BACKGROUND_TILE_SIZE),
      random(BACKGROUND_TILE_SIZE),
      random(1.5, 3.5)
    );
  }
}

// Moves the offset along and wraps it, so it never grows.
function updateBackground() {
  backgroundOffset.add(BACKGROUND_SPEED);
  backgroundOffset.x = backgroundOffset.x % BACKGROUND_TILE_SIZE;
  backgroundOffset.y = backgroundOffset.y % BACKGROUND_TILE_SIZE;
}

// Tiles the image over the whole canvas, starting one tile early so there are no gaps.
function drawBackground() {
  for (let x = -BACKGROUND_TILE_SIZE; x < width; x += BACKGROUND_TILE_SIZE) {
    for (let y = -BACKGROUND_TILE_SIZE; y < height; y += BACKGROUND_TILE_SIZE) {
      image(backgroundTile, x + floor(backgroundOffset.x), y + floor(backgroundOffset.y));
    }
  }
}
