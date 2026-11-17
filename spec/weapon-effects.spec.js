describe("Weapon hooks in combat", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(200, 200, "Fire");
    player.setAim(new p5.Vector(1, 0));
  });

  function runDueEffects() {
    const shots = [];
    for (const effect of player.takeDueEffects()) {
      const shot = applyWeaponEffect(effect, player, room);
      if (shot !== null) {
        shots.push(shot);
      }
    }
    return shots;
  }

  // Equips a weapon from the bag, then plays frames the way the sketch does.
  function useWeapon(weapon) {
    player.inventory.add(weapon);
    player.inventory.equip(weapon);
    const enemy = new Enemy(222, 192, "Demon");
    room.enemies.push(enemy);
    for (let i = 0; i < 70; i++) {
      player.fireAll(new p5.Vector(1, 0));
      player.update(room, { meleeHeld: weapon.constructor === MeleeWeapon });
      runDueEffects();
      enemy.health = enemy.maxHealth; // keep it alive so every hit keeps counting
    }
    for (const item of player.inventory.contents()) {
      player.inventory.remove(item.item, item.quantity);
    }
    room.enemies = [];
  }

  it("equips and uses every weapon base at every rarity without throwing", function () {
    const rng = createRng(21);
    for (const base of WEAPON_BASES) {
      for (const rarity of RARITY_IDS) {
        for (let n = 0; n < 4; n++) {
          const weapon = generateWeapon(rng, { kind: base.kind, rarity: rarity, depth: 3 });
          expect(function () {
            useWeapon(weapon);
          }).not.toThrow();
        }
      }
    }
  });

  it("uses every handmade legendary without throwing", function () {
    for (const row of LEGENDARIES) {
      const weapon = generateWeapon(createRng(5), { kind: getWeaponBase(row.baseId).kind,
        rarity: "legendary" });
      expect(function () {
        useWeapon(weapon);
      }).not.toThrow();
    }
  });

  it("builds the ctx the hooks document", function () {
    const enemy = new Enemy(250, 190, "Demon");
    const ctx = makeHookContext(player, "fire", {
      weapon: { id: "w1", damage: 2, element: "Ice", shotSpeed: 4, range: 150 },
      angle: 1, damage: 2.5, target: enemy, enemies: [enemy, new Enemy(300, 190, "Demon")]
    });
    expect(ctx.source).toEqual({ x: player.getCenter().x, y: player.getCenter().y });
    expect(ctx.angle).toBe(1);
    expect(ctx.damage).toBe(2.5);
    expect(ctx.count).toBe(1);
    expect(ctx.weapon.range).toBe(150);
    expect(ctx.target.health).toBe(enemy.health);
    expect(ctx.enemies.length).toBe(1); // the target is not listed twice
    expect(makeHookContext(player, "fire", { weapon: { id: "w1" } }).count).toBe(2);
    expect(makeHookContext(player, "hit", { weapon: { id: "w1" } }).count).toBe(1);
  });

  it("queues effects and releases them after their delay", function () {
    player.queueEffects([projectileEffect(0, 0, 0, 1, { delayFrames: 2 }), healEffect(1)]);
    expect(player.takeDueEffects().length).toBe(1);
    expect(player.takeDueEffects().length).toBe(0);
    expect(player.takeDueEffects().length).toBe(1); // the third call, after a delay of 2
  });

  it("carries out each effect type", function () {
    const enemy = new Enemy(300, 190, "Demon");
    room.enemies.push(enemy);
    const center = enemy.getCenter();
    const shot = applyWeaponEffect(projectileEffect(10, 10, 0, 2, { element: "Fire" }),
      player, room);
    expect(shot.damage).toBe(2);
    expect(shot.element).toBe("Fire");
    player.health = 1;
    applyWeaponEffect(healEffect(2), player, room);
    expect(player.health).toBe(3);
    applyWeaponEffect(areaEffect(center.x, center.y, 20, 1), player, room);
    expect(enemy.health).toBe(enemy.maxHealth - 1);
    const before = enemy.pos.x;
    applyWeaponEffect(pullEffect(center.x - 60, center.y, 100, 3), player, room);
    expect(enemy.pos.x).toBeLessThan(before);
  });

  it("fires Starfall's ring on every 5th shot", function () {
    const staff = generateWeapon(createRng(1), { kind: "ranged", rarity: "legendary" });
    const row = getLegendary("starfall");
    staff.onFire = row.onFire;
    player.inventory.add(staff);
    player.inventory.equip(staff);
    let ring = 0;
    for (let i = 0; i < 5; i++) {
      player.fireCooldown = 0;
      player.fireAll(new p5.Vector(1, 0));
      ring = player.takeDueEffects().length;
    }
    expect(ring).toBe(8);
  });
});
