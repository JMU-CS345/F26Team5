// Specs for character appearance customization (#23).

describe("Appearance", function () {
  it("has body, eyes, shirt and pants, and no hair", function () {
    expect(APPEARANCE_PARTS).toEqual(["body", "eyes", "shirt", "pants"]);
    expect(APPEARANCE_PARTS).not.toContain("hair");
  });

  it("uses a valid hex color for every default", function () {
    for (const part of APPEARANCE_PARTS) {
      expect(isValidHex(DEFAULT_APPEARANCE[part])).toBe(true);
    }
  });

  it("accepts hex codes with or without #, in any case, and 3 or 6 digits", function () {
    expect(normalizeHex("#F1C299")).toBe("#f1c299");
    expect(normalizeHex("f1c299")).toBe("#f1c299");
    expect(normalizeHex("  #fc9 ")).toBe("#ffcc99");
  });

  it("rejects things that are not hex colors", function () {
    for (const bad of ["", "#", "#12345", "#1234567", "#gg0000", "red", null, undefined, 123]) {
      expect(normalizeHex(bad)).toBeNull();
      expect(isValidHex(bad)).toBe(false);
    }
  });

  it("converts hex to RGB", function () {
    expect(hexToRgb("#f1c299")).toEqual([241, 194, 153]);
    expect(hexToRgb("nope")).toBeNull();
  });

  it("keeps valid colors and fills in anything missing or invalid", function () {
    const look = makeAppearance({ body: "#603020", eyes: "rainbow", hair: "#ffffff" });
    expect(look.body).toBe("#603020");
    expect(look.eyes).toBe(DEFAULT_APPEARANCE.eyes);
    expect(look.shirt).toBe(DEFAULT_APPEARANCE.shirt);
    expect(look.pants).toBe(DEFAULT_APPEARANCE.pants);
    expect(Object.keys(look).sort()).toEqual([...APPEARANCE_PARTS].sort());
  });

  it("cleans up colors when making an appearance", function () {
    expect(makeAppearance({ shirt: "F00" }).shirt).toBe("#ff0000");
  });

  it("sets one part to a new color", function () {
    const look = setAppearanceColor(makeAppearance(), "shirt", "#FF0000");
    expect(look.shirt).toBe("#ff0000");
    expect(look.pants).toBe(DEFAULT_APPEARANCE.pants);
  });

  it("ignores invalid colors and unknown parts when setting a color", function () {
    const look = makeAppearance();
    expect(setAppearanceColor(look, "shirt", "#12")).toEqual(look);
    expect(setAppearanceColor(look, "hair", "#ffffff")).toEqual(look);
  });

  it("does not change the original appearance when setting a color", function () {
    const look = makeAppearance();
    setAppearanceColor(look, "body", "#000000");
    expect(look.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("gives an RGB color for each part", function () {
    for (const part of APPEARANCE_PARTS) {
      expect(getAppearanceColor(makeAppearance(), part).length).toBe(3);
    }
    expect(getAppearanceColor(makeAppearance({ eyes: "#0a141e" }), "eyes")).toEqual([10, 20, 30]);
  });

  it("draws the layers pants, then shirt, then eyes", function () {
    expect(APPEARANCE_LAYER_ORDER).toEqual(["pants", "shirt", "eyes"]);
  });

  it("has an eyes, shirt and pants layer image for every player model", function () {
    for (const name of PLAYER_MODEL_NAMES) {
      const layers = PLAYER_ART[name].layerSheets;
      expect(Object.keys(layers).sort()).toEqual(["eyes", "pants", "shirt"]);
      for (const layer of APPEARANCE_LAYER_ORDER) {
        expect(layers[layer]).toContain(PLAYER_ART[name].spriteW + "x" + PLAYER_ART[name].spriteH);
      }
    }
  });
});

describe("Customization in the character creator", function () {
  function gameAtCustomize(mageClass = "Fire") {
    const game = new Game();
    game.selectModel("Tall");
    game.selectClass(mageClass);
    return game;
  }

  it("comes after the class menu", function () {
    const game = gameAtCustomize();
    expect(game.isCustomizing()).toBe(true);
    expect(game.isPlaying()).toBe(false);
  });

  it("lets the player pick a color for all four parts", function () {
    const game = gameAtCustomize();
    for (const part of APPEARANCE_PARTS) {
      expect(game.changeAppearance(part, "#123456")).toBe(true);
      expect(game.appearance[part]).toBe("#123456");
    }
  });

  it("accepts a typed hex code in any form and stores it as #rrggbb", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("eyes", "FC9")).toBe(true);
    expect(game.appearance.eyes).toBe("#ffcc99");
  });

  it("ignores a color that is not valid hex", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("shirt", "#12")).toBe(false);
    expect(game.appearance.shirt).toBe(DEFAULT_APPEARANCE.shirt);
  });

  it("only changes the look on the customization screen", function () {
    const game = new Game();
    expect(game.changeAppearance("body", "#000000")).toBe(false);
    game.selectModel("Tall");
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.changeAppearance("body", "#000000")).toBe(false);
    expect(game.appearance.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("ignores unknown parts", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("hair", "#ffffff")).toBe(false);
  });

  it("cannot finish customization from another screen", function () {
    expect(new Game().finishCustomization()).toBe(false);
  });

  it("saves the chosen look on the player", function () {
    const game = gameAtCustomize();
    game.changeAppearance("eyes", "#00ff00");
    game.changeAppearance("shirt", "#ff00ff");
    game.finishCustomization();
    const player = new Player(0, 0, game.selectedClass, game.selectedModel, game.appearance);
    expect(player.appearance).toEqual(game.appearance);
  });

  it("gives the player their own copy of the look", function () {
    const game = gameAtCustomize();
    const player = new Player(0, 0, "Fire", "Tall", game.appearance);
    player.appearance.body = "#000000";
    expect(game.appearance.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("uses the default look when none is given", function () {
    expect(new Player(0, 0).appearance).toEqual(makeAppearance());
  });

  it("does not change stats (cosmetic only)", function () {
    for (const mageClass of MAGE_CLASSES) {
      const plain = new Player(0, 0, mageClass, "Tall");
      const styled = new Player(0, 0, mageClass, "Tall", {
        body: "#603020", eyes: "#dc2828", shirt: "#787882", pants: "#101010"
      });
      expect(styled.stats).toEqual(plain.stats);
      expect(styled.speed).toBe(plain.speed);
      expect(styled.maxHealth).toBe(plain.maxHealth);
    }
  });

  it("keeps the look for the next run, on any model", function () {
    const game = gameAtCustomize();
    game.changeAppearance("pants", "#abcdef");
    const look = { ...game.appearance };
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    game.selectModel("Short");
    game.selectClass("Mind");
    expect(game.appearance).toEqual(look);
  });
});

describe("getCustomizeAction", function () {
  it("maps Enter to done", function () {
    expect(getCustomizeAction("Enter")).toEqual({ type: "done" });
    expect(getCustomizeAction("enter")).toEqual({ type: "done" });
  });

  it("ignores every other key, since colors are picked with the mouse or typed", function () {
    for (const key of ["w", "s", "a", "d", "ArrowUp", "ArrowLeft", "x", "1"]) {
      expect(getCustomizeAction(key)).toBeNull();
    }
  });

  it("knows when the player is typing in a field", function () {
    expect(isTypingInCustomizeField({ tagName: "INPUT" })).toBe(true);
    expect(isTypingInCustomizeField({ tagName: "BODY" })).toBe(false);
    expect(isTypingInCustomizeField(null)).toBe(false);
  });
});
