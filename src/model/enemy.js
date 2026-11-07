// Enemy model. No p5 drawing calls, so Jasmine can test it without a canvas.

const ENEMY_LENGTH = 16;
const ENEMY_WIDTH = 16;
const ENEMY_SPEED = 1;
const ENEMY_MAX_HEALTH = 3;
const ENEMY_DETECTION_RANGE = 200;
const ENEMY_CONTACT_DAMAGE = 1;
const ENEMY_DAMAGE_COOLDOWN = 30; // frames at 60 fps

class Enemy {
  constructor(x, y) {
    this.pos = new p5.Vector(x, y);
    this.length = ENEMY_LENGTH;
    this.width = ENEMY_WIDTH;
    this.speed = ENEMY_SPEED;
    this.maxHealth = ENEMY_MAX_HEALTH;
    this.health = ENEMY_MAX_HEALTH;
    this.detectionRange = ENEMY_DETECTION_RANGE;
    this.contactDamage = ENEMY_CONTACT_DAMAGE;
    // Starts at zero so the enemy can damage the player on its first contact.
    this.damageCooldown = 0;
  }

  isDead() {
    return this.health <= 0;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }

  // Call once per frame. Counts down cooldown and moves toward the player.
  update(player, room) {
    if (this.isDead()) return;
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
    if (this.damageCooldown === 0) {
      this.moveToward(player, room);
    }
  }

  // Moves toward a player only when they are within detection range.
  moveToward(player, room) {
    if (this.isDead()) return;
    const target = player.getCenter().sub(this.getCenter());
    if (target.magSq() > this.detectionRange * this.detectionRange) return;
    const step = target.setMag(this.speed);
    moveWithCollision(this, step.x, step.y, room);
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