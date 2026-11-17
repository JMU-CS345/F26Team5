describe("weapon comparison and swap", function () {
  function melee(options) {
    return new MeleeWeapon({ id: "m" + Math.random(), name: "Sword", ...options });
  }

  function ranged(options) {
    return new ProjectileWeapon({ id: "r" + Math.random(), name: "Wand", ...options });
  }

  function playerOnTop(drop) {
    return new Player(drop.x, drop.y, "Fire", "Wizard");
  }

  describe("compareWeapons", function () {
    it("marks better stats up and worse stats down", function () {
      const rows = compareWeapons(
        melee({ damage: 3, reach: 20, swingFrames: 10 }),
        melee({ damage: 2, reach: 30, swingFrames: 16 })
      );
      const byLabel = {};
      for (const row of rows) {
        byLabel[row.label] = row;
      }
      expect(byLabel.Damage.verdict).toBe("up");
      expect(byLabel.Damage.diff).toBe(1);
      expect(byLabel.Reach.verdict).toBe("down");
      expect(byLabel.Reach.diff).toBe(-10);
      // A lower swing time is better.
      expect(byLabel["Swing time"].verdict).toBe("up");
    });

    it("marks equal stats same", function () {
      const rows = compareWeapons(melee({ damage: 2 }), melee({ damage: 2 }));
      expect(rows.every((row) => row.verdict === "same")).toBe(true);
    });

    it("treats a lower shot delay as better for ranged weapons", function () {
      const rows = compareWeapons(ranged({ fireRate: 10 }), ranged({ fireRate: 20 }));
      const delay = rows.find((row) => row.label === "Shot delay");
      expect(delay.verdict).toBe("up");
      expect(delay.diff).toBe(-10);
    });

    it("shows no verdicts when nothing is equipped", function () {
      const rows = compareWeapons(ranged({ damage: 2 }), null);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.verdict === "none")).toBe(true);
    });

    it("lists a weapon's affix and legendary lines", function () {
      const epic = generateWeapon(createRng(3), { rarity: "epic" });
      expect(weaponEffectLines(epic).length).toBeGreaterThan(0);
      let legendary = null;
      for (let seed = 1; seed <= 100 && legendary === null; seed++) {
        const w = generateWeapon(createRng(seed), { rarity: "legendary" });
        legendary = w;
      }
      const power = getLegendary(legendary.uniqueId).power;
      expect(weaponEffectLines(legendary)[0]).toBe(power);
    });
  });

  describe("swapWeaponDrop", function () {
    let room;
    let player;
    let drop;

    beforeEach(function () {
      room = new TemplateRoom(0, 0, parseRoomTemplate({
        name: "t",
        role: "normal",
        rows: [
          "################",
          "#..............#",
          "#..............#",
          "#..............#",
          "+..............#",
          "+..............#",
          "#..............#",
          "#..............#",
          "#..............#",
          "################"
        ]
      }));
      drop = new ItemDrop(80, 80, melee({ name: "Floor Axe", damage: 4 }));
      room.items.push(drop);
      player = playerOnTop(drop);
    });

    it("finds a weapon drop under the player and ignores other drops", function () {
      expect(findWeaponDropUnderPlayer(player, room)).toBe(drop);
      player.pos.set(200, 100);
      expect(findWeaponDropUnderPlayer(player, room)).toBeNull();
    });

    it("does not pick weapons up just by walking over them", function () {
      expect(pickupItemDrops(player, room)).toEqual([]);
      expect(room.items).toContain(drop);
    });

    it("equips into an empty slot", function () {
      const result = swapWeaponDrop(player, room, drop);
      expect(result.equipped).toBe(drop.item);
      expect(result.dropped).toBeNull();
      expect(player.inventory.getEquipped("melee")).toBe(drop.item);
      expect(room.items.length).toBe(0);
    });

    it("equips the new weapon and drops the old one on the floor", function () {
      const old = melee({ name: "Old Sword", damage: 1 });
      player.inventory.add(old);
      player.inventory.equip(old);
      const result = swapWeaponDrop(player, room, drop);
      expect(result.dropped).toBe(old);
      expect(player.inventory.getEquipped("melee")).toBe(drop.item);
      expect(player.inventory.quantityOf(old)).toBe(0);
      expect(room.items.length).toBe(1);
      expect(room.items[0].item).toBe(old);
    });

    it("uses the ranged slot for projectile weapons", function () {
      const wandDrop = new ItemDrop(80, 80, ranged({ name: "Floor Wand" }));
      room.items = [wandDrop];
      swapWeaponDrop(player, room, wandDrop);
      expect(player.inventory.getEquipped("projectile")).toBe(wandDrop.item);
      expect(player.inventory.getEquipped("melee")).toBeNull();
    });

    it("does nothing for a drop that is no longer in the room", function () {
      room.items = [];
      expect(swapWeaponDrop(player, room, drop)).toBeNull();
      expect(player.inventory.getEquipped("melee")).toBeNull();
    });
  });
});
