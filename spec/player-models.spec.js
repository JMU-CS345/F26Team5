// Checks the layered wizard: frame table, layers, anchor math, recolor and defaults.
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

describe("defaultAppearance", () => {
  it("comes from the class: Fire red, Ice blue, Mind violet", () => {
    expect(defaultAppearance("Fire").robe[1]).toEqual([196, 52, 38]);
    expect(defaultAppearance("Ice").robe[1]).toEqual([60, 132, 196]);
    expect(defaultAppearance("Mind").robe[1]).toEqual([122, 76, 184]);
  });

  it("colors the flame by class", () => {
    expect(defaultAppearance("Fire").flame[1]).toEqual([255, 160, 30]);
    expect(defaultAppearance("Ice").flame[1]).toEqual([130, 215, 255]);
    expect(defaultAppearance("Mind").flame[1]).toEqual([205, 140, 255]);
  });

  it("has skin, robe, hat, hatStyle, eyes and flame, and starts pointed", () => {
    const look = defaultAppearance("Ice");
    for (const field of ["skin", "robe", "hat", "hatStyle", "eyes", "flame"]) {
      expect(field in look).toBe(true);
    }
    expect(look.hatStyle).toBe("pointed");
    expect(look.eyes).toBeNull();
  });

  it("takes a hood and ignores an unknown hat style", () => {
    expect(defaultAppearance("Fire", "hood").hatStyle).toBe("hood");
    expect(defaultAppearance("Fire", "round").hatStyle).toBe("pointed");
  });

  it("gives a new player the class look", () => {
    expect(new Player(0, 0, "Mind").appearance.robe).toEqual(defaultAppearance("Mind").robe);
  });
});

describe("layer choice and recolor map", () => {
  it("draws the eyes layer under a hat and the hood layer for a hood", () => {
    expect(layersForStyle("pointed")).toEqual(["robe", "body", "hat", "eyes", "flame"]);
    expect(layersForStyle("hood")).toEqual(["robe", "body", "hood", "flame"]);
  });

  it("maps the three key grays of the robe to the class ramp", () => {
    const pairs = recolorPairs("robe", defaultAppearance("Ice"));
    expect(pairs.length).toBe(3);
    expect(pairs[0]).toEqual([[70, 70, 70], [30, 70, 130]]);
    expect(pairs[2]).toEqual([[210, 210, 210], [150, 210, 240]]);
  });

  it("recolors the hat on its own ramp, not the robe's", () => {
    const pairs = recolorPairs("hat", defaultAppearance("Fire"));
    expect(pairs[1][1]).toEqual([178, 40, 34]);
  });

  it("has dark eyes under a hat and orange eyes in a hood unless a color is set", () => {
    expect(eyeColorFor(defaultAppearance("Fire"))).toEqual([26, 22, 38]);
    expect(eyeColorFor(defaultAppearance("Fire", "hood"))).toEqual([255, 150, 30]);
    const look = defaultAppearance("Fire");
    look.eyes = [10, 200, 10];
    expect(eyeColorFor(look)).toEqual([10, 200, 10]);
  });

  it("gives the same cache key for the same look and a new one for a new look", () => {
    const fire = defaultAppearance("Fire");
    expect(recolorKey("robe", fire)).toBe(recolorKey("robe", defaultAppearance("Fire")));
    expect(recolorKey("robe", fire)).not.toBe(recolorKey("robe", defaultAppearance("Ice")));
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
    const out = recolorLayer(img, recolorPairs("robe", defaultAppearance("Fire")));
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

  it("uses the swing frames by attack phase", () => {
    player.attack = { phase: () => "windup" };
    expect(playerFrame(player).col).toBe(5);
    player.attack = { phase: () => "active" };
    expect(playerFrame(player).col).toBe(6);
    player.attack = { phase: () => "recovery" };
    expect(playerFrame(player).col).toBe(7);
  });

  it("uses the hurt frame just after a hit, then goes back", () => {
    player.takeDamage(1, new p5.Vector(1, 0));
    expect(playerFrame(player).state).toBe("hurt");
    player.iFrames = 5;
    expect(playerFrame(player).state).toBe("idle");
  });

  it("uses the dash frame while dashing", () => {
    player.dashFrames = 3;
    expect(playerFrame(player).state).toBe("dash");
    expect(playerFrame(player).col).toBe(10);
  });

  it("uses the KO frames when dead", () => {
    player.takeDamage(player.maxHealth);
    expect(playerFrame(player).col).toBe(12);
    player.deathFrames = 20;
    expect(playerFrame(player).col).toBe(13);
  });
});
