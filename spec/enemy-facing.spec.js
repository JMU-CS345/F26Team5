// Which way an enemy faces, the swing staying visible after a hit, and picking art by direction.
// Uses placePlayerRightOf from enemy.spec.js.
describe("Enemy facing", function () {
  let room;
  let enemy;
  let player;

  // Puts the player dx and dy pixels from the enemy center, then updates once.
  function lookAt(dx, dy) {
    const center = enemy.getCenter();
    player.pos.set(center.x + dx - player.length / 2, center.y + dy - player.width / 2);
    enemy.update(player, room);
  }

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(300, 200, "Eyeball"); // stands still
    player = new Player(0, 0);
  });

  it("starts facing down", function () {
    expect(enemy.facingDir).toBe("down");
  });

  it("picks the dominant axis", function () {
    lookAt(60, 20);
    expect(enemy.facingDir).toBe("right");
    lookAt(-60, 20);
    expect(enemy.facingDir).toBe("left");
    lookAt(20, 60);
    expect(enemy.facingDir).toBe("down");
    lookAt(20, -60);
    expect(enemy.facingDir).toBe("up");
  });

  it("gives a tie to left or right", function () {
    lookAt(40, 40);
    expect(enemy.facingDir).toBe("right");
    lookAt(-40, -40);
    expect(enemy.facingDir).toBe("left");
  });

  it("sets facingAngle from the vector to the player", function () {
    lookAt(0, 50);
    expect(enemy.facingAngle).toBeCloseTo(Math.PI / 2, 5);
    lookAt(-50, 0);
    expect(Math.abs(enemy.facingAngle)).toBeCloseTo(Math.PI, 5);
    lookAt(50, 0);
    expect(enemy.facingAngle).toBeCloseTo(0, 5);
  });

  it("keeps the old facing while the player is out of range", function () {
    lookAt(-60, 0);
    lookAt(enemy.detectionRange + 100, 0);
    expect(enemy.facingDir).toBe("left");
    expect(enemy.facingLeft).toBe(true);
  });
});

describe("Melee swing", function () {
  let room;
  let enemy;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(100, 100);
    enemy.type = {
      ...ENEMY_TYPES.Jelly,
      move: "hopSwing",
      hopRest: 10,
      hopFrames: 5,
      hopSpeed: 2,
      attack: { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 5, recover: 7 }
    };
    player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 20);
  });

  it("hits once per swing and again on the next swing", function () {
    let hits = 0;
    let swings = 0;
    let wasSwinging = false;
    for (let frame = 0; frame < 150; frame++) {
      enemy.update(player, room);
      if (enemy.state === "attack" && !wasSwinging) {
        swings++;
      }
      wasSwinging = enemy.state === "attack";
      if (enemy.meleeHit(player)) {
        hits++;
      }
      player.health = 99; // so the player stays alive and in reach
    }
    expect(swings).toBeGreaterThan(1);
    expect(hits).toBe(swings);
  });

  it("keeps the attack state after a hit, then recovers, then goes idle", function () {
    let sawAttackAfterHit = false;
    let hitFrame = -1;
    for (let frame = 0; frame < 120; frame++) {
      enemy.update(player, room);
      if (hitFrame < 0 && enemy.meleeHit(player)) {
        hitFrame = frame;
      }
      if (hitFrame >= 0 && frame === hitFrame + 3) {
        sawAttackAfterHit = enemy.state === "attack";
      }
      if (hitFrame >= 0 && frame === hitFrame + ENEMY_HIT_PAUSE_FRAMES + 2) {
        expect(enemy.state).toBe("recover"); // not stuck once the hit pause ends
      }
      if (hitFrame >= 0 && frame === hitFrame + ENEMY_HIT_PAUSE_FRAMES + 12) {
        expect(enemy.state).toBe("idle");
        break;
      }
    }
    expect(hitFrame).toBeGreaterThan(0);
    expect(sawAttackAfterHit).toBe(true);
  });
});

describe("Choosing sprite frames", function () {
  const SHEET_SIZES = {
    "assets/enemy/Bouncer.png": { w: 149, h: 288 },
    "assets/enemy/Spark Bark.png": { w: 128, h: 80 }
  };

  it("maps angles to the 8 aim frames", function () {
    const degrees = { 90: 0, 135: 1, 180: 2, "-135": 3, "-90": 4, "-45": 5, 0: 6, 45: 7 };
    for (const key of Object.keys(degrees)) {
      const angle = (Number(key) * Math.PI) / 180;
      expect(aimFrameIndex(angle, 8)).withContext(key + " degrees").toBe(degrees[key]);
    }
  });

  it("keeps the aim frame inside the list for any angle", function () {
    for (let angle = -7; angle <= 7; angle += 0.37) {
      const index = aimFrameIndex(angle, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });

  it("shows the Spark Bark aim frame for where the player is", function () {
    const bark = new Enemy(0, 0, "SparkBark");
    const sprite = bark.type.sprite;
    bark.facingAngle = Math.PI / 2;
    expect(enemySpriteFrame(bark, sprite, 0)).toBe(sprite.aimFrames[0]);
    bark.facingAngle = -Math.PI / 2;
    expect(enemySpriteFrame(bark, sprite, 999)).toBe(sprite.aimFrames[4]);
  });

  it("shows the Bouncer art for its direction and state", function () {
    const bouncer = new Enemy(0, 0, "Bouncer");
    const sprite = bouncer.type.sprite;
    const left = sprite.directions.left;
    bouncer.facingDir = "left";
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.hop[0]);
    bouncer.setState("windup", 5);
    expect(enemySpriteFrame(bouncer, sprite, 50)).toBe(left.hop[0]);
    bouncer.setState("hop", 5);
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.hop[0]);
    expect(enemySpriteFrame(bouncer, sprite, sprite.frameTime)).toBe(left.hop[1]);
    bouncer.setState("attack", 5);
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.attack[0]);
  });

  it("keeps every direction, aim and fallback frame inside its sheet", function () {
    for (const name of ["Bouncer", "SparkBark"]) {
      for (const frame of allSpriteFrames(ENEMY_TYPES[name].sprite)) {
        const size = SHEET_SIZES[frame.sheet];
        expect(size).withContext(frame.sheet).toBeDefined();
        expect(frame.x + (frame.w || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.w);
        expect(frame.y + (frame.h || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.h);
      }
    }
  });

  it("validates directions and aimFrames", function () {
    const frame = { sheet: "a.png", x: 0, y: 0 };
    const set = { hop: [frame], attack: [frame] };
    const dirs = { down: set, up: set, left: set, right: set };
    const base = { ...ENEMY_TYPES.Jelly };
    const withSprite = (extra) => ({
      Test: { ...base, sprite: { frameTime: 5, frames: [frame], ...extra } }
    });
    expect(validateEnemyTypes(withSprite({ directions: dirs, aimFrames: [frame] }))).toEqual([]);
    const missing = { ...dirs, up: { hop: [frame], attack: [] } };
    expect(validateEnemyTypes(withSprite({ directions: missing }))).toEqual([
      "Test: sprite.directions.up.attack must be a non-empty list"
    ]);
    expect(validateEnemyTypes(withSprite({ aimFrames: [] }))).toEqual([
      "Test: sprite.aimFrames must be a non-empty list"
    ]);
  });
});
