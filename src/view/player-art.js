// What each playermodel looks like: sprite sheets, frame sizes and walk cycles, keyed by model
// name (PLAYER_MODEL_NAMES in model/player-models.js). This file draws nothing, so Jasmine can
// load it. Load it after player-models.js.

// Every sheet has the same row order: walking down, up, right, left, then the same
// four with the weapon. Column 0 of each row is the standing frame.
const PLAYER_ART = Object.freeze({
  Tall: {
    sheet: "assets/player/16x32 Player.png",
    // White layers for #23, tinted to the chosen colors and drawn over the body sheet. Each one
    // has exactly the same layout as the body sheet, so frame (col, row) lines up everywhere.
    layerSheets: {
      eyes: "assets/player/customization/16x32 Eyes.png",
      shirt: "assets/player/customization/16x32 Shirt.png",
      pants: "assets/player/customization/16x32 Pants.png"
    },
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
    layerSheets: {
      eyes: "assets/player/customization/16x16 Eyes.png",
      shirt: "assets/player/customization/16x16 Shirt.png",
      pants: "assets/player/customization/16x16 Pants.png"
    },
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

// The layers drawn over the body sheet, bottom to top. Pants go under the shirt, and the eyes
// go on top of everything. Each one has a sheet in PLAYER_ART[model].layerSheets.
const APPEARANCE_LAYER_ORDER = Object.freeze(["pants", "shirt", "eyes"]);
