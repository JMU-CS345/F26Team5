describe("getStatsForClass", () => {
  it("gives the base stats when there is no class", () => {
    expect(getStatsForClass(null)).toEqual({
      health: 5,
      speed: 2,
      resolve: 1,
      constitution: 1,
      intelligence: 1
    });
  });

  it("gives the Fire mage extra resolve only", () => {
    const stats = getStatsForClass("Fire");
    expect(stats.resolve).toBe(3);
    expect(stats.constitution).toBe(1);
    expect(stats.intelligence).toBe(1);
  });

  it("gives the Ice mage extra constitution only", () => {
    const stats = getStatsForClass("Ice");
    expect(stats.constitution).toBe(3);
    expect(stats.resolve).toBe(1);
    expect(stats.intelligence).toBe(1);
  });

  it("gives the Mind mage extra intelligence only", () => {
    const stats = getStatsForClass("Mind");
    expect(stats.intelligence).toBe(3);
    expect(stats.resolve).toBe(1);
    expect(stats.constitution).toBe(1);
  });

  it("keeps health and speed the same for every class", () => {
    for (const mageClass of MAGE_CLASSES) {
      const stats = getStatsForClass(mageClass);
      expect(stats.health).toBe(BASE_STATS.health);
      expect(stats.speed).toBe(BASE_STATS.speed);
    }
  });

  it("falls back to the base stats for an unknown class", () => {
    expect(getStatsForClass("Wind")).toEqual(getStatsForClass(null));
  });

  it("returns a new object each time, so changing one does not affect the base", () => {
    const a = getStatsForClass("Fire");
    a.resolve = 99;
    expect(getStatsForClass("Fire").resolve).toBe(3);
    expect(BASE_STATS.resolve).toBe(1);
  });
});

describe("ELEMENT_STAT", () => {
  it("maps each element to the stat that scales its damage", () => {
    expect(ELEMENT_STAT.Fire).toBe("resolve");
    expect(ELEMENT_STAT.Ice).toBe("constitution");
    expect(ELEMENT_STAT.Mind).toBe("intelligence");
  });

  it("has a stat for every mage class", () => {
    for (const mageClass of MAGE_CLASSES) {
      expect(BASE_STATS[ELEMENT_STAT[mageClass]]).toBeDefined();
    }
  });
});

describe("scaleDamage", () => {
  it("does not change damage when the matching stat is 1", () => {
    expect(scaleDamage(1, "Fire", getStatsForClass(null))).toBe(1);
  });

  it("adds 25% of base damage per stat point above 1", () => {
    const stats = { ...BASE_STATS, resolve: 3 };
    expect(scaleDamage(1, "Fire", stats)).toBeCloseTo(1.5);
    expect(scaleDamage(2, "Fire", stats)).toBeCloseTo(3);
  });

  it("uses the stat that matches the element", () => {
    const stats = { ...BASE_STATS, resolve: 5, constitution: 1, intelligence: 3 };
    expect(scaleDamage(1, "Fire", stats)).toBeCloseTo(2);
    expect(scaleDamage(1, "Ice", stats)).toBeCloseTo(1);
    expect(scaleDamage(1, "Mind", stats)).toBeCloseTo(1.5);
  });

  it("does not scale an unknown or missing element", () => {
    const stats = { ...BASE_STATS, resolve: 5 };
    expect(scaleDamage(1, "Wind", stats)).toBe(1);
    expect(scaleDamage(1, null, stats)).toBe(1);
  });

  it("returns zero for zero base damage", () => {
    expect(scaleDamage(0, "Fire", getStatsForClass("Fire"))).toBe(0);
  });
});

describe("Player stats", () => {
  it("takes max health and speed from the stats", () => {
    const player = new Player(0, 0, "Fire");
    expect(player.maxHealth).toBe(player.stats.health);
    expect(player.health).toBe(player.stats.health);
    expect(player.speed).toBe(player.stats.speed);
  });

  it("builds stats from its class", () => {
    expect(new Player(0, 0, "Ice").stats.constitution).toBe(3);
    expect(new Player(0, 0, "Mind").stats.intelligence).toBe(3);
  });

  it("does not share its stats object with other players", () => {
    const a = new Player(0, 0, "Fire");
    const b = new Player(0, 0, "Fire");
    a.stats.resolve = 99;
    expect(b.stats.resolve).toBe(3);
  });

  it("scales damage by the matching stat", () => {
    const player = new Player(0, 0, "Fire");
    expect(player.getDamage(1, "Fire")).toBeCloseTo(1.5);
    expect(player.getDamage(1, "Ice")).toBeCloseTo(1);
  });

  it("fires projectiles with damage scaled to its class", () => {
    const fire = new Player(0, 0, "Fire").fire(new p5.Vector(1, 0));
    const ice = new Player(0, 0, "Ice").fire(new p5.Vector(1, 0));
    expect(fire.damage).toBeCloseTo(1.5);
    expect(ice.damage).toBeCloseTo(1.5);
  });
});

describe("Projectile damage", () => {
  it("defaults to the standard damage", () => {
    const p = new Projectile(0, 0, new p5.Vector(1, 0));
    expect(p.damage).toBe(PROJECTILE_DAMAGE);
  });

  it("uses a damage value passed in", () => {
    const p = new Projectile(0, 0, new p5.Vector(1, 0), 2.5);
    expect(p.damage).toBe(2.5);
  });
});