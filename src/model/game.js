// Game state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks which screen the game is on and which mage class the player picked.

const GAME_STATES = Object.freeze({
  MENU: "menu",
  PLAYING: "playing",
  DEAD: "dead"
});

// Order matters: it is the order shown on the menu and the 1/2/3 key mapping.
const MAGE_CLASSES = Object.freeze(["Fire", "Ice", "Mind"]);

class Game {
  constructor() {
    this.state = GAME_STATES.MENU;
    this.selectedClass = null;
  }

  isMenu() {
    return this.state === GAME_STATES.MENU;
  }

  isPlaying() {
    return this.state === GAME_STATES.PLAYING;
  }

  isDead() {
    return this.state === GAME_STATES.DEAD;
  }

  // Picks a class and starts the run. Only works from the menu, and only for a
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

  // Starting a new run goes back to the menu so the player picks a class again.
  newRun() {
    if (!this.isDead()) {
      return false;
    }
    this.selectedClass = null;
    this.state = GAME_STATES.MENU;
    return true;
  }
}
