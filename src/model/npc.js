// NPC model. No p5 drawing calls, so Jasmine can test it without a canvas.
// An NPC is a static or wandering friendly character that stands in the world.
// It cannot take damage or interact with combat.

const NPC_SIZE = 16; // default width and height, matches the tile grid
const NPC_INTERACTION_DISTANCE = 36; // pixels within which player can interact

class Npc {
  constructor(x, y, name, dialogue = [], choices = []) {
    if (!name || typeof name !== "string") {
      throw new Error("NPC must have a name");
    }
    this.pos = new p5.Vector(x, y);
    this.length = NPC_SIZE;
    this.width = NPC_SIZE;
    this.name = name;
    this.choices = choices.slice(); // [{ id, label }] shown after the last page, like a shop

    // Normalizes dialogue into an array of string pages
    if (typeof dialogue === "string") {
      this.dialogue = dialogue.length > 0 ? [dialogue] : ["..."];
    } else if (Array.isArray(dialogue) && dialogue.length > 0) {
      this.dialogue = dialogue.slice();
    } else {
      this.dialogue = ["..."];
    }
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }

  getDialoguePages() {
    return this.dialogue.slice();
  }

  // Returns true if the player is within interaction distance of this NPC
  isPlayerNear(player, distance = NPC_INTERACTION_DISTANCE) {
    if (!player || typeof player.getCenter !== "function") {
      return false;
    }
    const toPlayer = player.getCenter().sub(this.getCenter());
    return toPlayer.magSq() <= distance * distance;
  }
}
