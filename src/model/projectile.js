// Projectile model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PROJECTILE_LENGTH = 8;
const PROJECTILE_WIDTH = 8;
const PROJECTILE_SPEED = 5; // pixels per frame (the sketch runs at 60 fps)
const PROJECTILE_DAMAGE = 1;

class Projectile {
  // options (all optional): range in pixels before it fades, pierce for how many extra
  // targets it passes through, onHit(ctx) from the weapon, and the player who fired it.
  constructor(x, y, dir, damage = PROJECTILE_DAMAGE, speed = PROJECTILE_SPEED, options = {}) {
    this.length = PROJECTILE_LENGTH;
    this.width = PROJECTILE_WIDTH;
    this.damage = damage;
    this.pos = new p5.Vector(x - this.length / 2, y - this.width / 2);
    this.vel = dir.copy().setMag(speed);
    this.alive = true;
    this.range = options.range === undefined ? Infinity : options.range;
    this.pierce = options.pierce || 0;
    this.onHit = options.onHit || null;
    this.weapon = options.weapon || null;
    this.owner = options.owner || null;
    this.traveled = 0; // pixels flown so far
    this.hitTargets = []; // so a piercing shot hurts each target once
  }

  update(room) {
    this.pos.add(this.vel);
    this.traveled += this.vel.mag();
    if (this.traveled >= this.range || room.collidesWithWall(this.getBounds())) {
      this.alive = false;
    }
  }

  canHit(target) {
    return this.alive && !this.hitTargets.includes(target);
  }

  // Call after a hit lands. The shot ends once it has passed through all it can.
  registerHit(target) {
    this.hitTargets.push(target);
    if (this.hitTargets.length > this.pierce) {
      this.alive = false;
    }
    if (typeof this.onHit === "function") {
      this.onHit({
        player: this.owner,
        target: target,
        damage: this.damage,
        weapon: this.weapon
      });
    }
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }
}
