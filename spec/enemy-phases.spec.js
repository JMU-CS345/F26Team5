// Boss phases: a type can change speed, move and attack once its health gets low.
describe("Enemy phases", function () {
  let room;
  let player;

  // Puts the player this many pixels to the right of the enemy, center to center.
  function placePlayer(enemy, distance) {
    const center = enemy.getCenter();
    player.pos.set(center.x + distance - player.length / 2, center.y - player.width / 2);
  }

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(320, 200);
  });

  describe("getPhase", function () {
    it("is null above the threshold and at exactly 50%", function () {
      const demon = createEnemy("Demon", 100, 100);
      expect(demon.getPhase()).toBeNull();
      demon.health = 20;
      expect(demon.getPhase()).toBeNull();
    });

    it("is active below the threshold", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.health = 19;
      expect(demon.getPhase()).toBe(ENEMY_TYPES.Demon.phases[0]);
    });

    it("picks the lowest threshold when two match", function () {
      const demon = createEnemy("Demon", 100, 100);
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

    it("fall back to the base type for a Demon above the threshold", function () {
      const demon = createEnemy("Demon", 100, 100);
      expect(demon.getMoveName()).toBe("chase");
      expect(demon.getAttack()).toBe(ENEMY_TYPES.Demon.attack);
      expect(demon.getSpeed()).toBe(1);
    });

    it("use the phase values below the threshold", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.health = 10;
      expect(demon.getSpeed()).toBe(1.6);
      expect(demon.getAttack()).toBe(ENEMY_TYPES.Demon.phases[0].attack);
      expect(demon.getMoveName()).toBe("chase");
    });

    it("use a phase move name when it has one", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.type = Object.assign({}, demon.type, { phases: [{ below: 0.5, move: "erratic" }] });
      demon.health = 10;
      expect(demon.getMoveName()).toBe("erratic");
    });

    it("keep a speed set directly on the enemy when the phase has none", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.type = Object.assign({}, demon.type, { phases: [{ below: 0.5, move: "none" }] });
      demon.speed = 0;
      demon.health = 10;
      expect(demon.getSpeed()).toBe(0);
    });
  });

  describe("in play", function () {
    it("moves at the phase speed", function () {
      const demon = createEnemy("Demon", 100, 100);
      placePlayer(demon, 200);
      demon.health = 10;
      const startX = demon.pos.x;
      demon.update(player, room);
      expect(demon.pos.x - startX).toBeCloseTo(1.6, 3);
    });

    it("fires the phase attack with its count", function () {
      const demon = createEnemy("Demon", 100, 100);
      placePlayer(demon, 200);
      demon.health = 10;
      demon.attackTimer = 0;
      expect(demon.tryAttack(player).length).toBe(3);
      expect(demon.attackTimer).toBe(50);
    });

    it("fires the base attack above the threshold", function () {
      const demon = createEnemy("Demon", 100, 100);
      placePlayer(demon, 200);
      demon.attackTimer = 0;
      expect(demon.tryAttack(player).length).toBe(1);
      expect(demon.attackTimer).toBe(75);
    });
  });

  describe("phase change", function () {
    it("clamps attackTimer to the new cooldown", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.attackTimer = 75;
      demon.takeDamage(21);
      expect(demon.attackTimer).toBe(50);
    });

    it("never raises attackTimer", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.attackTimer = 10;
      demon.takeDamage(21);
      expect(demon.attackTimer).toBe(10);
    });

    it("flashes after the crossing hit and stops after the flash frames", function () {
      const demon = createEnemy("Demon", 100, 100);
      expect(demon.justChangedPhase()).toBe(false);
      demon.takeDamage(21);
      expect(demon.justChangedPhase()).toBe(true);
      for (let i = 0; i < ENEMY_PHASE_FLASH_FRAMES; i++) {
        demon.update(player, room);
      }
      expect(demon.justChangedPhase()).toBe(false);
    });

    it("does not flash for a hit that stays in the same phase", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.takeDamage(5);
      expect(demon.justChangedPhase()).toBe(false);
      demon.takeDamage(21);
      demon.phaseFlashTimer = 0;
      demon.takeDamage(1);
      expect(demon.justChangedPhase()).toBe(false);
    });

    it("does not flash for zero or negative damage", function () {
      const demon = createEnemy("Demon", 100, 100);
      demon.takeDamage(0);
      demon.takeDamage(-5);
      expect(demon.justChangedPhase()).toBe(false);
      expect(demon.getPhase()).toBeNull();
    });
  });

  describe("validation", function () {
    function demonWith(changes) {
      const table = { Demon: Object.assign({}, ENEMY_TYPES.Demon, changes) };
      return validateEnemyTypes(table);
    }

    it("accepts the Demon table", function () {
      expect(validateEnemyTypes()).toEqual([]);
    });

    it("rejects phases that are not a list or are empty", function () {
      expect(demonWith({ phases: "no" })).toContain("Demon: phases must be a non-empty list");
      expect(demonWith({ phases: [] })).toContain("Demon: phases must be a non-empty list");
    });

    it("rejects below of 0, 1 and 1.5", function () {
      for (const below of [0, 1, 1.5]) {
        const problems = demonWith({ phases: [{ below: below }] });
        expect(problems).toContain("Demon: phase below must be a number above 0 and below 1");
      }
    });

    it("rejects below values that do not get smaller", function () {
      const problems = demonWith({ phases: [{ below: 0.3 }, { below: 0.5 }] });
      expect(problems).toContain("Demon: phase below values must get smaller down the list");
    });

    it("rejects an unknown move", function () {
      const problems = demonWith({ phases: [{ below: 0.5, move: "fly" }] });
      expect(problems).toContain("Demon: phase move is not in ENEMY_MOVES: fly");
    });

    it("rejects a bad attack inside a phase", function () {
      const bad = { kind: "boom", cooldown: 0, damage: 1, speed: 1, color: [1, 2, 3] };
      const problems = demonWith({ phases: [{ below: 0.5, attack: bad }] });
      expect(problems).toContain("Demon: phase attack.kind is not in ENEMY_ATTACKS: boom");
      expect(problems).toContain("Demon: phase attack.cooldown must be a number above 0");
    });

    it("rejects a negative phase speed", function () {
      const problems = demonWith({ phases: [{ below: 0.5, speed: -1 }] });
      expect(problems).toContain("Demon: phase speed must be a number of at least 0");
    });

    it("rejects a lootTable that is a number or empty", function () {
      expect(demonWith({ lootTable: 5 })).toContain("Demon: lootTable must be a non-empty string");
      expect(demonWith({ lootTable: "" })).toContain("Demon: lootTable must be a non-empty string");
    });
  });

  describe("findDeadBosses", function () {
    it("returns only the bosses", function () {
      const demon = createEnemy("Demon", 0, 0);
      const jelly = createEnemy("Jelly", 0, 0);
      expect(findDeadBosses([jelly, demon])).toEqual([demon]);
    });

    it("works on an empty list", function () {
      expect(findDeadBosses([])).toEqual([]);
    });
  });
});
