// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const PLAYER_SPEED = 2; // pixels per frame (the sketch runs at 60 fps)
const PLAYER_MAX_HEALTH = 5;
const FIRE_COOLDOWN = 15; // frames between shots
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

class Player {
  // mageClass is "Fire", "Ice" or "Mind". It does not change stats yet (#7).
  constructor(x, y, mageClass = null) {
    this.pos = new p5.Vector(x, y);
    this.mageClass = mageClass;
    this.length = PLAYER_LENGTH;
    this.width = PLAYER_WIDTH;
    this.speed = PLAYER_SPEED;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.health = PLAYER_MAX_HEALTH;
    this.deathFrames = 0; // frames spent dead
    this.fireCooldown = 0; // frames until the player can fire again
  }

  fire(dir) {
    if (this.isDead() || this.fireCooldown > 0 || dir.magSq() === 0) {
      return null;
    }
    this.fireCooldown = FIRE_COOLDOWN;
    return new Projectile(
      this.pos.x + this.length / 2,
      this.pos.y + this.width / 2,
      dir
    );
  }

  isDead() {
    return this.health <= 0;
  }

  // Enemies and hazards should call this instead of changing health directly.
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  // Call once per frame. Counts the death animation.
  update() {
    if (this.isDead()) {
      this.deathFrames = Math.min(this.deathFrames + 1, DEATH_FRAMES);
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
    }
  }

  // The death screen shows after the animation finishes.
  showDeathScreen() {
    return this.deathFrames >= DEATH_FRAMES;
  }

  move(dir, room) {
    if (this.isDead() || dir.magSq() === 0) {
      return;
    }
    const step = dir.copy().setMag(this.speed);
    moveWithCollision(this, step.x, step.y, room);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }
}
