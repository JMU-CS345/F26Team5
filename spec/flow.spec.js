// Basic smoke specs: the main pieces of a run still work together.
// They use the model classes only, so no sketch or canvas is needed.

// A run the way the menu starts it: a class, a small room and a player.
function makeRun(mageClass) {
  const game = new Game();
  game.selectClass(mageClass);
  const room = new NormalRoom(0, 0, 160, 160);
  const player = new Player(80, 80, game.selectedClass);
  return { game, room, player };
}

describe("game flow", function () {
  it("starts a run when a class is picked", function () {
    const game = new Game();
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
    expect(game.isMenu()).toBe(true);
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
