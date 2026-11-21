// Tile routes, straight-line walking, hoppers that ignore walls, the Skeleton planting its feet
// for a shot and the Zombie's sight speed. Uses placePlayerRightOf, makeRng and
// tryAttackThroughWindup from enemy.spec.js, which loads first in SpecRunner.html.

// A one tile thick wall down column 20 from border to border, with the given rows left open.
function wallWithGap(room, gapRows) {
  for (let row = 1; row < room.rows - 1; row++) {
    if (!gapRows.includes(row)) {
      room.setTile(20, row, TILE.INTERIOR_WALL);
    }
  }
}

function onTheGrid(value) {
  return Math.abs(value / 16 - Math.round(value / 16)) < 0.000001;
}

describe("Tile routes (Room.findTilePath)", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
  });

  it("runs straight along an open row", function () {
    const path = room.findTilePath(3, 5, 1, 1, 8 * 16 + 8, 5 * 16 + 8);
    expect(path.length).toBe(5);
    expect(path.every((step) => step.row === 5 && step.horizontal)).toBe(true);
  });

  it("is empty when the start already covers the goal", function () {
    expect(room.findTilePath(8, 5, 1, 1, 8 * 16 + 8, 5 * 16 + 8)).toEqual([]);
  });

  it("goes around a wall through the gap, one whole tile at a time", function () {
    wallWithGap(room, [12]);
    const goalX = 30 * 16 + 8;
    const goalY = 5 * 16 + 8;
    const path = room.findTilePath(10, 5, 1, 1, goalX, goalY);
    expect(path).not.toBe(null);
    expect(path.some((step) => step.col === 20 && step.row === 12)).toBe(true);
    let prev = { col: 10, row: 5 };
    for (const step of path) {
      const moved = Math.abs(step.col - prev.col) + Math.abs(step.row - prev.row);
      expect(moved).toBe(1); // never a diagonal, never a jump
      expect(room.canStandAt(step.col, step.row)).toBe(true);
      prev = step;
    }
    expect(prev.col).toBe(30);
    expect(prev.row).toBe(5);
  });

  it("returns null when a wall seals the goal off", function () {
    wallWithGap(room, []);
    expect(room.findTilePath(10, 5, 1, 1, 30 * 16 + 8, 5 * 16 + 8)).toBe(null);
  });

  it("will not fit a two tile enemy through a one tile gap", function () {
    wallWithGap(room, [12]);
    expect(room.findTilePath(10, 4, 2, 2, 30 * 16 + 8, 5 * 16 + 8)).toBe(null);
    room = new NormalRoom(0, 0, 640, 400);
    wallWithGap(room, [12, 13]);
    expect(room.findTilePath(10, 4, 2, 2, 30 * 16 + 8, 5 * 16 + 8)).not.toBe(null);
  });
});

describe("Walking the tiles", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(480, 80);
  });

  function walker(name, x, y) {
    const enemy = createEnemy(name, x, y);
    enemy.spawnTimer = 0;
    enemy.detectionRange = 1000;
    enemy.speed = 1;
    enemy.type = { ...enemy.type, move: "chase", speed: 1, phases: undefined, vision: undefined };
    return enemy;
  }

  it("settles onto a row or column of the grid and stays on one", function () {
    const enemy = walker("Zombie", 100, 70);
    player.pos.set(400, 300);
    for (let frame = 0; frame < 400; frame++) {
      enemy.update(player, room);
      if (frame > 20) {
        expect(onTheGrid(enemy.pos.x) || onTheGrid(enemy.pos.y)).toBe(true);
      }
    }
  });

  it("goes around a wall through the gap and reaches the player", function () {
    wallWithGap(room, [12]);
    const enemy = walker("Zombie", 96, 80);
    enemy.speed = 2;
    enemy.type = { ...enemy.type, speed: 2 };
    for (let frame = 0; frame < 700; frame++) {
      enemy.update(player, room);
      expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
    }
    expect(rectsOverlap(enemy.getBounds(), player.getBounds())).toBe(true);
  });

  it("takes a two tile Demon through a gap it fits", function () {
    wallWithGap(room, [12, 13]);
    const demon = createEnemy("Demon", 96, 80);
    demon.spawnTimer = 0;
    demon.speed = 2;
    demon.type = { ...demon.type, speed: 2, phases: undefined };
    for (let frame = 0; frame < 900; frame++) {
      demon.update(player, room);
      expect(room.collidesWithWall(demon.getBounds())).toBe(false);
    }
    expect(rectsOverlap(demon.getBounds(), player.getBounds())).toBe(true);
  });

  it("notices a player through a wall, but cannot see them", function () {
    wallWithGap(room, [12]);
    const skeleton = createEnemy("Skeleton", 256, 96); // row 6, well away from the gap in row 12
    player.pos.set(352, 96);
    expect(skeleton.isAware(player, room)).toBe(true);
    expect(skeleton.canSee(player, room)).toBe(false);
  });
});

describe("Hoppers ignore walls", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    wallWithGap(room, []); // a solid wall down column 20
    player = new Player(352, 192); // right behind it
  });

  for (const name of ["Jelly", "Bouncer"]) {
    it(`lets the ${name} see and hop at a player behind a wall, with no way round`, function () {
      const enemy = createEnemy(name, 272, 192);
      enemy.spawnTimer = 0;
      expect(enemy.canSee(player, room)).toBe(true);
      const start = enemy.pos.x;
      for (let frame = 0; frame < 200; frame++) {
        enemy.update(player, room);
        expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
      }
      expect(enemy.pos.x).toBeGreaterThan(start + 10); // it hopped at the wall
      expect(enemy.pos.x).toBeLessThanOrEqual(320 - enemy.length); // and stopped against it
    });
  }

  it("does not give a walker that sight", function () {
    const zombie = createEnemy("Zombie", 272, 192);
    expect(zombie.canSee(player, room)).toBe(false);
  });
});

describe("Skeleton stopping for a shot", function () {
  let room;
  let skeleton;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    skeleton = createEnemy("Skeleton", 320, 192);
    skeleton.spawnTimer = 0;
    player = new Player(0, 0);
  });

  it("stands still through the whole windup, then moves on after firing", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange + 100); // it wants to approach
    skeleton.attackTimer = 0;
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.state).toBe("windup");
    const planted = skeleton.pos.copy();
    for (let i = 0; i < ENEMY_TYPES.Skeleton.attack.windup - 1; i++) {
      skeleton.update(player, room);
      expect(skeleton.pos.x).toBe(planted.x);
      expect(skeleton.pos.y).toBe(planted.y);
    }
    skeleton.stateTimer = 0;
    expect(skeleton.tryAttack(player, room).length).toBe(1);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeGreaterThan(planted.x); // walking again
  });

  it("faces the player while it stands there", function () {
    placePlayerRightOf(skeleton, player, -(ENEMY_TYPES.Skeleton.keepRange + 100)); // player on its left
    skeleton.attackTimer = 0;
    skeleton.tryAttack(player, room);
    skeleton.update(player, room);
    expect(skeleton.facingLeft).toBe(true);
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange + 100); // now on its right
    skeleton.update(player, room);
    expect(skeleton.facingLeft).toBe(false);
  });

  it("does not freeze a hopper in its windup", function () {
    const bouncer = createEnemy("Bouncer", 320, 192);
    bouncer.spawnTimer = 0;
    placePlayerRightOf(bouncer, player, 10);
    let swung = false;
    for (let i = 0; i < 120; i++) {
      bouncer.update(player, room);
      swung = swung || bouncer.state === "attack";
      expect(bouncer.isPlanted()).toBe(false);
    }
    expect(swung).toBe(true); // its windup ran on into the swing
  });
});

describe("Zombie sight speed", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    zombie = createEnemy("Zombie", 256, 96);
    zombie.spawnTimer = 0;
    player = new Player(0, 0);
  });

  it("is quicker while it sees the player than while running to where it saw them", function () {
    zombie.faceDirection(1, 0);
    placePlayerRightOf(zombie, player, 60); // ahead in its row, clear floor between
    const sight = zombie.pos.copy();
    zombie.update(player, room);
    const fast = p5.Vector.dist(sight, zombie.pos);

    player.pos.set(zombie.pos.x + 60, zombie.pos.y - 48); // steps out of the row
    const hidden = zombie.pos.copy();
    zombie.update(player, room); // runs on toward the spot it saw them
    const slow = p5.Vector.dist(hidden, zombie.pos);

    expect(fast).toBeCloseTo(ENEMY_TYPES.Zombie.sightSpeed, 5);
    expect(slow).toBeCloseTo(ENEMY_TYPES.Zombie.speed, 5);
    expect(fast).toBeGreaterThan(slow);
  });

  it("needs a sight speed that is at least its speed", function () {
    expect(validateEnemyTypes({ Zombie: ENEMY_TYPES.Zombie })).toEqual([]);
    const bad = { ...ENEMY_TYPES.Zombie, sightSpeed: ENEMY_TYPES.Zombie.speed / 2 };
    expect(validateEnemyTypes({ Zombie: bad }).length).toBeGreaterThan(0);
  });
});

describe("Zombie line vision", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    zombie = createEnemy("Zombie", 96, 96); // on the grid, row 6
    zombie.spawnTimer = 0;
    zombie.rng = () => 0; // when it ambles, it ambles right
    player = new Player(0, 0);
  });

  it("sees the player in the row it faces, ahead of it", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    expect(zombie.canSee(player, room)).toBe(true);
  });

  it("does not see a player behind it, a row away, or beyond its range", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(48, 96); // behind
    expect(zombie.canSee(player, room)).toBe(false);
    player.pos.set(176, 112); // the next row down
    expect(zombie.canSee(player, room)).toBe(false);
    player.pos.set(96 + ENEMY_TYPES.Zombie.detectionRange + 40, 96); // too far
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("sees up and down a column too", function () {
    zombie.faceDirection(0, 1);
    player.pos.set(96, 176);
    expect(zombie.canSee(player, room)).toBe(true);
    player.pos.set(112, 176); // the next column over
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("does not see through a wall", function () {
    room.setTile(8, 6, TILE.INTERIOR_WALL);
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("does not turn to face a player standing beside it", function () {
    zombie.rng = () => 0.25; // it ambles down, the way it already faces
    zombie.faceDirection(0, 1);
    player.pos.set(176, 96); // in its row, but it is facing down
    zombie.update(player, room);
    expect(zombie.facingDir).toBe("down");
    expect(zombie.lastKnown).toBe(null); // and it never noticed them
  });

  it("faces the way it ambles", function () {
    zombie.rng = () => 0.25; // down
    zombie.update(player, room);
    expect(zombie.facingDir).toBe("down");
  });

  it("runs to the spot where it saw the player, even after they step away, then stumbles again", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    zombie.update(player, room); // spots them
    expect(zombie.lastKnown).not.toBe(null);
    player.pos.set(176, 224); // out of the row, out of sight
    for (let frame = 0; frame < 200 && zombie.lastKnown; frame++) {
      zombie.update(player, room);
    }
    expect(zombie.lastKnown).toBe(null); // it got there
    expect(Math.abs(zombie.pos.x - 176)).toBeLessThanOrEqual(8); // on the tile where it saw them
    expect(zombie.pos.x).toBeGreaterThan(160); // having run a long way from where it started
    const there = zombie.pos.copy();
    zombie.update(player, room);
    expect(p5.Vector.dist(there, zombie.pos)).toBeCloseTo(ENEMY_TYPES.Zombie.wanderSpeed, 5); // stumbling
  });

  it("follows a player who stays in the row", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(200, 96);
    zombie.update(player, room);
    player.pos.set(240, 96);
    zombie.update(player, room);
    expect(zombie.lastKnown.x).toBeCloseTo(248, 5); // the newest spot
  });

  it("stops hunting a spot it cannot reach", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    zombie.update(player, room);
    for (let row = 1; row < room.rows - 1; row++) {
      room.setTile(11, row, TILE.INTERIOR_WALL); // seal the spot off
    }
    player.pos.set(176, 224);
    for (let frame = 0; frame < 60; frame++) {
      zombie.update(player, room);
    }
    expect(zombie.alertTimer).toBe(0);
  });
});

describe("Enemies and pits", function () {
  let room;
  let player;

  const makeEnemy = (typeName, x, y) => {
    const enemy = new Enemy(x, y, typeName);
    enemy.spawnTimer = 0;
    enemy.wakeTimer = 0;
    return enemy;
  };

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    room.setTile(10, 5, TILE.PIT); // pixels x 160 to 175, y 80 to 95
    player = new Player(500, 300);
  });

  it("keeps a walking enemy out of a pit", function () {
    const enemy = makeEnemy("Jelly", 140, 80);
    for (let i = 0; i < 20; i++) {
      moveWithCollision(enemy, 2, 0, room);
      expect(room.overlapsPit(enemy.getBounds())).toBe(false);
    }
    expect(enemy.pos.x).toBeGreaterThan(130);
  });

  it("lets a flier cross a pit", function () {
    const bat = makeEnemy("Bat", 140, 80);
    for (let i = 0; i < 30; i++) {
      moveWithCollision(bat, 2, 0, room);
    }
    expect(bat.pos.x).toBe(200);
  });

  it("kills an enemy that a shove carries over a pit", function () {
    const enemy = makeEnemy("Jelly", 150, 80); // middle at x 158, two pixels short of the pit
    enemy.applyKnockback(new p5.Vector(1, 0));
    for (let i = 0; i < 10 && !enemy.isDead(); i++) {
      enemy.update(player, room);
    }
    expect(enemy.isDead()).toBe(true);
    expect(enemy.fell).toBe(true);
  });

  it("does not kill an enemy that is only shoved toward a pit", function () {
    const enemy = makeEnemy("Jelly", 100, 80);
    enemy.applyKnockback(new p5.Vector(1, 0));
    for (let i = 0; i < 10; i++) {
      enemy.update(player, room);
    }
    expect(enemy.isDead()).toBe(false);
  });

  it("does not drop a flier or a boss into a pit", function () {
    const bat = makeEnemy("Bat", 160, 80);
    const demon = makeEnemy("Demon", 152, 72); // 32 wide, its middle is over the pit
    bat.update(player, room);
    demon.update(player, room);
    expect(bat.isDead()).toBe(false);
    expect(demon.isDead()).toBe(false);
  });
});
