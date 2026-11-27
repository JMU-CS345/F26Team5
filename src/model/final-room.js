// The room after the third dungeon, where the final boss is fought. For now it is an empty arena
// with no way out: the final boss is not in the game yet. When it is, put it in at bossSpawn (see
// below) when the player walks in, and decide what opening the room up again after the fight does.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js and tile-types.js, and before run.js.
//
//   #  wall     .  floor
const FINAL_ROOM_TEMPLATE = Object.freeze({
  name: "final-arena",
  // Where the final boss will stand, as a tile. Nothing spawns there yet.
  bossSpawn: Object.freeze({ col: 18, row: 7 }),
  // Where the player stands on coming in: the middle of the south end.
  entry: Object.freeze({ col: 18, row: 17 }),
  rows: Object.freeze([
    "####################################",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "#..................................#",
    "####################################"
  ])
});

class FinalRoom extends Room {
  // screenX, screenY: the top-left of the screen area; the arena is centered in the same 640x400
  // area (or bigger, this one fills the screen's width) a dungeon room is.
  constructor(screenX = 0, screenY = 0, template = FINAL_ROOM_TEMPLATE) {
    const cols = template.rows[0].length;
    const rows = template.rows.length;
    super(
      screenX + Math.floor((SCREEN_COLS - cols) / 2) * TILE_SIZE,
      screenY + Math.floor((SCREEN_ROWS - rows) / 2) * TILE_SIZE,
      cols * TILE_SIZE,
      rows * TILE_SIZE
    );
    this.template = template;
    this.id = "final-room"; // dungeon rooms have numbers, so this can never clash with one
    this.name = template.name;
    this.role = "final";
    this.isFinalRoom = true;
    this.tileGrid = [];
    this.generateLayout();
  }

  generateLayout() {
    this.tileGrid = this.template.rows.map((row) =>
      [...row].map((ch) => (ch === "#" ? TILE.WALL : TILE.FLOOR))
    );
  }

  // Where the middle of the player stands on coming in.
  getEntryPoint() {
    return {
      x: this.x + (this.template.entry.col + 0.5) * this.tileSize,
      y: this.y + (this.template.entry.row + 0.5) * this.tileSize
    };
  }

  // Where the middle of the final boss will stand: nothing spawns there yet.
  getBossSpawn() {
    return {
      x: this.x + (this.template.bossSpawn.col + 0.5) * this.tileSize,
      y: this.y + (this.template.bossSpawn.row + 0.5) * this.tileSize
    };
  }

  // The player's spawn, so a FinalRoom answers the same question the other rooms do.
  getPlayerSpawn() {
    return this.getEntryPoint();
  }
}
