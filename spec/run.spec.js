// Specs for Run: the dungeon, the room, the player and the shots, one frame at a time.
describe("Run", function () {
  const none = () => new p5.Vector(0, 0);
  let dungeon;
  let run;

  const centerOfTile = (room, col, row) => ({
    x: room.x + col * room.tileSize + room.tileSize / 2,
    y: room.y + row * room.tileSize + room.tileSize / 2
  });
  const frame = (input = {}) => run.update({ move: none(), fire: none(), ...input });

  // A room (not the start) that has enemies in its drawing.
  const roomWithEnemies = () =>
    dungeon.rooms.find((r) => r.role === "normal" && r.template.spawns.length > 0 && r.exits.length > 0);

  beforeEach(function () {
    dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
  });

  it("starts in the start room with the player at its spawn point", function () {
    const spawn = dungeon.start.getPlayerSpawn();
    expect(run.room).toBe(dungeon.start);
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.entrySpot).toEqual({ x: spawn.x, y: spawn.y });
  });

  it("drops the shots in flight when it enters a room", function () {
    run.projectiles.push(new Projectile(0, 0, new p5.Vector(1, 0)));
    run.enemyProjectiles.push(new Projectile(0, 0, new p5.Vector(1, 0)));
    run.enterRoom(dungeon.rooms[1]);
    expect(run.projectiles).toEqual([]);
    expect(run.enemyProjectiles).toEqual([]);
  });

  it("walks the player through an exit and remembers where they came in", function () {
    const exit = run.room.exits[0];
    const spot = dungeon.entryPoint(run.room, exit);
    run.useExit(exit);
    expect(run.room.id).toBe(exit.toId);
    expect(run.player.getCenter().x).toBe(spot.x);
    expect(run.player.getCenter().y).toBe(spot.y);
    expect(run.entrySpot).toEqual(spot);
  });

  it("takes the exit when the player stands in a door tile", function () {
    const exit = run.room.exits[0];
    const middle = centerOfTile(run.room, exit.tiles[0].col, exit.tiles[0].row);
    run.player.pos.set(middle.x - run.player.length / 2, middle.y - run.player.width / 2);
    frame();
    expect(run.room.id).toBe(exit.toId);
  });

  it("shuts the doors behind the player in a room with enemies and opens them when it is cleared", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    const doorTile = target.exits[0].tiles[0];
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_CLOSED);
    const enemies = target.enemies.length;
    expect(enemies).toBeGreaterThan(0);

    for (const e of target.enemies) {
      e.health = 0;
    }
    const dead = frame();
    expect(dead.length).toBe(enemies);
    expect(target.enemies.length).toBe(0);
    expect(target.cleared).toBe(true);
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_OPEN);
  });

  it("keeps the doors shut while an enemy is still alive", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    target.enemies[0].health = 0;
    frame();
    expect(target.cleared).toBe(false);
    const doorTile = target.exits[0].tiles[0];
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_CLOSED);
  });

  it("marks the boss room as defeated when its boss dies", function () {
    const bossRoom = dungeon.rooms.find((r) => r.role === "boss");
    run.enterRoom(bossRoom);
    for (const e of bossRoom.enemies) {
      e.health = 0;
    }
    frame();
    expect(bossRoom.bossDefeated).toBe(true);
  });

  it("respawns the player at the entry spot after a fall into a pit", function () {
    const room = run.room;
    const spawn = run.entrySpot;
    const tile = Math.floor((spawn.x - room.x) / room.tileSize) + 3; // a few tiles away on the same row
    const row = Math.floor((spawn.y - room.y) / room.tileSize);
    room.setTile(tile, row, TILE.PIT);
    const middle = centerOfTile(room, tile, row);
    run.player.pos.set(middle.x - run.player.length / 2, middle.y - run.player.width / 2);
    const health = run.player.health;

    frame();
    expect(run.player.isFalling()).toBe(true);
    for (let i = 0; i < PLAYER_FALL_FRAMES + 2; i++) {
      frame();
    }
    expect(run.player.isFalling()).toBe(false);
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.player.health).toBe(health - PIT_FALL_DAMAGE);
  });

  it("does not walk or shoot while frozen, as during a dialogue", function () {
    const before = run.player.pos.copy();
    frame({ move: new p5.Vector(1, 0), fire: new p5.Vector(1, 0), frozen: true });
    expect(run.player.pos.x).toBe(before.x);
    expect(run.projectiles.length).toBe(0);
  });

  it("walks and shoots when not frozen", function () {
    const before = run.player.pos.x;
    frame({ move: new p5.Vector(1, 0), fire: new p5.Vector(1, 0) });
    expect(run.player.pos.x).toBeGreaterThan(before);
    expect(run.projectiles.length).toBe(1);
  });

  it("keeps the enemies still once the player is dead", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    for (const e of target.enemies) {
      e.spawnTimer = 0;
      e.wakeTimer = 0;
    }
    run.player.health = 0;
    const where = target.enemies.map((e) => e.pos.copy());
    for (let i = 0; i < 20; i++) {
      frame();
    }
    target.enemies.forEach((e, i) => {
      expect(e.pos.x).toBe(where[i].x);
      expect(e.pos.y).toBe(where[i].y);
    });
  });
});
