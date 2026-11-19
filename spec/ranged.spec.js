describe("Ranged shots", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 200, "Fire");
  });

  function equip(weapon) {
    player.inventory.add(weapon);
    player.inventory.equip(weapon);
  }

  function wand(extra = {}) {
    return new ProjectileWeapon({ id: "wand", name: "Wand", damage: 2, ...extra });
  }

  it("fires the default shot with no weapon", function () {
    const shots = player.fireAll(right);
    expect(shots.length).toBe(1);
    expect(shots[0].vel.mag()).toBeCloseTo(RANGED_DEFAULTS.shotSpeed, 5);
    expect(shots[0].range).toBe(RANGED_DEFAULTS.range);
  });

  it("takes speed, range and pierce from the weapon", function () {
    equip(wand({ shotSpeed: 9, range: 120, pierce: 2 }));
    const shot = player.fireAll(right)[0];
    expect(shot.vel.mag()).toBeCloseTo(9, 5);
    expect(shot.range).toBe(120);
    expect(shot.pierce).toBe(2);
  });

  it("takes damage from the weapon, scaled by the class", function () {
    equip(wand({ damage: 4 }));
    const shot = player.fireAll(right)[0];
    expect(shot.damage).toBeCloseTo(player.getDamage(4, player.mageClass), 5);
  });

  it("waits the weapon fire rate between shots", function () {
    equip(wand({ fireRate: 10 }));
    expect(player.fireAll(right).length).toBe(1);
    for (let i = 0; i < 9; i++) {
      player.update(room);
      expect(player.fireAll(right).length).toBe(0);
    }
    player.update(room);
    expect(player.fireAll(right).length).toBe(1);
  });

  it("fires a volley with the weapon projectile count", function () {
    equip(wand({ projectileCount: 3, spread: 40 }));
    expect(player.fireAll(right).length).toBe(3);
  });

  it("spreads a volley evenly around the aim", function () {
    equip(wand({ projectileCount: 3, spread: 40 }));
    const shots = player.fireAll(right);
    const angles = shots.map((s) => Math.round(s.vel.heading() * 180 / Math.PI));
    expect(angles).toEqual([-20, 0, 20]);
  });

  it("fires straight with one projectile even if spread is set", function () {
    equip(wand({ spread: 60 }));
    expect(player.fireAll(right)[0].vel.heading()).toBeCloseTo(0, 5);
  });

  it("fades after its range", function () {
    equip(wand({ range: 50, shotSpeed: 5 }));
    const shot = player.fireAll(right)[0];
    for (let i = 0; i < 9; i++) {
      shot.update(room);
    }
    expect(shot.alive).toBe(true);
    shot.update(room);
    expect(shot.alive).toBe(false);
  });

  it("passes through as many enemies as its pierce allows", function () {
    const shot = new Projectile(100, 100, right, 1, 0, { pierce: 1 });
    const a = new Enemy(96, 96, "Demon");
    const b = new Enemy(96, 96, "Demon");
    const c = new Enemy(96, 96, "Demon");
    expect(a.damageFromProjectile(shot)).toBe(true);
    expect(shot.alive).toBe(true);
    expect(a.damageFromProjectile(shot)).toBe(false); // same enemy, not twice
    expect(b.damageFromProjectile(shot)).toBe(true);
    expect(shot.alive).toBe(false);
    expect(c.damageFromProjectile(shot)).toBe(false);
  });

  it("dies on the first enemy with no pierce", function () {
    const shot = new Projectile(100, 100, right, 1, 0);
    const a = new Enemy(96, 96, "Demon");
    a.damageFromProjectile(shot);
    expect(shot.alive).toBe(false);
  });

  it("calls the weapon hooks", function () {
    const fired = [];
    const hit = [];
    equip(wand({
      onFire: (ctx) => {
        fired.push(ctx);
        return [];
      },
      onHit: (ctx) => {
        hit.push(ctx);
        return [];
      }
    }));
    const shot = player.fireAll(right)[0];
    expect(fired.length).toBe(1);
    expect(fired[0].angle).toBeCloseTo(0, 5);
    const enemy = new Enemy(0, 0, "Demon");
    enemy.pos.set(shot.pos.x, shot.pos.y);
    enemy.damageFromProjectile(shot);
    expect(hit.length).toBe(1);
    expect(hit[0].target.health).toBe(enemy.health);
  });

  it("is weaker and slower than melee by default", function () {
    expect(RANGED_DEFAULTS.damage).toBeLessThan(MELEE_DEFAULTS.damage);
    const shotsPerSecond = 60 / RANGED_DEFAULTS.fireRate;
    const swingsPerSecond = 60 / MELEE_DEFAULTS.swingFrames;
    expect(shotsPerSecond).toBeLessThan(swingsPerSecond);
    expect(RANGED_DEFAULTS.damage * shotsPerSecond)
      .toBeLessThan(MELEE_DEFAULTS.damage * swingsPerSecond);
  });
});
