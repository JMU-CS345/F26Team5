// Game state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks which screen the game is on, and the playermodel and mage class the player picked.

const GAME_STATES = Object.freeze({
  MODEL: "model", // character creator, step 1: pick a playermodel
  MENU: "menu", // character creator, step 2: pick a class
  PLAYING: "playing",
  DEAD: "dead"
});

// Order matters: it is the order shown on the menu and the 1/2/3 key mapping.
const MAGE_CLASSES = Object.freeze(["Fire", "Ice", "Mind"]);

class Game {
  constructor() {
    this.state = GAME_STATES.MODEL;
    this.selectedModel = null;
    this.selectedClass = null;
  }

  isModelSelect() {
    return this.state === GAME_STATES.MODEL;
  }

  // The class menu, the second step of the character creator.
  isMenu() {
    return this.state === GAME_STATES.MENU;
  }

  isPlaying() {
    return this.state === GAME_STATES.PLAYING;
  }

  isDead() {
    return this.state === GAME_STATES.DEAD;
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

  // Picks a class and starts the run. Only works from the class menu, and only for a
  // real class, so a stray key press cannot start a run mid-game.
  selectClass(mageClass) {
    if (!this.isMenu() || !MAGE_CLASSES.includes(mageClass)) {
      return false;
    }
    this.selectedClass = mageClass;
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

  // Starting a new run goes back to the start of the character creator.
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