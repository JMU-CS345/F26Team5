describe("Game state", function () {
  let game;

  // A game that has already picked a model, so it is on the class menu.
  function gameAtClassMenu() {
    const g = new Game();
    g.selectModel("Tall");
    return g;
  }

  beforeEach(function () {
    game = gameAtClassMenu();
  });

  it("is on the class menu with no class chosen once a model is picked", function () {
    expect(game.state).toBe(GAME_STATES.MENU);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("offers Fire, Ice and Mind as the classes", function () {
    expect(MAGE_CLASSES).toEqual(["Fire", "Ice", "Mind"]);
  });

  it("saves the chosen class and starts the run", function () {
    for (const mageClass of MAGE_CLASSES) {
      const fresh = gameAtClassMenu();
      expect(fresh.selectClass(mageClass)).toBe(true);
      expect(fresh.selectedClass).toBe(mageClass);
      expect(fresh.isPlaying()).toBe(true);
    }
  });

  it("ignores a class that does not exist", function () {
    expect(game.selectClass("Lightning")).toBe(false);
    expect(game.selectClass(null)).toBe(false);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("cannot change class once the run has started", function () {
    game.selectClass("Fire");
    expect(game.selectClass("Ice")).toBe(false);
    expect(game.selectedClass).toBe("Fire");
  });

  it("moves to dead when the player dies during a run", function () {
    game.selectClass("Ice");
    expect(game.playerDied()).toBe(true);
    expect(game.isDead()).toBe(true);
  });

  it("cannot die from the menu", function () {
    expect(game.playerDied()).toBe(false);
    expect(game.isMenu()).toBe(true);
  });

  it("goes back to the model screen when a new run starts", function () {
    game.selectClass("Fire");
    game.playerDied();
    expect(game.newRun()).toBe(true);
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("only starts a new run after dying", function () {
    expect(game.newRun()).toBe(false);
    game.selectClass("Mind");
    expect(game.newRun()).toBe(false);
    expect(game.isPlaying()).toBe(true);
  });

  it("lets the player pick a different class on the next run", function () {
    game.selectClass("Fire");
    game.playerDied();
    game.newRun();
    game.selectModel("Tall");
    expect(game.selectClass("Mind")).toBe(true);
    expect(game.selectedClass).toBe("Mind");
  });
});

describe("getClassForKey", function () {
  it("maps 1, 2 and 3 to Fire, Ice and Mind", function () {
    expect(getClassForKey("1")).toBe("Fire");
    expect(getClassForKey("2")).toBe("Ice");
    expect(getClassForKey("3")).toBe("Mind");
  });

  it("returns null for any other key", function () {
    for (const key of ["0", "4", "a", "h", " ", "Enter", ""]) {
      expect(getClassForKey(key)).toBeNull();
    }
  });
});

describe("Player class", function () {
  it("keeps the class it was made with", function () {
    expect(new Player(50, 50, "Ice").mageClass).toBe("Ice");
  });

  it("has no class when none is given", function () {
    expect(new Player(50, 50).mageClass).toBeNull();
  });
});
