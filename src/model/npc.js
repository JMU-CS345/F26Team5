// NPC model. No p5 drawing calls, so Jasmine can test it without a canvas.

const NPC_LENGTH = 16;
const NPC_WIDTH = 16;
const NPC_TALK_DISTANCE = 40; // max interaction distance in pixels

const NPC_PRESETS = Object.freeze({
  Villager: {
    name: "Villager",
    dialogue: [
      "Hello, traveler!",
      "Welcome to our village.",
      "The dungeon to the north is full of dangerous monsters."
    ],
    choices: [
      { text: "Ask about dungeon", response: "The dungeon is deep and treacherous. Watch out for traps and beasts!" },
      { text: "Say goodbye", response: "Safe travels, adventurer!" }
    ]
  },
  Shopkeeper: {
    name: "Shopkeeper",
    dialogue: [
      "Welcome to my shop, traveler!",
      "I am preparing my wares for dungeon explorers.",
      "Come back soon once my new stock arrives!"
    ],
    choices: [
      { text: "Browse stock", response: "Fresh health potions and magical scrolls are arriving soon!" },
      { text: "Leave shop", response: "Come back anytime!" }
    ]
  },
  Elder: {
    name: "Elder",
    dialogue: [
      "Greetings, young mage.",
      "The ancient magic flows strong within you.",
      "Master the elements of Fire, Ice, and Mind to overcome your foes."
    ],
    choices: [
      { text: "Ask about magic", response: "Fire burns fierce, Ice freezes and slows, and Mind pierces the soul." },
      { text: "Thank the Elder", response: "May the spirits guide your path." }
    ]
  },
  Guard: {
    name: "Guard",
    speed: 1,
    dialogue: [
      "Halt! Peace in the settlement, traveler.",
      "I patrol this path to keep the villagers safe."
    ],
    choices: [
      { text: "Report danger", response: "We keep watch day and night. Report any monsters outside the walls." },
      { text: "Carry on", response: "Keep your wits sharp." }
    ]
  }
});

class NPC {
  // Config can be:
  // - a preset name (e.g. "Shopkeeper")
  // - an array of strings (dialogue lines)
  // - a config object: { name, dialogue, choices, path, speed }
  constructor(x, y, config = null, options = {}) {
    this.pos = new p5.Vector(x, y);
    this.length = NPC_LENGTH;
    this.width = NPC_WIDTH;

    let base = {};
    if (typeof config === "string" && NPC_PRESETS[config]) {
      base = NPC_PRESETS[config];
    } else if (Array.isArray(config)) {
      base = { dialogue: config };
    } else if (config && typeof config === "object") {
      base = config;
    }

    const merged = Object.assign({}, base, options);

    this.name = merged.name || "Villager";
    this.dialogue = Array.isArray(merged.dialogue) && merged.dialogue.length > 0
      ? merged.dialogue.slice()
      : ["Hello, traveler!", "Be careful in the dungeons."];
    this.choices = Array.isArray(merged.choices) ? merged.choices.slice() : [];

    this.currentLine = 0;
    this.isTalking = false;
    this.selectedChoice = null;
    this.choiceResponse = null;

    this.path = Array.isArray(merged.path) && merged.path.length > 0
      ? merged.path.map((pt) => ({ x: pt.x, y: pt.y }))
      : null;
    this.currentWaypointIndex = 0;
    if (this.path && this.path.length > 1) {
      const first = this.path[0];
      if (Math.abs(first.x - x) < 0.001 && Math.abs(first.y - y) < 0.001) {
        this.currentWaypointIndex = 1;
      }
    }
    this.speed = typeof merged.speed === "number" ? merged.speed : (this.path ? 1 : 0);
    this.isMoving = Boolean(this.path && this.path.length > 0 && this.speed > 0);
    this.facing = "down";
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  // Returns true if player is within speaking range
  canInteract(player) {
    if (!player) return false;
    const playerCenter = player.getCenter
      ? player.getCenter()
      : new p5.Vector(player.pos.x + player.length / 2, player.pos.y + player.width / 2);
    return this.getCenter().dist(playerCenter) <= NPC_TALK_DISTANCE;
  }

  hasChoices() {
    return (
      this.isTalking &&
      this.choiceResponse === null &&
      this.currentLine === this.dialogue.length - 1 &&
      this.choices.length > 0 &&
      this.selectedChoice === null
    );
  }

  getCurrentChoices() {
    if (!this.hasChoices()) return [];
    return this.choices.map((c) => (typeof c === "string" ? c : c.text));
  }

  choose(index) {
    if (!this.hasChoices() || index < 0 || index >= this.choices.length) {
      return false;
    }
    this.selectedChoice = index;
    const choice = this.choices[index];
    this.choiceResponse = typeof choice === "object" && choice.response ? choice.response : "";
    return true;
  }

  // Advances dialogue, selects default choice, or closes text box if finished
  interact() {
    if (!this.isTalking) {
      this.isTalking = true;
      this.currentLine = 0;
      this.selectedChoice = null;
      this.choiceResponse = null;
      this.isMoving = false; // Pause NPC movement when talking
      return;
    }

    if (this.choiceResponse !== null) {
      this.closeDialogue();
      return;
    }

    if (this.hasChoices()) {
      this.choose(0);
      return;
    }

    if (this.currentLine < this.dialogue.length - 1) {
      this.currentLine++;
    } else {
      this.closeDialogue();
    }
  }

  closeDialogue() {
    this.isTalking = false;
    this.currentLine = 0;
    this.selectedChoice = null;
    this.choiceResponse = null;
    if (this.path && this.path.length > 0 && this.speed > 0) {
      this.isMoving = true; // Resume moving when dialogue closes
    }
  }

  getCurrentText() {
    if (!this.isTalking) return "";
    if (this.choiceResponse !== null) {
      return this.choiceResponse;
    }
    if (this.dialogue.length === 0) return "";
    return this.dialogue[this.currentLine] || "";
  }

  // Moves along waypoint path when not talking
  update(room = null) {
    if (this.isTalking) {
      this.isMoving = false;
      return;
    }

    if (!this.path || this.path.length === 0 || this.speed <= 0) {
      this.isMoving = false;
      return;
    }

    this.isMoving = true;
    const target = this.path[this.currentWaypointIndex];
    if (!target) return;

    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= this.speed * this.speed) {
      this.pos.x = target.x;
      this.pos.y = target.y;
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.path.length;
    } else {
      const dist = Math.sqrt(distSq);
      const step = Math.min(this.speed, dist);
      const stepX = (dx / dist) * step;
      const stepY = (dy / dist) * step;

      if (Math.abs(stepX) > Math.abs(stepY)) {
        this.facing = stepX > 0 ? "right" : "left";
      } else {
        this.facing = stepY > 0 ? "down" : "up";
      }

      if (room && typeof moveWithCollision === "function") {
        moveWithCollision(this, stepX, stepY, room);
      } else {
        this.pos.x += stepX;
        this.pos.y += stepY;
      }
    }
  }
}

function createNPC(presetOrName, x, y, options = {}) {
  return new NPC(x, y, presetOrName, options);
}
