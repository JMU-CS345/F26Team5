describe("Status effects", function () {
  // Eyeball is a turret: it stays put and shoots. Demon is a boss.
  function makeEnemy(typeName = "Eyeball") {
    const enemy = new Enemy(100, 100, typeName);
    enemy.health = enemy.maxHealth;
    return enemy;
  }

  function tickFrames(enemy, frames) {
    for (let i = 0; i < frames; i++) {
      tickStatusEffects(enemy);
    }
  }

  describe("Fire (burn)", function () {
    it("starts a burn with the full duration", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Fire");
      expect(enemy.status.burn).toBe(STATUS_BURN_FRAMES);
    });

    it("deals damage every STATUS_BURN_INTERVAL frames", function () {
      const enemy = makeEnemy();
      enemy.health = 10;
      applyStatusEffect(enemy, "Fire");
      tickFrames(enemy, STATUS_BURN_INTERVAL - 1);
      expect(enemy.health).toBe(10);
      tickStatusEffects(enemy);
      expect(enemy.health).toBeCloseTo(10 - STATUS_BURN_DAMAGE, 5);
    });

    it("adds up to 0.75 damage over the full burn (3 ticks), then expires", function () {
      const enemy = makeEnemy();
      enemy.health = 10;
      applyStatusEffect(enemy, "Fire");
      tickFrames(enemy, STATUS_BURN_FRAMES);
      expect(enemy.health).toBeCloseTo(10 - 3 * STATUS_BURN_DAMAGE, 5);
      expect(enemy.status.burn).toBe(0);
      tickFrames(enemy, 60);
      expect(enemy.health).toBeCloseTo(10 - 3 * STATUS_BURN_DAMAGE, 5);
    });

    it("refreshing resets the burn timer to the full duration", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Fire");
      tickFrames(enemy, 50);
      applyStatusEffect(enemy, "Fire");
      expect(enemy.status.burn).toBe(STATUS_BURN_FRAMES);
    });

    it("hits bosses too", function () {
      const boss = makeEnemy("Demon");
      boss.health = 10;
      applyStatusEffect(boss, "Fire");
      tickFrames(boss, STATUS_BURN_INTERVAL);
      expect(boss.health).toBeCloseTo(10 - STATUS_BURN_DAMAGE, 5);
    });
  });

  describe("Ice (slow)", function () {
    it("slows movement to 0.6x while slowed", function () {
      const enemy = makeEnemy("Zombie");
      const base = enemy.getSpeed();
      applyStatusEffect(enemy, "Ice");
      expect(speedMultiplier(enemy)).toBe(STATUS_SLOW_SPEED);
      expect(enemy.getSpeed()).toBeCloseTo(base * 0.6, 5);
    });

    it("expires after STATUS_SLOW_FRAMES", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Ice");
      tickFrames(enemy, STATUS_SLOW_FRAMES - 1);
      expect(speedMultiplier(enemy)).toBe(STATUS_SLOW_SPEED);
      tickStatusEffects(enemy);
      expect(speedMultiplier(enemy)).toBe(1);
      expect(enemy.getSpeed()).toBe(enemy.speed);
    });

    it("gives bosses a lighter slow (0.85x)", function () {
      const boss = makeEnemy("Demon");
      applyStatusEffect(boss, "Ice");
      expect(speedMultiplier(boss)).toBe(STATUS_BOSS_SLOW_SPEED);
      expect(speedMultiplier(boss)).toBeGreaterThan(STATUS_SLOW_SPEED);
    });

    it("refreshing resets the slow timer", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Ice");
      tickFrames(enemy, 40);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });
  });

  describe("Mind (stun)", function () {
    it("stuns a normal enemy for 24 frames", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Mind");
      expect(enemy.status.stun).toBe(24);
    });

    it("stuns a normal enemy for STATUS_STUN_FRAMES", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Mind");
      expect(isStunned(enemy)).toBe(true);
      tickFrames(enemy, STATUS_STUN_FRAMES - 1);
      expect(isStunned(enemy)).toBe(true);
      tickStatusEffects(enemy);
      expect(isStunned(enemy)).toBe(false);
    });

    it("stops a turret from shooting while stunned", function () {
      const enemy = makeEnemy("Eyeball");
      const player = new Player(enemy.pos.x + 40, enemy.pos.y, "Mind");
      enemy.attackTimer = 0;
      applyStatusEffect(enemy, "Mind");
      expect(enemy.tryAttack(player)).toEqual([]);
      tickFrames(enemy, STATUS_STUN_FRAMES);
      enemy.attackTimer = 0;
      enemy.tryAttack(player); // starts the shot flash
      enemy.shotFlash = 0;
      expect(enemy.tryAttack(player).length).toBeGreaterThan(0);
    });

    it("does not stun bosses", function () {
      const boss = makeEnemy("Demon");
      applyStatusEffect(boss, "Mind");
      expect(isStunned(boss)).toBe(false);
      expect(boss.status.stun).toBe(0);
    });

    it("refreshing resets the stun timer", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Mind");
      tickFrames(enemy, 10);
      applyStatusEffect(enemy, "Mind");
      expect(enemy.status.stun).toBe(STATUS_STUN_FRAMES);
    });
  });

  describe("cap", function () {
    it("does not stack a second copy of the same effect", function () {
      const enemy = makeEnemy();
      enemy.health = 10;
      for (let i = 0; i < 5; i++) {
        applyStatusEffect(enemy, "Fire");
      }
      expect(enemy.status.burn).toBe(STATUS_BURN_FRAMES);
      tickFrames(enemy, STATUS_BURN_FRAMES);
      expect(enemy.health).toBeCloseTo(10 - 3 * STATUS_BURN_DAMAGE, 5);
    });

    it("keeps different effects in separate slots", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Fire");
      applyStatusEffect(enemy, "Ice");
      applyStatusEffect(enemy, "Mind");
      expect(enemy.status.burn).toBeGreaterThan(0);
      expect(enemy.status.slow).toBeGreaterThan(0);
      expect(enemy.status.stun).toBeGreaterThan(0);
    });
  });

  describe("no element", function () {
    it("does nothing for null or unknown elements", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, null);
      applyStatusEffect(enemy, "Earth");
      expect(enemy.status).toEqual(createStatus());
    });
  });

  describe("activeStatusElement", function () {
    it("reports the tint element, stun first", function () {
      const enemy = makeEnemy("Zombie");
      expect(activeStatusElement(enemy)).toBeNull();
      applyStatusEffect(enemy, "Ice");
      expect(activeStatusElement(enemy)).toBe("Ice");
      applyStatusEffect(enemy, "Fire");
      expect(activeStatusElement(enemy)).toBe("Fire");
      applyStatusEffect(enemy, "Mind");
      expect(activeStatusElement(enemy)).toBe("Mind");
    });
  });

  describe("tuning values", function () {
    it("uses the agreed numbers", function () {
      expect(STATUS_BURN_FRAMES).toBe(90);
      expect(STATUS_BURN_INTERVAL).toBe(30);
      expect(STATUS_SLOW_FRAMES).toBe(70);
      expect(STATUS_SLOW_SPEED).toBe(0.6);
      expect(STATUS_BOSS_SLOW_SPEED).toBe(0.85);
      expect(STATUS_STUN_FRAMES).toBe(24);
      expect(STATUS_PROC_CHANCE).toBe(0.4);
    });
  });

  describe("proc chance", function () {
    function shotAt(enemy, element) {
      const shot = new Projectile(enemy.pos.x + 10, enemy.pos.y + 10, new p5.Vector(1, 0));
      shot.element = element;
      return shot;
    }

    function hitWithRoll(roll, element) {
      const enemy = makeEnemy("Zombie");
      enemy.health = 10;
      let rolls = 0;
      enemy.rng = () => {
        rolls++;
        return roll;
      };
      enemy.damageFromProjectile(shotAt(enemy, element));
      return { enemy, rolls };
    }

    it("applies the status when the roll is under STATUS_PROC_CHANCE", function () {
      const { enemy } = hitWithRoll(STATUS_PROC_CHANCE - 0.01, "Ice");
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });

    it("applies nothing when the roll is at or over STATUS_PROC_CHANCE", function () {
      const { enemy } = hitWithRoll(STATUS_PROC_CHANCE, "Ice");
      expect(enemy.status).toEqual(createStatus());
    });

    it("still does the shot damage when the status does not proc", function () {
      const { enemy } = hitWithRoll(0.99, "Fire");
      expect(enemy.health).toBeLessThan(10);
    });

    it("rolls once per element shot using enemy.rng", function () {
      const { rolls } = hitWithRoll(0.5, "Mind");
      expect(rolls).toBe(1);
    });

    it("does not roll for a shot with no element", function () {
      const enemy = makeEnemy("Zombie");
      let rolls = 0;
      enemy.rng = () => {
        rolls++;
        return 0;
      };
      enemy.damageFromProjectile(shotAt(enemy, null));
      expect(rolls).toBe(0);
    });
  });

  describe("re-apply immunity", function () {
    it("blocks a burn for 60 frames after it ends", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Fire");
      tickFrames(enemy, STATUS_BURN_FRAMES);
      expect(enemy.status.burn).toBe(0);
      applyStatusEffect(enemy, "Fire");
      expect(enemy.status.burn).toBe(0);
      tickFrames(enemy, STATUS_BURN_IMMUNE_FRAMES - 1);
      applyStatusEffect(enemy, "Fire");
      expect(enemy.status.burn).toBe(0);
      tickFrames(enemy, 1);
      applyStatusEffect(enemy, "Fire");
      expect(enemy.status.burn).toBe(STATUS_BURN_FRAMES);
    });

    it("blocks a slow for 60 frames after it ends", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Ice");
      tickFrames(enemy, STATUS_SLOW_FRAMES);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(0);
      tickFrames(enemy, STATUS_SLOW_IMMUNE_FRAMES - 1);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(0);
      tickFrames(enemy, 1);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });

    it("blocks a stun for 90 frames after it ends", function () {
      const enemy = makeEnemy();
      applyStatusEffect(enemy, "Mind");
      tickFrames(enemy, STATUS_STUN_FRAMES);
      expect(isStunned(enemy)).toBe(false);
      applyStatusEffect(enemy, "Mind");
      expect(isStunned(enemy)).toBe(false);
      tickFrames(enemy, STATUS_STUN_IMMUNE_FRAMES - 1);
      applyStatusEffect(enemy, "Mind");
      expect(isStunned(enemy)).toBe(false);
      tickFrames(enemy, 1);
      applyStatusEffect(enemy, "Mind");
      expect(isStunned(enemy)).toBe(true);
    });

    it("does not block a refresh while the effect is still running", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Ice");
      tickFrames(enemy, 10);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });

    it("keeps each effect's immunity separate", function () {
      const enemy = makeEnemy("Zombie");
      applyStatusEffect(enemy, "Mind");
      tickFrames(enemy, STATUS_STUN_FRAMES);
      applyStatusEffect(enemy, "Ice");
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });
  });

  describe("projectile hits", function () {
    it("apply the projectile's element when it hits an enemy", function () {
      const enemy = makeEnemy("Zombie");
      enemy.rng = () => 0; // 0 always procs
      const shot = new Projectile(enemy.pos.x + 10, enemy.pos.y + 10, new p5.Vector(1, 0));
      shot.element = "Ice";
      enemy.damageFromProjectile(shot);
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });

    it("apply nothing for a projectile with no element", function () {
      const enemy = makeEnemy("Zombie");
      const shot = new Projectile(enemy.pos.x + 10, enemy.pos.y + 10, new p5.Vector(1, 0));
      enemy.damageFromProjectile(shot);
      expect(enemy.status).toEqual(createStatus());
    });
  });
});
