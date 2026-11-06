// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const PLAYER_SPEED = 2; // pixels per frame (the sketch runs at 60 fps)
const PLAYER_MAX_HEALTH = 5;
const FIRE_COOLDOWN = 15; // frames between shots
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

class Player {
  constructor(x, y) {
    this.pos = new p5.Vector(x, y);
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


  move(dir, bounds, room = null, offsetX = 0, offsetY = 0) {
    // Do not move if the player is dead or no direction is pressed.
    if (this.isDead() || dir.magSq() === 0) {
      return;
    }

    // Normalize movement speed to prevent faster diagonal movement.
    const movement = dir.copy().setMag(this.speed);

    if (room) {
      // Calculate the playable boundaries inside the room walls.
      // Offsets account for the room's position on the canvas.
      const minX = offsetX + room.tileSize;
      const minY = offsetY + room.tileSize;
      const maxX = offsetX + room.width - room.tileSize - this.length;
      const maxY = offsetY + room.height - room.tileSize - this.width;

      // Move the player while keeping them inside the room walls.
      this.pos.x = Math.min(
        Math.max(this.pos.x + movement.x, minX),
        maxX
      );

      this.pos.y = Math.min(
        Math.max(this.pos.y + movement.y, minY),
        maxY
      );
    } else {
      // Preserve the original canvas boundary behavior if no room is given.
      this.pos.add(movement);

      // Clamp the player to the canvas without requiring p5 constrain().
      this.pos.x = Math.min(
        Math.max(this.pos.x, 0),
        bounds.width - this.length
      );

      this.pos.y = Math.min(
        Math.max(this.pos.y, 0),
        bounds.height - this.width
      );
    }
  }


  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }
}
