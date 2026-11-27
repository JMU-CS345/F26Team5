// Enemy model. No p5 drawing calls, so Jasmine can test it without a canvas.
// What each type is (stats, behaviors, art) lives in enemy-types.js.

const ENEMY_DAMAGE_COOLDOWN = 30; // frames at 60 fps
const ENEMY_HURT_FRAMES = 6; // how long the hit flash lasts
const ENEMY_PHASE_FLASH_FRAMES = 30; // how long the boss bar flashes after a phase change
const ENEMY_SWING_FRAMES = 10; // how long a melee swing can hit
const ENEMY_KNOCKBACK_SPEED = 3; // pixels per frame at the start of a shove
const ENEMY_KNOCKBACK_FRAMES = 8;
const ENEMY_KNOCKBACK_DECAY = 0.8; // the shove keeps this much of its speed each frame
const ENEMY_SPAWN_FRAMES = 30; // harmless while the spawn-in ring plays
const ENEMY_HIT_PAUSE_FRAMES = 12; // an enemy that just hurt the player stops steering this long
const ENEMY_ALERT_FRAMES = 90; // how long an enemy keeps hunting the last place it saw the player
const ENEMY_SEPARATION_FRACTION = 0.8; // enemies push apart when closer than this share of their size
const ENEMY_SEPARATION_SPEED = 0.6; // most pixels per frame an enemy gives way to a neighbor
const ENEMY_REPLAN_FRAMES = 20; // how often a walking enemy rebuilds its tile route
const ENEMY_WAKE_FRAMES = 60; // after the player walks in, enemies hold still and harmless this long
const ENEMY_LINE_ALERT_FRAMES = 360; // a line-of-sight hunter keeps running to the spot this long
const ENEMY_BLOCK_FRAMES = 8; // how long the shield flash lasts after a blocked hit
const ENEMY_FRONT_COSINE = Math.SQRT1_2; // a hit counts as head-on inside 45 degrees of the facing
const ENEMY_FACING_VECTORS = Object.freeze({
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0]
});

class Enemy {
  // typeName is a key of ENEMY_TYPES. With no name it is a Jelly.
  constructor(x, y, typeName = "Jelly") {
    const type = ENEMY_TYPES[typeName];
    if (!type) {
      throw new Error("Unknown enemy type: " + typeName);
    }
    this.typeName = typeName;
    this.type = type; // read only, shared by every enemy of this type
    this.pos = new p5.Vector(x, y);
    this.length = type.length;
    this.width = type.width;
    this.speed = type.speed;
    this.maxHealth = type.maxHealth;
    this.health = type.maxHealth;
    this.detectionRange = type.detectionRange;
    this.contactDamage = type.contactDamage;
    // Starts at zero so the enemy can damage the player on its first contact.
    this.damageCooldown = 0; // frames before this enemy may hurt the player again
    this.ramCooldown = 0; // frames before the player's outstretched sword can ram this enemy again
    this.recoverTimer = 0; // frames this enemy stays put after hurting the player
    this.attackTimer = 0; // frames until the next shot or swing
    if (type.attack) {
      this.attackTimer = type.attack.cooldown;
    }
    this.age = 0; // frames alive, for behaviors that wobble
    this.hurtTimer = 0; // frames left of the hit flash
    this.blockTimer = 0; // frames left of the shield flash after a hit was blocked
    this.phaseFlashTimer = 0; // frames left of the phase change flash
    this.state = "idle"; // idle, windup, attack or recover. A move behavior sets it.
    this.stateTimer = 0; // frames left in this state
    this.memory = {}; // what the move and attack behaviors remember between frames, emptied by resetMoveState
    this.knockback = new p5.Vector(0, 0); // pixels per frame, shrinks as the shove fades
    this.knockbackTimer = 0;
    this.spawnTimer = 0; // createEnemy can raise this so the enemy fades in harmless
    this.wakeTimer = 0; // frames left of holding still after the player entered the room
    this.walkFrames = 0; // frames spent walking, like the player's, 0 when standing still
    this.fell = false; // true if it died by falling into a pit
    this.facingLeft = false;
    this.facingDir = "down"; // "down", "up", "left" or "right", the side the player is on
    this.facingAngle = Math.PI / 2; // radians toward the player, 0 is right and y grows down
    this.swingHit = false; // true once the current swing has hurt the player
    this.alertTimer = 0; // frames left of hunting the last place the player was seen
    this.home = this.pos.copy(); // where it spawned, which a patrol route is measured from
    this.patrolPath = null; // this enemy's own patrol route, or null to use the type's
    this.patrolIndex = 0; // which stop of the route it is walking to
    this.lastKnown = null; // where the player was when last seen
    this.lastMoveName = null; // lets update() notice a phase swapping the move behavior
    this.route = null; // tiles still to walk, from findTilePath, or null when none is planned
    this.routeGoal = null; // the goal tile the route was planned for
    this.routeAge = 0; // frames since the route was planned
    this.rng = Math.random; // specs swap this out to control wandering
  }

  isDead() {
    return this.health <= 0;
  }

  // The active phase of the type, or null. The smallest matching below wins.
  getPhase() {
    const phases = this.type.phases;
    if (!phases) {
      return null;
    }
    const fraction = this.health / this.maxHealth;
    let active = null;
    for (const phase of phases) {
      if (fraction < phase.below && (!active || phase.below < active.below)) {
        active = phase;
      }
    }
    return active;
  }

  getMoveName() {
    const phase = this.getPhase();
    if (phase && phase.move) {
      return phase.move;
    }
    return this.type.move;
  }

  getAttack() {
    const phase = this.getPhase();
    if (phase && phase.attack) {
      return phase.attack;
    }
    return this.type.attack;
  }

  getSpeed() {
    const phase = this.getPhase();
    if (phase && typeof phase.speed === "number") {
      return phase.speed;
    }
    return this.speed;
  }

  justChangedPhase() {
    return this.phaseFlashTimer > 0;
  }

  setState(name, frames) {
    this.state = name;
    this.stateTimer = frames;
  }

  isSpawning() {
    return this.spawnTimer > 0;
  }

  // True during the pause after the player walks into the room. The enemy neither moves, attacks
  // nor hurts the player, so one standing by a door cannot hit the player the moment they arrive.
  isWaking() {
    return this.wakeTimer > 0;
  }

  // Starts the pause, and drops anything the enemy was in the middle of or hunting.
  startWakeDelay(frames = ENEMY_WAKE_FRAMES) {
    if (this.isDead()) {
      return;
    }
    this.wakeTimer = frames;
    this.knockbackTimer = 0;
    this.recoverTimer = 0;
    this.alertTimer = 0;
    this.lastKnown = null;
    this.resetMoveState();
  }

  // True when a hit travelling along fromDir lands on the front of a shielded enemy (blocksFront).
  // A hit with no direction, or one that lands on a side or the back, is never blocked.
  blocksHit(fromDir) {
    if (!this.type.blocksFront || !fromDir || fromDir.magSq() === 0) {
      return false;
    }
    const front = ENEMY_FACING_VECTORS[this.facingDir];
    // The hit comes from the side it is travelling away from, so the front is hit when the hit
    // travels against the way the enemy faces.
    const headOn = -(fromDir.x * front[0] + fromDir.y * front[1]) / fromDir.mag();
    return headOn > ENEMY_FRONT_COSINE + 0.000001;
  }

  // fromDir is the direction the hit travels. Leave it out for damage with no shove.
  // element is "Fire", "Ice" or "Mind" for an elemental hit: the damage is doubled if this enemy is
  // weak to it and halved if it resists (see weakTo and resists in enemy-types.js). Leave it out
  // for a neutral hit.
  // Returns false when a shield blocked the hit, so it did nothing, and true otherwise.
  takeDamage(amount, fromDir, element = null) {
    if (amount > 0 && this.blocksHit(fromDir)) {
      this.blockTimer = ENEMY_BLOCK_FRAMES;
      return false;
    }
    amount *= getElementMultiplier(this.type, element);
    if (amount > 0) {
      this.hurtTimer = ENEMY_HURT_FRAMES;
    }
    if (amount > 0 && fromDir) {
      this.applyKnockback(fromDir);
    }
    if (amount > 0 && !this.type.boss) {
      this.interrupt(); // a hit breaks a windup or a dash. Bosses are heavy and keep going.
    }
    const phaseBefore = this.getPhase();
    this.health = Math.max(0, this.health - amount);
    if (this.getPhase() !== phaseBefore) {
      this.phaseFlashTimer = ENEMY_PHASE_FLASH_FRAMES;
      const attack = this.getAttack();
      if (attack) {
        // A faster attack should start soon, but a phase change never delays a shot.
        this.attackTimer = Math.min(this.attackTimer, attack.cooldown);
      }
    }
    return true;
  }

  // Shoves the enemy along dir (any length). Bosses are heavy and move half as far.
  applyKnockback(dir, speed = ENEMY_KNOCKBACK_SPEED) {
    if (!dir || dir.magSq() === 0 || this.type.noKnockback) {
      return;
    }
    this.knockback = dir.copy().setMag(this.type.boss ? speed / 2 : speed);
    this.knockbackTimer = ENEMY_KNOCKBACK_FRAMES;
    this.route = null; // a shove knocks it off its route
  }

  // Cancels a windup (a swing or a telegraphed shot) or a dash. A swing already out is not cut
  // short. What it does to each is up to the attack or move behavior.
  interrupt() {
    if (this.state === "windup") {
      const attack = this.getAttack();
      if (attack) {
        ENEMY_ATTACKS[attack.kind].interrupt(this, attack);
      } else {
        this.setState("idle", 0);
      }
    }
    const move = ENEMY_MOVES[this.getMoveName()];
    if (move.interrupt) {
      move.interrupt(this);
    }
  }

  // Puts the enemy back to idle and makes it forget what its behaviors were remembering. Used
  // when a phase swaps the move behavior mid-state.
  resetMoveState() {
    this.setState("idle", 0);
    this.swingHit = false;
    this.route = null;
    this.memory = {};
  }

  // True for hoppers and bouncers, which go straight at the player and ignore walls and sight.
  isDirectMover() {
    return ENEMY_MOVES[this.getMoveName()].direct === true;
  }

  // True while winding up an attack, or while its swing or aftermath plays out. Walkers stand
  // still for it, so the attack is telegraphed.
  isPlanted() {
    return (this.state === "windup" || this.state === "attack" || this.state === "recover") && !this.isDirectMover();
  }

  // True for enemies that face the way they walk (type.facing) instead of turning to the player.
  facesTravel() {
    return this.type.facing === "travel";
  }

  // The speed while the player is in sight: type.sightSpeed when it has one, else the normal speed.
  getSightSpeed() {
    return Math.max(this.getSpeed(), this.type.sightSpeed || 0);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }

  // True when the player is inside detection range and, if a room is given, no wall is between.
  // Works on plain numbers because it runs several times per enemy per frame.
  canSee(player, room) {
    if (this.usesLineVision()) {
      return this.seesAlongFacing(player, room);
    }
    const ex = this.pos.x + this.length / 2;
    const ey = this.pos.y + this.width / 2;
    const px = player.pos.x + player.length / 2;
    const py = player.pos.y + player.width / 2;
    const dx = px - ex;
    const dy = py - ey;
    if (dx * dx + dy * dy > this.detectionRange * this.detectionRange) {
      return false;
    }
    if (room && !this.isDirectMover() && typeof room.hasLineOfSight === "function") {
      return room.hasLineOfSight(ex, ey, px, py);
    }
    return true;
  }

  // True for enemies that only see along the row or column of tiles they face (type.vision).
  usesLineVision() {
    return this.type.vision === "line";
  }

  // Line vision: true when the player stands in the same tile row or column the enemy faces, ahead
  // of it, within detection range, with no wall in between.
  seesAlongFacing(player, room) {
    const ts = room ? room.tileSize : TILE_SIZE;
    const originX = room ? room.x : 0;
    const originY = room ? room.y : 0;
    const from = this.getCenter();
    const to = player.getCenter();
    const ahead = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[this.facingDir];
    const horizontal = ahead[1] === 0;
    const myLane = Math.floor(((horizontal ? from.y : from.x) - (horizontal ? originY : originX)) / ts);
    const theirLane = Math.floor(((horizontal ? to.y : to.x) - (horizontal ? originY : originX)) / ts);
    if (myLane !== theirLane) {
      return false;
    }
    const distance = horizontal ? (to.x - from.x) * ahead[0] : (to.y - from.y) * ahead[1];
    if (distance <= 0 || distance > this.detectionRange) {
      return false;
    }
    if (!room || typeof room.hasLineOfSight !== "function") {
      return true;
    }
    return horizontal
      ? room.hasLineOfSight(from.x, from.y, to.x, from.y)
      : room.hasLineOfSight(from.x, from.y, from.x, to.y);
  }

  // True when the player is inside detection range, walls or not. An enemy hears the player
  // through a wall and walks around it. Shooting and sight speed still need canSee. Line vision
  // enemies are only ever aware of a player they can see along their facing.
  isAware(player, room) {
    if (this.usesLineVision()) {
      return this.canSee(player, room);
    }
    const dx = player.pos.x + player.length / 2 - (this.pos.x + this.length / 2);
    const dy = player.pos.y + player.width / 2 - (this.pos.y + this.width / 2);
    return dx * dx + dy * dy <= this.detectionRange * this.detectionRange;
  }

  // Remembers where the player was while within range, and counts the memory down once the player
  // is out of range. Returns whether the enemy is aware of the player right now.
  senseTarget(player, room) {
    if (this.isAware(player, room)) {
      this.alertTimer = this.usesLineVision() ? ENEMY_LINE_ALERT_FRAMES : ENEMY_ALERT_FRAMES;
      this.lastKnown = player.getCenter();
      return true;
    }
    if (this.alertTimer > 0) {
      this.alertTimer--;
      const spot = this.lastKnown;
      // Arrived when the walk along the tile route to the spot's tile is finished, or, with no tile
      // map to route over, when it is standing close enough to the spot.
      const routeDone =
        spot && room && this.route !== null && this.route.length === 0 && this.routeGoal === this.tileKey(spot, room);
      const closeEnough = spot && spot.dist(this.getCenter()) < Math.max(2, this.getSpeed());
      if (routeDone || closeEnough) {
        this.alertTimer = 0;
      }
    }
    if (this.alertTimer === 0) {
      this.lastKnown = null;
    }
    return false;
  }

  // The point to move toward: the player while within range, else the last place they were
  // noticed, else null.
  getTarget(player, room) {
    if (this.isAware(player, room)) {
      return player.getCenter();
    }
    if (this.alertTimer > 0 && this.lastKnown) {
      return this.lastKnown.copy();
    }
    return null;
  }

  // Direction from this enemy to the player, never zero.
  directionTo(player) {
    const dir = player.getCenter().sub(this.getCenter());
    if (dir.magSq() === 0) {
      return p5.Vector.fromAngle(this.facingAngle);
    }
    return dir;
  }

  // Call once per frame. Counts the timers down and runs the type's move behavior.
  update(player, room) {
    if (this.isDead()) {
      return;
    }
    this.age++;
    if (this.isSpawning()) {
      this.spawnTimer--;
      this.walkFrames = 0;
      return;
    }
    if (this.isWaking()) {
      this.wakeTimer--;
      this.walkFrames = 0;
      return;
    }
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
    this.ramCooldown = Math.max(0, this.ramCooldown - 1);
    this.attackTimer = Math.max(0, this.attackTimer - 1);
    this.hurtTimer = Math.max(0, this.hurtTimer - 1);
    this.blockTimer = Math.max(0, this.blockTimer - 1);
    this.phaseFlashTimer = Math.max(0, this.phaseFlashTimer - 1);
    this.recoverTimer = Math.max(0, this.recoverTimer - 1);
    this.stateTimer = Math.max(0, this.stateTimer - 1);
    const moveName = this.getMoveName();
    if (this.lastMoveName !== null && moveName !== this.lastMoveName) {
      this.resetMoveState(); // a phase swapped the move, so the old state means nothing now
    }
    this.lastMoveName = moveName;
    const before = this.pos.copy();
    const aware = this.senseTarget(player, room);
    if (aware && this.state !== "attack" && !this.usesLineVision() && !this.facesTravel()) {
      this.faceToward(player); // the facing is locked while a swing is out
    }
    if (this.knockbackTimer > 0) {
      moveWithCollision(this, this.knockback.x, this.knockback.y, room);
      this.knockback.mult(ENEMY_KNOCKBACK_DECAY);
      this.knockbackTimer--;
    } else if (this.recoverTimer === 0 && !this.isPlanted()) {
      ENEMY_MOVES[moveName].run(this, player, room);
      this.separate(room);
    }
    this.walkFrames = this.pos.dist(before) > 0.01 ? this.walkFrames + 1 : 0;
    // A shove can carry it over a pit. Fliers and bosses stay up.
    if (!this.type.flies && !this.type.boss && room && typeof room.isPitAt === "function") {
      const center = this.getCenter();
      if (room.isPitAt(center.x, center.y)) {
        this.fall();
      }
    }
  }

  // True while the enemy keeps out of pits. A flier crosses them, and a shoved enemy goes wherever
  // the shove takes it. moveWithCollision reads this.
  get avoidsPits() {
    return !this.type.flies && this.knockbackTimer <= 0;
  }

  // Drops into a pit and dies there. The room treats it like any other kill.
  fall() {
    this.health = 0;
    this.fell = true;
    this.knockbackTimer = 0;
  }

  // Gives way to overlapping neighbors so a group does not collapse into one blob.
  // Turrets stay put, and a dash keeps its line.
  separate(room) {
    const move = ENEMY_MOVES[this.getMoveName()];
    if (!room || !room.enemies || move.stationary || (move.dashState && this.state === move.dashState)) {
      return;
    }
    const mine = this.getCenter();
    for (const other of room.enemies) {
      if (other === this || other.isDead() || other.isSpawning()) {
        continue;
      }
      const theirs = other.getCenter();
      let dx = mine.x - theirs.x;
      let dy = mine.y - theirs.y;
      const minDist = ((this.length + other.length) / 2) * ENEMY_SEPARATION_FRACTION;
      if (dx * dx + dy * dy >= minDist * minDist) {
        continue;
      }
      if (dx === 0 && dy === 0) {
        dx = room.enemies.indexOf(this) > room.enemies.indexOf(other) ? 1 : -1; // exact overlap
      }
      const dist = Math.hypot(dx, dy);
      const push = Math.min(ENEMY_SEPARATION_SPEED, minDist - dist);
      moveWithCollision(this, (dx / dist) * push, (dy / dist) * push, room);
    }
  }

  // Remembers which way the player is. The art picks its direction from these.
  faceToward(player) {
    const toPlayer = player.getCenter().sub(this.getCenter());
    this.faceDirection(toPlayer.x, toPlayer.y);
  }

  // Turns to face the way (dx, dy) points. Used for walking and for looking at the player.
  faceDirection(dx, dy) {
    this.facingLeft = dx < 0;
    this.facingAngle = Math.atan2(dy, dx);
    if (Math.abs(dy) > Math.abs(dx)) {
      this.facingDir = dy > 0 ? "down" : "up";
    } else if (dx < 0) {
      this.facingDir = "left";
    } else {
      this.facingDir = "right";
    }
  }

  // A label for the tile a pixel point is on, to tell whether a route's goal has moved.
  tileKey(point, room) {
    const ts = room.tileSize;
    return Math.floor((point.x - room.x) / ts) + "," + Math.floor((point.y - room.y) / ts);
  }

  // Follows the tiles toward the player while within range, then toward where they were last noticed.
  moveAlongTiles(player, room, speed = this.getSpeed()) {
    const target = this.getTarget(player, room);
    if (target) {
      this.walkTileRoute(target, room, speed);
    }
  }

  // Walks one frame toward a point along whole tiles, in straight horizontal and vertical lines
  // and around walls. The route is rebuilt every ENEMY_REPLAN_FRAMES frames, when the goal moves
  // to another tile, and after a shove. It first lines up with the row or column it is about to
  // run along, so it ends up on the tile grid.
  walkTileRoute(target, room, speed = this.getSpeed()) {
    if (this.isDead() || !target) {
      return;
    }
    if (!room || typeof room.findTilePath !== "function") {
      const step = target.copy().sub(this.getCenter()); // no tile map, so just head straight there
      if (step.magSq() >= 1) {
        step.setMag(speed);
        moveWithCollision(this, step.x, step.y, room);
      }
      return;
    }
    const ts = room.tileSize;
    const goal = this.tileKey(target, room);
    this.routeAge++;
    if (!this.route || goal !== this.routeGoal || this.routeAge >= ENEMY_REPLAN_FRAMES) {
      const startCol = Math.round((this.pos.x - room.x) / ts);
      const startRow = Math.round((this.pos.y - room.y) / ts);
      const fw = Math.ceil(this.length / ts);
      const fh = Math.ceil(this.width / ts);
      const found = room.findTilePath(startCol, startRow, fw, fh, target.x, target.y);
      if (found === null) {
        this.alertTimer = 0; // no way there, so stop hunting that spot
      }
      this.route = found || [];
      this.routeGoal = goal;
      this.routeAge = 0;
    }
    const tiny = 0.000001;
    let remaining = speed;
    while (remaining > tiny && this.route.length > 0) {
      const next = this.route[0];
      const dx = room.x + next.col * ts - this.pos.x;
      const dy = room.y + next.row * ts - this.pos.y;
      if (Math.abs(dx) < tiny && Math.abs(dy) < tiny) {
        this.route.shift();
        continue;
      }
      // Line up across the lane first, then run along it.
      const alongX = next.horizontal ? Math.abs(dy) < tiny : Math.abs(dx) >= tiny;
      const delta = alongX ? dx : dy;
      const move = Math.sign(delta) * Math.min(Math.abs(delta), remaining);
      const startX = this.pos.x;
      const startY = this.pos.y;
      moveWithCollision(this, alongX ? move : 0, alongX ? 0 : move, room);
      const moved = Math.abs(this.pos.x - startX) + Math.abs(this.pos.y - startY);
      if (moved < tiny) {
        this.routeAge = ENEMY_REPLAN_FRAMES; // blocked, so plan again next frame
        return;
      }
      remaining -= moved;
      if (this.usesLineVision() || this.facesTravel()) {
        this.faceDirection(alongX ? move : 0, alongX ? 0 : move); // look where it is going
      }
    }
  }

  // Moves straight toward the player while within range, then toward where they were last noticed.
  // Ignores the tile grid, for anything that flies or dashes.
  moveToward(player, room) {
    if (this.isDead()) {
      return;
    }
    const target = this.getTarget(player, room);
    if (!target) {
      return;
    }
    const step = target.sub(this.getCenter());
    if (step.magSq() < 1) {
      return; // already standing on the last known spot
    }
    step.setMag(this.getSpeed());
    moveWithCollision(this, step.x, step.y, room);
  }

  // Returns an array of new projectiles. Empty for enemies with no attack.
  tryAttack(player, room) {
    const attack = this.getAttack();
    if (this.isDead() || this.isSpawning() || this.isWaking() || !attack) {
      return [];
    }
    return ENEMY_ATTACKS[attack.kind].run(this, player, room);
  }

  // Melee hit: while in the attack state, hurts a player inside a reach box in front of us.
  // A zap (short range lightning) is hit the same way, with a thinner box.
  meleeHit(player) {
    const attack = this.getAttack();
    if (this.isDead() || player.isFalling() || !attack || (attack.kind !== "melee" && attack.kind !== "zap")) {
      return false;
    }
    if (this.state !== "attack" || this.swingHit || this.damageCooldown > 0) {
      return false;
    }
    if (!rectsOverlap(this.getSwingBox(attack.reach, attack.thickness, attack.sideRaise), player.getBounds())) {
      return false;
    }
    player.takeDamage(attack.damage, this.directionTo(player));
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
    this.recoverTimer = ENEMY_HIT_PAUSE_FRAMES;
    this.swingHit = true; // one hit per swing, and the sword stays out
    return true;
  }

  // The box the sword (or bolt) covers, on the side the enemy faces. It reaches `reach` pixels
  // from the enemy's center and is `thickness` wide, which is `reach` for a sword, so a sword
  // covers a square. Matches the four way swing art. `raise` lifts a box that points left or right
  // that many pixels, for an enemy whose hands are above its middle.
  getSwingBox(reach, thickness = reach, raise = 0) {
    const c = this.getCenter();
    if (this.facingDir === "left") {
      return { x: c.x - reach, y: c.y - thickness / 2 - raise, w: reach, h: thickness };
    }
    if (this.facingDir === "right") {
      return { x: c.x, y: c.y - thickness / 2 - raise, w: reach, h: thickness };
    }
    if (this.facingDir === "up") {
      return { x: c.x - thickness / 2, y: c.y - reach, w: thickness, h: reach };
    }
    return { x: c.x - thickness / 2, y: c.y, w: thickness, h: reach };
  }

  isTouching(player) {
    return rectsOverlap(this.getBounds(), player.getBounds());
  }

  damagePlayer(player) {
    if (this.isDead() || player.isFalling() || this.isSpawning() || this.isWaking() || this.damageCooldown > 0) {
      return false;
    }
    if (!this.isTouching(player)) {
      return false;
    }
    const away = this.directionTo(player); // from this enemy toward the player
    player.takeDamage(this.contactDamage, away);
    this.applyKnockback(away.copy().mult(-1)); // and the enemy recoils the other way
    if (this.state !== "windup") {
      this.interrupt(); // running into the player ends a dash (a windup carries on)
    }
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
    this.recoverTimer = ENEMY_HIT_PAUSE_FRAMES;
    return true;
  }

  // Returns whether this enemy overlaps a projectile.
  isTouchingProjectile(projectile) {
    return rectsOverlap(this.getBounds(), projectile.getBounds());
  }

  damageFromProjectile(projectile) {
    if (this.isDead() || this.isSpawning() || !projectile.alive) {
      return false;
    }
    if (projectile.hitEnemies.includes(this) || !this.isTouchingProjectile(projectile)) {
      return false;
    }
    const hurt = this.takeDamage(projectile.damage, projectile.vel, projectile.element);
    if (hurt && projectile.pierce > 0) {
      projectile.pierce--; // passes through, and will not hurt this enemy again
      projectile.hitEnemies.push(this);
    } else {
      projectile.alive = false;
    }
    return true;
  }

  // The player walks into the enemy with the sword out. If it overlaps the ram area ({ x, y, w, h })
  // it is hurt and shoved along dir, once per cooldown frames. Returns whether it was touched,
  // even when a shield blocked the damage, so the player can be shoved back either way.
  damageFromRam(hitbox, amount, dir, element, cooldown) {
    if (this.isDead() || this.isSpawning() || this.ramCooldown > 0
        || !rectsOverlap(this.getBounds(), hitbox)) {
      return false;
    }
    this.takeDamage(amount, dir, element);
    this.ramCooldown = cooldown;
    return true;
  }

  // Hurts the enemy if it overlaps a sword's hitbox ({ x, y, w, h }). dir is the way the swing
  // goes, which shoves the enemy. Returns whether it was touched, so the caller can count one hit
  // per swing.
  damageFromSlash(hitbox, amount, dir, element = null) {
    if (this.isDead() || this.isSpawning() || !rectsOverlap(this.getBounds(), hitbox)) {
      return false;
    }
    this.takeDamage(amount, dir, element);
    return true;
  }
}

// Drops dead enemies from the room and returns them, so loot or a boss exit can react once.
function removeDeadEnemies(room) {
  const dead = room.enemies.filter((enemy) => enemy.isDead());
  room.enemies = room.enemies.filter((enemy) => !enemy.isDead());
  return dead;
}

// Returns only the bosses from a list of dead enemies, like the one removeDeadEnemies returns.
function findDeadBosses(deadEnemies) {
  return deadEnemies.filter((enemy) => enemy.type.boss);
}
