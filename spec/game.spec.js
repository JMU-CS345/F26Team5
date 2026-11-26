// Game state, game flow and runs.
// Shared helpers live in helpers.js.

// ===== from game.spec.js =====
describe("Game state", function () {
  let game;

  // A game that has already picked a model, so it is on the class menu.
  function gameAtClassMenu() {
    const g = new Game();
    g.selectModel("Tall");
    return g;
  }

  beforeEach(function () {
    game = gameAtClassMenu();
  });

  it("is on the class menu with no class chosen once a model is picked", function () {
    expect(game.state).toBe(GAME_STATES.MENU);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("offers Fire, Ice and Mind as the classes", function () {
    expect(MAGE_CLASSES).toEqual(["Fire", "Ice", "Mind"]);
  });

  it("saves the chosen class and moves on to customization", function () {
    for (const mageClass of MAGE_CLASSES) {
      const fresh = gameAtClassMenu();
      expect(fresh.selectClass(mageClass)).toBe(true);
      expect(fresh.selectedClass).toBe(mageClass);
      expect(fresh.isCustomizing()).toBe(true);
    }
  });

  it("starts the run once customization is finished", function () {
    game.selectClass("Fire");
    expect(game.finishCustomization()).toBe(true);
    expect(game.isPlaying()).toBe(true);
  });

  it("ignores a class that does not exist", function () {
    expect(game.selectClass("Lightning")).toBe(false);
    expect(game.selectClass(null)).toBe(false);
    expect(game.isMenu()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("cannot change class once the run has started", function () {
    game.selectClass("Fire");
    game.finishCustomization();
    expect(game.selectClass("Ice")).toBe(false);
    expect(game.selectedClass).toBe("Fire");
  });

  it("opens and closes the inventory menu only during a run", function () {
    expect(game.openInventory()).toBe(false);
    game.selectClass("Fire");
    game.finishCustomization();

    expect(game.openInventory()).toBe(true);
    expect(game.isInventory()).toBe(true);
    expect(game.isPlaying()).toBe(false);
    expect(game.closeInventory()).toBe(true);
    expect(game.isPlaying()).toBe(true);
  });

  it("toggles between playing and the paused inventory state", function () {
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.toggleInventory()).toBe(true);
    expect(game.state).toBe(GAME_STATES.INVENTORY);
    expect(game.toggleInventory()).toBe(true);
    expect(game.state).toBe(GAME_STATES.PLAYING);
  });

  it("moves to dead when the player dies during a run", function () {
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.playerDied()).toBe(true);
    expect(game.isDead()).toBe(true);
  });

  it("cannot die from the menu", function () {
    expect(game.playerDied()).toBe(false);
    expect(game.isMenu()).toBe(true);
  });

  it("goes back to the model screen when a new run starts", function () {
    game.selectClass("Fire");
    game.finishCustomization();
    game.playerDied();
    expect(game.newRun()).toBe(true);
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedClass).toBeNull();
  });

  it("only starts a new run after dying", function () {
    expect(game.newRun()).toBe(false);
    game.selectClass("Mind");
    game.finishCustomization();
    expect(game.newRun()).toBe(false);
    expect(game.isPlaying()).toBe(true);
  });

  it("lets the player pick a different class on the next run", function () {
    game.selectClass("Fire");
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    game.selectModel("Tall");
    expect(game.selectClass("Mind")).toBe(true);
    expect(game.selectedClass).toBe("Mind");
  });
});

describe("Player class", function () {
  it("keeps the class it was made with", function () {
    expect(new Player(50, 50, "Ice").mageClass).toBe("Ice");
  });

  it("has no class when none is given", function () {
    expect(new Player(50, 50).mageClass).toBeNull();
  });
});


// ===== from flow.spec.js =====
// Basic smoke specs: the main pieces of a run still work together.
// They use the model classes only, so no sketch or canvas is needed.

// A run the way the menu starts it: a class, a small room and a player.
function makeRun(mageClass, modelName = "Tall") {
  const game = new Game();
  game.selectModel(modelName);
  game.selectClass(mageClass);
  game.finishCustomization();
  const room = new NormalRoom(0, 0, 160, 160);
  const player = new Player(80, 80, game.selectedClass, game.selectedModel);
  return { game, room, player };
}

describe("game flow", function () {
  it("starts a run when a model and a class are picked", function () {
    const game = new Game();
    game.selectModel("Tall");
    game.selectClass("Fire");
    game.finishCustomization();
    expect(game.isPlaying()).toBe(true);
  });

  it("lets an enemy hurt the player", function () {
    const { room, player } = makeRun("Fire");
    const enemy = new Enemy(120, 80);
    for (let frame = 0; frame < 200; frame++) {
      enemy.update(player, room);
      enemy.damagePlayer(player);
    }
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it("ends the run when the player dies and allows a new one", function () {
    const { game, player } = makeRun("Mind");
    player.takeDamage(player.maxHealth);
    game.playerDied();
    expect(game.isDead()).toBe(true);
    game.newRun();
    expect(game.isModelSelect()).toBe(true);
  });

  it("lets projectiles kill an enemy", function () {
    const { room } = makeRun("Fire");
    const enemy = new Enemy(120, 80);
    for (let shot = 0; shot < 5; shot++) {
      const proj = new Projectile(90, 88, new p5.Vector(1, 0));
      for (let step = 0; step < 20; step++) {
        proj.update(room);
        enemy.damageFromProjectile(proj);
      }
    }
    expect(enemy.isDead()).toBe(true);
  });

  it("keeps the player inside the room", function () {
    const { room, player } = makeRun("Ice");
    for (let frame = 0; frame < 200; frame++) {
      player.move(new p5.Vector(-1, 0), room);
    }
    expect(room.collidesWithWall(player.getBounds())).toBe(false);
  });
});

describe("character creator", () => {
  let game;
  beforeEach(() => {
    game = new Game();
  });

  it("starts on the model screen", () => {
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedModel).toBeNull();
  });

  it("moves to the class menu once a model is picked", () => {
    expect(game.selectModel("Short")).toBe(true);
    expect(game.selectedModel).toBe("Short");
    expect(game.isMenu()).toBe(true);
  });

  it("ignores unknown models", () => {
    expect(game.selectModel("Giant")).toBe(false);
    expect(game.isModelSelect()).toBe(true);
  });

  it("does not allow picking a class before a model", () => {
    expect(game.selectClass("Fire")).toBe(false);
    expect(game.isModelSelect()).toBe(true);
  });

  it("does not allow changing the model from the class menu", () => {
    game.selectModel("Tall");
    expect(game.selectModel("Short")).toBe(false);
    expect(game.selectedModel).toBe("Tall");
  });

  it("keeps the picked model when a class is picked", () => {
    game.selectModel("Short");
    game.selectClass("Ice");
    game.finishCustomization();
    expect(game.isPlaying()).toBe(true);
    expect(game.selectedModel).toBe("Short");
    expect(game.selectedClass).toBe("Ice");
  });

  it("goes back to the model screen and clears both choices on a new run", () => {
    game.selectModel("Short");
    game.selectClass("Ice");
    game.finishCustomization();
    game.playerDied();
    expect(game.newRun()).toBe(true);
    expect(game.isModelSelect()).toBe(true);
    expect(game.selectedModel).toBeNull();
    expect(game.selectedClass).toBeNull();
  });
});

describe("PLAYER_ART", () => {
  it("has art for every player model name and for nothing else", () => {
    expect(Object.keys(PLAYER_ART).sort()).toEqual([...PLAYER_MODEL_NAMES].sort());
  });

  it("has a sheet, a sprite size and a walk cycle for every direction on every model", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      const model = PLAYER_ART[name];
      expect(model.sheet).toBeTruthy();
      expect(model.spriteW).toBeGreaterThan(0);
      expect(model.spriteH).toBeGreaterThan(0);
      for (const facing of ["down", "up", "right", "left"]) {
        expect(model.walkCycles[facing].length).toBeGreaterThan(0);
      }
    }
  });

  it("gives the short model a two-frame side walk and a four-frame front and back walk", () => {
    const cycles = PLAYER_ART.Short.walkCycles;
    expect(cycles.right.length).toBe(2);
    expect(cycles.left.length).toBe(2);
    expect(cycles.down.length).toBe(4);
    expect(cycles.up.length).toBe(4);
  });
});

describe("Player model name", () => {
  it("defaults to the tall model", () => {
    expect(new Player(0, 0, "Fire").modelName).toBe("Tall");
  });

  it("uses the model it is given", () => {
    expect(new Player(0, 0, "Fire", "Short").modelName).toBe("Short");
  });
});


// ===== from run.spec.js =====
// Specs for Run: the dungeon, the room, the player and the shots, one frame at a time.
describe("Run", function () {
  const none = () => new p5.Vector(0, 0);
  let dungeon;
  let run;

  const centerOfTile = (room, col, row) => ({
    x: room.x + col * room.tileSize + room.tileSize / 2,
    y: room.y + row * room.tileSize + room.tileSize / 2
  });
  const frame = (input = {}) => run.update({ move: none(), fire: none(), ...input });

  // A room (not the start) that has enemies in its drawing.
  const roomWithEnemies = () =>
    dungeon.rooms.find((r) => r.role === "normal" && r.template.spawns.length > 0 && r.exits.length > 0);

  beforeEach(function () {
    dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
  });

  it("starts in the start room with the player at its spawn point", function () {
    const spawn = dungeon.start.getPlayerSpawn();
    expect(run.room).toBe(dungeon.start);
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.entrySpot).toEqual({ x: spawn.x, y: spawn.y });
  });

  it("drops the shots in flight when it enters a room", function () {
    run.projectiles.push(new Projectile(0, 0, new p5.Vector(1, 0)));
    run.enemyProjectiles.push(new Projectile(0, 0, new p5.Vector(1, 0)));
    run.enterRoom(dungeon.rooms[1]);
    expect(run.projectiles).toEqual([]);
    expect(run.enemyProjectiles).toEqual([]);
  });

  it("walks the player through an exit and remembers where they came in", function () {
    const exit = run.room.exits[0];
    const spot = dungeon.entryPoint(run.room, exit);
    run.useExit(exit);
    expect(run.room.id).toBe(exit.toId);
    expect(run.player.getCenter().x).toBe(spot.x);
    expect(run.player.getCenter().y).toBe(spot.y);
    expect(run.entrySpot).toEqual(spot);
  });

  it("takes the exit when the player stands in a door tile", function () {
    const exit = run.room.exits[0];
    const middle = centerOfTile(run.room, exit.tiles[0].col, exit.tiles[0].row);
    run.player.pos.set(middle.x - run.player.length / 2, middle.y - run.player.width / 2);
    frame();
    expect(run.room.id).toBe(exit.toId);
  });

  it("shuts the doors behind the player in a room with enemies and opens them when it is cleared", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    const doorTile = target.exits[0].tiles[0];
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_CLOSED);
    const enemies = target.enemies.length;
    expect(enemies).toBeGreaterThan(0);

    for (const e of target.enemies) {
      e.health = 0;
    }
    const dead = frame();
    expect(dead.length).toBe(enemies);
    expect(target.enemies.length).toBe(0);
    expect(target.cleared).toBe(true);
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_OPEN);
  });

  it("keeps the doors shut while an enemy is still alive", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    target.enemies[0].health = 0;
    frame();
    expect(target.cleared).toBe(false);
    const doorTile = target.exits[0].tiles[0];
    expect(target.getTile(doorTile.col, doorTile.row)).toBe(TILE.DOOR_CLOSED);
  });

  it("marks the boss room as defeated when its boss dies", function () {
    const bossRoom = dungeon.rooms.find((r) => r.role === "boss");
    run.enterRoom(bossRoom);
    for (const e of bossRoom.enemies) {
      e.health = 0;
    }
    frame();
    expect(bossRoom.bossDefeated).toBe(true);
  });

  it("respawns the player at the entry spot after a fall into a pit", function () {
    const room = run.room;
    const spawn = run.entrySpot;
    const tile = Math.floor((spawn.x - room.x) / room.tileSize) + 3; // a few tiles away on the same row
    const row = Math.floor((spawn.y - room.y) / room.tileSize);
    room.setTile(tile, row, TILE.PIT);
    const middle = centerOfTile(room, tile, row);
    run.player.pos.set(middle.x - run.player.length / 2, middle.y - run.player.width / 2);
    const health = run.player.health;

    frame();
    expect(run.player.isFalling()).toBe(true);
    for (let i = 0; i < PLAYER_FALL_FRAMES + 2; i++) {
      frame();
    }
    expect(run.player.isFalling()).toBe(false);
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.player.health).toBe(health - PIT_FALL_DAMAGE);
  });

  it("does not walk or shoot while frozen, as during a dialogue", function () {
    const before = run.player.pos.copy();
    frame({ move: new p5.Vector(1, 0), fire: new p5.Vector(1, 0), frozen: true });
    expect(run.player.pos.x).toBe(before.x);
    expect(run.projectiles.length).toBe(0);
  });

  it("walks and shoots when not frozen", function () {
    const before = run.player.pos.x;
    frame({ move: new p5.Vector(1, 0), fire: new p5.Vector(1, 0) });
    expect(run.player.pos.x).toBeGreaterThan(before);
    expect(run.projectiles.length).toBe(1);
  });

  it("keeps the enemies still once the player is dead", function () {
    const target = roomWithEnemies();
    run.enterRoom(target);
    for (const e of target.enemies) {
      e.spawnTimer = 0;
      e.wakeTimer = 0;
    }
    run.player.health = 0;
    const where = target.enemies.map((e) => e.pos.copy());
    for (let i = 0; i < 20; i++) {
      frame();
    }
    target.enemies.forEach((e, i) => {
      expect(e.pos.x).toBe(where[i].x);
      expect(e.pos.y).toBe(where[i].y);
    });
  });
});

describe("getMenuAction", function () {
  it("maps A and D to moving the highlight left and right, in either case", function () {
    expect(getMenuAction("a")).toEqual({ type: "move", step: -1 });
    expect(getMenuAction("A")).toEqual({ type: "move", step: -1 });
    expect(getMenuAction("d")).toEqual({ type: "move", step: 1 });
    expect(getMenuAction("D")).toEqual({ type: "move", step: 1 });
  });

  it("maps Enter and Space to picking the highlighted choice", function () {
    expect(getMenuAction("Enter")).toEqual({ type: "confirm" });
    expect(getMenuAction(" ")).toEqual({ type: "confirm" });
  });

  it("ignores the number keys and every other key", function () {
    for (const key of ["1", "2", "3", "0", "w", "s", "h", "ArrowLeft", "Escape", ""]) {
      expect(getMenuAction(key)).toBeNull();
    }
  });
});

describe("Choosing with the highlight", function () {
  let game;

  beforeEach(function () {
    game = new Game();
  });

  it("starts on the first playermodel", function () {
    expect(game.getMenuChoices()).toEqual(PLAYER_MODEL_NAMES);
    expect(game.menuIndex).toBe(0);
    expect(game.getHighlightedChoice()).toBe(PLAYER_MODEL_NAMES[0]);
  });

  it("moves right and left, and wraps round at both ends", function () {
    game.moveMenuCursor(1);
    expect(game.getHighlightedChoice()).toBe(PLAYER_MODEL_NAMES[1]);
    game.moveMenuCursor(1);
    expect(game.getHighlightedChoice()).toBe(PLAYER_MODEL_NAMES[0]);
    game.moveMenuCursor(-1);
    expect(game.getHighlightedChoice()).toBe(PLAYER_MODEL_NAMES[PLAYER_MODEL_NAMES.length - 1]);
  });

  it("picks the highlighted model and moves on to the class menu with the first class highlighted", function () {
    game.moveMenuCursor(1);
    expect(game.confirmMenuChoice()).toBe(true);
    expect(game.selectedModel).toBe(PLAYER_MODEL_NAMES[1]);
    expect(game.isMenu()).toBe(true);
    expect(game.getMenuChoices()).toEqual(MAGE_CLASSES);
    expect(game.getHighlightedChoice()).toBe(MAGE_CLASSES[0]);
  });

  it("picks the highlighted class and moves on to the customization screen", function () {
    game.confirmMenuChoice();
    game.moveMenuCursor(-1); // wraps to the last class
    expect(game.getHighlightedChoice()).toBe(MAGE_CLASSES[MAGE_CLASSES.length - 1]);
    expect(game.confirmMenuChoice()).toBe(true);
    expect(game.selectedClass).toBe(MAGE_CLASSES[MAGE_CLASSES.length - 1]);
    expect(game.isCustomizing()).toBe(true);
  });

  it("has the parts of the look as its rows in the character creator, and nothing to pick there", function () {
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    expect(game.isCustomizing()).toBe(true);
    expect(game.getMenuChoices()).toEqual(APPEARANCE_PARTS);
    expect(game.getHighlightedChoice()).toBe(APPEARANCE_PARTS[0]);
    expect(game.confirmMenuChoice()).toBe(false);
    expect(game.isCustomizing()).toBe(true);
  });

  it("moves between the rows of the character creator, wrapping round", function () {
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    game.moveMenuCursor(1);
    expect(game.getHighlightedChoice()).toBe(APPEARANCE_PARTS[1]);
    game.moveMenuCursor(-1);
    game.moveMenuCursor(-1);
    expect(game.getHighlightedChoice()).toBe(APPEARANCE_PARTS[APPEARANCE_PARTS.length - 1]);
  });

  it("steps the highlighted part's color, and only that part", function () {
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    game.moveMenuCursor(2); // shirt
    const before = { ...game.appearance };
    expect(game.cycleHighlightedColor(1)).toBe(true);
    expect(game.appearance.shirt).toBe(APPEARANCE_PALETTES.shirt[(getPaletteIndex(before, "shirt") + 1) % APPEARANCE_PALETTES.shirt.length]);
    for (const part of ["body", "eyes", "pants"]) {
      expect(game.appearance[part]).toBe(before[part]);
    }
    game.cycleHighlightedColor(-1);
    expect(game.appearance.shirt).toBe(before.shirt);
  });

  it("does not change colors anywhere but the character creator", function () {
    const before = { ...game.appearance };
    expect(game.cycleHighlightedColor(1)).toBe(false);
    expect(game.appearance).toEqual(before);
  });

  it("starts each visit to the character creator on the first row", function () {
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    game.moveMenuCursor(1);
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    expect(game.menuIndex).toBe(0);
  });

  it("has no choices once the run has started", function () {
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    game.finishCustomization();
    expect(game.getMenuChoices()).toEqual([]);
    expect(game.getHighlightedChoice()).toBeNull();
    expect(game.moveMenuCursor(1)).toBe(false);
  });

  it("goes back to the first model when a new run starts", function () {
    game.moveMenuCursor(1);
    game.confirmMenuChoice();
    game.moveMenuCursor(1);
    game.confirmMenuChoice();
    game.finishCustomization();
    game.playerDied();
    game.newRun();
    expect(game.isModelSelect()).toBe(true);
    expect(game.menuIndex).toBe(0);
  });
});

describe("Menu backdrop tint", function () {
  it("is white on the playermodel screen, where no class is highlighted", function () {
    expect(getMenuTintTarget(null)).toEqual([255, 255, 255]);
    expect(getMenuTintTarget(undefined)).toEqual([255, 255, 255]);
  });

  it("is a light wash of the highlighted class's colour on the class screen", function () {
    for (const mageClass of MAGE_CLASSES) {
      const tint = getMenuTintTarget(mageClass);
      expect(tint).not.toEqual([255, 255, 255]);
      tint.forEach((channel, i) => {
        expect(channel).toBeGreaterThanOrEqual(CLASS_COLORS[mageClass][i]); // lighter than the class colour
        expect(channel).toBeLessThanOrEqual(255);
      });
    }
  });

  it("is different for every class", function () {
    const tints = MAGE_CLASSES.map((c) => getMenuTintTarget(c).join(","));
    expect(new Set(tints).size).toBe(MAGE_CLASSES.length);
  });

  it("blends part of the way from one colour to another", function () {
    expect(blendToward([0, 100, 200], [100, 200, 0], 0)).toEqual([0, 100, 200]);
    expect(blendToward([0, 100, 200], [100, 200, 0], 1)).toEqual([100, 200, 0]);
    expect(blendToward([0, 100, 200], [100, 200, 0], 0.5)).toEqual([50, 150, 100]);
  });

  it("eases from white into a class colour a little each frame, then settles on it", function () {
    const target = getMenuTintTarget("Fire");
    let tint = [255, 255, 255];
    const first = stepMenuTint(tint, target);
    expect(first[2]).toBeLessThan(255); // moving
    expect(first[2]).toBeGreaterThan(target[2]); // but not there yet
    for (let i = 0; i < 120; i++) {
      tint = stepMenuTint(tint, target);
    }
    expect(tint).toEqual(target);
  });

  it("changes direction when a different class is highlighted, and goes back to white", function () {
    let tint = getMenuTintTarget("Fire");
    const toIce = getMenuTintTarget("Ice");
    const before = Math.abs(tint[0] - toIce[0]);
    tint = stepMenuTint(tint, toIce);
    expect(Math.abs(tint[0] - toIce[0])).toBeLessThan(before);
    for (let i = 0; i < 120; i++) {
      tint = stepMenuTint(tint, getMenuTintTarget(null));
    }
    expect(tint).toEqual([255, 255, 255]);
  });
});

describe("Menu accent colours", function () {
  it("are a neutral slate on the playermodel screen and the class's own colour on the class screen", function () {
    expect(getMenuAccentTarget(null)).toEqual(MENU_ACCENT);
    for (const mageClass of MAGE_CLASSES) {
      expect(getMenuAccentTarget(mageClass)).toEqual(CLASS_COLORS[mageClass]);
    }
  });

  it("are no longer purple on the playermodel screen", function () {
    const [r, g, b] = MENU_ACCENT;
    expect(b - Math.max(r, g)).toBeLessThan(60); // the old purple was [160, 140, 255]
    expect(MENU_ACCENT).not.toEqual([160, 140, 255]);
  });

  it("hands out copies, so easing one cannot change the table", function () {
    const target = getMenuAccentTarget("Fire");
    target[0] = 0;
    expect(CLASS_COLORS.Fire[0]).toBe(230);
    getMenuAccentTarget(null)[0] = 0;
    expect(MENU_ACCENT[0]).toBe(100);
  });

  it("make the cards a dark version of the accent, more tinted when selected", function () {
    for (const mageClass of MAGE_CLASSES) {
      const accent = CLASS_COLORS[mageClass];
      const plain = getCardFill(accent, false);
      const selected = getCardFill(accent, true);
      for (let i = 0; i < 3; i++) {
        expect(plain[i]).toBeGreaterThanOrEqual(MENU_CARD_BASE[i]);
        expect(selected[i]).toBeGreaterThanOrEqual(plain[i]);
        expect(selected[i]).toBeLessThan(accent[i] + 1); // always darker than the accent itself
      }
    }
  });

  it("give cards a different colour for every class", function () {
    const fills = MAGE_CLASSES.map((c) => getCardFill(CLASS_COLORS[c], true).join(","));
    expect(new Set(fills).size).toBe(MAGE_CLASSES.length);
  });

  it("fade from slate to a class colour a little each frame", function () {
    const target = getMenuAccentTarget("Ice");
    let accent = MENU_ACCENT.slice();
    const first = stepMenuTint(accent, target);
    expect(first).not.toEqual(accent);
    for (let i = 0; i < 120; i++) {
      accent = stepMenuTint(accent, target);
    }
    expect(accent).toEqual(target);
  });
});

describe("Typing a hex code in the character creator", function () {
  let game;
  const type = (text) => {
    for (const ch of text) {
      game.typeHexDigit(ch);
    }
  };

  beforeEach(function () {
    game = new Game();
    game.confirmMenuChoice();
    game.confirmMenuChoice();
    game.moveMenuCursor(1); // eyes
  });

  it("starts empty on the highlighted row, only in the character creator", function () {
    expect(game.isEnteringHex()).toBe(false);
    expect(game.startHexEntry()).toBe(true);
    expect(game.isEnteringHex()).toBe(true);
    expect(game.hexBuffer).toBe("");
    expect(new Game().startHexEntry()).toBe(false);
  });

  it("types digits in lower case, up to six, and ignores anything that is not a hex digit", function () {
    game.startHexEntry();
    type("AbC");
    expect(game.hexBuffer).toBe("abc");
    expect(game.typeHexDigit("g")).toBe(false);
    expect(game.typeHexDigit("#")).toBe(false);
    expect(game.typeHexDigit("12")).toBe(false);
    type("1234567");
    expect(game.hexBuffer).toBe("abc123");
    expect(game.typeHexDigit("f")).toBe(false);
  });

  it("does not take digits when not typing", function () {
    expect(game.typeHexDigit("a")).toBe(false);
    expect(game.hexBuffer).toBeNull();
  });

  it("deletes the last digit", function () {
    game.startHexEntry();
    type("abc");
    expect(game.deleteHexDigit()).toBe(true);
    expect(game.hexBuffer).toBe("ab");
    game.deleteHexDigit();
    game.deleteHexDigit();
    expect(game.deleteHexDigit()).toBe(false);
    expect(game.hexBuffer).toBe("");
  });

  it("previews a color once there are three or six digits, and not at other lengths", function () {
    game.startHexEntry();
    expect(game.getHexEntryColor()).toBeNull();
    type("fc");
    expect(game.getHexEntryColor()).toBeNull();
    type("9");
    expect(game.getHexEntryColor()).toBe("#ffcc99");
    type("1");
    expect(game.getHexEntryColor()).toBeNull();
    type("23");
    expect(game.getHexEntryColor()).toBe("#fc9123");
  });

  it("applies a six digit code to the highlighted part only, and stops typing", function () {
    const before = { ...game.appearance };
    game.startHexEntry();
    type("123456");
    expect(game.confirmHexEntry()).toBe(true);
    expect(game.appearance.eyes).toBe("#123456");
    for (const part of ["body", "shirt", "pants"]) {
      expect(game.appearance[part]).toBe(before[part]);
    }
    expect(game.isEnteringHex()).toBe(false);
  });

  it("applies a three digit code as the six digit color", function () {
    game.startHexEntry();
    type("0f8");
    game.confirmHexEntry();
    expect(game.appearance.eyes).toBe("#00ff88");
  });

  it("does not apply a code of the wrong length, and carries on typing", function () {
    const before = game.appearance.eyes;
    game.startHexEntry();
    type("12345");
    expect(game.confirmHexEntry()).toBe(false);
    expect(game.appearance.eyes).toBe(before);
    expect(game.isEnteringHex()).toBe(true);
    type("6");
    expect(game.confirmHexEntry()).toBe(true);
    expect(game.appearance.eyes).toBe("#123456");
  });

  it("gives up on Enter with nothing typed, and on cancel, keeping the color", function () {
    const before = game.appearance.eyes;
    game.startHexEntry();
    expect(game.confirmHexEntry()).toBe(false);
    expect(game.isEnteringHex()).toBe(false);
    game.startHexEntry();
    type("123456");
    game.cancelHexEntry();
    expect(game.isEnteringHex()).toBe(false);
    expect(game.appearance.eyes).toBe(before);
  });

  it("does not move rows or step colors while typing, since A and D are digits", function () {
    game.startHexEntry();
    const row = game.menuIndex;
    const eyes = game.appearance.eyes;
    expect(game.moveMenuCursor(1)).toBe(false);
    expect(game.cycleHighlightedColor(1)).toBe(false);
    expect(game.menuIndex).toBe(row);
    expect(game.appearance.eyes).toBe(eyes);
  });

  it("steps from a typed color to the first color on D and the last on A", function () {
    game.startHexEntry();
    type("123456");
    game.confirmHexEntry();
    game.cycleHighlightedColor(1);
    expect(game.appearance.eyes).toBe(NES_PALETTE[0]);
    game.startHexEntry();
    type("123456");
    game.confirmHexEntry();
    game.cycleHighlightedColor(-1);
    expect(game.appearance.eyes).toBe(NES_PALETTE[NES_PALETTE.length - 1]);
  });

  it("stops typing when the run starts or a new run begins", function () {
    game.startHexEntry();
    game.finishCustomization();
    expect(game.isEnteringHex()).toBe(false);
    game.playerDied();
    game.newRun();
    expect(game.isEnteringHex()).toBe(false);
  });
});
