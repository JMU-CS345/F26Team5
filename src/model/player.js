// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_SIZE = 16;
const PLAYER_SPEED = 2; // pixels per frame (the sketch runs at 60 fps)
const PLAYER_MAX_HEALTH = 5;
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

class Player {
  constructor(x, y) {
    this.pos = new p5.Vector(x, y);
    this.size = PLAYER_SIZE;
    this.speed = PLAYER_SPEED;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.health = PLAYER_MAX_HEALTH;
    this.deathFrames = 0; // frames spent dead
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
  }

  // The death screen shows after the animation finishes.
  showDeathScreen() {
    return this.deathFrames >= DEATH_FRAMES;
  }

  // dir is a p5.Vector. setMag keeps diagonals from being faster.
  move(dir, bounds) {
    if (this.isDead() || dir.magSq() === 0) {
      return;
    }
    this.pos.add(dir.copy().setMag(this.speed));
    // Math instead of constrain() because the specs run without a sketch.
    this.pos.x = Math.min(Math.max(this.pos.x, 0), bounds.width - this.size);
    this.pos.y = Math.min(Math.max(this.pos.y, 0), bounds.height - this.size);
  }
}
