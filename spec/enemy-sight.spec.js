// Specs for Enemy.getSightLanes: the strips the debug overlay draws for enemies that do not see in
// a plain circle (line vision enemies, and shooters that need the player in their line of fire).
describe("enemy sight lanes for the debug overlay", function () {
  let room;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
  });

  function bounds(lane) {
    const xs = lane.map((c) => c.x);
    const ys = lane.map((c) => c.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  it("gives an enemy that sees in a circle no lanes", function () {
    const bat = createEnemy("Bat", 300, 200);
    expect(bat.getSightLanes(room)).toEqual([]);
  });

  it("gives the purple wizard one lane per direction he can shoot", function () {
    const wiz = createEnemy("ShadowWizardPurple", 300, 200);
    expect(wiz.getSightLanes(room).length).toBe(4);
  });

  it("makes each purple lane as wide as the line the shot has to hit the player in, and as long as his range", function () {
    const wiz = createEnemy("ShadowWizardPurple", 300, 200);
    const c = wiz.getCenter();
    const half = (16 + PROJECTILE_WIDTH) / 2 - ENEMY_LINE_MARGIN;
    const right = bounds(wiz.getSightLanes(room, 16)[0]); // angle 0: to the right
    expect(right.minX).toBeCloseTo(c.x, 3);
    expect(right.maxX).toBeCloseTo(c.x + wiz.detectionRange, 3);
    expect(right.minY).toBeCloseTo(c.y - half, 3);
    expect(right.maxY).toBeCloseTo(c.y + half, 3);
  });

  it("stops a purple lane at a wall", function () {
    const wiz = createEnemy("ShadowWizardPurple", 40, 200); // the left wall is close
    const c = wiz.getCenter();
    const left = bounds(wiz.getSightLanes(room, 16)[2]); // angle PI: to the left
    expect(left.maxX).toBeCloseTo(c.x, 3);
    expect(left.minX).toBeGreaterThan(room.x + room.tileSize - 1); // does not reach into the wall
    expect(c.x - left.minX).toBeLessThan(wiz.detectionRange);
  });

  it("a player in a purple lane is one the wizard would shoot at", function () {
    const wiz = createEnemy("ShadowWizardPurple", 300, 200);
    const c = wiz.getCenter();
    const lane = bounds(wiz.getSightLanes(room, 16)[0]);
    const player = new Player(0, 0);
    player.pos.set(c.x + 100 - player.length / 2, c.y - player.width / 2);
    const center = player.getCenter();
    expect(center.x).toBeGreaterThan(lane.minX);
    expect(center.x).toBeLessThan(lane.maxX);
    expect(playerInShotLine(wiz, player, new p5.Vector(1, 0))).toBe(true);
  });

  it("gives a line vision enemy one tile wide lane along the way it faces, and none for a circle", function () {
    const ghoul = createEnemy("Ghoul", 300, 200);
    ghoul.facingDir = "right";
    const lanes = ghoul.getSightLanes(room);
    expect(lanes.length).toBe(1);
    const b = bounds(lanes[0]);
    const c = ghoul.getCenter();
    expect(b.minX).toBeCloseTo(c.x, 3);
    expect(b.maxX).toBeCloseTo(c.x + ghoul.detectionRange, 3);
    expect(b.maxY - b.minY).toBe(room.tileSize);
    expect(b.minY).toBe(Math.floor(c.y / room.tileSize) * room.tileSize); // the tile row he stands in
  });

  it("turns the line vision lane with his facing", function () {
    const ghoul = createEnemy("Ghoul", 300, 200);
    const c = ghoul.getCenter();
    ghoul.facingDir = "up";
    const up = bounds(ghoul.getSightLanes(room)[0]);
    expect(up.maxY).toBeCloseTo(c.y, 3);
    expect(up.minY).toBeCloseTo(c.y - ghoul.detectionRange, 3);
    expect(up.maxX - up.minX).toBe(room.tileSize);
    ghoul.facingDir = "left";
    const left = bounds(ghoul.getSightLanes(room)[0]);
    expect(left.maxX).toBeCloseTo(c.x, 3);
  });

  it("stops the line vision lane at a wall, matching what he can see", function () {
    const ghoul = createEnemy("Ghoul", 40, 200);
    ghoul.facingDir = "left";
    const c = ghoul.getCenter();
    const b = bounds(ghoul.getSightLanes(room)[0]);
    expect(b.minX).toBeGreaterThanOrEqual(room.x + room.tileSize - 1);
    expect(c.x - b.minX).toBeLessThan(ghoul.detectionRange);
  });
});

describe("yellow Shadow Wizard only zaps a player who is in one of his four bolts", function () {
  let room;
  let player;
  let wiz;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(0, 0);
    wiz = createEnemy("ShadowWizardYellow", 300, 200);
    wiz.spawnTimer = 0;
    wiz.attackTimer = 0;
    wiz.getSpeed = () => 0;
  });

  function placeAt(dx, dy) {
    const c = wiz.getCenter();
    player.pos.set(c.x + dx - player.length / 2, c.y + dy - player.width / 2);
  }

  it("is set to zap in line", function () {
    expect(ENEMY_TYPES.ShadowWizardYellow.attack.inLine).toBe(true);
  });

  it("zaps a player standing in line on each of the four sides", function () {
    for (const [dx, dy, side] of [[30, 0, "right"], [-30, 0, "left"], [0, 30, "down"], [0, -30, "up"]]) {
      const w = createEnemy("ShadowWizardYellow", 300, 200);
      w.spawnTimer = 0;
      w.attackTimer = 0;
      const c = w.getCenter();
      player.pos.set(c.x + dx - player.length / 2, c.y + dy - player.width / 2);
      w.tryAttack(player, room);
      expect(w.state).toBe("windup");
      expect(w.facingDir).toBe(side);
    }
  });

  it("does not zap a player who is close but off to a diagonal, outside every bolt", function () {
    placeAt(30, 30);
    expect(wiz.canSee(player, room)).toBe(true); // he sees the player, and still waits
    wiz.tryAttack(player, room);
    expect(wiz.state).toBe("idle");
    placeAt(-28, -28);
    wiz.tryAttack(player, room);
    expect(wiz.state).toBe("idle");
  });

  it("does not turn to face a player he is not going to zap", function () {
    wiz.facingDir = "down";
    placeAt(30, 30);
    wiz.tryAttack(player, room);
    expect(wiz.facingDir).toBe("down");
  });

  it("zaps the moment the player steps into the line", function () {
    placeAt(30, 30);
    wiz.tryAttack(player, room);
    expect(wiz.state).toBe("idle");
    placeAt(30, 2);
    wiz.tryAttack(player, room);
    expect(wiz.state).toBe("windup");
  });

  it("does not zap a player past the end of the bolt", function () {
    placeAt(52, 0); // inside his detection range of 56, but beyond the bolt's reach
    expect(wiz.canSee(player, room)).toBe(true);
    wiz.tryAttack(player, room);
    expect(wiz.state).toBe("idle");
  });

  it("gives the overlay the four raised bolt boxes as lanes", function () {
    const attack = ENEMY_TYPES.ShadowWizardYellow.attack;
    const lanes = wiz.getSightLanes(room);
    expect(lanes.length).toBe(4);
    const boxes = wiz.getZapBoxes(attack);
    const right = lanes[0];
    expect(right[0]).toEqual({ x: boxes.right.x, y: boxes.right.y });
    expect(right[2]).toEqual({ x: boxes.right.x + boxes.right.w, y: boxes.right.y + boxes.right.h });
    expect(boxes.right.y).toBe(wiz.getCenter().y - attack.thickness / 2 - attack.sideRaise);
    expect(boxes.up.y).toBe(wiz.getCenter().y - attack.reach - attack.verticalRaise);
  });

  it("validates inLine on a zap and rejects it on a melee or a strike", function () {
    const yellow = ENEMY_TYPES.ShadowWizardYellow;
    expect(validateEnemyTypes({ T: { ...yellow, attack: { ...yellow.attack, inLine: "yes" } } }).length).toBeGreaterThan(0);
    const green = ENEMY_TYPES.ShadowWizardGreen;
    expect(validateEnemyTypes({ T: { ...green, attack: { ...green.attack, inLine: true } } }).length).toBeGreaterThan(0);
    expect(validateEnemyTypes({ T: { ...yellow } }).length).toBe(0);
  });
});
