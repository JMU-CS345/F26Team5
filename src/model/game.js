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

// Order matters: it is the order shown on the menu, left to right.
const MAGE_CLASSES = Object.freeze(["Fire", "Ice", "Mind"]);

class Game {
  constructor() {
    this.state = GAME_STATES.MODEL;
    this.selectedModel = null;
    this.selectedClass = null;
    this.menuIndex = 0; // which choice is highlighted on the playermodel or class screen
    this.hexBuffer = null; // the hex digits typed so far in the character creator, or null when not typing one
    this.appearance = makeAppearance(); // kept between runs, so it starts as last time's look
  }

  // The choices on the current menu screen: the playermodels (left to right) on the model screen, the
  // classes on the class menu, and the parts of the look (top to bottom) in the character creator.
  // Empty on every other screen.
  getMenuChoices() {
    if (this.isModelSelect()) {
      return PLAYER_MODEL_NAMES;
    }
    if (this.isMenu()) {
      return MAGE_CLASSES;
    }
    if (this.isCustomizing()) {
      return APPEARANCE_PARTS; // the rows of the character creator, top to bottom
    }
    return [];
  }

  // The highlighted choice, or null when the screen has none.
  getHighlightedChoice() {
    const choices = this.getMenuChoices();
    return choices.length === 0 ? null : choices[this.menuIndex];
  }

  // Moves the highlight by step (-1 for left or up, 1 for right or down). It wraps round at the ends. Returns
  // false when the screen has no choices.
  moveMenuCursor(step) {
    const count = this.getMenuChoices().length;
    if (count === 0 || this.isEnteringHex()) {
      return false;
    }
    this.menuIndex = (((this.menuIndex + step) % count) + count) % count;
    return true;
  }

  // Picks the highlighted choice: the model on the model screen, the class on the class menu.
  // Returns false when there is nothing to pick.
  confirmMenuChoice() {
    if (this.isModelSelect()) {
      return this.selectModel(this.getHighlightedChoice());
    }
    if (this.isMenu()) {
      return this.selectClass(this.getHighlightedChoice());
    }
    return false;
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
    this.menuIndex = 0;
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
    this.menuIndex = 0;
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

  isEnteringHex() {
    return this.hexBuffer !== null;
  }

  // Starts typing a hex code for the highlighted part, in the character creator. Returns false
  // anywhere else.
  startHexEntry() {
    if (!this.isCustomizing()) {
      return false;
    }
    this.hexBuffer = "";
    return true;
  }

  // Adds one hex digit (0-9, a-f, either case) to the code being typed, up to six. Returns whether it
  // was added.
  typeHexDigit(digit) {
    if (!this.isEnteringHex() || this.hexBuffer.length >= 6 || !/^[0-9a-fA-F]$/.test(digit)) {
      return false;
    }
    this.hexBuffer += digit.toLowerCase();
    return true;
  }

  // Deletes the last digit typed. Returns whether there was one.
  deleteHexDigit() {
    if (!this.isEnteringHex() || this.hexBuffer.length === 0) {
      return false;
    }
    this.hexBuffer = this.hexBuffer.slice(0, -1);
    return true;
  }

  // Stops typing and keeps the part's color as it was.
  cancelHexEntry() {
    this.hexBuffer = null;
  }

  // The color the digits typed so far make, like "#ffcc99", or null while they are not three or six
  // digits. The screen shows it as a preview.
  getHexEntryColor() {
    return this.isEnteringHex() ? normalizeHex("#" + this.hexBuffer) : null;
  }

  // Sets the highlighted part to the typed code and stops typing. A code that is not three or six
  // digits is not applied and typing carries on (returns false). Enter with nothing typed gives up.
  confirmHexEntry() {
    if (!this.isEnteringHex()) {
      return false;
    }
    if (this.hexBuffer === "") {
      this.hexBuffer = null;
      return false;
    }
    const color = this.getHexEntryColor();
    if (color === null) {
      return false;
    }
    this.appearance = setAppearanceColor(this.appearance, this.getHighlightedChoice(), color);
    this.hexBuffer = null;
    return true;
  }

  // In the character creator, moves the highlighted part (body, eyes, shirt or pants) to the next
  // color in its palette (step 1) or the previous one (step -1). Returns false anywhere else.
  cycleHighlightedColor(step) {
    if (!this.isCustomizing() || this.isEnteringHex()) {
      return false;
    }
    this.appearance = cyclePaletteColor(this.appearance, this.getHighlightedChoice(), step);
    return true;
  }

  // Finishes the character creator and starts the run.
  finishCustomization() {
    if (!this.isCustomizing()) {
      return false;
    }
    this.hexBuffer = null;
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
    this.menuIndex = 0;
    this.hexBuffer = null;
    this.state = GAME_STATES.MODEL;
    return true;
  }
}
