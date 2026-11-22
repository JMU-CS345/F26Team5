describe("RunTier", function () {
  it("starts in dungeon 1 and advances to 3, then stays", function () {
    const run = new RunTier();
    expect(run.tier).toBe(1);
    expect(run.isFinal()).toBe(false);
    expect(run.advance()).toBe(2);
    expect(run.advance()).toBe(3);
    expect(run.isFinal()).toBe(true);
    expect(run.advance()).toBe(3);
  });

  it("start() resets a finished run to dungeon 1", function () {
    const run = new RunTier();
    run.advance();
    run.advance();
    run.start();
    expect(run.tier).toBe(1);
  });

  it("rolls loot deeper in later dungeons", function () {
    expect(tierLootDepth(1)).toBe(0);
    expect(tierLootDepth(3)).toBe(2 * TIER_DEPTH_STEP);
  });

  it("counts the tier step once in LootRun depth and chest gold", function () {
    const run = new LootRun(1, [0, 2]);
    expect(run.lootDepth({ id: 1, tier: 2 })).toBe(2 + tierLootDepth(2));
    const gold = (tier) => new LootRun(5, [0, 2]).rollChestLoot({ id: 1, tier: tier }).gold;
    expect(gold(2)).toBeGreaterThan(gold(1));
  });
});

describe("stairs", function () {
  const room = new NormalRoom(100, 100, 640, 400);

  it("sit in the middle of the room, and rooms start without them", function () {
    expect(room.stairs).toBeNull();
    expect(makeStairs(room)).toEqual({ x: 420, y: 300 });
  });

  it("are stepped on when the player's center is on them", function () {
    const stairs = makeStairs(room);
    const on = new Player(stairs.x - 8, stairs.y - 8, "Fire");
    const off = new Player(stairs.x + 100, stairs.y, "Fire");
    expect(playerOnStairs(stairs, on)).toBe(true);
    expect(playerOnStairs(stairs, off)).toBe(false);
  });

});

describe("Game victory", function () {
  function playingGame() {
    const game = new Game();
    game.startCharacterSelect();
    game.selectModel(PLAYER_MODEL_NAMES[0]);
    game.selectClass("Fire");
    game.finishCustomization();
    return game;
  }

  it("is reached from a run in play and goes back to the title", function () {
    const game = playingGame();
    expect(game.winRun()).toBe(true);
    expect(game.isVictory()).toBe(true);
    expect(game.shouldSimulate()).toBe(false);
    expect(game.backToTitle()).toBe(true);
    expect(game.isTitle()).toBe(true);
  });

  it("cannot be reached from the title or the death screen", function () {
    const game = new Game();
    expect(game.winRun()).toBe(false);
    const dead = playingGame();
    dead.playerDied();
    expect(dead.winRun()).toBe(false);
  });
});
