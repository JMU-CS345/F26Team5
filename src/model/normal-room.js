// creates a normal room that extends room to have all the properties   
class NormalRoom extends Room {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.tileGrid = [];
    this.generateLayout();
  }

  generateLayout() {
    const columns = this.width / this.tileSize;
    const rows = this.height / this.tileSize;

    this.tileGrid = [];
    
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < columns; x++) {
            const isWall = (x === 0 || y === 0 || x === columns - 1 || y === rows - 1);
            row.push(isWall ? TILE.WALL : TILE.FLOOR);
        }

      this.tileGrid.push(row);
    }
  }
}
