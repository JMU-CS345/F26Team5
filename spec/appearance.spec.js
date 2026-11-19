// Specs for character appearance customization (#23).

describe("Appearance", function () {
  it("has skin, eyes, hair and clothing, each with a few options", function () {
    expect(APPEARANCE_PARTS).toEqual(["skin", "eyes", "hair", "clothing"]);
    for (const part of APPEARANCE_PARTS) {
      expect(APPEARANCE_OPTIONS[part].length).toBeGreaterThan(1);
    }
  });

  it("uses a real option for every default", function () {
    for (const part of APPEARANCE_PARTS) {
      expect(getAppearanceOptionNames(part)).toContain(DEFAULT_APPEARANCE[part]);
    }
  });

  it("keeps valid choices and fills in anything missing or unknown", function () {
    const look = makeAppearance({ skin: "Dark", eyes: "Rainbow" });
    expect(look.skin).toBe("Dark");
    expect(look.eyes).toBe(DEFAULT_APPEARANCE.eyes);
    expect(look.hair).toBe(DEFAULT_APPEARANCE.hair);
    expect(look.clothing).toBe(DEFAULT_APPEARANCE.clothing);
  });

  it("cycles forward and back through the options, wrapping at both ends", function () {
    const names = getAppearanceOptionNames("skin");
    let look = makeAppearance({ skin: names[0] });
    look = cycleAppearance(look, "skin", 1);
    expect(look.skin).toBe(names[1]);
    look = cycleAppearance(makeAppearance({ skin: names[0] }), "skin", -1);
    expect(look.skin).toBe(names[names.length - 1]);
  });

  it("does not change the original appearance when cycling", function () {
    const look = makeAppearance();
    cycleAppearance(look, "hair", 1);
    expect(look.hair).toBe(DEFAULT_APPEARANCE.hair);
  });

  it("has a wizard layer to tint for every part", function () {
    const layers = PLAYER_MODELS.Wizard.layers;
    for (const layer of ["body", "eyes", "hat", "robe"]) {
      expect(layers).toContain(layer);
    }
  });

  it("gives a color for each part, and no color for no hat color or class clothing", function () {
    expect(getAppearanceColor(makeAppearance(), "skin").length).toBe(3);
    expect(getAppearanceColor(makeAppearance({ hair: "None" }), "hair")).toBeNull();
    expect(getAppearanceColor(makeAppearance({ clothing: "Class" }), "clothing")).toBeNull();
  });
});

describe("Customization in the character creator", function () {
  function gameAtCustomize(mageClass = "Fire") {
    const game = new Game();
    game.selectClass(mageClass);
    return game;
  }

  it("comes after the class menu", function () {
    const game = gameAtCustomize();
    expect(game.isCustomizing()).toBe(true);
    expect(game.isPlaying()).toBe(false);
  });

  it("lets the player pick all four parts", function () {
    const game = gameAtCustomize();
    for (const part of APPEARANCE_PARTS) {
      const before = game.appearance[part];
      expect(game.changeAppearance(part, 1)).toBe(true);
      expect(game.appearance[part]).not.toBe(before);
    }
  });

  it("only changes the look on the customization screen", function () {
    const game = new Game();
    expect(game.changeAppearance("skin", 1)).toBe(false);
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.changeAppearance("skin", 1)).toBe(false);
    expect(game.appearance.skin).toBe(DEFAULT_APPEARANCE.skin);
  });

  it("ignores unknown parts", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("hat", 1)).toBe(false);
  });

  it("cannot finish customization from another screen", function () {
    expect(new Game().finishCustomization()).toBe(false);
  });

  it("saves the chosen look on the player", function () {
    const game = gameAtCustomize();
    game.changeAppearance("eyes", 1);
    game.changeAppearance("hair", 1);
    game.finishCustomization();
    const player = new Player(0, 0, game.selectedClass, game.selectedModel, game.appearance);
    expect(player.appearance).toEqual(game.appearance);
  });

  it("gives the player their own copy of the look", function () {
    const game = gameAtCustomize();
    const player = new Player(0, 0, "Fire", "Wizard", game.appearance);
    player.appearance.skin = "Dark";
    expect(game.appearance.skin).toBe(DEFAULT_APPEARANCE.skin);
  });

  it("uses the default look when none is given", function () {
    expect(new Player(0, 0).appearance).toEqual(makeAppearance());
  });

  it("does not change stats (cosmetic only)", function () {
    for (const mageClass of MAGE_CLASSES) {
      const plain = new Player(0, 0, mageClass, "Wizard");
      const styled = new Player(0, 0, mageClass, "Wizard", {
        skin: "Dark", eyes: "Red", hair: "None", clothing: "Gray"
      });
      expect(styled.stats).toEqual(plain.stats);
      expect(styled.speed).toBe(plain.speed);
      expect(styled.maxHealth).toBe(plain.maxHealth);
    }
  });

  it("keeps the look for the next run, on any class", function () {
    const game = gameAtCustomize();
    game.changeAppearance("clothing", 1);
    const look = { ...game.appearance };
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    game.selectClass("Mind");
    expect(game.appearance).toEqual(look);
  });
});

describe("getCustomizeAction", function () {
  it("maps W/S and Up/Down to moving between rows", function () {
    expect(getCustomizeAction("w")).toEqual({ type: "row", step: -1 });
    expect(getCustomizeAction("ArrowDown")).toEqual({ type: "row", step: 1 });
  });

  it("maps A/D and Left/Right to changing the option", function () {
    expect(getCustomizeAction("A")).toEqual({ type: "option", step: -1 });
    expect(getCustomizeAction("ArrowRight")).toEqual({ type: "option", step: 1 });
  });

  it("maps Enter to done and ignores other keys", function () {
    expect(getCustomizeAction("Enter")).toEqual({ type: "done" });
    expect(getCustomizeAction("x")).toBeNull();
    expect(getCustomizeAction("1")).toBeNull();
  });

  it("wraps the highlighted row at both ends", function () {
    expect(nextCustomizeRow(0, -1)).toBe(APPEARANCE_PARTS.length - 1);
    expect(nextCustomizeRow(APPEARANCE_PARTS.length - 1, 1)).toBe(0);
  });
});
