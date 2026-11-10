// Playermodel data. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load this before game.js, player.js and the view files.

// Every sheet has the same row order: walking down, up, right, left, then the same
// four with the weapon. Column 0 of each row is the standing frame.
const PLAYER_MODELS = Object.freeze({
  Tall: {
    sheet: "assets/player/16x32 Player.png",
    spriteW: 16,
    spriteH: 32,
    // Columns of the walk frames in order. Each cycle starts on a step, not the standing frame.
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0, 2, 0],
      left: [1, 0, 2, 0]
    }
  },
  Short: {
    sheet: "assets/player/16x16 Player.png",
    spriteW: 16,
    spriteH: 16,
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0],
      left: [1, 0]
    }
  }
});

// Order matters: it is the order shown on the model screen and the 1/2 key mapping.
const PLAYER_MODEL_NAMES = Object.freeze(Object.keys(PLAYER_MODELS));