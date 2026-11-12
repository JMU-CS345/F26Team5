// Runs the same checks on every enemy type in ENEMY_TYPES. Adding a row to the table adds
// these checks automatically, so a broken new enemy fails here with its name.
describe("Every enemy type", function () {
  for (const name of ENEMY_TYPE_NAMES) {
    describe(name, function () {
      let room;
      let player;
      let enemy;
      const type = ENEMY_TYPES[name];

      // Puts the player this many pixels to the right of the enemy, center to center.
      function placePlayer(distance) {
        const center = enemy.getCenter();
        player.pos.set(center.x + distance - player.length / 2, center.y - player.width / 2);
      }

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
        placePlayer(10);
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
        placePlayer(type.detectionRange * 0.9);
        const before = enemy.pos.copy();
        const distanceBefore = p5.Vector.dist(enemy.getCenter(), player.getCenter());
        enemy.update(player, room);
        if (type.move === "none") {
          expect(p5.Vector.dist(before, enemy.pos)).toBe(0);
        } else {
          // Far inside its range, every moving type closes in on the player.
          const distanceAfter = p5.Vector.dist(enemy.getCenter(), player.getCenter());
          expect(distanceAfter).toBeLessThan(distanceBefore);
        }
      });

      it("cannot see a player beyond its detection range", function () {
        placePlayer(type.detectionRange + 50);
        expect(enemy.canSee(player)).toBe(false);
      });

      it("faces the player", function () {
        placePlayer(-type.detectionRange / 2);
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
        placePlayer(type.detectionRange * 0.5);
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
          placePlayer(50);
          expect(enemy.tryAttack(player)).toEqual([]);
        });
      } else {
        it("waits for its cooldown before the first shot", function () {
          placePlayer(type.detectionRange / 2);
          expect(enemy.attackTimer).toBe(type.attack.cooldown);
          expect(enemy.tryAttack(player)).toEqual([]);
        });

        it("shoots toward the player", function () {
          placePlayer(type.detectionRange / 2);
          enemy.attackTimer = 0;
          const centerOf = (shot) =>
            new p5.Vector(shot.pos.x + shot.length / 2, shot.pos.y + shot.width / 2);
          for (const shot of enemy.tryAttack(player)) {
            const before = p5.Vector.dist(centerOf(shot), player.getCenter());
            shot.update(room);
            expect(p5.Vector.dist(centerOf(shot), player.getCenter())).toBeLessThan(before);
          }
        });

        it("shoots projectiles that can hurt the player", function () {
          placePlayer(type.detectionRange / 2);
          enemy.attackTimer = 0;
          const shots = enemy.tryAttack(player);
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

        it("starts the cooldown again after it fires", function () {
          placePlayer(type.detectionRange / 2);
          enemy.attackTimer = 0;
          enemy.tryAttack(player);
          expect(enemy.attackTimer).toBe(type.attack.cooldown);
          expect(enemy.tryAttack(player)).toEqual([]);
        });
      }
    });
  }
});
