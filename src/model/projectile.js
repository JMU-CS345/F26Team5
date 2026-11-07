// Projectile model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PROJECTILE_LENGTH = 8;
const PROJECTILE_WIDTH = 8;
const PROJECTILE_SPEED = 5; // pixels per frame (the sketch runs at 60 fps)
const PROJECTILE_DAMAGE = 1;

class Projectile {
  constructor(x, y, dir) {
    this.length = PROJECTILE_LENGTH;
    this.width = PROJECTILE_WIDTH;
    this.damage = PROJECTILE_DAMAGE;
    this.pos = new p5.Vector(x - this.length / 2, y - this.width / 2);
    this.vel = dir.copy().setMag(PROJECTILE_SPEED);
    this.alive = true;
  }
  
  update(room) {
    this.pos.add(this.vel);
    if (room.collidesWithWall(this.getBounds())) {
      this.alive = false;
    }
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }
}