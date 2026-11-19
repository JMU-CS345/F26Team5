// Game state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks which screen the game is on, and the playermodel, mage class and appearance the
// player picked.

const GAME_STATES = Object.freeze({
  MODEL: "model", // character creator, step 1: pick a playermodel
  MENU: "menu", // character creator, step 2: pick a class
  CUSTOMIZE: "customize", // character creator, step 3: pick the look (#23)
  PLAYING: "playing",
  INVENTORY: "inventory",
  DEAD: "dead"
});

// Order matters: it is the order shown on the menu and the 1/2/3 key mapping.
const MAGE_CLASSES = Object.freeze(["Fire", "Ice", "Mind"]);

class Game {
  constructor() {
    this.state = GAME_STATES.MODEL;
    this.selectedModel = null;
    this.selectedClass = null;
    this.appearance = makeAppearance(); // kept between runs, so it starts as last time's look
  }

  isModelSelect() {
    return this.state === GAME_STATES.MODEL;
  }

  // The class menu, the second step of the character creator.
  isMenu() {
    return this.state === GAME_STATES.MENU;
  }

  // The customization screen, the last step of the character creator.
  isCustomizing() {
    return this.state === GAME_STATES.CUSTOMIZE;
  }

  isPlaying() {
    return this.state === GAME_STATES.PLAYING;
  }

  isInventory() {
    return this.state === GAME_STATES.INVENTORY;
  }

  isDead() {
    return this.state === GAME_STATES.DEAD;
  }

  openInventory() {
    if (!this.isPlaying()) {
      return false;
    }
    this.state = GAME_STATES.INVENTORY;
    return true;
  }

  closeInventory() {
    if (!this.isInventory()) {
      return false;
    }
    this.state = GAME_STATES.PLAYING;
    return true;
  }

  toggleInventory() {
    if (this.isPlaying()) {
      return this.openInventory();
    }
    if (this.isInventory()) {
      return this.closeInventory();
    }
    return false;
  }

  // Picks a playermodel and moves on to the class menu. Only works on the model
  // screen, and only for a real model.
  selectModel(modelName) {
    if (!this.isModelSelect() || !PLAYER_MODEL_NAMES.includes(modelName)) {
      return false;
    }
    this.selectedModel = modelName;
    this.state = GAME_STATES.MENU;
    return true;
  }

  // Picks a class and moves on to the customization screen. Only works from the class
  // menu, and only for a real class, so a stray key press cannot change it mid-game.
  selectClass(mageClass) {
    if (!this.isMenu() || !MAGE_CLASSES.includes(mageClass)) {
      return false;
    }
    this.selectedClass = mageClass;
    this.state = GAME_STATES.CUSTOMIZE;
    return true;
  }

  // Moves one part of the look to the next (step 1) or previous (step -1) option.
  // Only works on the customization screen.
  changeAppearance(part, step) {
    if (!this.isCustomizing() || !APPEARANCE_PARTS.includes(part)) {
      return false;
    }
    this.appearance = cycleAppearance(this.appearance, part, step);
    return true;
  }

  // Finishes the character creator and starts the run.
  finishCustomization() {
    if (!this.isCustomizing()) {
      return false;
    }
    this.state = GAME_STATES.PLAYING;
    return true;
  }

  // Called once the death animation has finished.
  playerDied() {
    if (!this.isPlaying()) {
      return false;
    }
    this.state = GAME_STATES.DEAD;
    return true;
  }

  // Starting a new run goes back to the start of the character creator. The appearance is
  // kept, so the customization screen starts on the last look.
  newRun() {
    if (!this.isDead()) {
      return false;
    }
    this.selectedModel = null;
    this.selectedClass = null;
    this.state = GAME_STATES.MODEL;
    return true;
  }
}
