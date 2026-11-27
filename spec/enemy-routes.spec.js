// Specs for the three enemy fixes: the purple wizard only shoots along a line the player is on, the
// yellow wizard's side bolt is raised to his hands, and the Blockette's patrols (a route a room
// draws for it, or walking with a wall on its right hand).
describe("purple Shadow Wizard only shoots when the player is in the line of fire", function () {
  let room;
  let player;
  let wiz;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(0, 0);
    wiz = createEnemy("ShadowWizardPurple", 300, 200);
    wiz.spawnTimer = 0;
    wiz.attackTimer = 0;
    wiz.getSpeed = () => 0; // stands still, so what is in the line does not change as it wanders
  });

  function placeAt(dx, dy) {
    const c = wiz.getCenter();
    player.pos.set(c.x + dx - player.length / 2, c.y + dy - player.width / 2);
  }

  function shotsFiredIn(frames) {
    const shots = [];
    for (let i = 0; i < frames; i++) {
      wiz.update(player, room);
      shots.push(...wiz.tryAttack(player, room));
    }
    return shots;
  }

  it("does not shoot or even start winding up when the player is off at an angle", function () {
    for (const [dx, dy] of [[80, 80], [-80, 80], [80, -80], [60, 40], [100, 30], [30, -100]]) {
      placeAt(dx, dy);
      expect(shotsFiredIn(60)).toEqual([]);
      expect(wiz.state).not.toBe("windup");
    }
  });

  it("shoots along the line when the player is straight right, left, above or below", function () {
    for (const [dx, dy, vx, vy] of [[100, 0, 1, 0], [-100, 0, -1, 0], [0, -100, 0, -1], [0, 100, 0, 1]]) {
      wiz.attackTimer = 0;
      wiz.setState("idle", 0);
      placeAt(dx, dy);
      const shots = shotsFiredIn(80);
      expect(shots.length).toBe(1);
      const along = (v) => (Math.abs(v) < 1e-6 ? 0 : Math.sign(v)); // cos(90 degrees) is not exactly 0
      expect(along(shots[0].vel.x)).toBe(vx);
      expect(along(shots[0].vel.y)).toBe(vy);
    }
  });

  it("shoots when the player is a little off the line, as long as the shot would still hit", function () {
    placeAt(100, 8);
    const shots = shotsFiredIn(80);
    expect(shots.length).toBe(1);
    const shot = shots[0];
    for (let i = 0; i < 100 && shot.alive; i++) {
      shot.update(room);
      if (projectileHitsPlayer(shot, player)) {
        return;
      }
    }
    fail("the shot missed a player it was fired at");
  });

  it("waits, then shoots the moment the player steps into the line", function () {
    placeAt(100, 50);
    expect(shotsFiredIn(30)).toEqual([]);
    expect(wiz.attackTimer).toBe(0); // it never spent its cooldown
    placeAt(100, 0);
    expect(shotsFiredIn(40).length).toBe(1);
  });

  it("every shot it fires at a player standing still hits", function () {
    for (let angle = 0; angle < 360; angle += 15) {
      player = new Player(0, 0); // a hit hurts the player, so each angle gets a new one
      const wizard = createEnemy("ShadowWizardPurple", 300, 200);
      wizard.spawnTimer = 0;
      wizard.attackTimer = 0;
      const c = wizard.getCenter();
      const r = 90;
      player.pos.set(c.x + Math.cos((angle * Math.PI) / 180) * r - 8, c.y + Math.sin((angle * Math.PI) / 180) * r - 8);
      const shots = [];
      for (let i = 0; i < 80; i++) {
        wizard.update(player, room);
        shots.push(...wizard.tryAttack(player, room));
      }
      for (const shot of shots) {
        let hit = false;
        for (let i = 0; i < 150 && shot.alive && !hit; i++) {
          shot.update(room);
          hit = projectileHitsPlayer(shot, player);
        }
        expect(hit).toBe(true);
      }
    }
  });

  it("table check: inLine needs aimSteps and a true or false", function () {
    const purple = ENEMY_TYPES.ShadowWizardPurple;
    const withAttack = (attack) => ({ T: { ...purple, attack: { ...purple.attack, ...attack } } });
    expect(validateEnemyTypes(withAttack({ inLine: "yes" })).length).toBeGreaterThan(0);
    expect(validateEnemyTypes({ T: { ...purple, attack: { ...purple.attack, aimSteps: undefined, inLine: true } } }).length)
      .toBeGreaterThan(0);
  });
});

describe("yellow Shadow Wizard's bolt is raised to his hands", function () {
  let wiz;
  beforeEach(function () {
    wiz = createEnemy("ShadowWizardYellow", 300, 200);
  });

  it("has a raise for the side bolt and one for the up and down bolt", function () {
    expect(ENEMY_TYPES.ShadowWizardYellow.attack.sideRaise).toBeGreaterThan(0);
    expect(ENEMY_TYPES.ShadowWizardYellow.attack.verticalRaise).toBeGreaterThan(0);
  });

  it("lifts the left and right damage boxes by the side raise", function () {
    const attack = ENEMY_TYPES.ShadowWizardYellow.attack;
    const c = wiz.getCenter();
    for (const side of ["left", "right"]) {
      wiz.facingDir = side;
      const flat = wiz.getSwingBox(attack.reach, attack.thickness);
      const raised = wiz.getSwingBox(attack.reach, attack.thickness, attack.sideRaise);
      expect(raised.y).toBe(flat.y - attack.sideRaise);
      expect(raised.h).toBe(flat.h);
      expect(raised.x).toBe(flat.x);
    }
    // The side raise does not move an up or down box.
    for (const side of ["up", "down"]) {
      wiz.facingDir = side;
      expect(wiz.getSwingBox(attack.reach, attack.thickness, attack.sideRaise))
        .toEqual(wiz.getSwingBox(attack.reach, attack.thickness));
    }
    expect(c.y).toBe(200 + 8);
  });

  it("lifts the up and down damage boxes by the vertical raise, and leaves left and right alone", function () {
    const attack = ENEMY_TYPES.ShadowWizardYellow.attack;
    for (const side of ["up", "down"]) {
      wiz.facingDir = side;
      const flat = wiz.getSwingBox(attack.reach, attack.thickness);
      const raised = wiz.getSwingBox(attack.reach, attack.thickness, 0, attack.verticalRaise);
      expect(raised.y).toBe(flat.y - attack.verticalRaise);
      expect(raised.h).toBe(flat.h);
      expect(raised.x).toBe(flat.x);
      expect(raised.w).toBe(flat.w);
    }
    for (const side of ["left", "right"]) {
      wiz.facingDir = side;
      expect(wiz.getSwingBox(attack.reach, attack.thickness, 0, attack.verticalRaise))
        .toEqual(wiz.getSwingBox(attack.reach, attack.thickness));
    }
  });

  it("hurts a player standing in the raised up bolt, above where the flat box ends", function () {
    const attack = ENEMY_TYPES.ShadowWizardYellow.attack;
    const player = new Player(0, 0);
    wiz.facingDir = "up";
    wiz.setState("attack", 10);
    wiz.swingHit = false;
    const c = wiz.getCenter();
    player.width = 6;
    player.pos.set(c.x, c.y - attack.reach - attack.verticalRaise); // top row of the raised box
    expect(wiz.meleeHit(player)).toBe(true);
  });

  it("hurts a player standing at the height of the raised bolt, using the raised box", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(0, 0);
    const attack = ENEMY_TYPES.ShadowWizardYellow.attack;
    wiz.facingDir = "right";
    wiz.setState("attack", 10);
    wiz.swingHit = false;
    const c = wiz.getCenter();
    // Entirely above the flat box's top edge but inside the raised one.
    player.pos.set(c.x + 24, c.y - attack.thickness / 2 - attack.sideRaise - 1);
    player.width = 6;
    expect(wiz.meleeHit(player)).toBe(true);
  });

  it("validates the raise", function () {
    const yellow = ENEMY_TYPES.ShadowWizardYellow;
    expect(validateEnemyTypes({ T: { ...yellow, attack: { ...yellow.attack, sideRaise: -1 } } }).length).toBeGreaterThan(0);
    expect(validateEnemyTypes({ T: { ...yellow, attack: { ...yellow.attack, verticalRaise: -1 } } }).length).toBeGreaterThan(0);
    expect(validateEnemyTypes({ T: { ...ENEMY_TYPES.Jelly, attack: { ...ENEMY_TYPES.ShadowWizardPurple.attack, verticalRaise: 2 } } }).length)
      .toBeGreaterThan(0);
    expect(validateEnemyTypes({ T: { ...ENEMY_TYPES.Jelly, attack: { ...ENEMY_TYPES.ShadowWizardPurple.attack, sideRaise: 2 } } }).length)
      .toBeGreaterThan(0);
  });
});

describe("Blockette walking with a wall on its right hand", function () {
  let room;
  let player;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400); // 40 by 25 tiles, walls round the edge
    player = new Player(600, 360);
  });

  function blockAt(col, row, facing = "down") {
    const block = createEnemy("Blockette", col * 16, row * 16);
    block.spawnTimer = 0;
    block.facingDir = facing;
    return block;
  }

  function tileOf(block) {
    const c = block.getCenter();
    return { col: Math.floor(c.x / 16), row: Math.floor(c.y / 16) };
  }

  function walk(block, frames, each) {
    for (let i = 0; i < frames; i++) {
      block.update(player, room);
      each(block, i);
    }
  }

  it("is the default, with no fixed square", function () {
    expect(ENEMY_TYPES.Blockette.patrol).toBe("follow");
    expect(validateEnemyTypes()).toEqual([]);
  });

  it("goes straight to the first wall, then follows the walls all the way round the room", function () {
    const block = blockAt(10, 10);
    const seen = { minCol: 99, maxCol: 0, minRow: 99, maxRow: 0 };
    walk(block, 9000, () => {
      const t = tileOf(block);
      seen.minCol = Math.min(seen.minCol, t.col);
      seen.maxCol = Math.max(seen.maxCol, t.col);
      seen.minRow = Math.min(seen.minRow, t.row);
      seen.maxRow = Math.max(seen.maxRow, t.row);
    });
    expect(seen).toEqual({ minCol: 1, maxCol: 38, minRow: 1, maxRow: 23 });
  });

  it("stays on floor and keeps a wall on its right once it has found one", function () {
    const block = blockAt(10, 10);
    let touching = false;
    walk(block, 6000, () => {
      expect(room.collidesWithWall(block.getBounds())).toBe(false);
      const c = block.getCenter();
      const atCenter = Math.abs((c.x % 16) - 8) < 0.01 && Math.abs((c.y % 16) - 8) < 0.01;
      if (atCenter) {
        const heading = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[block.facingDir];
        const right = [-heading[1], heading[0]]; // turn right: down screen coordinates, so (x, y) -> (-y, x)
        const t = tileOf(block);
        const rightIsWall = room.isWallAt(room.x + (t.col + right[0] + 0.5) * 16, room.y + (t.row + right[1] + 0.5) * 16);
        touching = touching || rightIsWall;
        if (touching) {
          expect(rightIsWall).toBe(true);
        }
      }
    });
    expect(touching).toBe(true);
  });

  it("goes round an obstacle standing in the room instead of through it", function () {
    for (let col = 20; col <= 22; col++) {
      for (let row = 10; row <= 12; row++) {
        room.setTile(col, row, TILE.INTERIOR_WALL);
      }
    }
    const block = blockAt(19, 11, "right"); // right beside the obstacle, facing it
    const seen = { minCol: 99, maxCol: 0, minRow: 99, maxRow: 0 };
    walk(block, 3000, () => {
      expect(room.collidesWithWall(block.getBounds())).toBe(false);
      const t = tileOf(block);
      seen.minCol = Math.min(seen.minCol, t.col);
      seen.maxCol = Math.max(seen.maxCol, t.col);
      seen.minRow = Math.min(seen.minRow, t.row);
      seen.maxRow = Math.max(seen.maxRow, t.row);
    });
    // The loop round the 3 by 3 block: one tile clear of it on every side.
    expect(seen).toEqual({ minCol: 19, maxCol: 23, minRow: 9, maxRow: 13 });
  });

  it("goes round the edge of a pit and never falls in", function () {
    for (let col = 20; col <= 22; col++) {
      for (let row = 10; row <= 12; row++) {
        room.setTile(col, row, TILE.PIT);
      }
    }
    const block = blockAt(19, 11, "right");
    walk(block, 3000, () => {
      expect(block.isDead()).toBe(false);
      expect(room.overlapsPit(block.getBounds())).toBe(false);
    });
    expect(tileOf(block).col).toBeGreaterThanOrEqual(19);
  });

  it("faces the way it walks, so the shield leads", function () {
    const block = blockAt(10, 10, "down");
    walk(block, 20, () => {});
    expect(block.facingDir).toBe("down");
    const turned = blockAt(10, 10, "right");
    walk(turned, 20, () => {});
    expect(turned.facingDir).toBe("right");
  });

  it("does not move when it is boxed in, and does not throw", function () {
    const block = blockAt(10, 10);
    for (const [c, r] of [[10, 9], [10, 11], [9, 10], [11, 10]]) {
      room.setTile(c, r, TILE.INTERIOR_WALL);
    }
    const before = block.pos.copy();
    walk(block, 60, () => {});
    expect(block.pos.x).toBe(before.x);
    expect(block.pos.y).toBe(before.y);
  });

  it("uses its own route instead when it has one, round the same obstacle", function () {
    for (let col = 20; col <= 22; col++) {
      for (let row = 10; row <= 12; row++) {
        room.setTile(col, row, TILE.INTERIOR_WALL);
      }
    }
    const block = blockAt(18, 11);
    block.patrolPath = [{ dx: 0, dy: 0 }, { dx: 8, dy: 0 }]; // straight through the obstacle and back
    let across = false;
    walk(block, 2500, () => {
      expect(room.collidesWithWall(block.getBounds())).toBe(false);
      across = across || tileOf(block).col >= 26;
    });
    expect(across).toBe(true);
  });
});

describe("rooms can give each Blockette its own route", function () {
  const template = (name) => ROOM_TEMPLATES.find((t) => t.name === name);
  // A patrol counts a stop as reached once the enemy is on that tile, to the nearest tile.
  const stopReached = (block, stop) =>
    Math.round(block.pos.x / 16) === stop.col && Math.round(block.pos.y / 16) === stop.row;

  it("has routes in the Blockette rooms", function () {
    expect(template("shield-patrol").patrols.length).toBe(2);
    expect(template("shield-maze").patrols.length).toBe(4);
    expect(validateRoomTemplates()).toEqual([]);
  });

  it("hands each route to the Blockette it starts on, as offsets from that Blockette's tile", function () {
    const parsed = parseRoomTemplate(template("shield-patrol"));
    const left = parsed.spawns.find((s) => s.type === "Blockette" && s.col === 3);
    const right = parsed.spawns.find((s) => s.type === "Blockette" && s.col === 19);
    expect(left.patrol).toEqual([{ dx: 0, dy: 0 }, { dx: 6, dy: 0 }, { dx: 6, dy: 8 }, { dx: 0, dy: 8 }]);
    expect(right.patrol).toEqual([{ dx: 0, dy: 0 }, { dx: -6, dy: 0 }, { dx: -6, dy: 8 }, { dx: 0, dy: 8 }]);
    expect(parsed.spawns.find((s) => s.type === "Ghoul").patrol).toBeUndefined();
  });

  it("gives the spawned enemy its route, and an enemy with none keeps the type's way", function () {
    const room = new TemplateRoom(0, 0, parseRoomTemplate(template("shield-patrol")));
    room.spawnEnemies();
    const blocks = room.enemies.filter((e) => e.typeName === "Blockette");
    expect(blocks.length).toBe(2);
    for (const block of blocks) {
      expect(block.patrolPath.length).toBe(4);
    }
    expect(room.enemies.find((e) => e.typeName === "Ghoul").patrolPath).toBeNull();

    const bare = { ...template("shield-patrol"), patrols: undefined };
    const plain = new TemplateRoom(0, 0, parseRoomTemplate(bare));
    plain.spawnEnemies();
    expect(plain.enemies.filter((e) => e.typeName === "Blockette").every((e) => e.patrolPath === null)).toBe(true);
  });

  it("walks the drawn route in order in the real room", function () {
    const room = new TemplateRoom(0, 0, parseRoomTemplate(template("shield-patrol")));
    room.spawnEnemies();
    const block = room.enemies.find((e) => e.typeName === "Blockette" && e.home.x < 100);
    block.spawnTimer = 0;
    const player = new Player(200, 100);
    const stops = [{ col: 9, row: 2 }, { col: 9, row: 10 }, { col: 3, row: 10 }, { col: 3, row: 2 }];
    const reached = [];
    for (let frame = 0; frame < 4000 && reached.length < stops.length; frame++) {
      block.update(player, room);
      const next = stops[reached.length];
      if (stopReached(block, next)) {
        reached.push(next);
      }
    }
    expect(reached).toEqual(stops);
  });

  it("every route in every pre-made room can be walked, stop by stop, and then starts again", function () {
    for (const t of ROOM_TEMPLATES.filter((r) => r.patrols)) {
      const room = new TemplateRoom(0, 0, parseRoomTemplate(t));
      room.spawnEnemies();
      const player = new Player(room.x + 16, room.y + 16);
      for (const route of t.patrols) {
        const block = room.enemies.find((e) => e.typeName === "Blockette"
          && Math.round(e.pos.x / 16) === route[0].col && Math.round(e.pos.y / 16) === route[0].row);
        expect(block).toBeDefined();
        block.spawnTimer = 0;
        const stops = route.slice(1).concat([route[0]]); // every stop, then back to the start
        let reached = 0;
        for (let frame = 0; frame < 20000 && reached < stops.length; frame++) {
          block.update(player, room);
          if (stopReached(block, stops[reached])) {
            reached++;
          }
        }
        expect(reached).withContext(t.name + " route from " + route[0].col + "," + route[0].row).toBe(stops.length);
      }
    }
  });

  describe("validation", function () {
    const base = () => ({
      name: "t",
      role: "normal",
      rows: [
        "#####++#####",
        "#..........#",
        "#.L........#",
        "#....xx....#",
        "#....xx....#",
        "#..........#",
        "#..........#",
        "#####++#####"
      ]
    });
    const problems = (patrols) => validateRoomTemplates([{ ...base(), patrols }]).filter((p) => p.startsWith("t:"));

    it("accepts a good route", function () {
      expect(problems([[{ col: 2, row: 2 }, { col: 8, row: 2 }, { col: 8, row: 6 }]])).toEqual([]);
    });

    it("rejects patrols that is not a list, and a route with fewer than 2 stops", function () {
      expect(problems("go")).toEqual(["t: patrols must be a list of routes"]);
      expect(problems([[{ col: 2, row: 2 }]]).length).toBe(1);
    });

    it("rejects a stop in a wall, a stop off the map and a repeated stop", function () {
      expect(problems([[{ col: 2, row: 2 }, { col: 5, row: 3 }]]).join()).toContain("not on floor");
      expect(problems([[{ col: 2, row: 2 }, { col: 99, row: 3 }]]).join()).toContain("not on floor");
      expect(problems([[{ col: 2, row: 2 }, { col: 2, row: 2 }]]).join()).toContain("same tile");
    });

    it("rejects a route that does not start on a Blockette, and two routes from one Blockette", function () {
      expect(problems([[{ col: 3, row: 2 }, { col: 8, row: 2 }]]).join()).toContain("must start on the tile of a patrolling enemy");
      const route = [{ col: 2, row: 2 }, { col: 8, row: 2 }];
      expect(problems([route, route]).join()).toContain("start on the same tile");
    });
  });
});
