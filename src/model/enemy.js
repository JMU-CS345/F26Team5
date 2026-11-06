// Enemy model. No p5 drawing calls, so Jasmine can test it without a canvas.

const ENEMY_SIZE = 16;
const ENEMY_SPEED = 1;
const ENEMY_MAX_HEALTH = 3;
const ENEMY_DETECTION_RANGE = 200;
const ENEMY_CONTACT_DAMAGE = 1;
const ENEMY_DAMAGE_COOLDOWN = 30; // frames at 60 fps

class Enemy {
  constructor(x, y) {
    this.pos = new p5.Vector(x, y);
    this.size = ENEMY_SIZE;
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

  // Call once per frame. Counts down cooldown and moves toward the player.
  update(player, bounds) {
    if (this.isDead()) {
      return;
    }
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
    if (this.damageCooldown === 0) {
      this.moveToward(player, bounds);
    }
  }

  // Moves toward a player only when they are within detection range.
  moveToward(player, bounds) {
    if (this.isDead()) {
      return;
    }
    const target = player.pos.copy().sub(this.pos);
    if (target.magSq() > this.detectionRange * this.detectionRange) {
      return;
    }
    this.pos.add(target.setMag(this.speed));
    this.pos.x = Math.min(Math.max(this.pos.x, 0), bounds.width - this.size);
    this.pos.y = Math.min(Math.max(this.pos.y, 0), bounds.height - this.size);
  }

  isTouching(player) {
    return (
      this.pos.x < player.pos.x + player.length &&
      this.pos.x + this.size > player.pos.x &&
      this.pos.y < player.pos.y + player.width &&
      this.pos.y + this.size > player.pos.y
    );
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
    return (
      this.pos.x < projectile.pos.x + projectile.length &&
      this.pos.x + this.size > projectile.pos.x &&
      this.pos.y < projectile.pos.y + projectile.width &&
      this.pos.y + this.size > projectile.pos.y
    );
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