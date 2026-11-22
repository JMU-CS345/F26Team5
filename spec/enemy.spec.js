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

// Calls tryAttack and, when the enemy starts its telegraph (windup) instead of firing, lets the
// windup run out so the shot comes out. For specs about the shot itself, not the telegraph.
function tryAttackThroughWindup(enemy, player, room) {
  return shootNow(enemy, player, room);
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
    expect(demon.maxHealth).toBe(250);
    expect(demon.speed).toBe(1);
    expect(demon.contactDamage).toBeGreaterThanOrEqual(2);
    expect(demon.contactDamage).toBeLessThanOrEqual(3);
    expect(demon.type.attack.kind).toBe("shoot");
  });

  it("chases the player", function () {
    const room = new NormalRoom(0, 0, 640, 320);
    const demon = new Enemy(48, 96, "Demon"); // on the tile grid, so it runs straight along its row
    const player = new Player(0, 0);
    placePlayerRightOf(demon, player, 150);
    demon.update(player, room);
    expect(demon.pos.x).toBeCloseTo(48 + demon.speed, 5);
    expect(demon.pos.y).toBe(96);
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

describe("Enemy dialogue freeze and room grace", function () {
  const room = new NormalRoom(0, 0, 640, 320);

  it("does not move or count timers while frozen", function () {
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(0, 0);
    placePlayerRightOf(demon, player, 150);
    demon.update(player, room, true);
    expect(demon.pos.x).toBe(50);
    expect(demon.age).toBe(0);
  });

  it("moves again once unfrozen", function () {
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(0, 0);
    placePlayerRightOf(demon, player, 150);
    demon.update(player, room, true);
    for (let i = 0; i < 5; i++) {
      demon.update(player, room, false); // the tile walker takes a frame to pick a route
    }
    expect(demon.pos.x).toBeGreaterThan(50);
  });

  it("cannot hurt the player during the grace period", function () {
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(60, 110);
    demon.graceTimer = ROOM_GRACE_FRAMES;
    expect(demon.damagePlayer(player)).toBe(false);
    expect(player.health).toBe(player.maxHealth);
  });

  it("can hurt the player once the grace period expires", function () {
    const demon = new Enemy(50, 100, "Demon");
    const player = new Player(60, 110);
    demon.graceTimer = ROOM_GRACE_FRAMES;
    for (let i = 0; i < ROOM_GRACE_FRAMES; i++) {
      demon.update(player, room);
    }
    expect(demon.graceTimer).toBe(0);
    expect(demon.damagePlayer(player)).toBe(true);
  });

  it("template enemies start the grace period when the room loads", function () {
    const parsed = ROOM_TEMPLATES.map(parseRoomTemplate).find((t) => t.spawns.length > 0);
    const templateRoom = new TemplateRoom(0, 0, parsed);
    templateRoom.onEnter();
    expect(templateRoom.enemies.length).toBeGreaterThan(0);
    for (const enemy of templateRoom.enemies) {
      expect(enemy.graceTimer).toBe(ROOM_GRACE_FRAMES);
    }
  });
});

describe("Enemy freeze, stagger and shot flash", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(300, 200, "Fire");
  });

  function placeNear(enemy, distance) {
    const c = enemy.getCenter();
    player.pos.set(c.x + distance - 8, c.y - 8);
  }

  it("freezes for 12 frames after hitting the player, not 30", function () {
    expect(ENEMY_FREEZE_FRAMES).toBe(12);
    const enemy = new Enemy(100, 200, "Zombie");
    placeNear(enemy, 4);
    expect(enemy.damagePlayer(player)).toBe(true);
    expect(enemy.freezeTimer).toBe(ENEMY_FREEZE_FRAMES);
    expect(enemy.damageCooldown).toBe(ENEMY_DAMAGE_COOLDOWN);
    enemy.knockbackTimer = 0; // the recoil from the hit is its own thing
    const start = enemy.pos.copy();
    player.pos.set(400, 200);
    for (let i = 0; i < ENEMY_FREEZE_FRAMES; i++) {
      enemy.update(player, room);
    }
    expect(enemy.pos.x).toBe(start.x);
    expect(enemy.pos.y).toBe(start.y);
    // Tile walkers pick a route first and may walk up or down, so allow a few frames and
    // either axis.
    for (let i = 0; i < 20 && enemy.pos.dist(start) === 0; i++) {
      enemy.update(player, room);
    }
    expect(enemy.pos.dist(start)).toBeGreaterThan(0); // walking again, the cooldown still runs
    expect(enemy.damageCooldown).toBeGreaterThan(0);
  });

  it("still cannot hurt the player again until the damage cooldown ends", function () {
    const enemy = new Enemy(100, 200, "Zombie");
    placeNear(enemy, 4);
    enemy.damagePlayer(player);
    player.iFrames = 0;
    for (let i = 0; i < ENEMY_FREEZE_FRAMES + 2; i++) {
      enemy.update(player, room);
    }
    expect(enemy.damagePlayer(player)).toBe(false);
  });

  it("a hit during a Bouncer windup cancels it and staggers", function () {
    const bouncer = new Enemy(100, 200, "Bouncer");
    bouncer.setState("windup", 15);
    bouncer.takeDamage(1);
    expect(bouncer.state).toBe("recover");
    expect(bouncer.stateTimer).toBe(bouncer.getAttack().recover);
    expect(bouncer.freezeTimer).toBe(ENEMY_STAGGER_FRAMES);
  });

  it("a stagger holds an enemy still for 12 frames", function () {
    const zombie = new Enemy(100, 200, "Zombie");
    zombie.setState("windup", 15);
    zombie.takeDamage(1);
    zombie.knockbackTimer = 0;
    const x = zombie.pos.x;
    placeNear(zombie, 60);
    for (let i = 0; i < ENEMY_STAGGER_FRAMES; i++) {
      zombie.update(player, room);
    }
    expect(zombie.pos.x).toBe(x);
  });

  it("a hit outside a windup does not stagger", function () {
    const bouncer = new Enemy(100, 200, "Bouncer");
    bouncer.setState("idle", 15);
    bouncer.takeDamage(1);
    expect(bouncer.freezeTimer).toBe(0);
    bouncer.setState("attack", 5);
    bouncer.takeDamage(1);
    expect(bouncer.state).toBe("attack");
  });

  it("bosses are never staggered", function () {
    const boss = new Enemy(100, 200, "Demon");
    expect(boss.type.boss).toBe(true);
    boss.setState("windup", 15);
    boss.takeDamage(1);
    expect(boss.state).toBe("windup");
    expect(boss.freezeTimer).toBe(0);
  });

  it("a hit cancels the windup and its flash", function () {
    const skeleton = new Enemy(100, 200, "Skeleton");
    placeNear(skeleton, 100);
    skeleton.attackTimer = 0;
    skeleton.tryAttack(player, room);
    expect(skeleton.shotFlash).toBe(skeleton.getAttack().windup);
    skeleton.takeDamage(1);
    expect(skeleton.shotFlash).toBe(0);
    expect(skeleton.state).toBe("idle");
    expect(skeleton.tryAttack(player, room)).toEqual([]); // frozen
  });

  it("flashes through the windup before a shooter fires", function () {
    const skeleton = new Enemy(100, 200, "Skeleton");
    const windup = skeleton.getAttack().windup;
    placeNear(skeleton, 100);
    skeleton.attackTimer = 0;
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.isTelegraphing()).toBe(true);
    for (let i = 0; i < windup - 1; i++) {
      skeleton.update(player, room);
      expect(skeleton.tryAttack(player, room)).toEqual([]);
    }
    skeleton.update(player, room);
    expect(skeleton.shotFlash).toBe(0);
    expect(skeleton.tryAttack(player, room).length).toBe(1);
    expect(skeleton.isTelegraphing()).toBe(false);
  });

  it("gives every shooter type a flash for its windup", function () {
    for (const name of ENEMY_TYPE_NAMES) {
      const type = ENEMY_TYPES[name];
      if (!type.attack || type.attack.kind !== "shoot") {
        continue;
      }
      const enemy = new Enemy(100, 200, name);
      placeNear(enemy, 60);
      enemy.attackTimer = 0;
      enemy.stareTimer = type.attack.stare || 0;
      expect(enemy.tryAttack(player, room)).withContext(name).toEqual([]);
      expect(enemy.shotFlash).withContext(name).toBe(type.attack.windup);
    }
  });

  it("finds the swing box on each of the four sides", function () {
    const enemy = new Enemy(100, 200, "Bouncer");
    const c = enemy.getCenter();
    enemy.facingDir = "right";
    expect(enemy.getSwingBox(26).x).toBe(c.x);
    enemy.facingDir = "left";
    expect(enemy.getSwingBox(26).x).toBe(c.x - 26);
    enemy.facingDir = "up";
    expect(enemy.getSwingBox(26).y).toBe(c.y - 26);
    enemy.facingDir = "down";
    expect(enemy.getSwingBox(26).y).toBe(c.y);
  });
});
