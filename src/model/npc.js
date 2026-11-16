// NPC model. No p5 drawing calls, so Jasmine can test it without a canvas.
// An NPC is a static, friendly character that stands in the world.
// It cannot move, take damage, or interact with the combat system.

const NPC_SIZE = 16; // default width and height, matches the tile grid

class Npc {
  constructor(x, y, name) {
    if (!name || typeof name !== "string") {
      throw new Error("NPC must have a name");
    }
    this.pos = new p5.Vector(x, y);
    this.length = NPC_SIZE;
    this.width = NPC_SIZE;
    this.name = name;
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }
}
