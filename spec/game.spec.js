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

  it("saves the chosen class and moves on to customization", function () {
    for (const mageClass of MAGE_CLASSES) {
      const fresh = gameAtClassMenu();
      expect(fresh.selectClass(mageClass)).toBe(true);
      expect(fresh.selectedClass).toBe(mageClass);
      expect(fresh.isCustomizing()).toBe(true);
    }
  });

  it("starts the run once customization is finished", function () {
    game.selectClass("Fire");
    expect(game.finishCustomization()).toBe(true);
    expect(game.isPlaying()).toBe(true);
  });

  it("ignores a class that does not exist", function () {
    expect(game.selectClass("Lightning")).toBe(false);
    expect(game.selectClass(null)).toBe(false);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("cannot change class once the run has started", function () {
    game.selectClass("Fire");
    game.finishCustomization();
    expect(game.selectClass("Ice")).toBe(false);
    expect(game.selectedClass).toBe("Fire");
  });

  it("opens and closes the inventory menu only during a run", function () {
    expect(game.openInventory()).toBe(false);
    game.selectClass("Fire");
    game.finishCustomization();

    expect(game.openInventory()).toBe(true);
    expect(game.isInventory()).toBe(true);
    expect(game.isPlaying()).toBe(false);
    expect(game.closeInventory()).toBe(true);
    expect(game.isPlaying()).toBe(true);
  });

  it("toggles between playing and the paused inventory state", function () {
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.toggleInventory()).toBe(true);
    expect(game.state).toBe(GAME_STATES.INVENTORY);
    expect(game.toggleInventory()).toBe(true);
    expect(game.state).toBe(GAME_STATES.PLAYING);
  });

  it("moves to dead when the player dies during a run", function () {
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.playerDied()).toBe(true);
    expect(game.isDead()).toBe(true);
  });

  it("cannot die from the menu", function () {
    expect(game.playerDied()).toBe(false);
    expect(game.isMenu()).toBe(true);
  });

  it("goes back to the model screen when a new run starts", function () {
    game.selectClass("Fire");
    game.finishCustomization();
    game.playerDied();
    expect(game.newRun()).toBe(true);
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("only starts a new run after dying", function () {
    expect(game.newRun()).toBe(false);
    game.selectClass("Mind");
    game.finishCustomization();
    expect(game.newRun()).toBe(false);
    expect(game.isPlaying()).toBe(true);
  });

  it("lets the player pick a different class on the next run", function () {
    game.selectClass("Fire");
    game.finishCustomization();
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

describe("playerJustDied", function () {
  it("reports a death once, so the death sound cannot repeat every frame", function () {
    const game = new Game();
    game.selectModel("Tall");
    game.selectClass("Fire");
    game.finishCustomization();
    const player = new Player(100, 100, "Fire");
    expect(playerJustDied(game, player)).toBe(false); // alive
    player.takeDamage(player.maxHealth + 100);
    let reports = 0;
    for (let i = 0; i < DEATH_FRAMES + 100; i++) {
      player.update(new NormalRoom(0, 0, 640, 400), {});
      if (playerJustDied(game, player)) {
        reports++;
      }
    }
    expect(reports).toBe(1);
    expect(game.isDead()).toBe(true);
  });
});
