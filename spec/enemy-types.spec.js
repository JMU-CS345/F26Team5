describe("Enemy type table", function () {
  it("is valid", function () {
    expect(validateEnemyTypes()).toEqual([]);
  });

  it("lists every type name", function () {
    for (const name of ["Jelly", "Zombie", "Skeleton", "Bat", "Eyeball", "Demon"]) {
      expect(ENEMY_TYPE_NAMES).toContain(name);
    }
  });

  it("keeps Jelly, Zombie and Demon inside the ranges the issues ask for", function () {
    const jelly = ENEMY_TYPES.Jelly;
    expect(jelly.maxHealth).toBeGreaterThanOrEqual(3);
    expect(jelly.maxHealth).toBeLessThanOrEqual(5);
    expect(jelly.speed).toBeGreaterThanOrEqual(0.5);
    expect(jelly.speed).toBeLessThanOrEqual(1);
    expect(jelly.contactDamage).toBe(1);

    const zombie = ENEMY_TYPES.Zombie;
    expect(zombie.maxHealth).toBeGreaterThanOrEqual(5);
    expect(zombie.maxHealth).toBeLessThanOrEqual(8);
    expect(zombie.speed).toBeGreaterThanOrEqual(0.5);
    expect(zombie.speed).toBeLessThanOrEqual(1);
    expect(zombie.contactDamage).toBeGreaterThanOrEqual(1);
    expect(zombie.contactDamage).toBeLessThanOrEqual(2);

    const demon = ENEMY_TYPES.Demon;
    expect(demon.maxHealth).toBeGreaterThanOrEqual(30);
    expect(demon.maxHealth).toBeLessThanOrEqual(50);
    expect(demon.speed).toBe(1);
    expect(demon.contactDamage).toBeGreaterThanOrEqual(2);
    expect(demon.contactDamage).toBeLessThanOrEqual(3);
  });

  it("makes the Zombie slower and tougher than the Jelly", function () {
    expect(ENEMY_TYPES.Zombie.speed).toBeLessThanOrEqual(ENEMY_TYPES.Jelly.speed);
    expect(ENEMY_TYPES.Zombie.maxHealth).toBeGreaterThan(ENEMY_TYPES.Jelly.maxHealth);
  });

  it("only gives bosses a boss flag", function () {
    expect(ENEMY_TYPES.Demon.boss).toBe(true);
    expect(ENEMY_TYPES.Jelly.boss).toBe(false);
  });
});

describe("Enemy sprite frames", function () {
  // Add a line here when a type uses a new sprite sheet. The sizes keep a typo in a frame
  // rectangle from drawing half a sprite.
  const SHEET_SIZES = {
    "assets/enemy/Jelly.png": { w: 157, h: 272 },
    "assets/enemy/tiny-creatures.png": { w: 160, h: 288 }
  };

  for (const name of ENEMY_TYPE_NAMES) {
    it(name + " only uses frames that fit inside a known sheet", function () {
      const sprite = ENEMY_TYPES[name].sprite;
      if (!sprite) {
        return;
      }
      for (const frame of sprite.frames) {
        const size = SHEET_SIZES[frame.sheet];
        expect(size).withContext("unknown sheet " + frame.sheet).toBeDefined();
        expect(frame.x + ENEMY_SPRITE_SIZE).toBeLessThanOrEqual(size.w);
        expect(frame.y + ENEMY_SPRITE_SIZE).toBeLessThanOrEqual(size.h);
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

  it("catches a type with no sprite and no color", function () {
    expect(validateEnemyTypes(tableWith({ sprite: null, color: undefined })).length).toBe(1);
  });

  it("catches a sprite with no frames", function () {
    const problems = validateEnemyTypes(tableWith({ sprite: { frameTime: 10, frames: [] } }));
    expect(problems.length).toBe(1);
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
    const enemy = createEnemy("Zombie", 10, 20);
    expect(enemy instanceof Enemy).toBe(true);
    expect(enemy.typeName).toBe("Zombie");
    expect(enemy.pos.x).toBe(10);
    expect(enemy.pos.y).toBe(20);
    expect(enemy.health).toBe(ENEMY_TYPES.Zombie.maxHealth);
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
