// Player: movement and combat stats, stat upgrades and appearance.
// Shared helpers live in helpers.js.

// ===== from player.spec.js =====
describe("Player movement", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144
    player = new Player(50, 50);
  });

  it("moves in the direction it is given", function () {
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(50 + player.speed);
    expect(player.pos.y).toBe(50);
    player.move(new p5.Vector(0, 1), room);
    expect(player.pos.y).toBe(50 + player.speed);
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(50);
    player.move(new p5.Vector(0, -1), room);
    expect(player.pos.y).toBe(50);
  });

  it("does not move with no direction", function () {
    player.move(new p5.Vector(0, 0), room);
    expect(player.pos.x).toBe(50);
    expect(player.pos.y).toBe(50);
  });

  it("moves diagonals at the same speed as straight lines", function () {
    player.move(new p5.Vector(1, 1), room);
    const distance = Math.hypot(player.pos.x - 50, player.pos.y - 50);
    expect(distance).toBeCloseTo(player.speed, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 1);
    player.move(dir, room);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(1);
  });

  it("stops perfectly against every wall when keys keep pushing", function () {
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(room.x + room.tileSize);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, -1), room);
    expect(player.pos.y).toBe(room.y + room.tileSize);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(room.x + room.width - room.tileSize - player.length);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, 1), room);
    expect(player.pos.y).toBe(room.y + room.height - room.tileSize - player.width);
  });

  it("slides along a wall when moving diagonally into it", function () {
    player.pos.set(128, 50);          // already squished against the right wall
    player.move(new p5.Vector(1, 1), room);
    expect(player.pos.x).toBe(128);   // blocked on x
    expect(player.pos.y).toBeGreaterThan(50); // still free on y
  });

  it("reports its bounds as position plus length and width", function () {
    expect(player.getBounds()).toEqual({
      x: 50,
      y: 50,
      w: player.length,
      h: player.width
    });
  });

  it("reports its center", function () {
    const p = new Player(10, 20);
    expect(p.getCenter().x).toBe(10 + p.length / 2);
    expect(p.getCenter().y).toBe(20 + p.width / 2);
  });

  it("owns an independent player inventory", function () {
    const other = new Player(60, 60);
    expect(player.inventory instanceof PlayerInventory).toBe(true);
    expect(other.inventory).not.toBe(player.inventory);
  });
});

describe("getMoveDirection", function () {
  // 87 W, 65 A, 83 S, 68 D, 40 down arrow, 39 right arrow
  const held = (...codes) => (code) => codes.includes(code);

  it("maps WASD", function () {
    expect(getMoveDirection(held(87))).toEqual(new p5.Vector(0, -1));
    expect(getMoveDirection(held(83))).toEqual(new p5.Vector(0, 1));
    expect(getMoveDirection(held(65))).toEqual(new p5.Vector(-1, 0));
    expect(getMoveDirection(held(68))).toEqual(new p5.Vector(1, 0));
  });

  it("ignores the arrow keys, which fire instead", function () {
    expect(getMoveDirection(held(37)).magSq()).toBe(0);
    expect(getMoveDirection(held(38)).magSq()).toBe(0);
    expect(getMoveDirection(held(39)).magSq()).toBe(0);
    expect(getMoveDirection(held(40)).magSq()).toBe(0);
  });

  it("cancels opposite keys and combines diagonals", function () {
    expect(getMoveDirection(held(65, 68)).magSq()).toBe(0);
    expect(getMoveDirection(held(87, 68))).toEqual(new p5.Vector(1, -1));
  });

  it("returns no movement when nothing is held", function () {
    expect(getMoveDirection(held()).magSq()).toBe(0);
  });
});

describe("Player animation state", () => {
  const room = new NormalRoom(0, 0, 640, 400);
  const right = new p5.Vector(1, 0);
  const none = new p5.Vector(0, 0);
  let player;
  beforeEach(() => {
    player = new Player(100, 100, "Fire");
  });

  it("faces the direction it moves", () => {
    player.move(right, room);
    expect(player.facing).toBe("right");
    player.move(new p5.Vector(0, -1), room);
    expect(player.facing).toBe("up");
  });

  it("counts walk frames while moving and resets when standing still", () => {
    player.move(right, room);
    player.move(right, room);
    expect(player.walkFrames).toBe(2);
    player.move(none, room);
    expect(player.walkFrames).toBe(0);
  });

  it("faces the fire direction and holds the weapon while a fire key is held", () => {
    player.fire(right);
    expect(player.holding).toBe(true);
    expect(player.isArmUp()).toBe(true);
    expect(player.facing).toBe("right");
  });

  it("keeps the arm up for the cooldown after a quick tap", () => {
    shootTap(player, right); // tap and release
    expect(player.holding).toBe(false);
    expect(player.isArmUp()).toBe(true);
    for (let i = 0; i < player.getRangedWeapon().cooldown; i++) {
      player.update();
    }
    expect(player.isArmUp()).toBe(false);
  });

  it("keeps facing the shot direction while moving during the cooldown", () => {
    shootTap(player, right);
    player.move(new p5.Vector(0, 1), room);
    expect(player.facing).toBe("right");
  });

  it("does not turn toward another fire key during the cooldown", () => {
    const up = new p5.Vector(0, -1);
    shootTap(player, right);
    expect(player.fire(up)).toBeNull(); // still cooling down
    expect(player.facing).toBe("right");
    for (let i = 0; i < player.getRangedWeapon().cooldown; i++) {
      player.update();
    }
    expect(player.fire(up)).not.toBeNull(); // the waiting press shoots once the cooldown is over
    expect(player.facing).toBe("up");
  });
});

describe("getFireDirection", function () {
  // 38 up, 40 down, 37 left, 39 right; 87 W, 65 A, 83 S, 68 D
  const held = (...codes) => (code) => codes.includes(code);

  it("maps each arrow key to a cardinal direction", function () {
    expect(getFireDirection(held(38))).toEqual(new p5.Vector(0, -1));
    expect(getFireDirection(held(40))).toEqual(new p5.Vector(0, 1));
    expect(getFireDirection(held(37))).toEqual(new p5.Vector(-1, 0));
    expect(getFireDirection(held(39))).toEqual(new p5.Vector(1, 0));
  });

  it("returns no direction when no arrow is held", function () {
    expect(getFireDirection(held()).magSq()).toBe(0);
  });

  it("ignores WASD, which move instead", function () {
    expect(getFireDirection(held(87, 65, 83, 68)).magSq()).toBe(0);
  });

  it("never fires diagonally, even with several arrows held", function () {
    const combos = [[38, 39], [38, 37], [40, 39], [40, 37], [38, 40], [37, 39], [37, 38, 39, 40]];
    for (const combo of combos) {
      const dir = getFireDirection(held(...combo));
      expect(dir.x * dir.y).toBe(0);
      expect(dir.magSq()).toBe(1);
    }
  });
});

describe("Player firing", function () {
  const up = new p5.Vector(0, -1);
  let player;

  beforeEach(function () {
    player = new Player(50, 50);
  });

  it("fires a projectile from the center of the player", function () {
    const proj = player.fire(up);
    expect(proj).toBeInstanceOf(Projectile);
    const centerX = proj.pos.x + proj.length / 2;
    const centerY = proj.pos.y + proj.width / 2;
    expect(centerX).toBe(50 + player.length / 2);
    expect(centerY).toBe(50 + player.width / 2);
  });

  it("fires in the direction it is given", function () {
    const proj = player.fire(new p5.Vector(1, 0));
    expect(proj.vel.x).toBeGreaterThan(0);
    expect(proj.vel.y).toBeCloseTo(0, 5);
  });

  it("does not fire with no direction", function () {
    expect(player.fire(new p5.Vector(0, 0))).toBeNull();
    expect(player.fireCooldown).toBe(0);
  });

  it("cannot fire again until the cooldown is over", function () {
    expect(player.fire(up)).not.toBeNull();
    expect(player.fire(up)).toBeNull();
    for (let i = 0; i < FIRE_COOLDOWN - 1; i++) player.update();
    expect(player.fire(up)).toBeNull();
    player.update();
    expect(player.fire(up)).not.toBeNull();
  });

  it("does not let the cooldown go below zero", function () {
    for (let i = 0; i < 5; i++) player.update();
    expect(player.fireCooldown).toBe(0);
  });

  it("cannot fire once dead", function () {
    player.takeDamage(player.maxHealth);
    expect(player.fire(up)).toBeNull();
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(0, -1);
    player.fire(dir);
    expect(dir.x).toBe(0);
    expect(dir.y).toBe(-1);
  });
});

describe("Player health and death", function () {
  let player;

  beforeEach(function () {
    player = new Player(50, 50);
  });

  function playDeathAnimation() {
    for (let i = 0; i < DEATH_FRAMES; i++) player.update();
  }

  it("starts at full health, alive", function () {
    expect(player.health).toBe(player.maxHealth);
    expect(player.isDead()).toBe(false);
  });

  it("loses health when damaged", function () {
    player.takeDamage(2);
    expect(player.health).toBe(player.maxHealth - 2);
    expect(player.isDead()).toBe(false);
  });

  it("dies at exactly 0 health and never goes negative", function () {
    player.takeDamage(player.maxHealth + 10);
    expect(player.health).toBe(0);
    expect(player.isDead()).toBe(true);
  });

  it("does not show the death screen while alive", function () {
    playDeathAnimation();
    expect(player.deathFrames).toBe(0);
    expect(player.showDeathScreen()).toBe(false);
  });

  it("plays the death animation before showing the death screen", function () {
    player.takeDamage(player.maxHealth);
    expect(player.showDeathScreen()).toBe(false);
    player.update();
    expect(player.showDeathScreen()).toBe(false);
    playDeathAnimation();
    expect(player.showDeathScreen()).toBe(true);
  });

  it("cannot move once dead", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    player.takeDamage(player.maxHealth);
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(50);
  });

  it("a new Player (restart) has full health and no death state", function () {
    player.takeDamage(player.maxHealth);
    playDeathAnimation();
    const fresh = new Player(50, 50);
    expect(fresh.isDead()).toBe(false);
    expect(fresh.showDeathScreen()).toBe(false);
  });
});

describe("Player falling into pits", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160);
    room.setTile(4, 4, TILE.PIT); // pixels 64 to 79
    player = new Player(64, 64); // standing right over it
  });

  it("falls and loses health when the middle of the player is over a pit", function () {
    const before = player.health;
    player.update(room);
    expect(player.isFalling()).toBe(true);
    expect(player.health).toBe(before - PIT_FALL_DAMAGE);
  });

  it("does not fall when only the edge of the player is over a pit", function () {
    player.pos.set(50, 64); // the middle is on floor
    player.update(room);
    expect(player.isFalling()).toBe(false);
  });

  it("walks into a pit without being stopped, and falls", function () {
    player.pos.set(40, 64);
    for (let i = 0; i < 30 && !player.isFalling(); i++) {
      player.move(new p5.Vector(1, 0), room);
      player.update(room);
    }
    expect(player.isFalling()).toBe(true);
  });

  it("falls when a shove carries it over a pit", function () {
    player.pos.set(50, 64);
    player.takeDamage(1, new p5.Vector(1, 0));
    for (let i = 0; i < 12; i++) {
      player.update(room);
    }
    expect(player.isFalling()).toBe(true);
  });

  it("cannot walk or shoot while falling", function () {
    player.update(room);
    const x = player.pos.x;
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(x);
    expect(player.fire(new p5.Vector(1, 0))).toBeNull();
  });

  it("cannot be hurt while falling", function () {
    player.update(room);
    const enemy = new Enemy(64, 64, "Jelly");
    enemy.spawnTimer = 0;
    enemy.wakeTimer = 0;
    const health = player.health;
    expect(enemy.damagePlayer(player)).toBe(false);
    expect(player.health).toBe(health);
  });

  it("finishes falling after PLAYER_FALL_FRAMES and respawns where it is told", function () {
    player.update(room);
    expect(player.hasFinishedFalling()).toBe(false);
    for (let i = 0; i < PLAYER_FALL_FRAMES; i++) {
      player.update(room);
    }
    expect(player.hasFinishedFalling()).toBe(true);
    const health = player.health;
    player.respawnAt(100, 120);
    expect(player.isFalling()).toBe(false);
    expect(player.getCenter().x).toBe(100);
    expect(player.getCenter().y).toBe(120);
    expect(player.health).toBe(health); // the damage is not undone
  });

  it("dies if the fall takes the last of its health", function () {
    player.health = PIT_FALL_DAMAGE;
    player.update(room);
    expect(player.isDead()).toBe(true);
  });
});


// ===== from player-stats.spec.js =====
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


// ===== from appearance.spec.js =====
// Specs for character appearance customization (#23).

describe("Appearance", function () {
  it("has body, eyes, shirt and pants, and no hair", function () {
    expect(APPEARANCE_PARTS).toEqual(["body", "eyes", "shirt", "pants"]);
    expect(APPEARANCE_PARTS).not.toContain("hair");
  });

  it("uses a valid hex color for every default", function () {
    for (const part of APPEARANCE_PARTS) {
      expect(isValidHex(DEFAULT_APPEARANCE[part])).toBe(true);
    }
  });

  it("accepts hex codes with or without #, in any case, and 3 or 6 digits", function () {
    expect(normalizeHex("#F1C299")).toBe("#f1c299");
    expect(normalizeHex("f1c299")).toBe("#f1c299");
    expect(normalizeHex("  #fc9 ")).toBe("#ffcc99");
  });

  it("rejects things that are not hex colors", function () {
    for (const bad of ["", "#", "#12345", "#1234567", "#gg0000", "red", null, undefined, 123]) {
      expect(normalizeHex(bad)).toBeNull();
      expect(isValidHex(bad)).toBe(false);
    }
  });

  it("converts hex to RGB", function () {
    expect(hexToRgb("#f1c299")).toEqual([241, 194, 153]);
    expect(hexToRgb("nope")).toBeNull();
  });

  it("keeps valid colors and fills in anything missing or invalid", function () {
    const look = makeAppearance({ body: "#603020", eyes: "rainbow", hair: "#ffffff" });
    expect(look.body).toBe("#603020");
    expect(look.eyes).toBe(DEFAULT_APPEARANCE.eyes);
    expect(look.shirt).toBe(DEFAULT_APPEARANCE.shirt);
    expect(look.pants).toBe(DEFAULT_APPEARANCE.pants);
    expect(Object.keys(look).sort()).toEqual([...APPEARANCE_PARTS].sort());
  });

  it("cleans up colors when making an appearance", function () {
    expect(makeAppearance({ shirt: "F00" }).shirt).toBe("#ff0000");
  });

  it("sets one part to a new color", function () {
    const look = setAppearanceColor(makeAppearance(), "shirt", "#FF0000");
    expect(look.shirt).toBe("#ff0000");
    expect(look.pants).toBe(DEFAULT_APPEARANCE.pants);
  });

  it("ignores invalid colors and unknown parts when setting a color", function () {
    const look = makeAppearance();
    expect(setAppearanceColor(look, "shirt", "#12")).toEqual(look);
    expect(setAppearanceColor(look, "hair", "#ffffff")).toEqual(look);
  });

  it("does not change the original appearance when setting a color", function () {
    const look = makeAppearance();
    setAppearanceColor(look, "body", "#000000");
    expect(look.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("gives an RGB color for each part", function () {
    for (const part of APPEARANCE_PARTS) {
      expect(getAppearanceColor(makeAppearance(), part).length).toBe(3);
    }
    expect(getAppearanceColor(makeAppearance({ eyes: "#0a141e" }), "eyes")).toEqual([10, 20, 30]);
  });

  it("draws the layers pants, then shirt, then eyes", function () {
    expect(APPEARANCE_LAYER_ORDER).toEqual(["pants", "shirt", "eyes"]);
  });

  it("has an eyes, shirt and pants layer image for every player model", function () {
    for (const name of PLAYER_MODEL_NAMES) {
      const layers = PLAYER_ART[name].layerSheets;
      expect(Object.keys(layers).sort()).toEqual(["eyes", "pants", "shirt"]);
      for (const layer of APPEARANCE_LAYER_ORDER) {
        expect(layers[layer]).toContain(PLAYER_ART[name].spriteW + "x" + PLAYER_ART[name].spriteH);
      }
    }
  });
});

describe("Customization in the character creator", function () {
  function gameAtCustomize(mageClass = "Fire") {
    const game = new Game();
    game.selectModel("Tall");
    game.selectClass(mageClass);
    return game;
  }

  it("comes after the class menu", function () {
    const game = gameAtCustomize();
    expect(game.isCustomizing()).toBe(true);
    expect(game.isPlaying()).toBe(false);
  });

  it("lets the player pick a color for all four parts", function () {
    const game = gameAtCustomize();
    for (const part of APPEARANCE_PARTS) {
      expect(game.changeAppearance(part, "#123456")).toBe(true);
      expect(game.appearance[part]).toBe("#123456");
    }
  });

  it("accepts a typed hex code in any form and stores it as #rrggbb", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("eyes", "FC9")).toBe(true);
    expect(game.appearance.eyes).toBe("#ffcc99");
  });

  it("ignores a color that is not valid hex", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("shirt", "#12")).toBe(false);
    expect(game.appearance.shirt).toBe(DEFAULT_APPEARANCE.shirt);
  });

  it("only changes the look on the customization screen", function () {
    const game = new Game();
    expect(game.changeAppearance("body", "#000000")).toBe(false);
    game.selectModel("Tall");
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.changeAppearance("body", "#000000")).toBe(false);
    expect(game.appearance.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("ignores unknown parts", function () {
    const game = gameAtCustomize();
    expect(game.changeAppearance("hair", "#ffffff")).toBe(false);
  });

  it("cannot finish customization from another screen", function () {
    expect(new Game().finishCustomization()).toBe(false);
  });

  it("saves the chosen look on the player", function () {
    const game = gameAtCustomize();
    game.changeAppearance("eyes", "#00ff00");
    game.changeAppearance("shirt", "#ff00ff");
    game.finishCustomization();
    const player = new Player(0, 0, game.selectedClass, game.selectedModel, game.appearance);
    expect(player.appearance).toEqual(game.appearance);
  });

  it("gives the player their own copy of the look", function () {
    const game = gameAtCustomize();
    const player = new Player(0, 0, "Fire", "Tall", game.appearance);
    player.appearance.body = "#000000";
    expect(game.appearance.body).toBe(DEFAULT_APPEARANCE.body);
  });

  it("uses the default look when none is given", function () {
    expect(new Player(0, 0).appearance).toEqual(makeAppearance());
  });

  it("does not change stats (cosmetic only)", function () {
    for (const mageClass of MAGE_CLASSES) {
      const plain = new Player(0, 0, mageClass, "Tall");
      const styled = new Player(0, 0, mageClass, "Tall", {
        body: "#603020", eyes: "#dc2828", shirt: "#787882", pants: "#101010"
      });
      expect(styled.stats).toEqual(plain.stats);
      expect(styled.speed).toBe(plain.speed);
      expect(styled.maxHealth).toBe(plain.maxHealth);
    }
  });

  it("keeps the look for the next run, on any model", function () {
    const game = gameAtCustomize();
    game.changeAppearance("pants", "#abcdef");
    const look = { ...game.appearance };
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    game.selectModel("Short");
    game.selectClass("Mind");
    expect(game.appearance).toEqual(look);
  });
});

describe("getCustomizeAction", function () {
  it("maps W and S to moving between the parts of the look, in either case", function () {
    expect(getCustomizeAction("w")).toEqual({ type: "row", step: -1 });
    expect(getCustomizeAction("W")).toEqual({ type: "row", step: -1 });
    expect(getCustomizeAction("s")).toEqual({ type: "row", step: 1 });
    expect(getCustomizeAction("S")).toEqual({ type: "row", step: 1 });
  });

  it("maps A and D to stepping the highlighted part through its colors", function () {
    expect(getCustomizeAction("a")).toEqual({ type: "color", step: -1 });
    expect(getCustomizeAction("A")).toEqual({ type: "color", step: -1 });
    expect(getCustomizeAction("d")).toEqual({ type: "color", step: 1 });
    expect(getCustomizeAction("D")).toEqual({ type: "color", step: 1 });
  });

  it("maps Enter and Space to done", function () {
    expect(getCustomizeAction("Enter")).toEqual({ type: "done" });
    expect(getCustomizeAction("enter")).toEqual({ type: "done" });
    expect(getCustomizeAction(" ")).toEqual({ type: "done" });
  });

  it("maps H to typing a hex code, in either case", function () {
    expect(getCustomizeAction("h")).toEqual({ type: "hex" });
    expect(getCustomizeAction("H")).toEqual({ type: "hex" });
  });

  it("ignores the number keys, the arrow keys and every other key", function () {
    for (const key of ["ArrowUp", "ArrowLeft", "x", "1", "3", "#", "Tab", ""]) {
      expect(getCustomizeAction(key)).toBeNull();
    }
  });
});

describe("getHexEntryAction", function () {
  it("types the hex digits 0-9 and A-F in lower case, whatever the case pressed", function () {
    for (const digit of "0123456789abcdef") {
      expect(getHexEntryAction(digit)).toEqual({ type: "digit", digit });
      expect(getHexEntryAction(digit.toUpperCase())).toEqual({ type: "digit", digit });
    }
  });

  it("maps Backspace, Enter and Escape", function () {
    expect(getHexEntryAction("Backspace")).toEqual({ type: "backspace" });
    expect(getHexEntryAction("Enter")).toEqual({ type: "apply" });
    expect(getHexEntryAction("Escape")).toEqual({ type: "cancel" });
  });

  it("ignores W, S and every other key, since A and D are digits", function () {
    for (const key of ["w", "s", "g", "z", "h", "#", " ", "ArrowLeft", "Tab", "10", ""]) {
      expect(getHexEntryAction(key)).toBeNull();
    }
  });
});

describe("Appearance palettes", function () {
  it("has a palette for every part, with the default color in it and no repeats", function () {
    for (const part of APPEARANCE_PARTS) {
      const palette = APPEARANCE_PALETTES[part];
      expect(palette.length).toBeGreaterThan(1);
      expect(palette).toContain(DEFAULT_APPEARANCE[part]);
      expect(new Set(palette).size).toBe(palette.length);
      for (const hex of palette) {
        expect(isValidHex(hex)).toBe(true);
        expect(normalizeHex(hex)).toBe(hex); // already tidy, so a swatch matches its stored color
      }
    }
  });

  it("is the 55 colors of the NES palette, in the order of the palette image, for every part", function () {
    expect(NES_PALETTE.length).toBe(55);
    expect(NES_PALETTE[0]).toBe("#000000");
    expect(NES_PALETTE[5]).toBe("#a4e4fc");
    expect(NES_PALETTE[54]).toBe("#787878");
    for (const part of APPEARANCE_PARTS) {
      expect(APPEARANCE_PALETTES[part]).toBe(NES_PALETTE);
    }
  });

  it("finds where a part's color is in its palette", function () {
    const look = makeAppearance();
    for (const part of APPEARANCE_PARTS) {
      expect(getPaletteIndex(look, part)).toBe(APPEARANCE_PALETTES[part].indexOf(DEFAULT_APPEARANCE[part]));
    }
    expect(getPaletteIndex(makeAppearance({ eyes: "#010203" }), "eyes")).toBe(-1);
    expect(getPaletteIndex(look, "nose")).toBe(-1);
  });

  it("steps to the next and previous color, wrapping round at both ends", function () {
    for (const part of APPEARANCE_PARTS) {
      const palette = APPEARANCE_PALETTES[part];
      let look = setAppearanceColor(makeAppearance(), part, palette[0]);
      look = cyclePaletteColor(look, part, -1);
      expect(look[part]).toBe(palette[palette.length - 1]);
      look = cyclePaletteColor(look, part, 1);
      expect(look[part]).toBe(palette[0]);
      look = cyclePaletteColor(look, part, 1);
      expect(look[part]).toBe(palette[1]);
    }
  });

  it("only changes the one part, and returns a new appearance", function () {
    const before = makeAppearance();
    const after = cyclePaletteColor(before, "shirt", 1);
    expect(after).not.toBe(before);
    expect(after.shirt).not.toBe(before.shirt);
    for (const part of ["body", "eyes", "pants"]) {
      expect(after[part]).toBe(before[part]);
    }
    expect(before.shirt).toBe(DEFAULT_APPEARANCE.shirt);
  });

  it("goes to the first color going right and the last going left from a color not in the palette", function () {
    const odd = makeAppearance({ pants: "#010203" });
    expect(cyclePaletteColor(odd, "pants", 1).pants).toBe(APPEARANCE_PALETTES.pants[0]);
    expect(cyclePaletteColor(odd, "pants", -1).pants).toBe(APPEARANCE_PALETTES.pants[APPEARANCE_PALETTES.pants.length - 1]);
  });

  it("leaves the appearance alone for an unknown part", function () {
    expect(cyclePaletteColor(makeAppearance(), "nose", 1)).toEqual(makeAppearance());
  });
});

describe("Palette window", function () {
  it("is the colors around the current one, with the current one in the middle", function () {
    const look = setAppearanceColor(makeAppearance(), "shirt", NES_PALETTE[10]);
    const window = getPaletteWindow(look, "shirt", 5);
    expect(window.length).toBe(11);
    expect(window.map((item) => item.offset)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(window.map((item) => item.hex)).toEqual(NES_PALETTE.slice(5, 16));
    expect(window[5].custom).toBe(false);
  });

  it("wraps round the palette at both ends", function () {
    const first = getPaletteWindow(setAppearanceColor(makeAppearance(), "body", NES_PALETTE[0]), "body", 3);
    expect(first.map((item) => item.hex)).toEqual([
      NES_PALETTE[52], NES_PALETTE[53], NES_PALETTE[54], NES_PALETTE[0], NES_PALETTE[1], NES_PALETTE[2], NES_PALETTE[3]
    ]);
    const last = getPaletteWindow(setAppearanceColor(makeAppearance(), "body", NES_PALETTE[54]), "body", 2);
    expect(last.map((item) => item.hex)).toEqual([NES_PALETTE[52], NES_PALETTE[53], NES_PALETTE[54], NES_PALETTE[0], NES_PALETTE[1]]);
  });

  it("puts a typed color that is not in the palette in the middle, marked custom", function () {
    const look = setAppearanceColor(makeAppearance(), "eyes", "#123456");
    const window = getPaletteWindow(look, "eyes", 2);
    expect(window[2]).toEqual({ hex: "#123456", offset: 0, custom: true });
    expect(window.filter((item) => item.custom).length).toBe(1);
  });

  it("shows what A and D would go to next, even from a typed color", function () {
    const look = setAppearanceColor(makeAppearance(), "pants", "#123456");
    const window = getPaletteWindow(look, "pants", 1);
    expect(window[0].hex).toBe(cyclePaletteColor(look, "pants", -1).pants); // left is the last color
    expect(window[2].hex).toBe(cyclePaletteColor(look, "pants", 1).pants); // right is the first
    const inPalette = getPaletteWindow(makeAppearance(), "pants", 1);
    expect(inPalette[0].hex).toBe(cyclePaletteColor(makeAppearance(), "pants", -1).pants);
    expect(inPalette[2].hex).toBe(cyclePaletteColor(makeAppearance(), "pants", 1).pants);
  });
});
