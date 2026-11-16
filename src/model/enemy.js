// Enemy model. No p5 drawing calls, so Jasmine can test it without a canvas.
// What each type is (stats, behaviors, art) lives in enemy-types.js.

const ENEMY_DAMAGE_COOLDOWN = 30; // frames at 60 fps
const ENEMY_HURT_FRAMES = 6; // how long the hit flash lasts
const ENEMY_SWING_FRAMES = 6; // how long a melee swing can hit

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
    this.state = "idle"; // idle, windup, attack or recover. A move behavior sets it.
    this.stateTimer = 0; // frames left in this state
    this.hopDir = null; // locked dash direction for the hop moves
    this.facingLeft = false;
    this.rng = Math.random; // specs swap this out to control wandering
    this.wanderDir = null;
    this.wanderTimer = 0;
  }

  isDead() {
    return this.health <= 0;
  }

  setState(name, frames) {
    this.state = name;
    this.stateTimer = frames;
  }

  takeDamage(amount) {
    if (amount > 0) {
      this.hurtTimer = ENEMY_HURT_FRAMES;
    }
    this.health = Math.max(0, this.health - amount);
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
  update(player, room) {
    if (this.isDead()) {
      return;
    }
    this.age++;
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
    this.attackTimer = Math.max(0, this.attackTimer - 1);
    this.hurtTimer = Math.max(0, this.hurtTimer - 1);
    this.stateTimer = Math.max(0, this.stateTimer - 1);
    if (this.canSee(player)) {
      this.facingLeft = player.getCenter().x < this.getCenter().x;
    }
    if (this.damageCooldown === 0) {
      ENEMY_MOVES[this.type.move](this, player, room);
    }
  }

  // Moves toward a player only when they are within detection range.
  moveToward(player, room) {
    if (this.isDead() || !this.canSee(player)) {
      return;
    }
    const step = player.getCenter().sub(this.getCenter()).setMag(this.speed);
    moveWithCollision(this, step.x, step.y, room);
  }

  // Returns an array of new projectiles. Empty for enemies with no attack.
  tryAttack(player) {
    if (this.isDead() || !this.type.attack) {
      return [];
    }
    return ENEMY_ATTACKS[this.type.attack.kind](this, player);
  }

  // Melee hit: while in the attack state, hurts a player inside a reach box in front of us.
  meleeHit(player) {
    const attack = this.type.attack;
    if (this.isDead() || this.isSpawning() || !attack || attack.kind !== "melee") {
      return false;
    }
    if (this.state !== "attack" || this.damageCooldown > 0) {
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
    player.takeDamage(attack.damage);
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
    this.setState("recover", attack.recover); // one hit per swing
    return true;
  }

  isTouching(player) {
    return rectsOverlap(this.getBounds(), player.getBounds());
  }

  damagePlayer(player) {
    if (this.isDead() || this.damageCooldown > 0 || !this.isTouching(player)) {
      return false;
    }
    player.takeDamage(this.contactDamage);
    this.damageCooldown = ENEMY_DAMAGE_COOLDOWN;
    return true;
  }

  // Returns whether this enemy overlaps a projectile.
  isTouchingProjectile(projectile) {
    return rectsOverlap(this.getBounds(), projectile.getBounds());
  }

  damageFromProjectile(projectile) {
    if (this.isDead() || !projectile.alive || !this.isTouchingProjectile(projectile)) {
      return false;
    }
    this.takeDamage(projectile.damage);
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
