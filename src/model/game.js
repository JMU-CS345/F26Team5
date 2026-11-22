// Game state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks which screen the game is on, and the mage class and appearance the player picked.
// The character creator is three steps: playermodel, class, look.

const GAME_STATES = Object.freeze({
  TITLE: "title",
  SETTINGS: "settings", // opened from the title or the pause menu
  CREDITS: "credits",
  MODEL: "model", // character creator, step 1: pick a playermodel
  MENU: "menu", // character creator, step 2: pick a class
  CUSTOMIZE: "customize", // character creator, step 3: pick the look (#23)
  PLAYING: "playing",
  INVENTORY: "inventory",
  PAUSED: "paused",
  DEAD: "dead",
  VICTORY: "victory" // the last boss is dead
});

// Order matters: it is the order shown on the menu and the 1/2/3 key mapping.
const MAGE_CLASSES = Object.freeze(["Fire", "Ice", "Mind"]);

class Game {
  constructor() {
    this.state = GAME_STATES.TITLE;
    this.selectedModel = null;
    this.selectedClass = null;
    this.settingsReturn = GAME_STATES.TITLE; // where Back from settings goes
    this.appearance = makeAppearance(); // kept between runs, so it starts as last time's look
  }

  isTitle() {
    return this.state === GAME_STATES.TITLE;
  }

  isSettings() {
    return this.state === GAME_STATES.SETTINGS;
  }

  isCredits() {
    return this.state === GAME_STATES.CREDITS;
  }

  isModelSelect() {
    return this.state === GAME_STATES.MODEL;
  }

  // The class menu.
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

  isPaused() {
    return this.state === GAME_STATES.PAUSED;
  }

  isDead() {
    return this.state === GAME_STATES.DEAD;
  }

  isVictory() {
    return this.state === GAME_STATES.VICTORY;
  }

  // Enemies, shots and timers only move on these states. Pause, inventory and every menu
  // freeze the world.
  shouldSimulate() {
    return this.isPlaying() || this.isDead();
  }

  // New Run on the title screen goes to the model screen.
  startCharacterSelect() {
    if (!this.isTitle()) {
      return false;
    }
    this.state = GAME_STATES.MODEL;
    return true;
  }

  // Picks a playermodel and moves on to the class menu. Only works on the model screen, and
  // only for a real model.
  selectModel(modelName) {
    if (!this.isModelSelect() || !PLAYER_MODEL_NAMES.includes(modelName)) {
      return false;
    }
    this.selectedModel = modelName;
    this.state = GAME_STATES.MENU;
    return true;
  }

  openSettings() {
    if (!this.isTitle() && !this.isPaused()) {
      return false;
    }
    this.settingsReturn = this.state;
    this.state = GAME_STATES.SETTINGS;
    return true;
  }

  closeSettings() {
    if (!this.isSettings()) {
      return false;
    }
    this.state = this.settingsReturn;
    return true;
  }

  openCredits() {
    if (!this.isTitle()) {
      return false;
    }
    this.state = GAME_STATES.CREDITS;
    return true;
  }

  closeCredits() {
    if (!this.isCredits()) {
      return false;
    }
    this.state = GAME_STATES.TITLE;
    return true;
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

  // Esc or the window losing focus during a run.
  pause() {
    if (!this.isPlaying()) {
      return false;
    }
    this.state = GAME_STATES.PAUSED;
    return true;
  }

  resume() {
    if (!this.isPaused()) {
      return false;
    }
    this.state = GAME_STATES.PLAYING;
    return true;
  }

  // Restart Run on the pause menu keeps the picked model and class. The sketch builds the
  // new dungeon.
  restartRun() {
    if (!this.isPaused()) {
      return false;
    }
    this.state = GAME_STATES.PLAYING;
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

  // Sets one part of the look (body, eyes, shirt or pants) to a hex color like "#3c78e6".
  // Only works on the customization screen, and only for a real part and a valid color.
  changeAppearance(part, hex) {
    if (!this.isCustomizing() || !APPEARANCE_PARTS.includes(part) || !isValidHex(hex)) {
      return false;
    }
    this.appearance = setAppearanceColor(this.appearance, part, hex);
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

  // The final boss is dead. Only a run in play can be won.
  winRun() {
    if (!this.isPlaying()) {
      return false;
    }
    this.state = GAME_STATES.VICTORY;
    return true;
  }

  // Leaving a run (death screen or Quit to Title) or backing out of character select.
  // Clears the picked model and class, but keeps the appearance.
  backToTitle() {
    const allowed =
      this.isModelSelect() || this.isMenu() || this.isCustomizing() ||
      this.isPaused() || this.isDead() || this.isVictory();
    if (!allowed) {
      return false;
    }
    this.selectedModel = null;
    this.selectedClass = null;
    this.state = GAME_STATES.TITLE;
    return true;
  }
}

// True on the one frame the death screen starts, so the death sound plays once per death.
function playerJustDied(game, player) {
  if (!player.showDeathScreen()) {
    return false;
  }
  return game.playerDied();
}
