// Basic smoke specs: the main pieces of a run still work together.
// They use the model classes only, so no sketch or canvas is needed.

// A run the way the menu starts it: a class, a small room and a player.
function makeRun(mageClass, modelName = "Tall") {
  const game = new Game();
  game.selectModel(modelName);
  game.selectClass(mageClass);
  const room = new NormalRoom(0, 0, 160, 160);
  const player = new Player(80, 80, game.selectedClass, game.selectedModel);
  return { game, room, player };
}

describe("game flow", function () {
  it("starts a run when a model and a class are picked", function () {
    const game = new Game();
    game.selectModel(getModelForKey("1"));
    game.selectClass(getClassForKey("1"));
    expect(game.isPlaying()).toBe(true);
  });

  it("lets an enemy hurt the player", function () {
    const { room, player } = makeRun("Fire");
    const enemy = new Enemy(120, 80);
    for (let frame = 0; frame < 200; frame++) {
      enemy.update(player, room);
      enemy.damagePlayer(player);
    }
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it("ends the run when the player dies and allows a new one", function () {
    const { game, player } = makeRun("Mind");
    player.takeDamage(player.maxHealth);
    game.playerDied();
    expect(game.isDead()).toBe(true);
    game.newRun();
    expect(game.isModelSelect()).toBe(true);
  });

  it("lets projectiles kill an enemy", function () {
    const { room } = makeRun("Fire");
    const enemy = new Enemy(120, 80);
    for (let shot = 0; shot < 5; shot++) {
      const proj = new Projectile(90, 88, new p5.Vector(1, 0));
      for (let step = 0; step < 20; step++) {
        proj.update(room);
        enemy.damageFromProjectile(proj);
      }
    }
    expect(enemy.isDead()).toBe(true);
  });

  it("keeps the player inside the room", function () {
    const { room, player } = makeRun("Ice");
    for (let frame = 0; frame < 200; frame++) {
      player.move(new p5.Vector(-1, 0), room);
    }
    expect(room.collidesWithWall(player.getBounds())).toBe(false);
  });
});

describe("character creator", () => {
  let game;
  beforeEach(() => {
    game = new Game();
  });

  it("starts on the model screen", () => {
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedModel).toBeNull();
  });

  it("moves to the class menu once a model is picked", () => {
    expect(game.selectModel("Short")).toBe(true);
    expect(game.selectedModel).toBe("Short");
    expect(game.isMenu()).toBe(true);
  });

  it("ignores unknown models", () => {
    expect(game.selectModel("Giant")).toBe(false);
    expect(game.isModelSelect()).toBe(true);
  });

  it("does not allow picking a class before a model", () => {
    expect(game.selectClass("Fire")).toBe(false);
    expect(game.isModelSelect()).toBe(true);
  });

  it("does not allow changing the model from the class menu", () => {
    game.selectModel("Tall");
    expect(game.selectModel("Short")).toBe(false);
    expect(game.selectedModel).toBe("Tall");
  });

  it("keeps the picked model when a class is picked", () => {
    game.selectModel("Short");
    game.selectClass("Ice");
    expect(game.isPlaying()).toBe(true);
    expect(game.selectedModel).toBe("Short");
    expect(game.selectedClass).toBe("Ice");
  });

  it("goes back to the model screen and clears both choices on a new run", () => {
    game.selectModel("Short");
    game.selectClass("Ice");
    game.playerDied();
    expect(game.newRun()).toBe(true);
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedModel).toBeNull();
    expect(game.selectedClass).toBeNull();
  });
});

describe("getModelForKey", () => {
  it("maps 1 and 2 to the models in order", () => {
    expect(getModelForKey("1")).toBe("Tall");
    expect(getModelForKey("2")).toBe("Short");
  });

  it("returns null for any other key", () => {
    expect(getModelForKey("3")).toBeNull();
    expect(getModelForKey("0")).toBeNull();
    expect(getModelForKey("a")).toBeNull();
    expect(getModelForKey("Enter")).toBeNull();
  });
});

describe("PLAYER_MODELS", () => {
  it("has a sheet, a sprite size and a walk cycle for every direction on every model", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      const model = PLAYER_MODELS[name];
      expect(model.sheet).toBeTruthy();
      expect(model.spriteW).toBeGreaterThan(0);
      expect(model.spriteH).toBeGreaterThan(0);
      for (const facing of ["down", "up", "right", "left"]) {
        expect(model.walkCycles[facing].length).toBeGreaterThan(0);
      }
    }
  });

  it("gives the short model a two-frame side walk and a four-frame front and back walk", () => {
    const cycles = PLAYER_MODELS.Short.walkCycles;
    expect(cycles.right.length).toBe(2);
    expect(cycles.left.length).toBe(2);
    expect(cycles.down.length).toBe(4);
    expect(cycles.up.length).toBe(4);
  });
});

describe("Player model name", () => {
  it("defaults to the tall model", () => {
    expect(new Player(0, 0, "Fire").modelName).toBe("Tall");
  });

  it("uses the model it is given", () => {
    expect(new Player(0, 0, "Fire", "Short").modelName).toBe("Short");
  });
});
