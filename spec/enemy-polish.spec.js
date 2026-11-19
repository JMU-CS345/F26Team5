// Knockback and spawn-in. Uses makeRng and placePlayerRightOf from enemy.spec.js.
describe("Enemy knockback", function () {
  let room;
  let enemy;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 320, 160); // floor spans 16 to 304 by 16 to 144
    enemy = new Enemy(100, 60);
    enemy.speed = 0; // so only the knockback moves it
    enemy.type = { ...enemy.type, move: "none" }; // Jelly hops now, so stand it still
  });

  it("pushes the enemy along the hit direction over several updates", function () {
    const player = new Player(200, 60);
    enemy.takeDamage(1, right);
    enemy.update(player, room);
    const afterOne = enemy.pos.x;
    expect(afterOne).toBeGreaterThan(100);
    for (let i = 0; i < ENEMY_KNOCKBACK_FRAMES; i++) {
      enemy.update(player, room);
    }
    expect(enemy.pos.x).toBeGreaterThan(afterOne);
    expect(enemy.pos.y).toBeCloseTo(60, 5);
  });

  it("stops after the knockback frames are used up", function () {
    const player = new Player(200, 60);
    enemy.takeDamage(1, right);
    for (let i = 0; i < ENEMY_KNOCKBACK_FRAMES; i++) {
      enemy.update(player, room);
    }
    const settled = enemy.pos.x;
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(settled);
  });

  it("stops at a wall", function () {
    const player = new Player(200, 60);
    enemy.pos.set(room.x + room.width - 16 - enemy.length - 1, 60);
    enemy.takeDamage(1, right);
    for (let i = 0; i < ENEMY_KNOCKBACK_FRAMES; i++) {
      enemy.update(player, room);
    }
    // The wall check looks at the last pixel, so the edge may sit up to 1 px past the tile line.
    const wallEdge = room.x + room.width - 16;
    expect(enemy.getBounds().x + enemy.length).toBeLessThanOrEqual(wallEdge + 1);
    expect(enemy.pos.x).toBeGreaterThan(271);
  });

  it("does not move the enemy when no direction is given", function () {
    const player = new Player(200, 60);
    enemy.takeDamage(1);
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(100);
    expect(enemy.pos.y).toBe(60);
  });

  it("does not move the enemy when the damage is 0", function () {
    const player = new Player(200, 60);
    enemy.takeDamage(0, right);
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(100);
  });

  it("moves a boss half as far", function () {
    const player = new Player(200, 60);
    const boss = new Enemy(100, 60, "Demon");
    boss.speed = 0;
    enemy.takeDamage(1, right);
    boss.takeDamage(1, right);
    for (let i = 0; i < ENEMY_KNOCKBACK_FRAMES; i++) {
      enemy.update(player, room);
      boss.update(player, room);
    }
    expect(boss.pos.x - 100).toBeCloseTo((enemy.pos.x - 100) / 2, 5);
  });

  it("is applied when a projectile hits, along the projectile's direction", function () {
    const player = new Player(200, 60);
    const center = enemy.getCenter();
    const shot = new Projectile(center.x, center.y, right);
    expect(enemy.damageFromProjectile(shot)).toBe(true);
    enemy.update(player, room);
    expect(enemy.pos.x).toBeGreaterThan(100);
  });
});

describe("Enemy spawn-in", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 320, 160);
    player = new Player(100, 60);
  });

  it("starts at zero for an enemy made with new", function () {
    expect(new Enemy(0, 0).spawnTimer).toBe(0);
    expect(new Enemy(0, 0).isSpawning()).toBe(false);
  });

  it("starts at zero from createEnemy unless asked", function () {
    expect(createEnemy("Jelly", 0, 0).spawnTimer).toBe(0);
    expect(createEnemy("Jelly", 0, 0, true).spawnTimer).toBe(ENEMY_SPAWN_FRAMES);
  });

  it("cannot hurt the player while spawning", function () {
    const jelly = createEnemy("Jelly", 100, 60, true);
    expect(jelly.damagePlayer(player)).toBe(false);
  });

  it("does not shoot while spawning", function () {
    const skeleton = createEnemy("Skeleton", 160, 60, true);
    skeleton.attackTimer = 0;
    expect(skeleton.tryAttack(player)).toEqual([]);
  });

  it("lets shots pass through while spawning", function () {
    const jelly = createEnemy("Jelly", 100, 60, true);
    const center = jelly.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
    expect(jelly.damageFromProjectile(shot)).toBe(false);
    expect(shot.alive).toBe(true);
    expect(jelly.health).toBe(jelly.maxHealth);
  });

  it("does not move while spawning", function () {
    const zombie = createEnemy("Zombie", 160, 60, true);
    placePlayerRightOf(zombie, player, 40);
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(160);
    expect(zombie.spawnTimer).toBe(ENEMY_SPAWN_FRAMES - 1);
  });

  it("acts normally once the spawn frames are over", function () {
    const zombie = createEnemy("Zombie", 160, 64, true); // on the tile grid
    zombie.faceDirection(1, 0); // a Zombie only sees straight ahead, and the player is on its right
    placePlayerRightOf(zombie, player, 40);
    for (let i = 0; i < ENEMY_SPAWN_FRAMES; i++) {
      zombie.update(player, room);
    }
    expect(zombie.isSpawning()).toBe(false);
    zombie.update(player, room);
    expect(zombie.pos.x).toBeGreaterThan(160);
    player.pos.set(zombie.pos.x, zombie.pos.y);
    expect(zombie.damagePlayer(player)).toBe(true);
  });
});
