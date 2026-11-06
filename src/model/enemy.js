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
    this.damageCooldown = 0;
  }

  isDead() {
    return this.health <= 0;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  // Call once per frame. Counts down the contact-damage cooldown.
  update(player, bounds) {
    if (this.isDead()) {
      return;
    }
    this.moveToward(player, bounds);
    this.damageCooldown = Math.max(0, this.damageCooldown - 1);
  }

  // Moves toward a player only when the player is within detection range.
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
      this.pos.x < player.pos.x + player.size &&
      this.pos.x + this.size > player.pos.x &&
      this.pos.y < player.pos.y + player.size &&
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
}