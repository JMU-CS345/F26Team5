// Checks the layered wizard: frame table, layers, anchor math, recolor and the colors that
// come from the class and the customization choices.
describe("PLAYER_MODELS", () => {
  it("has one model, still named in selectedModel", () => {
    expect(PLAYER_MODEL_NAMES).toEqual(["Wizard"]);
    expect(PLAYER_MODELS.Wizard.spriteW).toBe(24);
    expect(PLAYER_MODELS.Wizard.spriteH).toBe(28);
  });

  it("lists the layers bottom to top", () => {
    expect(PLAYER_LAYERS).toEqual(["robe", "body", "hat", "hood", "eyes", "flame"]);
    expect(PLAYER_MODELS.Wizard.layers).toEqual(PLAYER_LAYERS);
  });

  it("has a layer picture for every layer", () => {
    for (const name of PLAYER_LAYERS) {
      expect(LAYER_DATA[name]).toMatch(/^data:image\/png;base64,/);
    }
  });

  it("has the frame table: idle 1, walk 4, swing 3, cast 2, dash 1, hurt 1, KO 2", () => {
    const counts = {};
    for (const name of Object.keys(FRAME_TABLE)) {
      counts[name] = FRAME_TABLE[name].frames;
    }
    expect(counts).toEqual({ idle: 1, walk: 4, swing: 3, cast: 2, dash: 1, hurt: 1, ko: 2 });
  });

  it("lays the states out one after another with no gaps", () => {
    let next = 0;
    for (const name of ["idle", "walk", "swing", "cast", "dash", "hurt", "ko"]) {
      expect(FRAME_TABLE[name].start).toBe(next);
      next += FRAME_TABLE[name].frames;
    }
    expect(next).toBe(14);
  });

  it("draws down, up and right rows only", () => {
    expect(SPRITE_ROWS).toEqual({ down: 0, up: 1, right: 2 });
  });
});

describe("spriteOrigin", () => {
  it("centers the 24x28 sprite on the 16x16 hitbox with the feet on its bottom", () => {
    const origin = spriteOrigin({ x: 100, y: 200 }, 16, 16);
    expect(origin.left).toBe(96);
    expect(origin.top).toBe(188);
    expect(origin.left + 24 / 2).toBe(100 + 16 / 2);
    expect(origin.top + 28).toBe(200 + 16);
  });

  it("leaves the player hitbox at 16x16", () => {
    const player = new Player(0, 0, "Fire");
    expect(player.length).toBe(16);
    expect(player.width).toBe(16);
  });
});

describe("wizardColors", () => {
  const none = makeAppearance();

  it("starts from the class: Fire red, Ice blue, Mind violet robe", () => {
    expect(wizardColors("Fire", none).robe[1]).toEqual([196, 52, 38]);
    expect(wizardColors("Ice", none).robe[1]).toEqual([60, 132, 196]);
    expect(wizardColors("Mind", none).robe[1]).toEqual([122, 76, 184]);
  });

  it("colors the flame by class", () => {
    expect(wizardColors("Fire", none).flame[1]).toEqual([255, 160, 30]);
    expect(wizardColors("Ice", none).flame[1]).toEqual([130, 215, 255]);
    expect(wizardColors("Mind", none).flame[1]).toEqual([205, 140, 255]);
  });

  it("falls back to the Fire look for an unknown class", () => {
    expect(wizardColors(null, none).robe).toEqual(wizardColors("Fire", none).robe);
  });

  it("starts pointed and has every field the layers need", () => {
    const colors = wizardColors("Ice", none);
    for (const field of ["skin", "robe", "hat", "hood", "hatStyle", "eyes", "flame"]) {
      expect(field in colors).toBe(true);
    }
    expect(colors.hatStyle).toBe("pointed");
  });

  it("uses the chosen skin color on the skin only", () => {
    const base = wizardColors("Fire", none);
    const dark = wizardColors("Fire", makeAppearance({ skin: "Dark" }));
    expect(dark.skin).toEqual(getAppearanceColor(makeAppearance({ skin: "Dark" }), "skin"));
    expect(dark.robe).toEqual(base.robe);
    expect(dark.hat).toEqual(base.hat);
    expect(dark.eyes).toEqual(base.eyes);
    expect(dark.flame).toEqual(base.flame);
  });

  it("uses the chosen eye color on the eyes only", () => {
    const base = wizardColors("Fire", none);
    const red = wizardColors("Fire", makeAppearance({ eyes: "Red" }));
    expect(red.eyes).toEqual(getAppearanceColor(makeAppearance({ eyes: "Red" }), "eyes"));
    expect(red.skin).toEqual(base.skin);
    expect(red.robe).toEqual(base.robe);
    expect(red.hat).toEqual(base.hat);
  });

  it("uses the chosen clothing color on the robe only", () => {
    const base = wizardColors("Fire", none);
    const green = wizardColors("Fire", makeAppearance({ clothing: "Green" }));
    const color = getAppearanceColor(makeAppearance({ clothing: "Green" }), "clothing");
    expect(green.robe[1]).toEqual(color);
    expect(green.robe).not.toEqual(base.robe);
    expect(green.hat).toEqual(base.hat);
    expect(green.hood).toEqual(base.hood);
    expect(green.skin).toEqual(base.skin);
    expect(green.eyes).toEqual(base.eyes);
  });

  it("uses the chosen hair color on the hat and hood, not the robe", () => {
    const base = wizardColors("Fire", none);
    const blonde = wizardColors("Fire", makeAppearance({ hair: "Blonde" }));
    const color = getAppearanceColor(makeAppearance({ hair: "Blonde" }), "hair");
    expect(blonde.hat[1]).toEqual(color);
    expect(blonde.hood[1]).toEqual(color);
    expect(blonde.robe).toEqual(base.robe);
    expect(blonde.skin).toEqual(base.skin);
    expect(blonde.eyes).toEqual(base.eyes);
  });

  it("keeps the class hat and robe for hair None and clothing Class", () => {
    const colors = wizardColors("Mind", makeAppearance({ hair: "None", clothing: "Class" }));
    expect(colors.hat[1]).toEqual([98, 56, 160]);
    expect(colors.robe[1]).toEqual([122, 76, 184]);
  });

  it("gives every hair color a hat of that color", () => {
    for (const name of getAppearanceOptionNames("hair")) {
      const color = getAppearanceColor(makeAppearance({ hair: name }), "hair");
      if (color !== null) {
        expect(wizardColors("Fire", makeAppearance({ hair: name })).hat[1]).toEqual(color);
      }
    }
  });

  it("does not change the shared option colors", () => {
    const colors = wizardColors("Fire", makeAppearance({ skin: "Dark", eyes: "Red" }));
    colors.skin[0] = 0;
    colors.eyes[0] = 0;
    expect(getAppearanceColor(makeAppearance({ skin: "Dark" }), "skin")[0]).toBe(96);
    expect(getAppearanceColor(makeAppearance({ eyes: "Red" }), "eyes")[0]).toBe(220);
  });

  it("is drawn from the appearance the player was given", () => {
    const player = new Player(0, 0, "Fire", "Wizard", { hair: "Black", clothing: "Gray" });
    const colors = wizardColors(player.mageClass, player.appearance);
    expect(colors.hat[1]).toEqual([35, 35, 40]);
    expect(colors.robe[1]).toEqual([120, 120, 130]);
  });
});

describe("layer choice and recolor map", () => {
  const none = makeAppearance();

  it("draws the eyes layer under a hat and the hood layer for a hood", () => {
    expect(layersForStyle("pointed")).toEqual(["robe", "body", "hat", "eyes", "flame"]);
    expect(layersForStyle("hood")).toEqual(["robe", "body", "hood", "flame"]);
  });

  it("maps the three key grays of the robe to the class ramp", () => {
    const pairs = recolorPairs("robe", wizardColors("Ice", none));
    expect(pairs.length).toBe(3);
    expect(pairs[0]).toEqual([[70, 70, 70], [30, 70, 130]]);
    expect(pairs[2]).toEqual([[210, 210, 210], [150, 210, 240]]);
  });

  it("recolors the hat on its own ramp, not the robe's", () => {
    const pairs = recolorPairs("hat", wizardColors("Fire", none));
    expect(pairs[1][1]).toEqual([178, 40, 34]);
  });

  // The hood layer has the eyes in it too, so the eye color also changes the hood.
  it("changes the swaps of exactly the layers whose part changed", () => {
    const base = wizardColors("Fire", none);
    const cases = [
      { part: "skin", choice: "Dark", layers: ["body"] },
      { part: "eyes", choice: "Red", layers: ["eyes", "hood"] },
      { part: "hair", choice: "Blonde", layers: ["hat", "hood"] },
      { part: "clothing", choice: "Green", layers: ["robe"] }
    ];
    for (const c of cases) {
      const changed = wizardColors("Fire", makeAppearance({ [c.part]: c.choice }));
      for (const layer of ["robe", "body", "hat", "hood", "eyes", "flame"]) {
        const same = recolorKey(layer, base) === recolorKey(layer, changed);
        expect(same).toBe(!c.layers.includes(layer));
      }
    }
  });

  it("gives the same cache key for the same look and a new one for a new look", () => {
    const fire = wizardColors("Fire", none);
    expect(recolorKey("robe", fire)).toBe(recolorKey("robe", wizardColors("Fire", none)));
    expect(recolorKey("robe", fire)).not.toBe(recolorKey("robe", wizardColors("Ice", none)));
  });

  // A tiny stand-in for a p5 image, because the runner has no canvas.
  function tinyImage(w, h) {
    return { width: w, height: h, pixels: new Array(w * h * 4).fill(0),
      loadPixels() {}, updatePixels() {} };
  }

  it("applies the map to a tiny in-memory image and keeps unlisted pixels", () => {
    const original = window.createImage;
    window.createImage = tinyImage;
    const img = tinyImage(3, 1);
    img.pixels = [70, 70, 70, 255, 210, 210, 210, 255, 26, 22, 38, 255];
    const out = recolorLayer(img, recolorPairs("robe", wizardColors("Fire", none)));
    expect(Array.from(out.pixels.slice(0, 4))).toEqual([120, 28, 24, 255]);
    expect(Array.from(out.pixels.slice(4, 8))).toEqual([236, 112, 56, 255]);
    expect(Array.from(out.pixels.slice(8, 12))).toEqual([26, 22, 38, 255]);
    window.createImage = original;
  });
});

describe("playerFrame", () => {
  let player;
  beforeEach(() => {
    player = new Player(0, 0, "Fire");
  });

  it("stands on the idle frame facing down", () => {
    expect(playerFrame(player)).toEqual({ state: "idle", index: 0, col: 0, row: 0, flip: false });
  });

  it("walks through the four walk frames", () => {
    player.walkFrames = 1;
    expect(playerFrame(player).col).toBe(1);
    player.walkFrames = STEP_TIME * 3;
    expect(playerFrame(player).col).toBe(4);
    player.walkFrames = STEP_TIME * 4;
    expect(playerFrame(player).col).toBe(1);
  });

  it("uses the right row for up and flips left from the right row", () => {
    player.facing = "up";
    expect(playerFrame(player).row).toBe(1);
    player.facing = "right";
    expect(playerFrame(player).flip).toBe(false);
    player.facing = "left";
    const f = playerFrame(player);
    expect(f.row).toBe(2);
    expect(f.flip).toBe(true);
  });

  it("uses the cast frames while shooting", () => {
    player.holding = true;
    expect(playerFrame(player).state).toBe("cast");
    expect(playerFrame(player).col).toBe(8);
  });

  it("uses the KO frames when dead", () => {
    player.takeDamage(player.maxHealth);
    expect(playerFrame(player).col).toBe(12);
    player.deathFrames = 20;
    expect(playerFrame(player).col).toBe(13);
  });
});
