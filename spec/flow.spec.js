// Basic smoke specs: the main pieces of a run still work together.
// They use the model classes only, so no sketch or canvas is needed.

// A run the way the menu starts it: a class, a small room and a player.
function makeRun(mageClass) {
  const game = new Game();
  game.startCharacterSelect();
  game.selectModel("Tall");
  game.selectClass(mageClass);
  game.finishCustomization();
  const room = new NormalRoom(0, 0, 160, 160);
  const player = new Player(80, 80, game.selectedClass, game.selectedModel);
  return { game, room, player };
}

describe("game flow", function () {
  it("uses E to interact and I for the inventory in both presets", function () {
    for (const name of CONTROL_PRESET_IDS) {
      const bindings = getPreset(name);
      expect(actionForKey(69, bindings)).toBe("interact");
      expect(actionForKey(73, bindings)).toBe("inventory");
      expect(actionForKey(70, bindings)).toBeNull(); // F no longer interacts
    }
  });

  it("starts a run when a class is picked", function () {
    const game = new Game();
    game.startCharacterSelect();
    game.selectModel("Tall");
    game.selectClass(getClassForKey("1"));
    game.finishCustomization();
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
    game.backToTitle();
    expect(game.isTitle()).toBe(true);
  });

  it("lets projectiles kill an enemy", function () {
    const { room } = makeRun("Fire");
    const enemy = new Enemy(120, 80);
    for (let shot = 0; shot < 30; shot++) {
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
    game.startCharacterSelect();
    game.selectModel("Tall");
  });

  it("starts on the class menu with the picked model", () => {
    expect(game.isMenu()).toBe(true);
    expect(game.selectedModel).toBe("Tall");
  });

  it("keeps the picked model when a class is picked", () => {
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.isPlaying()).toBe(true);
    expect(game.selectedModel).toBe("Tall");
    expect(game.selectedClass).toBe("Ice");
  });

  it("goes back to the title and clears both choices after a run", () => {
    game.selectClass("Ice");
    game.finishCustomization();
    game.playerDied();
    expect(game.backToTitle()).toBe(true);
    expect(game.isTitle()).toBe(true);
    expect(game.selectedModel).toBeNull();
    expect(game.selectedClass).toBeNull();
  });
});

describe("Player model name", () => {
  it("defaults to the tall model", () => {
    expect(new Player(0, 0, "Fire").modelName).toBe("Tall");
  });
});
