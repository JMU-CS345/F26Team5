describe("legendaries", function () {
  function ctxFor(overrides) {
    return {
      weapon: { damage: 3, element: "Fire", shotSpeed: 5, range: 200 },
      source: { x: 100, y: 100 },
      angle: 0,
      damage: 3,
      count: 1,
      target: { x: 150, y: 100, health: 2, maxHealth: 4 },
      enemies: [{ x: 210, y: 100 }],
      ...overrides
    };
  }

  function hookOf(id, name) {
    return getLegendary(id)[name];
  }

  it("has 8 to 10 valid handmade weapons", function () {
    expect(validateLegendaries()).toEqual([]);
    expect(LEGENDARIES.length).toBeGreaterThanOrEqual(8);
    expect(LEGENDARIES.length).toBeLessThanOrEqual(10);
  });

  it("is pure: the same ctx gives the same effects and leaves ctx alone", function () {
    for (const row of LEGENDARIES) {
      for (const name of ["onHit", "onFire"]) {
        if (row[name]) {
          const ctx = ctxFor({ count: 60, target: { x: 150, y: 100, health: 0, maxHealth: 4 } });
          const before = JSON.stringify(ctx);
          const first = row[name](ctx);
          const second = row[name](ctx);
          expect(JSON.stringify(first)).toBe(JSON.stringify(second));
          expect(JSON.stringify(ctx)).toBe(before);
        }
      }
    }
  });

  it("Emberfang throws one fireball, only when the hit kills", function () {
    const hook = hookOf("emberfang", "onHit");
    expect(hook(ctxFor({}))).toEqual([]);
    const effects = hook(ctxFor({ target: { x: 150, y: 100, health: 0, maxHealth: 4 } }));
    expect(effects.length).toBe(1);
    expect(effects[0].type).toBe("projectile");
    expect(effects[0].element).toBe("Fire");
    expect(effects[0].angle).toBeCloseTo(0, 5);
  });

  it("Wayfinder sends one shot back from the end of the range", function () {
    const effects = hookOf("wayfinder", "onFire")(ctxFor({}));
    expect(effects.length).toBe(1);
    expect(effects[0].x).toBeCloseTo(300, 5);
    expect(effects[0].angle).toBeCloseTo(Math.PI, 5);
    expect(effects[0].delayFrames).toBeGreaterThan(0);
  });

  it("Starfall makes a ring of 8 on every 5th shot only", function () {
    const hook = hookOf("starfall", "onFire");
    for (let count = 1; count <= 12; count++) {
      const effects = hook(ctxFor({ count: count }));
      if (count % 5 === 0) {
        expect(effects.length).toBe(8);
      } else {
        expect(effects).toEqual([]);
      }
    }
  });

  it("Gravemaul pulls toward the target once per hit", function () {
    const effects = hookOf("gravemaul", "onHit")(ctxFor({}));
    expect(effects.length).toBe(1);
    expect(effects[0].type).toBe("pull");
    expect(effects[0].x).toBe(150);
  });

  it("Soulthirst heals only on a kill", function () {
    const hook = hookOf("soulthirst", "onHit");
    expect(hook(ctxFor({}))).toEqual([]);
    const kill = hook(ctxFor({ target: { x: 0, y: 0, health: 0, maxHealth: 4 } }));
    expect(kill).toEqual([{ type: "heal", amount: 2 }]);
  });

  it("Thornspire fires 3 thorns on every 4th hit only", function () {
    const hook = hookOf("thornspire", "onHit");
    expect(hook(ctxFor({ count: 3 }))).toEqual([]);
    expect(hook(ctxFor({ count: 4 })).length).toBe(3);
    expect(hook(ctxFor({ count: 5 }))).toEqual([]);
  });

  it("Cinder Scepter bursts once per hit", function () {
    const effects = hookOf("cinder-scepter", "onHit")(ctxFor({}));
    expect(effects.length).toBe(1);
    expect(effects[0].type).toBe("area");
    expect(hookOf("cinder-scepter", "onHit")(ctxFor({ target: null }))).toEqual([]);
  });

  it("Chorus repeats a shot twice (3 bolts each) on every 3rd shot only", function () {
    const hook = hookOf("chorus", "onFire");
    expect(hook(ctxFor({ count: 2 }))).toEqual([]);
    const effects = hook(ctxFor({ count: 3 }));
    expect(effects.length).toBe(6);
    expect(new Set(effects.map((e) => e.delayFrames)).size).toBe(2);
  });

  it("Frostheart fires one huge orb on every 6th shot only", function () {
    const hook = hookOf("frostheart", "onFire");
    expect(hook(ctxFor({ count: 5 }))).toEqual([]);
    const effects = hook(ctxFor({ count: 6 }));
    expect(effects.length).toBe(1);
    expect(effects[0].pierce).toBe(5);
    expect(effects[0].damage).toBeGreaterThan(ctxFor({}).damage);
  });

  it("Reaver finishes only living enemies under 30% health", function () {
    const hook = hookOf("reaver", "onHit");
    expect(hook(ctxFor({}))).toEqual([]);
    expect(hook(ctxFor({ target: { x: 1, y: 1, health: 0, maxHealth: 4 } }))).toEqual([]);
    const low = hook(ctxFor({ target: { x: 1, y: 1, health: 1, maxHealth: 10 } }));
    expect(low.length).toBe(1);
  });

  it("generateWeapon builds each legendary as a real weapon with its hook", function () {
    for (const row of LEGENDARIES) {
      const kind = getWeaponBase(row.baseId).kind;
      let found = null;
      for (let seed = 1; seed <= 400 && found === null; seed++) {
        const weapon = generateWeapon(createRng(seed), { rarity: "legendary", kind: kind });
        if (weapon.uniqueId === row.id) {
          found = weapon;
        }
      }
      expect(found).not.toBeNull();
      expect(found.name).toBe(row.name);
      expect(found.rarity).toBe("legendary");
      expect(found.element).toBe(row.element);
      expect(found.affixes.length).toBe(2);
      expect(found.affixes.map(getAffix).some((a) => a.element)).toBe(false);
      if (row.onHit) {
        expect(typeof found.onHit).toBe("function");
      }
      if (row.onFire) {
        expect(typeof found.onFire).toBe("function");
      }
    }
  });

  it("a generated legendary hook still fires once per trigger", function () {
    let weapon = null;
    for (let seed = 1; seed <= 400 && weapon === null; seed++) {
      const w = generateWeapon(createRng(seed), { rarity: "legendary", kind: "ranged" });
      if (w.uniqueId === "starfall") {
        weapon = w;
      }
    }
    const ring = weapon.onFire(ctxFor({ count: 5 })).filter((e) => e.type === "projectile");
    const ringShots = ring.filter((e) => e.range === 110 && e.speed === 3.5);
    expect(ringShots.length).toBe(8);
    const quiet = weapon.onFire(ctxFor({ count: 4 })).filter((e) => e.speed === 3.5);
    expect(quiet).toEqual([]);
  });
});
