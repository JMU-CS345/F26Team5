describe("Enemy movement", function () {
  const bounds = { width: 100, height: 100 };
  let enemy;
  let player;

  beforeEach(function () {
    enemy = new Enemy(20, 20);
    player = new Player(50, 20);
  });

  it("moves toward a player in detection range", function () {
    enemy.moveToward(player, bounds);
    expect(enemy.pos.x).toBe(20 + enemy.speed);
    expect(enemy.pos.y).toBe(20);
  });

  it("does not move toward a player outside detection range", function () {
    player.pos.set(90, 90);
    enemy.detectionRange = 10;
    enemy.moveToward(player, bounds);
    expect(enemy.pos.x).toBe(20);
    expect(enemy.pos.y).toBe(20);
  });

  it("moves diagonally at the same speed as straight lines", function () {
    player.pos.set(50, 50);
    const start = enemy.pos.copy();
    enemy.moveToward(player, bounds);
    const distance = p5.Vector.dist(start, enemy.pos);
    expect(distance).toBeCloseTo(enemy.speed, 5);
  });

  it("stops at the room edges", function () {
    enemy.pos.set(95, 95);
    player.pos.set(100, 100);
    enemy.moveToward(player, bounds);
    expect(enemy.pos.x).toBe(bounds.width - enemy.size);
    expect(enemy.pos.y).toBe(bounds.height - enemy.size);
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
