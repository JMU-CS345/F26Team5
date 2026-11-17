// Small pieces the menu screens share. No p5 calls, so Jasmine can test them.

const FADE_FRAMES = 8;

// A Yes/No question that can open on top of a menu. The cursor starts on No every time, so a
// stray Enter never throws a run away.
class ConfirmDialog {
  constructor() {
    this.message = "";
    this.onYes = null;
    this.open = false;
    this.menu = new Menu([
      { label: "Yes", action: () => this.answerYes() },
      { label: "No", action: () => this.close() }
    ], () => this.close());
    this.menu.index = 1;
  }

  isOpen() {
    return this.open;
  }

  show(message, onYes) {
    this.message = message;
    this.onYes = onYes;
    this.open = true;
    this.menu.index = 1;
  }

  close() {
    this.open = false;
    this.onYes = null;
  }

  // Closes first, so the action can open another screen without the dialog hanging around.
  answerYes() {
    const action = this.onYes;
    this.close();
    if (typeof action === "function") {
      action();
    }
  }
}

// Counts frames since the screen changed. alpha() is how dark the cover should be.
class ScreenFade {
  constructor(frames = FADE_FRAMES) {
    this.frames = frames;
    this.left = 0;
    this.screen = null;
  }

  // Call every frame with the current screen name. A new name starts the fade.
  watch(screen) {
    if (screen !== this.screen) {
      if (this.screen !== null) {
        this.left = this.frames;
      }
      this.screen = screen;
    }
  }

  update() {
    if (this.left > 0) {
      this.left--;
    }
  }

  alpha() {
    return (255 * this.left) / this.frames;
  }
}

// Splits a control preset's lines ("WASD move, J melee") into key and action pairs.
function controlRows(preset) {
  const rows = [];
  preset.lines.forEach((line) => {
    line.split(", ").forEach((part) => {
      const space = part.indexOf(" ");
      rows.push({ key: part.slice(0, space), action: part.slice(space + 1) });
    });
  });
  return rows;
}
