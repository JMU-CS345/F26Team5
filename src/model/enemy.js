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
const ROOM_GRACE_FRAMES = 30; // template enemies are harmless this long after the room loads

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
    this.damageCooldown = 0;
    this.attackTimer = 0; // frames until the next shot
    if (type.attack) {
      this.attackTimer = type.attack.cooldown;
    }
    this.age = 0; // frames alive, for behaviors that wobble
    this.hurtTimer = 0; // frames left of the hit flash
    this.phaseFlashTimer = 0; // frames left of the phase change flash
    this.state = "idle"; // idle, windup, attack or recover. A move behavior sets it.
    this.stateTimer = 0; // frames left in this state
    this.hopDir = null; // locked dash direction for the hop moves
    this.knockback = new p5.Vector(0, 0); // pixels per frame, shrinks as the shove fades
    this.knockbackTimer = 0;
    this.graceTimer = 0; // harmless while above zero, set when the player enters the room
    this.spawnTimer = 0; // createEnemy can raise this so the enemy fades in harmless
    this.facingLeft = false;
    this.facingDir = "down"; // "down", "up", "left" or "right", the side the player is on
    this.facingAngle = Math.PI / 2; // radians toward the player, 0 is right and y grows down
    this.swingHit = false; // true once the current swing has hurt the player
    this.rng = Math.random; // specs swap this out to control wandering
    this.wanderDir = null;
    this.wanderTimer = 0;
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

  // Enemies that cannot hurt anyone yet: still appearing, or in the room's grace period.
  isHarmless() {
    return this.isSpawning() || this.graceTimer > 0;
  }

  // fromDir is the direction the hit travels. Leave it out for damage with no shove.
  takeDamage(amount, fromDir) {
    if (amount > 0) {
      this.hurtTimer = ENEMY_HURT_FRAMES;
    }
    if (amount > 0 && fromDir && fromDir.magSq() > 0) {
      let shove = ENEMY_KNOCKBACK_SPEED;
      if (this.type.boss) {
        shove = shove / 2; // bosses are heavy
      }
      this.knockback = fromDir.copy().setMag(shove);
      this.knockbackTimer = ENEMY_KNOCKBACK_FRAMES;
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
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }

  // True when the player is inside detection range.
  canSee(player) {
    const toPlayer = player.getCenter().sub(this.getCenter());
    return toPlayer.magSq() <= this.detectionRange * this.detectionRange;
  }

  // Call once per frame. Counts the timers down and runs the type's move behavior.
  // frozen is true while dialogue is open: nothing changes at all.
  update(player, room, frozen = false) {
    if (this.isDead() || frozen) {
      return;
    }
    this.age++;
    this.graceTimer = Math.max(0, this.graceTimer - 1);
    if (this.isSpawning()) {
      this.spawnTimer--;
      return;
    }
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
    this.attackTimer = Math.max(0, this.attackTimer - 1);
    this.hurtTimer = Math.max(0, this.hurtTimer - 1);
    this.phaseFlashTimer = Math.max(0, this.phaseFlashTimer - 1);
    this.stateTimer = Math.max(0, this.stateTimer - 1);
    if (this.canSee(player)) {
      this.faceToward(player);
    }
    if (this.knockbackTimer > 0) {
      moveWithCollision(this, this.knockback.x, this.knockback.y, room);
      this.knockback.mult(ENEMY_KNOCKBACK_DECAY);
      this.knockbackTimer--;
    } else if (this.damageCooldown === 0) {
      ENEMY_MOVES[this.getMoveName()](this, player, room);
    }
  }

  // Remembers which way the player is. The art picks its direction from these.
  faceToward(player) {
    const toPlayer = player.getCenter().sub(this.getCenter());
    this.facingLeft = toPlayer.x < 0;
    this.facingAngle = toPlayer.heading();
    if (Math.abs(toPlayer.y) > Math.abs(toPlayer.x)) {
      if (toPlayer.y > 0) {
        this.facingDir = "down";
      } else {
        this.facingDir = "up";
      }
    } else if (toPlayer.x < 0) {
      this.facingDir = "left";
    } else {
      this.facingDir = "right";
    }
  }

  // Moves toward a player only when they are within detection range.
  moveToward(player, room) {
    if (this.isDead() || !this.canSee(player)) {
      return;
    }
    const step = player.getCenter().sub(this.getCenter()).setMag(this.getSpeed());
    moveWithCollision(this, step.x, step.y, room);
  }

  // Returns an array of new projectiles. Empty for enemies with no attack.
  tryAttack(player) {
    const attack = this.getAttack();
    if (this.isDead() || this.isHarmless() || !attack) {
      return [];
    }
    return ENEMY_ATTACKS[attack.kind](this, player);
  }

  // Melee hit: while in the attack state, hurts a player inside a reach box in front of us.
  meleeHit(player) {
    const attack = this.getAttack();
    if (this.isDead() || this.isHarmless() || !attack || attack.kind !== "melee") {
      return false;
    }
    if (this.state !== "attack" || this.swingHit || this.damageCooldown > 0) {
      return false;
    }
    const center = this.getCenter();
    let left = center.x;
    if (this.facingLeft) {
      left = center.x - attack.reach;
    }
    const box = { x: left, y: center.y - attack.reach / 2, w: attack.reach, h: attack.reach };
    if (!rectsOverlap(box, player.getBounds())) {
      return false;
    }
    if (!player.takeDamage(attack.damage, player.getCenter().sub(center))) {
      return false; // the player is in i-frames, so try again next frame
    }
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
    this.swingHit = true; // one hit per swing, and the sword stays out
    return true;
  }

  isTouching(player) {
    return rectsOverlap(this.getBounds(), player.getBounds());
  }

  damagePlayer(player) {
    if (this.isDead() || this.isHarmless() || this.damageCooldown > 0) {
      return false;
    }
    if (!this.isTouching(player)) {
      return false;
    }
    const push = player.getCenter().sub(this.getCenter());
    if (!player.takeDamage(this.contactDamage, push)) {
      return false;
    }
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
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
    if (!this.isTouchingProjectile(projectile)) {
      return false;
    }
    this.takeDamage(projectile.damage, projectile.vel);
    projectile.alive = false;
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
