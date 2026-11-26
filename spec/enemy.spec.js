// ===== from enemy.spec.js =====
// Enemy basics: movement, health, types, validation, the per-type contract and the newer enemies.
// Shared helpers (placePlayerRightOf, makeRng, tryAttackThroughWindup, wallWithGap...) live in helpers.js.

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
    const zombie = new Enemy(0, 0, "Ghoul");
    expect(zombie.maxHealth).toBe(ENEMY_TYPES.Ghoul.maxHealth);
    expect(zombie.health).toBe(zombie.maxHealth);
    expect(zombie.speed).toBe(ENEMY_TYPES.Ghoul.speed);
    expect(zombie.detectionRange).toBe(ENEMY_TYPES.Ghoul.detectionRange);
    expect(zombie.contactDamage).toBe(ENEMY_TYPES.Ghoul.contactDamage);
  });

  it("throws on an unknown type", function () {
    expect(function () {
      new Enemy(0, 0, "Nope");
    }).toThrowError(/Nope/);
  });

  it("uses the size from its type for its hitbox", function () {
    const knight = new Enemy(10, 20, "DemonKnight");
    expect(knight.getBounds()).toEqual({ x: 10, y: 20, w: 64, h: 64 });
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
    const dead = new Enemy(40, 40, "Ghoul");
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

describe("DemonKnight", function () {
  it("is a boss with the stats the issue asks for", function () {
    const demon = new Enemy(0, 0, "DemonKnight");
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
    const demon = new Enemy(48, 96, "DemonKnight"); // on the tile grid, so it runs straight along its row
    const player = new Player(0, 0);
    placePlayerRightOf(demon, player, 150);
    demon.update(player, room);
    expect(demon.pos.x).toBeCloseTo(48 + demon.speed, 5);
    expect(demon.pos.y).toBe(96);
  });

  it("hurts the player by its contact damage", function () {
    const demon = new Enemy(50, 100, "DemonKnight");
    const player = new Player(60, 110);
    const before = player.health;
    expect(demon.damagePlayer(player)).toBe(true);
    expect(player.health).toBe(before - demon.contactDamage);
  });

  it("dies after taking its full health in damage and is removed", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    const demon = new Enemy(50, 50, "DemonKnight");
    room.enemies = [demon];
    demon.takeDamage(demon.maxHealth - 1);
    expect(demon.isDead()).toBe(false);
    demon.takeDamage(1);
    expect(demon.isDead()).toBe(true);
    expect(removeDeadEnemies(room)[0].type.boss).toBe(true);
    expect(room.enemies.length).toBe(0);
  });
});


describe("Enemy type table", function () {
  it("is valid", function () {
    expect(validateEnemyTypes()).toEqual([]);
  });

  it("has valid art for every type", function () {
    expect(validateEnemyArt()).toEqual([]);
  });

  it("lists every type name", function () {
    for (const name of ["Jelly", "Ghoul", "Skeleton", "Bat", "PeeperJr", "DemonKnight"]) {
      expect(ENEMY_TYPE_NAMES).toContain(name);
    }
  });

  it("keeps Jelly, Ghoul and DemonKnight inside the ranges the issues ask for", function () {
    const jelly = ENEMY_TYPES.Jelly;
    expect(jelly.maxHealth).toBeGreaterThanOrEqual(3);
    expect(jelly.maxHealth).toBeLessThanOrEqual(5);
    expect(jelly.speed).toBeGreaterThanOrEqual(0.5);
    expect(jelly.speed).toBeLessThanOrEqual(1);
    expect(jelly.contactDamage).toBe(1);

    const zombie = ENEMY_TYPES.Ghoul;
    expect(zombie.maxHealth).toBeGreaterThanOrEqual(5);
    expect(zombie.maxHealth).toBeLessThanOrEqual(8);
    expect(zombie.speed).toBeGreaterThanOrEqual(0.5);
    expect(zombie.speed).toBeLessThanOrEqual(1);
    expect(zombie.contactDamage).toBeGreaterThanOrEqual(1);
    expect(zombie.contactDamage).toBeLessThanOrEqual(2);

    const demon = ENEMY_TYPES.DemonKnight;
    expect(demon.maxHealth).toBeGreaterThanOrEqual(30);
    expect(demon.maxHealth).toBeLessThanOrEqual(50);
    expect(demon.speed).toBe(1);
    expect(demon.contactDamage).toBeGreaterThanOrEqual(2);
    expect(demon.contactDamage).toBeLessThanOrEqual(3);
  });

  it("makes the Ghoul slower and tougher than the Jelly", function () {
    expect(ENEMY_TYPES.Ghoul.speed).toBeLessThanOrEqual(ENEMY_TYPES.Jelly.speed);
    expect(ENEMY_TYPES.Ghoul.maxHealth).toBeGreaterThan(ENEMY_TYPES.Jelly.maxHealth);
  });

  it("only gives bosses a boss flag", function () {
    expect(ENEMY_TYPES.DemonKnight.boss).toBe(true);
    expect(ENEMY_TYPES.Jelly.boss).toBe(false);
  });
});

describe("Enemy sprite frames", function () {
  // Add a line here when a type uses a new sprite sheet. The sizes keep a typo in a frame
  // rectangle from drawing half a sprite.
  const SHEET_SIZES = {
    "assets/enemy/Bouncer.png": { w: 149, h: 288 },
    "assets/enemy/Jelly.png": { w: 157, h: 272 },
    "assets/enemy/Spark Bark.png": { w: 128, h: 80 },
    "assets/enemy/Skulleton.png": { w: 127, h: 72 },
    "assets/enemy/Bat.png": { w: 55, h: 64 },
    "assets/enemy/tiny-creatures.png": { w: 160, h: 288 },
    "assets/enemy/Ghoul.png": { w: 127, h: 256 },
    "assets/enemy/Peeper.png": { w: 194, h: 40 },
    "assets/enemy/Demon Knight.png": { w: 418, h: 144 },
    "assets/enemy/Blockette.png": { w: 139, h: 64 },
    "assets/enemy/Shadow Wizard Money Gang.png": { w: 194, h: 560 }
  };

  for (const name of ENEMY_TYPE_NAMES) {
    it(name + " only uses frames that fit inside a known sheet", function () {
      // Every picture the type can show: the sprite, its shots, its bolts.
      const art = ENEMY_ART[name];
      if (!art) {
        return;
      }
      for (const frame of allArtFrames(art)) {
        const size = SHEET_SIZES[frame.sheet];
        expect(size).withContext("unknown sheet " + frame.sheet).toBeDefined();
        expect(frame.x + (frame.w || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.w);
        expect(frame.y + (frame.h || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.h);
      }
    });
  }

  it("finds a Tiny Creatures tile by number", function () {
    expect(creatureFrame(0)).toEqual({ sheet: CREATURE_SHEET, x: 0, y: 0 });
    expect(creatureFrame(99)).toEqual({ sheet: CREATURE_SHEET, x: 144, y: 144 });
    expect(creatureFrame(123)).toEqual({ sheet: CREATURE_SHEET, x: 48, y: 192 });
  });
});

describe("validateEnemyTypes", function () {
  // A copy of the Jelly row to break one field at a time.
  function tableWith(changes) {
    return { Test: { ...ENEMY_TYPES.Jelly, ...changes } };
  }

  it("accepts a good row", function () {
    expect(validateEnemyTypes(tableWith({}))).toEqual([]);
  });

  it("names the type and the field when a move does not exist", function () {
    const problems = validateEnemyTypes(tableWith({ move: "teleport" }));
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("Test");
    expect(problems[0]).toContain("move");
  });

  it("catches a missing move", function () {
    expect(validateEnemyTypes(tableWith({ move: undefined })).length).toBe(1);
  });

  it("catches bad numbers", function () {
    expect(validateEnemyTypes(tableWith({ maxHealth: 0 })).length).toBe(1);
    expect(validateEnemyTypes(tableWith({ maxHealth: "3" })).length).toBe(1);
    expect(validateEnemyTypes(tableWith({ speed: -1 })).length).toBe(1);
    expect(validateEnemyTypes(tableWith({ length: 0 })).length).toBe(1);
  });

  it("catches a boss flag that is not true or false", function () {
    expect(validateEnemyTypes(tableWith({ boss: "yes" })).length).toBe(1);
  });

  it("catches a bad attack", function () {
    const goodAttack = ENEMY_TYPES.Skeleton.attack;
    expect(validateEnemyTypes(tableWith({ attack: { ...goodAttack, kind: "laser" } })).length)
      .toBe(1);
    expect(validateEnemyTypes(tableWith({ attack: { ...goodAttack, cooldown: 0 } })).length)
      .toBe(1);
    expect(validateEnemyTypes(tableWith({ attack: { ...goodAttack, color: "red" } })).length)
      .toBe(1);
    expect(validateEnemyTypes(tableWith({ attack: { ...goodAttack, count: 0 } })).length)
      .toBe(1);
  });

  it("requires the extra field a behavior needs", function () {
    expect(validateEnemyTypes(tableWith({ move: "wanderChase" })).length).toBe(1);
    expect(validateEnemyTypes(tableWith({ move: "keepDistance" })).length).toBe(1);
    expect(validateEnemyTypes(tableWith({ move: "wanderChase", wanderSpeed: 0.2 }))).toEqual([]);
  });

  it("reports every problem, not just the first", function () {
    const problems = validateEnemyTypes(tableWith({ move: "teleport", maxHealth: 0 }));
    expect(problems.length).toBe(2);
  });
});

describe("createEnemy", function () {
  it("makes an enemy of the named type at the given spot", function () {
    const enemy = createEnemy("Ghoul", 10, 20);
    expect(enemy instanceof Enemy).toBe(true);
    expect(enemy.typeName).toBe("Ghoul");
    expect(enemy.pos.x).toBe(10);
    expect(enemy.pos.y).toBe(20);
    expect(enemy.health).toBe(ENEMY_TYPES.Ghoul.maxHealth);
  });

  it("throws on an unknown type and names it", function () {
    expect(function () {
      createEnemy("Dragon", 0, 0);
    }).toThrowError(/Dragon/);
  });

  it("does not let two enemies share state", function () {
    const a = createEnemy("Jelly", 0, 0);
    const b = createEnemy("Jelly", 50, 50);
    a.takeDamage(1);
    expect(b.health).toBe(b.maxHealth);
    expect(ENEMY_TYPES.Jelly.maxHealth).toBe(3);
  });
});

describe("Enemy art table", function () {
  const frame = { sheet: "a.png", x: 0, y: 0, w: 16, h: 16 };
  const types = { Test: { ...ENEMY_TYPES.Jelly } };
  const artWith = (projectile) => ({
    Test: { sprite: { frameTime: 5, frames: [frame] }, projectile }
  });

  it("accepts a projectile picture, with diagonal frames if it rotates", function () {
    expect(validateEnemyArt(artWith({ frameTime: 4, frames: [frame] }), types)).toEqual([]);
    const rotating = { frameTime: 4, rotate: true, frames: [frame], diagonalFrames: [frame] };
    expect(validateEnemyArt(artWith(rotating), types)).toEqual([]);
  });

  it("rejects a projectile with no frame time, or a rotating one with no diagonal frames", function () {
    expect(validateEnemyArt(artWith({ frameTime: 0, frames: [frame] }), types)).toEqual([
      "Test: projectile.frameTime must be a number of at least 1"
    ]);
    expect(validateEnemyArt(artWith({ frameTime: 4, rotate: true, frames: [frame] }), types)).toEqual([
      "Test: projectile.diagonalFrames must be a non-empty list"
    ]);
  });

  it("needs a sprite or a color for every type", function () {
    const noColor = { Test: { ...ENEMY_TYPES.Jelly, color: undefined } };
    expect(validateEnemyArt({}, noColor)).toEqual(["Test: needs a sprite or a color"]);
    expect(validateEnemyArt({}, types)).toEqual([]); // a color is enough
  });

  it("catches a sprite with no frames", function () {
    const art = { Test: { sprite: { frameTime: 10, frames: [] } } };
    expect(validateEnemyArt(art, types)).toEqual(["Test: sprite.frames must be a non-empty list"]);
  });

  it("rejects art for a type that does not exist", function () {
    expect(validateEnemyArt({ Ghost: { sprite: null } }, types)).toEqual([
      "Ghost: art for an enemy type that does not exist"
    ]);
  });

  it("lists the sheets of a sprite and of its shots", function () {
    const frames = allArtFrames(ENEMY_ART.SparkBark);
    expect(frames.length).toBe(
      allSpriteFrames(ENEMY_ART.SparkBark.sprite).length +
        ENEMY_ART.SparkBark.projectile.frames.length +
        ENEMY_ART.SparkBark.projectile.diagonalFrames.length
    );
  });

  it("marks a shot with the type that fired it, so the view can pick its art", function () {
    const skeleton = new Enemy(0, 0, "Skeleton");
    const shots = fireShots(skeleton, new p5.Vector(1, 0), skeleton.getAttack());
    expect(shots[0].shooter).toBe("Skeleton");
    expect(ENEMY_ART.Skeleton.projectile).toBeDefined();
  });
});


// Runs the same checks on every enemy type in ENEMY_TYPES. Adding a row to the table adds
// these checks automatically, so a broken new enemy fails here with its name.
describe("Every enemy type", function () {
  for (const name of ENEMY_TYPE_NAMES) {
    describe(name, function () {
      let room;
      let player;
      let enemy;
      const type = ENEMY_TYPES[name];

      beforeEach(function () {
        room = new NormalRoom(0, 0, 640, 400);
        player = new Player(320, 200);
        enemy = createEnemy(name, 100, 100);
      });

      it("spawns at full health with a hitbox", function () {
        expect(enemy.health).toBe(type.maxHealth);
        expect(enemy.getBounds().w).toBeGreaterThan(0);
        expect(enemy.getBounds().h).toBeGreaterThan(0);
        expect(enemy.isDead()).toBe(false);
      });

      it("takes damage, flashes, and dies after maxHealth hits of 1", function () {
        enemy.takeDamage(1);
        expect(enemy.hurtTimer).toBeGreaterThan(0);
        for (let i = 1; i < type.maxHealth; i++) {
          enemy.takeDamage(1);
        }
        expect(enemy.isDead()).toBe(true);
      });

      it("is hurt and consumes a projectile that hits it", function () {
        const center = enemy.getCenter();
        const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
        expect(enemy.damageFromProjectile(shot)).toBe(true);
        expect(enemy.health).toBe(type.maxHealth - shot.damage);
        expect(shot.alive).toBe(false);
      });

      it("is removed from the room when it dies", function () {
        const other = createEnemy("Jelly", 300, 300);
        room.enemies = [enemy, other];
        enemy.takeDamage(type.maxHealth);
        const removed = removeDeadEnemies(room);
        expect(removed).toEqual([enemy]);
        expect(room.enemies).toEqual([other]);
      });

      it("does nothing once dead", function () {
        placePlayerRightOf(enemy, player, 10);
        enemy.attackTimer = 0;
        enemy.takeDamage(type.maxHealth);
        const before = enemy.pos.copy();
        enemy.update(player, room);
        expect(enemy.pos.x).toBe(before.x);
        expect(enemy.pos.y).toBe(before.y);
        expect(enemy.damagePlayer(player)).toBe(false);
        expect(enemy.tryAttack(player)).toEqual([]);
      });

      it("acts like its move says when the player is in range", function () {
        enemy.pos.set(96, 96); // on the tile grid, so a walker runs straight at the player
        if (type.vision === "line") {
          enemy.faceDirection(1, 0); // it only sees straight ahead, and the player is on its right
        }
        placePlayerRightOf(enemy, player, type.detectionRange * 0.9);
        const before = enemy.pos.copy();
        const distanceBefore = p5.Vector.dist(enemy.getCenter(), player.getCenter());
        enemy.update(player, room);
        if (type.move === "none") {
          expect(p5.Vector.dist(before, enemy.pos)).toBe(0);
        } else if (ENEMY_MOVES[type.move].roams) {
          // Ambling and patrolling enemies ignore the player, see "Roaming enemies".
          expect(Number.isFinite(enemy.pos.x)).toBe(true);
        } else {
          // Far inside its range, every moving type closes in on the player.
          const distanceAfter = p5.Vector.dist(enemy.getCenter(), player.getCenter());
          expect(distanceAfter).toBeLessThan(distanceBefore);
        }
      });

      it("cannot see a player beyond its detection range", function () {
        placePlayerRightOf(enemy, player, type.detectionRange + 50);
        expect(enemy.canSee(player)).toBe(false);
      });

      it("faces the player", function () {
        if (type.vision === "line" || type.facing === "travel") {
          return; // these face the way they walk, see "Ghoul line vision" and "Roaming enemies"
        }
        enemy.pos.set(320, 200); // mid room, so the player (to the left) is on the floor and in sight
        placePlayerRightOf(enemy, player, -type.detectionRange / 2);
        enemy.update(player, room);
        expect(enemy.facingLeft).toBe(true);
      });

      it("hurts the player on contact by its contact damage, then waits", function () {
        player.pos.set(enemy.pos.x, enemy.pos.y);
        const before = player.health;
        expect(enemy.damagePlayer(player)).toBe(true);
        expect(player.health).toBe(before - type.contactDamage);
        expect(enemy.damagePlayer(player)).toBe(false);
      });

      it("never throws or makes NaN positions over a few seconds of play", function () {
        placePlayerRightOf(enemy, player, type.detectionRange * 0.5);
        for (let frame = 0; frame < 300; frame++) {
          enemy.update(player, room);
          enemy.tryAttack(player);
        }
        expect(Number.isFinite(enemy.pos.x)).toBe(true);
        expect(Number.isFinite(enemy.pos.y)).toBe(true);
        expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
      });

      if (type.attack === null) {
        it("has no attack and never shoots", function () {
          placePlayerRightOf(enemy, player, 50);
          expect(enemy.tryAttack(player)).toEqual([]);
        });
      } else {
        it("waits for its cooldown before the first shot", function () {
          placePlayerRightOf(enemy, player, type.detectionRange / 2);
          expect(enemy.attackTimer).toBe(type.attack.cooldown);
          expect(enemy.tryAttack(player)).toEqual([]);
        });

        it("shoots toward the player", function () {
          placePlayerRightOf(enemy, player, type.detectionRange / 2);
          enemy.attackTimer = 0;
          const centerOf = (shot) =>
            new p5.Vector(shot.pos.x + shot.length / 2, shot.pos.y + shot.width / 2);
          for (const shot of enemy.tryAttack(player)) {
            const before = p5.Vector.dist(centerOf(shot), player.getCenter());
            shot.update(room);
            expect(p5.Vector.dist(centerOf(shot), player.getCenter())).toBeLessThan(before);
          }
        });

        if (type.attack.kind === "shoot") {
          it("shoots projectiles that can hurt the player", function () {
            placePlayerRightOf(enemy, player, type.detectionRange / 2);
            enemy.attackTimer = 0;
            enemy.memory.stareFrames = type.attack.stare || 0; // a staring shooter has stared long enough
            const shots = tryAttackThroughWindup(enemy, player);
            expect(shots.length).toBe(type.attack.count || 1);
            for (const shot of shots) {
              expect(shot instanceof Projectile).toBe(true);
              expect(shot.alive).toBe(true);
              expect(shot.damage).toBe(type.attack.damage);
            }
            const target = player.getCenter();
            shots[0].pos.set(target.x - shots[0].length / 2, target.y - shots[0].width / 2);
            const before = player.health;
            expect(projectileHitsPlayer(shots[0], player)).toBe(true);
            expect(player.health).toBe(before - type.attack.damage);
          });
        }

        if (type.attack.kind === "shoot") {
          it("starts the cooldown again after it fires", function () {
            placePlayerRightOf(enemy, player, type.detectionRange / 2);
            enemy.attackTimer = 0;
            enemy.memory.stareFrames = type.attack.stare || 0;
            enemy.tryAttack(player);
            expect(enemy.attackTimer).toBe(type.attack.cooldown);
            expect(enemy.tryAttack(player)).toEqual([]);
          });
        }
      }
    });
  }
});


// Ghoul, Peeper Jr., Demon Knight, Blockette and the Shadow Wizard Money Gang.
describe("New enemies", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(320, 200);
  });

  function make(name, x, y) {
    const enemy = createEnemy(name, x, y);
    enemy.rng = makeRng(7);
    return enemy;
  }

  describe("knockback", function () {
    it("shoves Peeper Jr. but not the Spark Bark or the Demon Knight", function () {
      const right = new p5.Vector(1, 0);
      const peeper = make("PeeperJr", 100, 100);
      peeper.takeDamage(1, right);
      expect(peeper.knockbackTimer).toBeGreaterThan(0);
      for (const name of ["SparkBark", "DemonKnight"]) {
        const enemy = make(name, 100, 100);
        enemy.takeDamage(1, right);
        expect(enemy.knockbackTimer).withContext(name).toBe(0);
        expect(enemy.health).withContext(name).toBe(ENEMY_TYPES[name].maxHealth - 1);
      }
    });
  });

  describe("Ghoul", function () {
    it("has a 16x32 sprite on a 16x16 hitbox and runs while it hunts", function () {
      const ghoul = make("Ghoul", 96, 96);
      expect(ghoul.getBounds().h).toBe(16);
      const sprite = ENEMY_ART.Ghoul.sprite;
      expect(sprite.walk.down.still.h).toBe(32);
      ghoul.faceDirection(1, 0);
      placePlayerRightOf(ghoul, player, 100);
      ghoul.update(player, room);
      expect(ghoul.state).toBe("run");
      ghoul.walkFrames = 1;
      expect(sprite.walk.right.run).toContain(enemySpriteFrame(ghoul, sprite, 0));
      ghoul.setState("idle", 0);
      expect(sprite.walk.right.cycle).toContain(enemySpriteFrame(ghoul, sprite, 0));
    });
  });

  describe("Demon Knight", function () {
    it("fires a spread of three and then a spread of two in its second phase", function () {
      const knight = make("DemonKnight", 100, 100);
      knight.health = 10;
      placePlayerRightOf(knight, player, 200);
      const counts = [];
      for (let i = 0; i < 4; i++) {
        knight.attackTimer = 0;
        knight.setState("idle", 0);
        counts.push(tryAttackThroughWindup(knight, player, room).length);
      }
      expect(counts).toEqual([3, 2, 3, 2]);
    });

    it("stands still for the shot and shows the firing pose afterwards", function () {
      const knight = make("DemonKnight", 100, 100);
      placePlayerRightOf(knight, player, 200);
      knight.attackTimer = 0;
      tryAttackThroughWindup(knight, player, room);
      expect(knight.state).toBe("recover");
      expect(knight.isPlanted()).toBe(true);
      const sprite = ENEMY_ART.DemonKnight.sprite;
      expect(enemySpriteFrame(knight, sprite, 0)).toBe(sprite.states.recover[0]);
    });

    it("walks with the five frame stomp", function () {
      const knight = make("DemonKnight", 100, 100);
      const sprite = ENEMY_ART.DemonKnight.sprite;
      expect(sprite.walkCycle.length).toBe(5);
      knight.walkFrames = 0;
      expect(enemySpriteFrame(knight, sprite, 0)).toBe(sprite.frames[0]);
      knight.walkFrames = sprite.frameTime * 2;
      expect(enemySpriteFrame(knight, sprite, 0)).toBe(sprite.walkCycle[2]);
    });
  });

  describe("Blockette", function () {
    function hit(enemy, travel) {
      const shot = new Projectile(0, 0, travel, 1, 2);
      const c = enemy.getCenter();
      shot.pos.set(c.x - shot.length / 2, c.y - shot.width / 2);
      enemy.damageFromProjectile(shot);
      return shot;
    }

    it("blocks hits from the front and takes them from the sides and back", function () {
      const block = make("Blockette", 200, 200);
      block.faceDirection(1, 0); // shield on the right
      const full = block.health;
      const shot = hit(block, new p5.Vector(-1, 0)); // flying left, so it lands on the front
      expect(block.health).toBe(full);
      expect(shot.alive).toBe(false);
      expect(block.blockTimer).toBeGreaterThan(0);
      expect(block.knockbackTimer).toBe(0);
      hit(block, new p5.Vector(0, 1)); // from above: a side
      expect(block.health).toBe(full - 1);
      hit(block, new p5.Vector(1, 0)); // from behind
      expect(block.health).toBe(full - 2);
    });

    it("blocks a hit that is only a little off head on, not a diagonal one", function () {
      const block = make("Blockette", 200, 200);
      block.faceDirection(0, 1); // facing down
      expect(block.blocksHit(new p5.Vector(0.3, -1))).toBe(true);
      expect(block.blocksHit(new p5.Vector(1, -1))).toBe(false);
      expect(block.blocksHit(undefined)).toBe(false);
    });

    it("walks its route in a loop and ignores the player", function () {
      const block = make("Blockette", 96, 96);
      block.spawnTimer = 0;
      placePlayerRightOf(block, player, 20);
      player.pos.set(96 + 20, 96);
      const visited = new Set();
      for (let frame = 0; frame < 3000; frame++) {
        block.update(new Player(560, 340), room);
        visited.add(block.patrolIndex);
      }
      expect(visited.size).toBe(ENEMY_TYPES.Blockette.patrol.length);
      expect(block.getBounds().x).toBeGreaterThanOrEqual(16);
    });

    it("faces the way it walks", function () {
      const block = make("Blockette", 96, 96);
      for (let frame = 0; frame < 60; frame++) {
        block.update(new Player(560, 340), room);
      }
      expect(block.facingDir).toBe("right");
    });

    it("can follow its own patrol route", function () {
      const block = make("Blockette", 96, 96);
      block.patrolPath = [{ dx: 0, dy: 3 }, { dx: 0, dy: 0 }];
      for (let frame = 0; frame < 60; frame++) {
        block.update(new Player(560, 340), room);
      }
      expect(block.pos.y).toBeGreaterThan(96);
      expect(block.pos.x).toBe(96);
    });
  });

  describe("Shadow Wizard Money Gang", function () {
    it("walks about instead of chasing, in all four directions", function () {
      const wiz = make("ShadowWizardPurple", 300, 200);
      placePlayerRightOf(wiz, player, 150);
      const seen = new Set();
      for (let frame = 0; frame < 3000; frame++) {
        wiz.update(player, room);
        seen.add(wiz.facingDir);
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    });

    it("purple fires a bolt along the nearest of the four sides", function () {
      const wiz = make("ShadowWizardPurple", 300, 200);
      placePlayerRightOf(wiz, player, 100);
      player.pos.y -= 20; // above the line, nearest side is still right
      wiz.attackTimer = 0;
      const shots = tryAttackThroughWindup(wiz, player, room);
      expect(shots.length).toBe(1);
      expect(shots[0].vel.y).toBeCloseTo(0, 5);
      expect(shots[0].vel.x).toBeGreaterThan(0);
      expect(wiz.facingDir).toBe("right");
      expect(ENEMY_ART.ShadowWizardPurple.projectile.rotate).toBe(true);
    });

    it("yellow zaps a player standing close in front of it, and not one far away", function () {
      const wiz = make("ShadowWizardYellow", 300, 200);
      placePlayerRightOf(wiz, player, 30);
      wiz.attackTimer = 0;
      wiz.tryAttack(player, room);
      expect(wiz.state).toBe("windup");
      expect(wiz.facingDir).toBe("right");
      const before = player.health;
      for (let i = 0; i < 200 && player.health === before; i++) {
        wiz.update(player, room);
        wiz.meleeHit(player);
        wiz.tryAttack(player, room);
      }
      expect(player.health).toBe(before - ENEMY_TYPES.ShadowWizardYellow.attack.damage);

      const far = make("ShadowWizardYellow", 300, 200);
      placePlayerRightOf(far, player, 120);
      far.attackTimer = 0;
      far.tryAttack(player, room);
      expect(far.state).toBe("idle");
    });

    it("yellow's bolt is 16 wide and reaches 32 pixels past its hitbox", function () {
      const wiz = make("ShadowWizardYellow", 300, 200);
      wiz.faceDirection(1, 0);
      const box = wiz.getSwingBox(40, 16);
      expect(box.w).toBe(40);
      expect(box.h).toBe(16);
      expect(box.x + box.w).toBe(wiz.pos.x + 8 + 40);
    });

    it("green calls a strike down on the player that only hurts after it warns", function () {
      const wiz = make("ShadowWizardGreen", 300, 200);
      const attack = ENEMY_TYPES.ShadowWizardGreen.attack;
      placePlayerRightOf(wiz, player, 100);
      wiz.attackTimer = 0;
      const bolts = tryAttackThroughWindup(wiz, player, room);
      expect(bolts.length).toBe(1);
      const bolt = bolts[0];
      expect(bolt.isStrike).toBe(true);
      const before = player.health;
      expect(projectileHitsPlayer(bolt, player)).toBe(false); // still only a marker
      for (let i = 0; i < attack.delay; i++) {
        bolt.update(room);
      }
      expect(projectileHitsPlayer(bolt, player)).toBe(true);
      expect(player.health).toBe(before - attack.damage);
      expect(bolt.alive).toBe(true); // stays on screen
      expect(projectileHitsPlayer(bolt, player)).toBe(false); // but hurts once
      for (let i = 0; i < attack.active; i++) {
        bolt.update(room);
      }
      expect(bolt.alive).toBe(false);
    });

    it("a strike whose spot the player has left misses", function () {
      const bolt = new LightningStrike(100, 100, 1, 5, 5, 24);
      player.pos.set(300, 300);
      for (let i = 0; i < 6; i++) {
        bolt.update(room);
      }
      expect(projectileHitsPlayer(bolt, player)).toBe(false);
    });
  });

  describe("table checks", function () {
    it("rejects a shield that turns to the player and a patrol with no route", function () {
      const base = ENEMY_TYPES.Blockette;
      expect(validateEnemyTypes({ T: { ...base, facing: undefined } }).length).toBeGreaterThan(0);
      expect(validateEnemyTypes({ T: { ...base, patrol: [] } }).length).toBeGreaterThan(0);
      expect(validateEnemyTypes({ T: { ...base, patrol: [{ dx: 0, dy: 0 }] } }).length).toBeGreaterThan(0);
    });

    it("rejects bad volleys, zaps and strikes", function () {
      const knight = ENEMY_TYPES.DemonKnight;
      const badVolley = { ...knight.attack, volleys: [{ count: 0, spread: 5 }] };
      expect(validateEnemyTypes({ T: { ...knight, attack: badVolley, phases: undefined } }).length).toBeGreaterThan(0);
      const zap = ENEMY_TYPES.ShadowWizardYellow;
      expect(validateEnemyTypes({ T: { ...zap, attack: { ...zap.attack, reach: 0 } } }).length).toBeGreaterThan(0);
      const strike = ENEMY_TYPES.ShadowWizardGreen;
      expect(validateEnemyTypes({ T: { ...strike, attack: { ...strike.attack, delay: 0 } } }).length).toBeGreaterThan(0);
    });
  });
});


// ===== from enemy-phases.spec.js =====
// Boss phases: a type can change speed, move and attack once its health gets low.
describe("Enemy phases", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(320, 200);
  });

  describe("getPhase", function () {
    it("is null above the threshold and at exactly 50%", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      expect(demon.getPhase()).toBeNull();
      demon.health = 20;
      expect(demon.getPhase()).toBeNull();
    });

    it("is active below the threshold", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.health = 19;
      expect(demon.getPhase()).toBe(ENEMY_TYPES.DemonKnight.phases[0]);
    });

    it("picks the lowest threshold when two match", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      const phases = [{ below: 0.75, speed: 2 }, { below: 0.25, speed: 3 }];
      demon.type = Object.assign({}, demon.type, { phases: phases });
      demon.health = 20;
      expect(demon.getPhase()).toBe(phases[0]);
      demon.health = 5;
      expect(demon.getPhase()).toBe(phases[1]);
    });
  });

  describe("getters", function () {
    it("fall back to the base type with no phases", function () {
      const jelly = createEnemy("Jelly", 100, 100);
      jelly.health = 1;
      expect(jelly.getPhase()).toBeNull();
      expect(jelly.getMoveName()).toBe(ENEMY_TYPES.Jelly.move);
      expect(jelly.getAttack()).toBeNull();
      expect(jelly.getSpeed()).toBe(1);
    });

    it("fall back to the base type for a DemonKnight above the threshold", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      expect(demon.getMoveName()).toBe("chase");
      expect(demon.getAttack()).toBe(ENEMY_TYPES.DemonKnight.attack);
      expect(demon.getSpeed()).toBe(1);
    });

    it("use the phase values below the threshold", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.health = 10;
      expect(demon.getSpeed()).toBe(1.6);
      expect(demon.getAttack()).toBe(ENEMY_TYPES.DemonKnight.phases[0].attack);
      expect(demon.getMoveName()).toBe("chase");
    });

    it("use a phase move name when it has one", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.type = Object.assign({}, demon.type, { phases: [{ below: 0.5, move: "erratic" }] });
      demon.health = 10;
      expect(demon.getMoveName()).toBe("erratic");
    });

    it("keep a speed set directly on the enemy when the phase has none", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.type = Object.assign({}, demon.type, { phases: [{ below: 0.5, move: "none" }] });
      demon.speed = 0;
      demon.health = 10;
      expect(demon.getSpeed()).toBe(0);
    });
  });

  describe("in play", function () {
    it("moves at the phase speed", function () {
      const demon = createEnemy("DemonKnight", 96, 96); // on the tile grid, so it runs straight along its row
      placePlayerRightOf(demon, player, 200);
      demon.health = 10;
      const startX = demon.pos.x;
      demon.update(player, room);
      expect(demon.pos.x - startX).toBeCloseTo(1.6, 3);
    });

    it("fires the phase attack with its count", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      placePlayerRightOf(demon, player, 200);
      demon.health = 10;
      demon.attackTimer = 0;
      expect(tryAttackThroughWindup(demon, player).length).toBe(3);
      expect(demon.attackTimer).toBe(ENEMY_TYPES.DemonKnight.phases[0].attack.cooldown);
    });

    it("fires the base attack above the threshold", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      placePlayerRightOf(demon, player, 200);
      demon.attackTimer = 0;
      expect(tryAttackThroughWindup(demon, player).length).toBe(1);
      expect(demon.attackTimer).toBe(ENEMY_TYPES.DemonKnight.attack.cooldown);
    });
  });

  describe("phase change", function () {
    it("clamps attackTimer to the new cooldown", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.attackTimer = 500;
      demon.takeDamage(21);
      expect(demon.attackTimer).toBe(ENEMY_TYPES.DemonKnight.phases[0].attack.cooldown);
    });

    it("never raises attackTimer", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.attackTimer = 10;
      demon.takeDamage(21);
      expect(demon.attackTimer).toBe(10);
    });

    it("flashes after the crossing hit and stops after the flash frames", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      expect(demon.justChangedPhase()).toBe(false);
      demon.takeDamage(21);
      expect(demon.justChangedPhase()).toBe(true);
      for (let i = 0; i < ENEMY_PHASE_FLASH_FRAMES; i++) {
        demon.update(player, room);
      }
      expect(demon.justChangedPhase()).toBe(false);
    });

    it("does not flash for a hit that stays in the same phase", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.takeDamage(5);
      expect(demon.justChangedPhase()).toBe(false);
      demon.takeDamage(21);
      demon.phaseFlashTimer = 0;
      demon.takeDamage(1);
      expect(demon.justChangedPhase()).toBe(false);
    });

    it("does not flash for zero or negative damage", function () {
      const demon = createEnemy("DemonKnight", 100, 100);
      demon.takeDamage(0);
      demon.takeDamage(-5);
      expect(demon.justChangedPhase()).toBe(false);
      expect(demon.getPhase()).toBeNull();
    });
  });

  describe("validation", function () {
    function demonWith(changes) {
      const table = { DemonKnight: Object.assign({}, ENEMY_TYPES.DemonKnight, changes) };
      return validateEnemyTypes(table);
    }

    it("accepts the DemonKnight table", function () {
      expect(validateEnemyTypes()).toEqual([]);
    });

    it("rejects phases that are not a list or are empty", function () {
      expect(demonWith({ phases: "no" })).toContain("DemonKnight: phases must be a non-empty list");
      expect(demonWith({ phases: [] })).toContain("DemonKnight: phases must be a non-empty list");
    });

    it("rejects below of 0, 1 and 1.5", function () {
      for (const below of [0, 1, 1.5]) {
        const problems = demonWith({ phases: [{ below: below }] });
        expect(problems).toContain("DemonKnight: phase below must be a number above 0 and below 1");
      }
    });

    it("rejects below values that do not get smaller", function () {
      const problems = demonWith({ phases: [{ below: 0.3 }, { below: 0.5 }] });
      expect(problems).toContain("DemonKnight: phase below values must get smaller down the list");
    });

    it("rejects an unknown move", function () {
      const problems = demonWith({ phases: [{ below: 0.5, move: "fly" }] });
      expect(problems).toContain("DemonKnight: phase move is not in ENEMY_MOVES: fly");
    });

    it("rejects a bad attack inside a phase", function () {
      const bad = { kind: "boom", cooldown: 0, damage: 1, speed: 1, color: [1, 2, 3] };
      const problems = demonWith({ phases: [{ below: 0.5, attack: bad }] });
      expect(problems).toContain("DemonKnight: phase attack.kind is not in ENEMY_ATTACKS: boom");
      expect(problems).toContain("DemonKnight: phase attack.cooldown must be a number above 0");
    });

    it("rejects a negative phase speed", function () {
      const problems = demonWith({ phases: [{ below: 0.5, speed: -1 }] });
      expect(problems).toContain("DemonKnight: phase speed must be a number of at least 0");
    });

    it("rejects a lootTable that is a number or empty", function () {
      expect(demonWith({ lootTable: 5 })).toContain("DemonKnight: lootTable must be a non-empty string");
      expect(demonWith({ lootTable: "" })).toContain("DemonKnight: lootTable must be a non-empty string");
    });
  });

  describe("findDeadBosses", function () {
    it("returns only the bosses", function () {
      const demon = createEnemy("DemonKnight", 0, 0);
      const jelly = createEnemy("Jelly", 0, 0);
      expect(findDeadBosses([jelly, demon])).toEqual([demon]);
    });

    it("works on an empty list", function () {
      expect(findDeadBosses([])).toEqual([]);
    });
  });
});
