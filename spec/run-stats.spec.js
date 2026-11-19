describe("RunStats", function () {
  let stats;

  beforeEach(function () {
    stats = new RunStats();
  });

  it("starts at zero with no best item", function () {
    expect(stats.roomsCleared).toBe(0);
    expect(stats.enemiesKilled).toBe(0);
    expect(stats.bestItem).toBeNull();
    expect(stats.bestItemName()).toBe("None");
  });

  it("counts kills", function () {
    stats.recordKill();
    stats.recordKill();
    expect(stats.enemiesKilled).toBe(2);
  });

  it("counts cleared rooms", function () {
    stats.recordRoomCleared();
    expect(stats.roomsCleared).toBe(1);
  });

  it("keeps the best item picked up", function () {
    const stick = new ProjectileWeapon({ id: "stick", name: "Stick", damage: 1 });
    const wand = new ProjectileWeapon({ id: "wand", name: "Wand", damage: 4 });
    const robe = new ChestArmor({ id: "robe", name: "Robe", defense: 2 });
    stats.recordPickup(wand);
    stats.recordPickup(stick);
    stats.recordPickup(robe);
    expect(stats.bestItem).toBe(wand);
    expect(stats.bestItemName()).toBe("Wand");
  });

  it("uses item value too", function () {
    const gem = new Item({ id: "gem", name: "Gem", value: 50 });
    stats.recordPickup(new ProjectileWeapon({ id: "wand", name: "Wand", damage: 4 }));
    stats.recordPickup(gem);
    expect(stats.bestItem).toBe(gem);
  });

  it("does not count gold as an item", function () {
    stats.recordPickup(new Gold());
    expect(stats.bestItem).toBeNull();
  });

  it("resets for a new run", function () {
    stats.recordKill();
    stats.recordRoomCleared();
    stats.recordPickup(new Item({ id: "gem", name: "Gem", value: 5 }));
    stats.reset();
    expect(stats.enemiesKilled).toBe(0);
    expect(stats.roomsCleared).toBe(0);
    expect(stats.bestItem).toBeNull();
  });
});
