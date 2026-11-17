describe("Game title, pause, settings and credits", function () {
  let game;

  function playingGame() {
    const g = new Game();
    g.startCharacterSelect();
    g.selectClass("Fire");
    return g;
  }

  beforeEach(function () {
    game = new Game();
  });

  it("starts on the title screen", function () {
    expect(game.state).toBe(GAME_STATES.TITLE);
    expect(game.isTitle()).toBe(true);
  });

  it("goes from New Run to the class menu only from the title", function () {
    expect(game.startCharacterSelect()).toBe(true);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedModel).toBe("Tall");
    expect(game.startCharacterSelect()).toBe(false);
  });

  it("cannot pick a class from the title", function () {
    expect(game.selectClass("Fire")).toBe(false);
    expect(game.isTitle()).toBe(true);
  });

  it("backs out of the class menu to the title and clears the model", function () {
    game.startCharacterSelect();
    expect(game.backToTitle()).toBe(true);
    expect(game.isTitle()).toBe(true);
    expect(game.selectedModel).toBeNull();
  });

  it("opens credits from the title and returns to it", function () {
    expect(game.openCredits()).toBe(true);
    expect(game.isCredits()).toBe(true);
    expect(game.closeCredits()).toBe(true);
    expect(game.isTitle()).toBe(true);
  });

  it("returns from settings to where it was opened", function () {
    expect(game.openSettings()).toBe(true);
    expect(game.closeSettings()).toBe(true);
    expect(game.isTitle()).toBe(true);

    game = playingGame();
    game.pause();
    expect(game.openSettings()).toBe(true);
    expect(game.isSettings()).toBe(true);
    expect(game.closeSettings()).toBe(true);
    expect(game.isPaused()).toBe(true);
  });

  it("cannot open settings or credits in the middle of a run", function () {
    game = playingGame();
    expect(game.openSettings()).toBe(false);
    expect(game.openCredits()).toBe(false);
  });

  it("pauses and resumes only during a run", function () {
    expect(game.pause()).toBe(false);
    expect(game.resume()).toBe(false);
    game = playingGame();
    expect(game.pause()).toBe(true);
    expect(game.isPaused()).toBe(true);
    expect(game.pause()).toBe(false);
    expect(game.resume()).toBe(true);
    expect(game.isPlaying()).toBe(true);
  });

  it("does not pause from the inventory or after death", function () {
    game = playingGame();
    game.openInventory();
    expect(game.pause()).toBe(false);
    game.closeInventory();
    game.playerDied();
    expect(game.pause()).toBe(false);
  });

  it("restarts the run from pause and keeps the model and class", function () {
    game = playingGame();
    game.pause();
    expect(game.restartRun()).toBe(true);
    expect(game.isPlaying()).toBe(true);
    expect(game.selectedModel).toBe("Tall");
    expect(game.selectedClass).toBe("Fire");
    expect(game.restartRun()).toBe(false);
  });

  it("quits to the title from pause and clears the picks", function () {
    game = playingGame();
    game.pause();
    expect(game.backToTitle()).toBe(true);
    expect(game.isTitle()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("only simulates the world while playing or dead", function () {
    game = playingGame();
    expect(game.shouldSimulate()).toBe(true);
    game.pause();
    expect(game.shouldSimulate()).toBe(false);
    game.resume();
    game.openInventory();
    expect(game.shouldSimulate()).toBe(false);
    expect(new Game().shouldSimulate()).toBe(false);
  });

  it("leaves enemy and projectile positions alone while paused", function () {
    game = playingGame();
    const room = new NormalRoom(0, 0, 320, 320);
    const player = new Player(40, 40, "Fire", "Tall");
    const enemy = new Enemy(200, 200);
    const shot = new Projectile(100, 100, new p5.Vector(1, 0));
    // The same guard draw() uses around the simulation.
    function step() {
      if (game.shouldSimulate()) {
        enemy.update(player, room);
        shot.update(room);
      }
    }
    game.pause();
    const enemyAt = enemy.pos.copy();
    const shotAt = shot.pos.copy();
    for (let frame = 0; frame < 60; frame++) {
      step();
    }
    expect(enemy.pos.x).toBe(enemyAt.x);
    expect(enemy.pos.y).toBe(enemyAt.y);
    expect(shot.pos.x).toBe(shotAt.x);
    game.resume();
    for (let frame = 0; frame < 10; frame++) {
      step();
    }
    expect(shot.pos.x).toBeGreaterThan(shotAt.x);
  });
});
