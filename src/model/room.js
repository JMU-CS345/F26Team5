// Every wall tile is 16 by 16 
const TILE_SIZE = 16;

class Room {
  constructor(width, height) {
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

  // returns a boolean value of whether or not it can collide based on
  // the 4 statements
  
  collidesWithWall(bounds, offsetX = 0, offsetY = 0) {
        const left = offsetX + this.tileSize;
        const top = offsetY + this.tileSize;
        const right = offsetX + this.width - this.tileSize;
        const bottom = offsetY + this.height - this.tileSize;

        return (
            bounds.x < left ||
            bounds.y < top ||
            bounds.x + bounds.w > right ||
            bounds.y + bounds.h > bottom
        );
    }

}
