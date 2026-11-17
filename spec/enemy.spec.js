// Helpers shared by the enemy specs. This file loads first in SpecRunner.html.
// A small deterministic random source, so wandering specs repeat exactly.
function makeRng(seed) {
  let state = seed;
  return function () {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

// Puts the player this many pixels to the right of the enemy, center to center.
function placePlayerRightOf(enemy, player, distance) {
  const center = enemy.getCenter();
  player.pos.set(center.x + distance - player.length / 2, center.y - player.width / 2);
}

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

describe("Enemy types", function () {
  it("is a Jelly when no type is given", function () {
    const enemy = new Enemy(0, 0);
    expect(enemy.typeName).toBe("Jelly");
    expect(enemy.maxHealth).toBe(ENEMY_TYPES.Jelly.maxHealth);
    expect(enemy.speed).toBe(ENEMY_TYPES.Jelly.speed);
    expect(enemy.detectionRange).toBe(ENEMY_TYPES.Jelly.detectionRange);
    expect(enemy.contactDamage).toBe(ENEMY_TYPES.Jelly.contactDamage);
  });

  it("takes its stats from its type", function () {
    const zombie = new Enemy(0, 0, "Zombie");
    expect(zombie.maxHealth).toBe(ENEMY_TYPES.Zombie.maxHealth);
    expect(zombie.health).toBe(zombie.maxHealth);
    expect(zombie.speed).toBe(ENEMY_TYPES.Zombie.speed);
    expect(zombie.detectionRange).toBe(ENEMY_TYPES.Zombie.detectionRange);
    expect(zombie.contactDamage).toBe(ENEMY_TYPES.Zombie.contactDamage);
  });

  it("throws on an unknown type", function () {
    expect(function () {
      new Enemy(0, 0, "Nope");
    }).toThrowError(/Nope/);
  });

  it("uses the size from its type for its hitbox", function () {
    const demon = new Enemy(10, 20, "Demon");
    expect(demon.getBounds()).toEqual({ x: 10, y: 20, w: 32, h: 32 });
  });
});

describe("Enemy sight, timers and facing", function () {
  let enemy;
  let player;
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 320);
    enemy = new Enemy(100, 100);
    player = new Player(0, 0);
  });

  it("sees the player exactly at its detection range but not one pixel past it", function () {
    placePlayerRightOf(enemy, player, enemy.detectionRange);
    expect(enemy.canSee(player)).toBe(true);
    placePlayerRightOf(enemy, player, enemy.detectionRange + 1);
    expect(enemy.canSee(player)).toBe(false);
  });

  it("counts the hit flash down to zero and never below", function () {
    enemy.takeDamage(1);
    expect(enemy.hurtTimer).toBe(ENEMY_HURT_FRAMES);
    for (let i = 0; i < ENEMY_HURT_FRAMES + 5; i++) {
      enemy.update(player, room);
    }
    expect(enemy.hurtTimer).toBe(0);
  });

  it("does not flash for zero damage", function () {
    enemy.takeDamage(0);
    expect(enemy.hurtTimer).toBe(0);
  });

  it("counts its age in frames", function () {
    enemy.update(player, room);
    enemy.update(player, room);
    expect(enemy.age).toBe(2);
  });

  it("freezes for the damage cooldown after hurting the player", function () {
    player.pos.set(enemy.pos.x, enemy.pos.y);
    enemy.damagePlayer(player);
    placePlayerRightOf(enemy, player, 100);
    const before = enemy.pos.x;
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(before);
    expect(enemy.damageCooldown).toBe(ENEMY_DAMAGE_COOLDOWN - 1);
  });

  it("faces left when the player is on its left and right when on its right", function () {
    placePlayerRightOf(enemy, player, -80);
    enemy.update(player, room);
    expect(enemy.facingLeft).toBe(true);
    placePlayerRightOf(enemy, player, 80);
    enemy.update(player, room);
    expect(enemy.facingLeft).toBe(false);
  });
});

describe("removeDeadEnemies", function () {
  it("removes only the dead and returns them once", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    const live = new Enemy(20, 20);
    const dead = new Enemy(40, 40, "Zombie");
    dead.takeDamage(dead.maxHealth);
    room.enemies = [live, dead];
    expect(removeDeadEnemies(room)).toEqual([dead]);
    expect(room.enemies).toEqual([live]);
    expect(removeDeadEnemies(room)).toEqual([]);
  });

  it("copes with an empty room, and an empty room counts as cleared", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    expect(removeDeadEnemies(room)).toEqual([]);
    expect(room.enemies.every((e) => e.isDead())).toBe(true);
  });
});

describe("Demon", function () {
  it("is a boss with the stats the issue asks for", function () {
    const demon = new Enemy(0, 0, "Demon");
    expect(demon.type.boss).toBe(true);
    expect(demon.maxHealth).toBeGreaterThanOrEqual(30);
    expect(demon.maxHealth).toBeLessThanOrEqual(50);
    expect(demon.speed).toBe(1);
    expect(demon.contactDamage).toBeGreaterThanOrEqual(2);
    expect(demon.contactDamage).toBeLessThanOrEqual(3);
    expect(demon.type.attack.kind).toBe("shoot");
  });

  it("chases the player", function () {
    const room = new NormalRoom(0, 0, 640, 320);
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(0, 0);
    placePlayerRightOf(demon, player, 150);
    demon.update(player, room);
    expect(demon.pos.x).toBeCloseTo(50 + demon.speed, 5);
  });

  it("hurts the player by its contact damage", function () {
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(60, 110);
    const before = player.health;
    expect(demon.damagePlayer(player)).toBe(true);
    expect(player.health).toBe(before - demon.contactDamage);
  });

  it("dies after taking its full health in damage and is removed", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    const demon = new Enemy(50, 50, "Demon");
    room.enemies = [demon];
    demon.takeDamage(demon.maxHealth - 1);
    expect(demon.isDead()).toBe(false);
    demon.takeDamage(1);
    expect(demon.isDead()).toBe(true);
    expect(removeDeadEnemies(room)[0].type.boss).toBe(true);
    expect(room.enemies.length).toBe(0);
  });
});
