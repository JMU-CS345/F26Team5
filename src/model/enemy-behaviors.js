// Movement and attack behaviors, looked up by name from enemy-types.js.
// Model code: no p5 drawing calls. To add a behavior, add one function here and name it
// in a type's row. A behavior uses only the enemy, player and room it is given.

// A move runs once per frame while the enemy is alive and not frozen by a hit.
const ENEMY_MOVES = Object.freeze({
  // Stands still, for turrets.
  none: function (enemy, player, room) {},

  // Walks straight at the player once the player is inside detection range.
  chase: function (enemy, player, room) {
    enemy.moveToward(player, room);
  },

  // Ambles in a random direction until the player is seen, then chases at full speed.
  wanderChase: function (enemy, player, room) {
    if (enemy.canSee(player)) {
      enemy.moveToward(player, room);
      return;
    }
    enemy.wanderTimer--;
    if (enemy.wanderTimer <= 0 || !enemy.wanderDir) {
      enemy.wanderDir = p5.Vector.fromAngle(enemy.rng() * 2 * Math.PI);
      enemy.wanderTimer = ENEMY_WANDER_FRAMES;
    }
    const before = enemy.pos.copy();
    const speed = enemy.type.wanderSpeed;
    moveWithCollision(enemy, enemy.wanderDir.x * speed, enemy.wanderDir.y * speed, room);
    if (p5.Vector.dist(before, enemy.pos) === 0) {
      enemy.wanderTimer = 0; // blocked by a wall, pick a new direction next frame
    }
  },

  // Walks toward the player until keepRange away and backs off when closer. For shooters.
  keepDistance: function (enemy, player, room) {
    if (!enemy.canSee(player)) {
      return;
    }
    const toPlayer = player.getCenter().sub(enemy.getCenter());
    const distance = toPlayer.mag();
    const keepRange = enemy.type.keepRange;
    if (distance > keepRange + ENEMY_KEEP_SLACK) {
      toPlayer.setMag(enemy.speed);
    } else if (distance < keepRange - ENEMY_KEEP_SLACK) {
      toPlayer.setMag(-enemy.speed);
    } else {
      return;
    }
    moveWithCollision(enemy, toPlayer.x, toPlayer.y, room);
  },

  // Zigzags toward the player. enemy.age counts frames, so the wobble is repeatable.
  erratic: function (enemy, player, room) {
    if (!enemy.canSee(player)) {
      return;
    }
    const step = player.getCenter().sub(enemy.getCenter()).setMag(enemy.speed);
    step.rotate(Math.sin(enemy.age / ENEMY_WOBBLE_TIME) * ENEMY_WOBBLE_ANGLE);
    moveWithCollision(enemy, step.x, step.y, room);
  }
});

const ENEMY_WANDER_FRAMES = 120; // how long a wandering enemy keeps one direction
const ENEMY_KEEP_SLACK = 8; // pixels of give around keepRange so shooters do not jitter
const ENEMY_WOBBLE_TIME = 8; // bigger is a slower zigzag
const ENEMY_WOBBLE_ANGLE = 1.2; // radians, the widest swing to either side of the player

// An attack runs once per frame and returns an array of new projectiles, often empty.
const ENEMY_ATTACKS = Object.freeze({
  // Fires count projectiles at the player, spread degrees apart, once the cooldown is over.
  shoot: function (enemy, player) {
    const attack = enemy.type.attack;
    if (enemy.attackTimer > 0 || !enemy.canSee(player)) {
      return [];
    }
    const center = enemy.getCenter();
    const aim = player.getCenter().sub(center);
    if (aim.magSq() === 0) {
      return []; // no direction to aim, and a zero vector would give NaN
    }
    enemy.attackTimer = attack.cooldown;
    const count = attack.count || 1;
    const step = ((attack.spread || 0) * Math.PI) / 180;
    const shots = [];
    for (let i = 0; i < count; i++) {
      const dir = aim.copy();
      dir.rotate((i - (count - 1) / 2) * step);
      const shot = new Projectile(center.x, center.y, dir, attack.damage, attack.speed);
      shot.color = attack.color;
      shots.push(shot);
    }
    return shots;
  }
});
