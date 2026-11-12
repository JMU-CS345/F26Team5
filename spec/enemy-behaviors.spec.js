describe("Zombie wandering (wanderChase)", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 320, 320);
    zombie = createEnemy("Zombie", 160, 160);
    player = new Player(288, 16); // about 190 px away, outside the Zombie's 160 range
  });

  it("starts out of sight of the player", function () {
    expect(zombie.canSee(player)).toBe(false);
  });

  it("ambles at its wander speed in the direction it rolled", function () {
    zombie.rng = () => 0; // angle 0 is straight right
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(160 + ENEMY_TYPES.Zombie.wanderSpeed, 5);
    expect(zombie.pos.y).toBeCloseTo(160, 5);
  });

  it("walks down when the roll is a quarter turn", function () {
    zombie.rng = () => 0.25;
    zombie.update(player, room);
    expect(zombie.pos.y).toBeCloseTo(160 + ENEMY_TYPES.Zombie.wanderSpeed, 5);
  });

  it("keeps one direction for a while, then rolls a new one", function () {
    let rolls = 0;
    zombie.rng = function () {
      rolls++;
      return 0;
    };
    for (let i = 0; i < 100; i++) {
      zombie.update(player, room);
    }
    expect(rolls).toBe(1);
    for (let i = 0; i < ENEMY_WANDER_FRAMES; i++) {
      zombie.update(player, room);
    }
    expect(rolls).toBe(2);
  });

  it("picks a new direction right away when it hits a wall", function () {
    zombie.pos.set(16, 160); // touching the left wall
    const rolls = [0.5, 0]; // first left (blocked), then right
    let next = 0;
    zombie.rng = () => rolls[next++];
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(16);
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(16 + ENEMY_TYPES.Zombie.wanderSpeed, 5);
  });

  it("picks a new direction when it only slides along a wall", function () {
    zombie.pos.set(16, 160); // against the left wall, heading up and to the left
    const rolls = [0.625, 0];
    let next = 0;
    zombie.rng = () => rolls[next++];
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(16);
    expect(zombie.pos.y).toBeLessThan(160); // slid up along the wall
    zombie.update(player, room);
    expect(zombie.pos.x).toBeGreaterThan(16); // new direction: right
  });

  it("never leaves the room while wandering", function () {
    zombie.detectionRange = 0; // never sees the player, so this is wandering only
    zombie.rng = makeRng(7);
    for (let frame = 0; frame < 3000; frame++) {
      zombie.update(player, room);
      expect(room.collidesWithWall(zombie.getBounds())).toBe(false);
    }
  });

  it("chases at full speed once it sees the player", function () {
    placePlayerRightOf(zombie, player, 100);
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(160 + zombie.speed, 5);
  });

  it("is faster chasing than wandering", function () {
    expect(ENEMY_TYPES.Zombie.wanderSpeed).toBeLessThan(ENEMY_TYPES.Zombie.speed);
  });

  it("does not wander when dead", function () {
    zombie.takeDamage(zombie.maxHealth);
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(160);
    expect(zombie.pos.y).toBe(160);
  });
});

describe("Skeleton keeping its distance (keepDistance)", function () {
  let room;
  let skeleton;
  let player;
  const keep = ENEMY_TYPES.Skeleton.keepRange;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 320);
    skeleton = createEnemy("Skeleton", 160, 160);
    player = new Player(0, 0);
  });

  it("walks toward a player who is far away but in range", function () {
    placePlayerRightOf(skeleton, player, keep + 100);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeCloseTo(160 + skeleton.speed, 5);
  });

  it("backs away from a player who is too close", function () {
    placePlayerRightOf(skeleton, player, keep - 60);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeCloseTo(160 - skeleton.speed, 5);
  });

  it("holds still at its preferred range", function () {
    placePlayerRightOf(skeleton, player, keep);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBe(160);
  });

  it("does nothing when the player is out of range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBe(160);
  });

  it("stops against a wall when backing off instead of walking through it", function () {
    skeleton.pos.set(16, 160); // against the left wall, player on its right and close
    placePlayerRightOf(skeleton, player, 30);
    for (let i = 0; i < 20; i++) {
      skeleton.update(player, room);
    }
    expect(skeleton.pos.x).toBe(16);
    expect(room.collidesWithWall(skeleton.getBounds())).toBe(false);
  });
});

describe("Bat zigzag (erratic)", function () {
  let room;
  let bat;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 320);
    bat = createEnemy("Bat", 100, 150);
    player = new Player(0, 0);
    placePlayerRightOf(bat, player, 200);
  });

  it("moves at its speed each frame", function () {
    const before = bat.pos.copy();
    bat.update(player, room);
    expect(p5.Vector.dist(before, bat.pos)).toBeCloseTo(bat.speed, 5);
  });

  it("does not fly in a straight line to the player", function () {
    for (let i = 0; i < 40; i++) {
      bat.update(player, room);
    }
    expect(Math.abs(bat.pos.y - 150)).toBeGreaterThan(5);
  });

  it("is repeatable: two bats do the same thing", function () {
    const other = createEnemy("Bat", 100, 150);
    for (let i = 0; i < 60; i++) {
      bat.update(player, room);
      other.update(player, room);
    }
    expect(bat.pos.x).toBeCloseTo(other.pos.x, 5);
    expect(bat.pos.y).toBeCloseTo(other.pos.y, 5);
  });

  it("stays still when the player is out of range", function () {
    placePlayerRightOf(bat, player, ENEMY_TYPES.Bat.detectionRange + 50);
    bat.update(player, room);
    expect(bat.pos.x).toBe(100);
    expect(bat.pos.y).toBe(150);
  });

  it("is faster than the Jelly but slower than the player", function () {
    expect(ENEMY_TYPES.Bat.speed).toBeGreaterThan(ENEMY_TYPES.Jelly.speed);
    expect(ENEMY_TYPES.Bat.speed).toBeLessThan(player.speed);
  });
});

describe("Shooting (shoot attack)", function () {
  let skeleton;
  let player;

  beforeEach(function () {
    skeleton = createEnemy("Skeleton", 100, 100);
    player = new Player(0, 0);
    skeleton.attackTimer = 0;
  });

  it("aims at the player: right", function () {
    placePlayerRightOf(skeleton, player, 100);
    const shot = skeleton.tryAttack(player)[0];
    expect(shot.vel.x).toBeGreaterThan(0);
    expect(shot.vel.y).toBeCloseTo(0, 5);
  });

  it("aims at the player: down", function () {
    const center = skeleton.getCenter();
    player.pos.set(center.x - 8, center.y + 100 - 8);
    const shot = skeleton.tryAttack(player)[0];
    expect(shot.vel.y).toBeGreaterThan(0);
    expect(shot.vel.x).toBeCloseTo(0, 5);
  });

  it("uses the attack's damage, speed and color", function () {
    placePlayerRightOf(skeleton, player, 100);
    const attack = ENEMY_TYPES.Skeleton.attack;
    const shot = skeleton.tryAttack(player)[0];
    expect(shot.damage).toBe(attack.damage);
    expect(shot.vel.mag()).toBeCloseTo(attack.speed, 5);
    expect(shot.color).toEqual(attack.color);
  });

  it("starts from the middle of the enemy", function () {
    placePlayerRightOf(skeleton, player, 100);
    const shot = skeleton.tryAttack(player)[0];
    const center = skeleton.getCenter();
    expect(shot.pos.x + shot.length / 2).toBeCloseTo(center.x, 5);
    expect(shot.pos.y + shot.width / 2).toBeCloseTo(center.y, 5);
  });

  it("waits for the cooldown and counts it down with update", function () {
    skeleton.attackTimer = ENEMY_TYPES.Skeleton.attack.cooldown;
    const room = new NormalRoom(0, 0, 640, 320);
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange);
    for (let i = 0; i < ENEMY_TYPES.Skeleton.attack.cooldown - 1; i++) {
      skeleton.update(player, room);
      expect(skeleton.tryAttack(player)).toEqual([]);
    }
    skeleton.update(player, room);
    expect(skeleton.tryAttack(player).length).toBe(1);
  });

  it("does not fire or lose its charge when the player is out of range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    expect(skeleton.tryAttack(player)).toEqual([]);
    expect(skeleton.attackTimer).toBe(0);
  });

  it("fires the moment the player comes into range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    skeleton.tryAttack(player);
    placePlayerRightOf(skeleton, player, 100);
    expect(skeleton.tryAttack(player).length).toBe(1);
  });

  it("does not aim when the player is exactly on top of it", function () {
    player.pos.set(skeleton.getCenter().x - 8, skeleton.getCenter().y - 8);
    expect(skeleton.tryAttack(player)).toEqual([]);
  });

  it("fires nothing for enemies without an attack", function () {
    const jelly = createEnemy("Jelly", 100, 100);
    placePlayerRightOf(jelly, player, 50);
    expect(jelly.tryAttack(player)).toEqual([]);
  });

  it("fires a fan for count above 1, spread degrees apart", function () {
    const eye = createEnemy("Eyeball", 100, 100);
    eye.attackTimer = 0;
    placePlayerRightOf(eye, player, 120);
    const shots = eye.tryAttack(player);
    const spread = (ENEMY_TYPES.Eyeball.attack.spread * Math.PI) / 180;
    expect(shots.length).toBe(3);
    const angles = shots.map((s) => s.vel.heading());
    expect(angles[0]).toBeCloseTo(-spread, 5);
    expect(angles[1]).toBeCloseTo(0, 5);
    expect(angles[2]).toBeCloseTo(spread, 5);
  });

  it("does not change the type table when it fires", function () {
    placePlayerRightOf(skeleton, player, 100);
    const before = JSON.stringify(ENEMY_TYPES.Skeleton);
    skeleton.tryAttack(player);
    expect(JSON.stringify(ENEMY_TYPES.Skeleton)).toBe(before);
  });
});

describe("Eyeball turret (none)", function () {
  it("never moves but still shoots", function () {
    const room = new NormalRoom(0, 0, 640, 320);
    const eye = createEnemy("Eyeball", 100, 100);
    const player = new Player(0, 0);
    placePlayerRightOf(eye, player, 150);
    for (let i = 0; i < ENEMY_TYPES.Eyeball.attack.cooldown; i++) {
      eye.update(player, room);
    }
    expect(eye.pos.x).toBe(100);
    expect(eye.pos.y).toBe(100);
    expect(eye.tryAttack(player).length).toBe(3);
  });
});
