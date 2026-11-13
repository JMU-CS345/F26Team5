// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const FIRE_COOLDOWN = 15; // frames between shots
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

class Player {
  // mageClass is "Fire", "Ice" or "Mind". It picks the starting stats (see player-stats.js).
  constructor(x, y, mageClass = null, modelName = "Tall") {
    this.pos = new p5.Vector(x, y);
    this.mageClass = mageClass;
    this.modelName = modelName;
    this.length = PLAYER_LENGTH;
    this.width = PLAYER_WIDTH;
    this.stats = getStatsForClass(mageClass);
    this.speed = this.stats.speed;
    this.maxHealth = this.stats.health;
    this.health = this.maxHealth;
    this.deathFrames = 0; // frames spent dead
    this.fireCooldown = 0; // frames until the player can fire again

    // Animation state. The view reads these to pick a sprite frame.
    this.facing = "down"; // "down", "up", "left" or "right"
    this.walkFrames = 0; // frames spent walking, 0 when standing still
    this.holding = false; // a fire key is held
  }

  // Sets facing from a direction vector. On an exact diagonal, faces up/down.
  faceToward(dir) {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      this.facing = dir.x > 0 ? "right" : "left";
    } else {
      this.facing = dir.y > 0 ? "down" : "up";
    }
  }

  // The weapon is raised while a fire key is held and for the cooldown after a shot.
  isArmUp() {
    return this.holding || this.fireCooldown > 0;
  }

  fire(dir) {
    this.holding = !this.isDead() && dir.magSq() > 0;
    if (this.isDead() || this.fireCooldown > 0 || dir.magSq() === 0) {
      return null; // can't shoot yet, so don't turn either
    }
    this.faceToward(dir);
    this.fireCooldown = FIRE_COOLDOWN;
    return new Projectile(
      this.pos.x + this.length / 2,
      this.pos.y + this.width / 2,
      dir,
      this.getDamage(PROJECTILE_DAMAGE, this.mageClass)
    );
  }

  // Damage for an attack of the given element, scaled by the matching stat.
  getDamage(baseDamage, element) {
    return scaleDamage(baseDamage, element, this.stats);
  }

  isDead() {
    return this.health <= 0;
  }

  // Enemies and hazards should call this instead of changing health directly.
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  // Call once per frame. Counts the death animation and the fire cooldown.
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
      this.walkFrames = 0;
      return;
    }
    if (!this.isArmUp()) {
      this.faceToward(dir); // keep the shot direction while the arm is up
    }
    this.walkFrames++;
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