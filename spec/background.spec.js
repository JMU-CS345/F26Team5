describe("dungeon background", () => {
  let sketch;
  let tile;

  // A p5 instance with no canvas, only to make a p5.Graphics for the tile.
  beforeEach(() => {
    sketch = new p5((p) => {
      p.setup = () => {
        p.noCanvas();
      };
    });
    tile = sketch.createGraphics(BACKGROUND_ART_SIZE, BACKGROUND_ART_SIZE);
    tile.pixelDensity(1);
  });

  afterEach(() => {
    tile.remove();
    sketch.remove();
  });

  it("builds the tile without errors", () => {
    expect(() => paintBackgroundTile(tile, BACKGROUND_ART_SIZE)).not.toThrow();
  });

  it("draws the tile at 2x so its pixels match the world", () => {
    expect(BACKGROUND_TILE_SIZE).toBe(BACKGROUND_ART_SIZE * 2);
  });

  it("makes a dark tile with only a little light in it", () => {
    paintBackgroundTile(tile, BACKGROUND_ART_SIZE);
    tile.loadPixels();
    let bright = 0;
    for (let i = 0; i < tile.pixels.length; i += 4) {
      const sum = tile.pixels[i] + tile.pixels[i + 1] + tile.pixels[i + 2];
      if (sum > 300) {
        bright++;
      }
    }
    expect(bright).toBe(0);
  });

  it("builds the same tile every time", () => {
    paintBackgroundTile(tile, BACKGROUND_ART_SIZE);
    tile.loadPixels();
    const first = Array.from(tile.pixels);
    paintBackgroundTile(tile, BACKGROUND_ART_SIZE);
    tile.loadPixels();
    expect(Array.from(tile.pixels)).toEqual(first);
  });
});
