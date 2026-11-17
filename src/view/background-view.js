// The slow-moving dungeon void behind the room. Drawing only, never changes the model.

const BACKGROUND_ART_SIZE = 64; // pixels in the picture, drawn at 2x like the world
const BACKGROUND_TILE_SIZE = BACKGROUND_ART_SIZE * 2; // screen pixels per repeat
const BACKGROUND_SPEED = new p5.Vector(0.2, 0.1); // pixels per frame
let backgroundTile;
let backgroundOffset;

// Paints one seamless tile of dark void onto a p5.Graphics: flecks of rubble in the stone
// colors and a few patches of violet fog. Uses its own small random numbers so the tile is
// the same every time and Jasmine can build it without a running sketch.
function paintBackgroundTile(g, size) {
  let seed = 123456789;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  g.noStroke();
  g.fill(PALETTE.void);
  g.rect(0, 0, size, size);

  // Fog: soft squares of dark violet, drawn again on each side so the tile repeats cleanly.
  g.fill(...paletteRgb("violetDark"), 22);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    const w = 14 + Math.floor(next() * 14);
    for (let dx = -size; dx <= size; dx += size) {
      for (let dy = -size; dy <= size; dy += size) {
        g.rect(x + dx, y + dy, w, w);
        g.rect(x + dx + 3, y + dy + 3, w - 6, w - 6);
      }
    }
  }

  // Rubble: single pixels and small pairs, mostly dark so the room stays the focus.
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    const roll = next();
    if (roll < 0.6) {
      g.fill(PALETTE.ink);
    } else if (roll < 0.9) {
      g.fill(PALETTE.stoneShadow);
    } else {
      g.fill(PALETTE.stoneDark);
    }
    g.rect(x, y, 1, 1);
    if (roll < 0.3) {
      g.rect(x + 1, y, 1, 1);
    }
  }
}

// Call once in setup().
function buildBackground() {
  backgroundOffset = createVector(0, 0);
  backgroundTile = createGraphics(BACKGROUND_ART_SIZE, BACKGROUND_ART_SIZE);
  backgroundTile.pixelDensity(1);
  backgroundTile.noSmooth();
  paintBackgroundTile(backgroundTile, BACKGROUND_ART_SIZE);
  // The page behind the scaled canvas gets the same void, so a wide or tall window has no
  // flat bars. updateBackground() keeps it lined up with the canvas.
  const page = document.documentElement.style;
  page.backgroundColor = PALETTE.void;
  page.backgroundImage = "url(" + backgroundTile.elt.toDataURL() + ")";
}

// Moves the offset along and wraps it, so it never grows.
function updateBackground() {
  backgroundOffset.add(BACKGROUND_SPEED);
  backgroundOffset.x = backgroundOffset.x % BACKGROUND_TILE_SIZE;
  backgroundOffset.y = backgroundOffset.y % BACKGROUND_TILE_SIZE;
  const page = document.documentElement.style;
  page.backgroundSize = BACKGROUND_TILE_SIZE * pageScale + "px";
  page.backgroundPosition = (pageLeft + floor(backgroundOffset.x) * pageScale) + "px " +
    (pageTop + floor(backgroundOffset.y) * pageScale) + "px";
}

// Tiles the image over the whole canvas, starting one tile early so there are no gaps.
function drawBackground() {
  for (let x = -BACKGROUND_TILE_SIZE; x < width; x += BACKGROUND_TILE_SIZE) {
    for (let y = -BACKGROUND_TILE_SIZE; y < height; y += BACKGROUND_TILE_SIZE) {
      image(
        backgroundTile,
        x + floor(backgroundOffset.x),
        y + floor(backgroundOffset.y),
        BACKGROUND_TILE_SIZE,
        BACKGROUND_TILE_SIZE
      );
    }
  }
}
