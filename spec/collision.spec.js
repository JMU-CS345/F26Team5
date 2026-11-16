describe("rectsOverlap", function () {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  it("is true for overlapping rects", function () {
    expect(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("is true when one rect contains the other", function () {
    expect(rectsOverlap(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
  });
  it("is false when rects only touch edges", function () {
    expect(rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
  it("is false when separated", function () {
    expect(rectsOverlap(a, { x: 50, y: 50, w: 10, h: 10 })).toBe(false);
  });
});

describe("projectileHitsPlayer", function () {
  let player;

  beforeEach(function () {
    player = new Player(100, 100);
  });

  it("hurts the player and uses up the projectile on a hit", function () {
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0), 2);
    expect(projectileHitsPlayer(shot, player)).toBe(true);
    expect(player.health).toBe(player.maxHealth - 2);
    expect(shot.alive).toBe(false);
  });

  it("does nothing on a miss", function () {
    const shot = new Projectile(10, 10, new p5.Vector(1, 0));
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(player.health).toBe(player.maxHealth);
    expect(shot.alive).toBe(true);
  });

  it("hits only once", function () {
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
    projectileHitsPlayer(shot, player);
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(player.health).toBe(player.maxHealth - 1);
  });

  it("does not hurt a dead player", function () {
    player.takeDamage(player.maxHealth);
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(shot.alive).toBe(true);
  });
});

describe("pickupItemDrops", function () {
  let player;
  let room;

  beforeEach(function () {
    player = new Player(50, 50);
    room = new NormalRoom(0, 0, 160, 160);
  });

  it("collects one of each supported item type on contact", function () {
    const weapon = new Weapon({ id: "wand", name: "Wand" });
    const armor = new Armor({ id: "robe", name: "Robe" });
    const potion = new Consumable({ id: "potion", name: "Potion" });
    room.items = [
      new ItemDrop(52, 52, weapon),
      new ItemDrop(52, 52, armor),
      new ItemDrop(52, 52, potion, 2),
      new ItemDrop(52, 52, new Gold(), 10)
    ];

    const collected = pickupItemDrops(player, room);

    expect(collected.length).toBe(4);
    expect(room.items.length).toBe(0);
    expect(player.inventory.quantityOf(weapon)).toBe(1);
    expect(player.inventory.quantityOf(armor)).toBe(1);
    expect(player.inventory.quantityOf("potion")).toBe(2);
    expect(player.inventory.gold).toBe(10);
  });

  it("leaves drops that do not overlap the player", function () {
    const drop = new ItemDrop(100, 100, new Gold(), 10);
    room.items = [drop];

    expect(pickupItemDrops(player, room)).toEqual([]);
    expect(room.items).toEqual([drop]);
    expect(player.inventory.gold).toBe(0);
  });

  it("leaves a drop in place when the inventory cannot accept it", function () {
    const drop = new ItemDrop(
      52,
      52,
      new Consumable({ id: "potion", name: "Potion" })
    );
    player.inventory = new PlayerInventory(0);
    room.items = [drop];

    expect(pickupItemDrops(player, room)).toEqual([]);
    expect(room.items).toEqual([drop]);
    expect(player.inventory.quantityOf("potion")).toBe(0);
  });
});
