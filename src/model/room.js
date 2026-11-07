// Every wall tile is 16 by 16 
const TILE_SIZE = 16;

class Room {
  constructor(x, y, width, height) {
    if (width % TILE_SIZE !== 0 || height % TILE_SIZE !== 0) {
      throw new Error(
        `Room size ${width}x${height} must be a multiple of ${TILE_SIZE}`
      );
    }
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.tileSize = TILE_SIZE;
    this.enemies = [];
    this.items = [];
    this.exits = [];
    this.cleared = false;
  }
  
  // requires subclasses to implement layouts.
  generateLayout() {
    throw new Error("Subclasses must implement generateLayout()");
  }

  // place holder. will implement later. for now it's hardcoded.
  onEnter() {
    // Room entry behavior will be implemented later.
  }

  // marks the room as cleared
  onClear() {
    this.cleared = true;
  }

  isWallAt(px, py) {
    const col = Math.floor((px - this.x) / this.tileSize);
    const row = Math.floor((py - this.y) / this.tileSize);
    if (row < 0 || col < 0 || row >= this.tileGrid.length || col >= this.tileGrid[0].length) {
      return true;
    }
    return this.tileGrid[row][col] === 1;
  }

  // returns a boolean value of whether or not it can collide based on
  // the 4 statements
  
  collidesWithWall(b) {
    return (
      this.isWallAt(b.x, b.y) ||
      this.isWallAt(b.x + b.w - 1, b.y) ||
      this.isWallAt(b.x, b.y + b.h - 1) ||
      this.isWallAt(b.x + b.w - 1, b.y + b.h - 1)
    );
  }

}
