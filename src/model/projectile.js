// Projectile model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PROJECTILE_LENGTH = 8;
const PROJECTILE_WIDTH = 8;
const PROJECTILE_SPEED = 5; // pixels per frame (the sketch runs at 60 fps)
const PROJECTILE_DAMAGE = 1;

class Projectile {
  constructor(x, y, dir, damage = PROJECTILE_DAMAGE, speed = PROJECTILE_SPEED) {
    this.length = PROJECTILE_LENGTH;
    this.width = PROJECTILE_WIDTH;
    this.damage = damage;
    this.pos = new p5.Vector(x - this.length / 2, y - this.width / 2);
    this.vel = dir.copy().setMag(speed);
    this.alive = true;
    this.age = 0; // frames flown, for animated pictures
    this.shooter = null; // name of the enemy type that fired it, so the view can pick its picture
    this.element = null; // "Fire", "Ice" or "Mind" for a weapon's shot. Enemies can be weak or strong against it.
    this.art = null; // key into WEAPON_ART for a weapon's shot. Null draws a plain square.
    this.charged = false; // true for the shot a full charge makes, which can have its own picture
    this.scale = 1; // how much bigger than normal the picture is drawn (a charged fireball)
    this.pierce = 0; // how many more enemies the shot can pass through before it stops
    this.hitEnemies = []; // enemies a piercing shot already hurt, so it hurts each only once
    this.homing = 0; // radians per frame it can turn toward a target (see steerToward)
  }

  // Makes the shot a bit bigger or smaller around its middle. Keeps the picture in step.
  resize(scale) {
    const cx = this.pos.x + this.length / 2;
    const cy = this.pos.y + this.width / 2;
    this.length = PROJECTILE_LENGTH * scale;
    this.width = PROJECTILE_WIDTH * scale;
    this.pos.set(cx - this.length / 2, cy - this.width / 2);
    this.scale = scale;
  }

  // Turns the shot's direction toward a point, by at most `homing` radians. Does nothing for a
  // shot that does not home. Its speed does not change.
  steerToward(target) {
    if (this.homing <= 0) {
      return;
    }
    const want = Math.atan2(target.y - (this.pos.y + this.width / 2), target.x - (this.pos.x + this.length / 2));
    let turn = want - Math.atan2(this.vel.y, this.vel.x);
    turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // the short way round, -PI to PI
    turn = Math.max(-this.homing, Math.min(this.homing, turn));
    const speed = this.vel.mag();
    const angle = Math.atan2(this.vel.y, this.vel.x) + turn;
    this.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }
  
  update(room) {
    this.age++;
    this.pos.add(this.vel);
    if (room.collidesWithWall(this.getBounds())) {
      this.alive = false;
    }
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  // True while the shot can hurt the player. A plain shot always can.
  canHurt() {
    return true;
  }

  // Called when the shot has just hurt the player. A plain shot is used up.
  onHit() {
    this.alive = false;
  }

  // The way the shot shoves the player. A plain shot pushes along its flight.
  hitDirection(player) {
    return this.vel;
  }
}

// A bolt of lightning called down from the sky onto one spot. It does not fly. For `warn` frames
// it only marks the spot, then for `active` frames it can hurt the player (once), then it is gone.
// The view draws it from age: the marker while warning, the bolt and the impact while active.
class LightningStrike extends Projectile {
  // x and y are the center of the spot. size is the width and length of the area it hurts.
  constructor(x, y, damage, warn, active, size = 16) {
    super(x, y, new p5.Vector(0, 1), damage, 0);
    this.length = size;
    this.width = size;
    this.pos.set(x - size / 2, y - size / 2);
    this.warn = warn;
    this.active = active;
    this.isStrike = true; // the view draws these differently from a flying shot
    this.hasHit = false;
  }

  update(room) {
    this.age++;
    if (this.age >= this.warn + this.active) {
      this.alive = false; // a strike is not stopped by walls: it comes from above
    }
  }

  isStriking() {
    return this.age >= this.warn && this.age < this.warn + this.active;
  }

  canHurt() {
    return this.isStriking() && !this.hasHit;
  }

  // The bolt stays on screen after it hurts the player, but only hurts once.
  onHit() {
    this.hasHit = true;
  }

  // Straight away from the middle of the bolt (straight down the screen if dead center).
  hitDirection(player) {
    const away = player.getCenter().sub(new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2));
    return away.magSq() === 0 ? new p5.Vector(0, 1) : away;
  }
}
