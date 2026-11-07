describe("Enemy movement", function () {
  let room;
  let enemy;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144 on both axes
    enemy = new Enemy(20, 20);
    player = new Player(50, 20);
  });

  it("moves toward a player in detection range", function () {
    enemy.moveToward(player, room);
    expect(enemy.pos.x).toBeCloseTo(20 + enemy.speed, 5);
    expect(enemy.pos.y).toBeCloseTo(20, 5);
  });

  it("does not move toward a player outside detection range", function () {
    player.pos.set(90, 90);
    enemy.detectionRange = 10;
    enemy.moveToward(player, room);
    expect(enemy.pos.x).toBe(20);
    expect(enemy.pos.y).toBe(20);
  });

  it("moves diagonally at the same speed as straight lines", function () {
    player.pos.set(50, 50);
    const start = enemy.pos.copy();
    enemy.moveToward(player, room);
    expect(p5.Vector.dist(start, enemy.pos)).toBeCloseTo(enemy.speed, 5);
  });

  it("stops perfectly against a wall", function () {
    enemy.pos.set(128, 100); // already touching the right wall (160 - 16 - 16)
    player.pos.set(150, 100);
    enemy.moveToward(player, room);
    expect(enemy.pos.x).toBe(128);
    expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
  });

  it("does not move when dead", function () {
    enemy.takeDamage(enemy.maxHealth);
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(20);
  });
});

describe("Enemy geometry", function () {
  it("uses length and width for its bounds and center", function () {
    const enemy = new Enemy(10, 20);
    enemy.length = 32;
    enemy.width = 16;
    expect(enemy.getBounds()).toEqual({ x: 10, y: 20, w: 32, h: 16 });
    expect(enemy.getCenter().x).toBe(26);
    expect(enemy.getCenter().y).toBe(28);
  });
});

describe("Enemy health and contact damage", function () {
  let enemy;
  let player;

  beforeEach(function () {
    enemy = new Enemy(50, 50);
    player = new Player(50, 50);
  });

  it("starts at full health, alive", function () {
    expect(enemy.health).toBe(enemy.maxHealth);
    expect(enemy.isDead()).toBe(false);
  });

  it("loses health when damaged and never goes negative", function () {
    enemy.takeDamage(enemy.maxHealth + 1);
    expect(enemy.health).toBe(0);
    expect(enemy.isDead()).toBe(true);
  });

  it("damages a touching player", function () {
    expect(enemy.damagePlayer(player)).toBe(true);
    expect(player.health).toBe(player.maxHealth - enemy.contactDamage);
  });

  it("does not damage repeatedly during its cooldown", function () {
    enemy.damagePlayer(player);
    expect(enemy.damagePlayer(player)).toBe(false);
    expect(player.health).toBe(player.maxHealth - enemy.contactDamage);
  });

  it("does not damage a player it is not touching", function () {
    player.pos.set(80, 80);
    expect(enemy.damagePlayer(player)).toBe(false);
    expect(player.health).toBe(player.maxHealth);
  });
});

describe("Enemy projectile damage", function () {
  it("takes projectile damage and consumes the projectile on contact", function () {
    const enemy = new Enemy(50, 50);
    const projectile = new Projectile(50, 50, new p5.Vector(1, 0));

    expect(enemy.damageFromProjectile(projectile)).toBe(true);
    expect(enemy.health).toBe(enemy.maxHealth - projectile.damage);
    expect(projectile.alive).toBe(false);
  });

  it("dies when projectile damage reaches its remaining health", function () {
    const enemy = new Enemy(50, 50);
    const projectile = new Projectile(50, 50, new p5.Vector(1, 0));
    projectile.damage = enemy.maxHealth;

    enemy.damageFromProjectile(projectile);

    expect(enemy.isDead()).toBe(true);
  });

  it("does not damage an enemy when the projectile misses", function () {
    const enemy = new Enemy(50, 50);
    const projectile = new Projectile(10, 10, new p5.Vector(1, 0));

    expect(enemy.damageFromProjectile(projectile)).toBe(false);
    expect(enemy.health).toBe(enemy.maxHealth);
    expect(projectile.alive).toBe(true);
  });
});
