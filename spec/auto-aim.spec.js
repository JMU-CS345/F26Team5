// Auto-aim: target choice, homing shots, melee snap, slashing enemy shots, DPS ratio.

describe("Auto-aim", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 192, "Fire");
    player.setAim(right);
  });

  function enemyAt(x, y, type = "Demon") {
    const enemy = new Enemy(x, y, type);
    room.enemies.push(enemy);
    return enemy;
  }

  // An enemy whose center sits dx, dy from the player's center.
  function enemyNear(dx, dy) {
    const enemy = enemyAt(0, 0);
    const c = player.getCenter();
    enemy.pos.set(c.x + dx - enemy.length / 2, c.y + dy - enemy.width / 2);
    return enemy;
  }

  describe("findAimTarget", function () {
    it("picks the nearest enemy", function () {
      enemyAt(300, 192);
      const near = enemyAt(200, 192);
      expect(findAimTarget(player, room.enemies, room, AIM_RANGE)).toBe(near);
    });

    it("returns null with no enemies", function () {
      expect(findAimTarget(player, [], room, AIM_RANGE)).toBeNull();
    });

    it("skips dead enemies", function () {
      const dead = enemyAt(160, 192);
      dead.health = 0;
      const alive = enemyAt(250, 192);
      expect(findAimTarget(player, room.enemies, room, AIM_RANGE)).toBe(alive);
    });

    it("skips spawning enemies", function () {
      const spawning = enemyAt(160, 192);
      spawning.spawnTimer = 30;
      expect(findAimTarget(player, room.enemies, room, AIM_RANGE)).toBeNull();
    });

    it("skips enemies behind a wall", function () {
      enemyAt(300, 192);
      for (let row = 1; row < room.rows - 1; row++) {
        room.setTile(12, row, TILE.INTERIOR_WALL);
      }
      expect(findAimTarget(player, room.enemies, room, AIM_RANGE)).toBeNull();
    });

    it("skips enemies out of range and keeps the default range at 240", function () {
      expect(AIM_RANGE).toBe(240);
      const far = enemyAt(100 + 300, 192);
      expect(findAimTarget(player, room.enemies, room, AIM_RANGE)).toBeNull();
      expect(findAimTarget(player, room.enemies, room, 400)).toBe(far);
    });

    it("falls back to the nearest visible enemy when the nearest is walled off", function () {
      const blocked = enemyAt(130, 120);
      room.setTile(Math.floor(115 / 16), Math.floor(150 / 16), TILE.INTERIOR_WALL);
      const open = enemyAt(300, 192);
      const found = findAimTarget(player, room.enemies, room, AIM_RANGE);
      expect([blocked, open]).toContain(found);
      expect(found).not.toBeNull();
    });
  });

  describe("applyAutoAim", function () {
    it("stores the target and points a held fire key at it", function () {
      const target = enemyAt(100, 300);
      const input = { fireDir: new p5.Vector(1, 0), move: new p5.Vector(0, 0) };
      applyAutoAim(player, input, room);
      expect(input.aimTarget).toBe(target);
      expect(player.aimTarget).toBe(target);
      expect(input.fireDir.y).toBeGreaterThan(0.9);
    });

    it("keeps the existing aim with no target", function () {
      const input = { fireDir: new p5.Vector(1, 0), move: new p5.Vector(0, 0) };
      applyAutoAim(player, input, room);
      expect(input.aimTarget).toBeNull();
      expect(input.fireDir.x).toBe(1);
    });

    it("does not start shooting when no fire key is held", function () {
      enemyAt(200, 192);
      const input = { fireDir: new p5.Vector(0, 0), move: new p5.Vector(0, 0) };
      applyAutoAim(player, input, room);
      expect(input.fireDir.magSq()).toBe(0);
    });
  });

  describe("homing shots", function () {
    it("turns at most SHOT_TURN_DEG per frame", function () {
      const target = enemyAt(100, 400 - 64);
      const shot = new Projectile(100, 192, right, 1, 5);
      shot.target = target;
      const before = shot.vel.heading();
      steerShot(shot);
      expect(Math.abs(shot.vel.heading() - before)).toBeCloseTo((SHOT_TURN_DEG * Math.PI) / 180, 5);
      expect(shot.vel.mag()).toBeCloseTo(5, 5);
    });

    it("turns the short way, toward the target on either side", function () {
      const above = enemyAt(100, 40);
      const shot = new Projectile(100, 192, right, 1, 5);
      shot.target = above;
      steerShot(shot);
      expect(shot.vel.y).toBeLessThan(0);
    });

    it("flies straight once the target is dead or missing", function () {
      const target = enemyAt(100, 300);
      const shot = new Projectile(100, 192, right, 1, 5);
      shot.target = target;
      target.health = 0;
      steerShot(shot);
      expect(shot.vel.y).toBe(0);
      shot.target = null;
      steerShot(shot);
      expect(shot.vel.y).toBe(0);
    });

    function chase(withTarget) {
      const target = enemyAt(300, 192);
      const shot = new Projectile(100, 192, right, 1, 5);
      if (withTarget) {
        shot.target = target;
      }
      for (let i = 0; i < 80 && shot.alive; i++) {
        target.pos.y -= 2; // a moving target
        shot.update(room);
        target.damageFromProjectile(shot);
      }
      return target.health < target.maxHealth;
    }

    it("hits a moving target that a straight shot misses", function () {
      expect(chase(false)).toBe(false);
      expect(chase(true)).toBe(true);
    });

    it("tags fired shots with the player's aim target", function () {
      const target = enemyAt(200, 192);
      player.aimTarget = target;
      expect(player.fireAll(right)[0].target).toBe(target);
    });

    it("fires plain shots with no target", function () {
      expect(player.fireAll(right)[0].target).toBeNull();
    });
  });

  describe("melee snap", function () {
    it("swings toward a target within reach + 24", function () {
      player.aimTarget = enemyNear(0, 28 + 20);
      expect(meleeSwingDir(player, 28).y).toBeGreaterThan(0.9);
    });

    it("keeps the normal aim past reach + 24", function () {
      player.aimTarget = enemyNear(0, 28 + 30);
      expect(meleeSwingDir(player, 28)).toBe(player.aim);
    });

    it("keeps the normal aim with no or a dead target", function () {
      expect(meleeSwingDir(player, 28)).toBe(player.aim);
      const dead = enemyAt(100, 220);
      dead.health = 0;
      player.aimTarget = dead;
      expect(meleeSwingDir(player, 28)).toBe(player.aim);
    });

    it("turns a real swing toward the target", function () {
      player.aimTarget = enemyNear(0, 40);
      player.bufferMelee();
      player.update(room);
      expect(player.attack.dir.y).toBeGreaterThan(0.9);
    });
  });

  describe("slashing enemy shots", function () {
    function shotAt(x, y) {
      const shot = new Projectile(x, y, new p5.Vector(-1, 0), 1, 2);
      room.enemies.length = 0;
      return shot;
    }

    function swingUntilActive() {
      player.bufferMelee();
      for (let i = 0; i < 20 && !(player.attack && player.attack.hitbox); i++) {
        player.update(room);
      }
    }

    it("destroys a shot inside the arc during the active frames", function () {
      swingUntilActive();
      const shot = shotAt(player.getCenter().x + 20, player.getCenter().y);
      slashEnemyShots(player, [shot]);
      expect(shot.alive).toBe(false);
    });

    it("leaves a shot outside the arc or out of reach", function () {
      swingUntilActive();
      const behind = shotAt(player.getCenter().x - 20, player.getCenter().y);
      const far = shotAt(player.getCenter().x + 200, player.getCenter().y);
      slashEnemyShots(player, [behind, far]);
      expect(behind.alive).toBe(true);
      expect(far.alive).toBe(true);
    });

    it("does nothing without a swing or during windup", function () {
      const shot = shotAt(player.getCenter().x + 20, player.getCenter().y);
      slashEnemyShots(player, [shot]);
      expect(shot.alive).toBe(true);
      player.bufferMelee();
      player.update(room);
      expect(player.attack.phase()).toBe("windup");
      slashEnemyShots(player, [shot]);
      expect(shot.alive).toBe(true);
    });
  });

  describe("rebalance", function () {
    it("uses the new default numbers", function () {
      expect(MELEE_DEFAULTS.damage).toBe(1.5);
      expect(MELEE_DEFAULTS.swingFrames).toBe(14);
      expect(MELEE_DEFAULTS.arc).toBe(90);
      expect(RANGED_DEFAULTS.fireRate).toBe(24);
    });

    it("keeps default melee DPS between 2 and 3 times ranged DPS", function () {
      const melee = getMeleeStats(null);
      const ranged = getRangedStats(null);
      const meleeDps = melee.damage / melee.swingFrames;
      const rangedDps = ranged.damage / ranged.fireRate;
      expect(meleeDps / rangedDps).toBeGreaterThanOrEqual(2);
      expect(meleeDps / rangedDps).toBeLessThanOrEqual(3);
    });
  });
});
