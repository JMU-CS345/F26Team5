// Movement, collision, camera and projectiles.
// Shared helpers live in helpers.js.

// ===== from movement.spec.js =====
describe("moveWithCollision", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(32, 64, 160, 160); // floor: x 48-176, y 80-208
  });

  it("moves freely on open floor", function () {
    const p = new Player(100, 100);
    moveWithCollision(p, 2, -3, room);
    expect(p.pos.x).toBe(102);
    expect(p.pos.y).toBe(97);
  });

  it("snaps against the right wall", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 0, room);
    expect(p.pos.x).toBe(160);
  });

  it("snaps against the left wall", function () {
    const p = new Player(49, 100);
    moveWithCollision(p, -2, 0, room);
    expect(p.pos.x).toBe(48);
  });

  it("snaps against the top wall", function () {
    const p = new Player(100, 81);
    moveWithCollision(p, 0, -2, room);
    expect(p.pos.y).toBe(80);
  });

  it("snaps against the bottom wall", function () {
    const p = new Player(100, 191);
    moveWithCollision(p, 0, 2, room);
    expect(p.pos.y).toBe(192);
  });

  it("slides along a wall on diagonal movement", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 2, room);
    expect(p.pos.x).toBe(160);
    expect(p.pos.y).toBe(102);
  });

  it("is not colliding after it snaps", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 0, room);
    expect(room.collidesWithWall(p.getBounds())).toBe(false);
  });

  it("handles non-square entities", function () {
    const e = new Enemy(140, 100);
    e.length = 32;
    e.width = 16;
    moveWithCollision(e, 5, 0, room);
    expect(e.pos.x).toBe(144); // 176 - 32
  });
});


// ===== from collision.spec.js =====
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
    const weapon = new ProjectileWeapon({ id: "wand", name: "Wand" });
    const armor = new ChestArmor({ id: "robe", name: "Robe" });
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


// ===== from camera.spec.js =====
// Specs for Camera: following a target across an area bigger than the screen.
describe("Camera", function () {
  const area = { x: 0, y: 0, width: 2000, height: 1200 };
  let camera;

  beforeEach(function () {
    camera = new Camera(1280, 720); // the screen
  });

  it("centers the screen on the target when it is far from every edge", function () {
    camera.follow(1000, 600, area);
    expect(camera.x).toBe(1000 - 640);
    expect(camera.y).toBe(600 - 360);
  });

  it("stops at the left and top edges of the area", function () {
    camera.follow(100, 50, area);
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
  });

  it("stops at the right and bottom edges, with the area's edge on the screen's edge", function () {
    camera.follow(1950, 1180, area);
    expect(camera.x + 1280).toBe(2000);
    expect(camera.y + 720).toBe(1200);
  });

  it("keeps following on one axis while stopped on the other", function () {
    camera.follow(1000, 20, area);
    expect(camera.x).toBe(360);
    expect(camera.y).toBe(0);
  });

  it("starts scrolling again as soon as the target passes the middle of the screen", function () {
    camera.follow(640, 360, area);
    expect(camera.x).toBe(0);
    camera.follow(641, 360, area);
    expect(camera.x).toBe(1);
  });

  it("respects an area that does not start at 0, 0", function () {
    const shifted = { x: 500, y: 300, width: 2000, height: 1200 };
    camera.follow(0, 0, shifted);
    expect(camera.x).toBe(500);
    expect(camera.y).toBe(300);
    camera.follow(9999, 9999, shifted);
    expect(camera.x).toBe(500 + 2000 - 1280);
    expect(camera.y).toBe(300 + 1200 - 720);
  });

  it("centers an area that is smaller than the screen instead of scrolling", function () {
    const small = { x: 320, y: 160, width: 640, height: 400 };
    camera.follow(330, 170, small);
    expect(camera.x).toBe(320 + (640 - 1280) / 2); // 0: the area is already in the middle
    expect(camera.y).toBe(160 + (400 - 720) / 2);
  });

  it("scrolls on one axis when the area is only wider than the screen", function () {
    const wide = { x: 0, y: 0, width: 3000, height: 400 };
    camera.follow(1500, 100, wide);
    expect(camera.x).toBe(860);
    expect(camera.y).toBe(-160);
  });

  it("only ever lands on whole pixels", function () {
    camera.follow(1000.4, 600.6, area);
    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
  });

  it("goes back to the top-left of the screen on reset", function () {
    camera.follow(1000, 600, area);
    camera.reset();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
  });
});


// ===== from projectile.spec.js =====
describe("Projectile", function () {
  const room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144
  const right = new p5.Vector(1, 0);
  const left = new p5.Vector(-1, 0);
  const up = new p5.Vector(0, -1);
  const down = new p5.Vector(0, 1);

  it("is centered on the point it spawns at", function () {
    const p = new Projectile(50, 60, right);
    expect(p.pos.x).toBe(50 - p.length / 2);
    expect(p.pos.y).toBe(60 - p.width / 2);
    expect(p.alive).toBe(true);
  });

  it("travels at PROJECTILE_SPEED no matter how long the direction vector is", function () {
    const p = new Projectile(50, 50, new p5.Vector(10, 0));
    expect(p.vel.mag()).toBeCloseTo(PROJECTILE_SPEED, 5);
    expect(p.vel.x).toBeGreaterThan(0);
  });

  it("moves by its velocity each update", function () {
    const p = new Projectile(50, 50, right);
    const startX = p.pos.x;
    const startY = p.pos.y;
    p.update(room);
    expect(p.pos.x).toBeCloseTo(startX + PROJECTILE_SPEED, 5);
    expect(p.pos.y).toBeCloseTo(startY, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 0);
    new Projectile(50, 50, dir);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(0);
  });

  it("reports its bounds as position plus length and width", function () {
    const p = new Projectile(50, 50, right);
    expect(p.getBounds()).toEqual({
      x: p.pos.x,
      y: p.pos.y,
      w: p.length,
      h: p.width
    });
  });

  it("stays alive on open floor", function () {
    const p = new Projectile(80, 80, right);
    p.update(room);
    expect(p.alive).toBe(true);
  });

  it("stays alive when it stops just short of a wall", function () {
    const nearMisses = [
      new Projectile(25, 80, left),
      new Projectile(135, 80, right),
      new Projectile(80, 25, up),
      new Projectile(80, 135, down)
    ];
    for (const p of nearMisses) {
      p.update(room);
      expect(p.alive).toBe(true);
    }
  });

  it("dies when it hits any of the four walls", function () {
    const hits = [
      new Projectile(24, 80, left),
      new Projectile(136, 80, right),
      new Projectile(80, 24, up),
      new Projectile(80, 136, down)
    ];
    for (const p of hits) {
      p.update(room);
      expect(p.alive).toBe(false);
    }
  });

  it("dies if it ends up outside the room", function () {
    const p = new Projectile(-100, 80, left);
    p.update(room);
    expect(p.alive).toBe(false);
  });
});

describe("Projectile speed", function () {
  it("moves at PROJECTILE_SPEED by default", function () {
    const p = new Projectile(50, 50, new p5.Vector(1, 0));
    expect(p.vel.mag()).toBeCloseTo(PROJECTILE_SPEED, 5);
  });

  it("moves at a given speed", function () {
    const p = new Projectile(50, 50, new p5.Vector(0, 1), 2, 3);
    expect(p.vel.mag()).toBeCloseTo(3, 5);
    expect(p.vel.y).toBeCloseTo(3, 5);
    expect(p.damage).toBe(2);
  });

  it("keeps a given damage with the default speed", function () {
    const p = new Projectile(50, 50, new p5.Vector(1, 0), 4);
    expect(p.damage).toBe(4);
    expect(p.vel.mag()).toBeCloseTo(PROJECTILE_SPEED, 5);
  });
});

describe("Projectile and pits", function () {
  it("flies over a pit instead of disappearing, and still stops at a wall", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    room.setTile(5, 5, TILE.PIT); // pixels 80 to 95
    const p = new Projectile(40, 88, new p5.Vector(1, 0));
    let crossed = false;
    for (let i = 0; i < 200 && p.alive; i++) {
      p.update(room);
      if (p.alive && p.pos.x > 100) {
        crossed = true; // past the pit and still flying
      }
    }
    expect(crossed).toBe(true);
    expect(p.alive).toBe(false); // the wall at the far side of the room
  });
});
