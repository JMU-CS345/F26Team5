describe("Class-match bonus", function () {
  const right = new p5.Vector(1, 0);

  describe("isClassMatch", function () {
    it("is true when the element equals the class", function () {
      expect(isClassMatch("Fire", "Fire")).toBe(true);
      expect(isClassMatch("Mind", "Mind")).toBe(true);
    });

    it("is false when the element differs from the class", function () {
      expect(isClassMatch("Fire", "Ice")).toBe(false);
      expect(isClassMatch("Mind", "Fire")).toBe(false);
    });

    it("is false when either side is missing", function () {
      expect(isClassMatch(null, "Fire")).toBe(false);
      expect(isClassMatch("Fire", null)).toBe(false);
      expect(isClassMatch(null, null)).toBe(false);
    });
  });

  describe("classMatchDamage", function () {
    it("adds CLASS_MATCH_DAMAGE_MULT when the element matches", function () {
      expect(classMatchDamage(2, "Ice", "Ice")).toBeCloseTo(2 * CLASS_MATCH_DAMAGE_MULT, 5);
    });

    it("gives a mismatched element no bonus", function () {
      expect(classMatchDamage(2, "Fire", "Ice")).toBe(2);
    });

    it("gives no bonus with no element or no class", function () {
      expect(classMatchDamage(2, null, "Ice")).toBe(2);
      expect(classMatchDamage(2, "Ice", null)).toBe(2);
    });
  });

  describe("on the player's shots", function () {
    it("marks the default shot as a class match and boosts its damage", function () {
      const player = new Player(0, 0, "Fire");
      const shot = player.fire(right);
      expect(shot.element).toBe("Fire");
      expect(shot.classMatch).toBe(true);
      expect(shot.damage).toBeCloseTo(player.getDamage(PROJECTILE_DAMAGE, "Fire") *
        CLASS_MATCH_DAMAGE_MULT, 5);
    });

    it("has no element and no bonus without a class", function () {
      const shot = new Player(0, 0, null).fire(right);
      expect(shot.element).toBeNull();
      expect(shot.classMatch).toBe(false);
      expect(shot.damage).toBe(PROJECTILE_DAMAGE);
    });
  });

  describe("on enemies", function () {
    function hit(element, classMatch) {
      const enemy = new Enemy(100, 100, "Zombie");
      const shot = new Projectile(enemy.pos.x + 10, enemy.pos.y + 10, right);
      shot.element = element;
      shot.classMatch = classMatch;
      enemy.damageFromProjectile(shot);
      return enemy;
    }

    it("lengthens the status when the element matches the class", function () {
      const enemy = hit("Ice", true);
      expect(enemy.status.slow).toBeCloseTo(STATUS_SLOW_FRAMES * CLASS_MATCH_DURATION_MULT, 5);
    });

    it("keeps the normal status length when the element is a mismatch", function () {
      const enemy = hit("Ice", false);
      expect(enemy.status.slow).toBe(STATUS_SLOW_FRAMES);
    });

    it("lengthens a matched stun too", function () {
      const enemy = hit("Mind", true);
      expect(enemy.status.stun).toBeCloseTo(STATUS_STUN_FRAMES * CLASS_MATCH_DURATION_MULT, 5);
    });

    it("gives a mismatched burn the normal duration", function () {
      const enemy = hit("Fire", false);
      expect(enemy.status.burn).toBe(STATUS_BURN_FRAMES);
    });
  });
});
