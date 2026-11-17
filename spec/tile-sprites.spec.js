describe("tile sprites", () => {
  it("gives every tile type a sprite key", () => {
    for (const type of Object.values(TILE)) {
      expect(TILE_SPRITE_KEYS[type]).toBeDefined();
    }
  });

  it("points every sprite key at a listed image file", () => {
    for (const key of Object.values(TILE_SPRITE_KEYS)) {
      expect(TILE_IMAGE_FILES[key]).toMatch(/^assets\/tiles\/.+\.png$/);
    }
  });

  it("uses lowercase-hyphen names for the new tile files", () => {
    for (const file of Object.values(TILE_IMAGE_FILES)) {
      const name = file.split("/").pop();
      expect(name).toMatch(/^[a-z0-9-]+\.png$/);
    }
  });

  it("has a ceiling image for walls with no floor around them", () => {
    expect(TILE_IMAGE_FILES.ceiling).toBeDefined();
  });

  it("loads every tile image with the right size", (done) => {
    const files = Object.entries(TILE_IMAGE_FILES);
    let remaining = files.length;
    for (const [key, file] of files) {
      const img = new Image();
      img.onload = () => {
        if (key === "walls") {
          expect([img.width, img.height]).toEqual([96, 32]);
        } else {
          expect([img.width, img.height]).toEqual([16, 16]);
        }
        remaining--;
        if (remaining === 0) {
          done();
        }
      };
      img.onerror = () => {
        fail("could not load " + file);
        done();
      };
      img.src = file;
    }
  });

  it("has a wall sprite cell for every variant the room code can return", () => {
    const variants = [
      "open-n", "open-e", "open-s", "open-w", "open-nw", "open-ne", "open-sw", "open-se",
      "diag-nw", "diag-ne", "diag-sw", "diag-se"
    ];
    const cells = variants.map((v) => WALL_SPRITES[v].join(","));
    expect(new Set(cells).size).toBe(variants.length);
  });
});
