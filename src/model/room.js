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
    this.npcs = [];
    this.items = [];
    this.chests = [];
    this.exits = [];
    this.cleared = false;
    this.stairs = null; // { x, y } in a boss room after the boss dies, the way to the hub
    this.state = "unvisited"; // "unvisited", "active" or "cleared"
    this.visited = false; // set when the player first walks in, the minimap reads it
    this.lastKillPos = null; // { x, y } centre of the last enemy that died here
    this.activeFrames = 0; // frames spent in the active state, for the anti-softlock arrow
    this.pendingWaves = []; // the waves not created yet, each a list of spawn spots
    this.waveNumber = 0; // how many waves have appeared so far
    this.waveTimer = 0; // frames since the last wave was beaten
    this.tileVersion = 0; // goes up whenever a tile changes, so the view knows to redraw the room

    // Filled in by the dungeon generator.
    this.id = null;
    this.role = "normal"; // "start", "normal", "boss" or "treasure"
    this.worldCol = 0; // where the room's top-left tile sits on the dungeon map
    this.worldRow = 0;
  }

  get cols() {
    return this.width / this.tileSize;
  }

  get rows() {
    return this.height / this.tileSize;
  }
  
  // requires subclasses to implement layouts.
  generateLayout() {
    throw new Error("Subclasses must implement generateLayout()");
  }

  // place holder. will implement later. for now it's hardcoded.
  onEnter() {
    // Room entry behavior will be implemented later.
  }

  // Holds every enemy in the room still and harmless for a moment. Call it each time the player
  // walks in, so enemies next to a door do not hit the player the instant they arrive.
  startEnemyDelay(frames) {
    for (const enemy of this.enemies) {
      enemy.startWakeDelay(frames);
    }
  }

  // marks the room as cleared and opens the doors
  onClear() {
    this.cleared = true;
    this.state = "cleared";
    this.openDoors();
  }

  // True while a later wave still has to appear, so the room is not clear yet.
  hasPendingWave() {
    return this.pendingWaves.length > 0;
  }

  // The spawn spots of the wave that appears next, or [] when there is none.
  nextWaveSpots() {
    if (this.pendingWaves.length === 0) {
      return [];
    }
    return this.pendingWaves[0];
  }

  // Same as closeDoors, the name the room flow uses.
  sealDoors() {
    this.closeDoors();
  }

  // Shuts every door that leads somewhere. A closed door is solid, so nothing gets through it.
  closeDoors() {
    this.setDoorTiles(TILE.DOOR_CLOSED);
  }

  // Opens every door that leads somewhere.
  openDoors() {
    this.setDoorTiles(TILE.DOOR_OPEN);
  }

  setDoorTiles(type) {
    for (const exit of this.exits) {
      for (const { col, row } of exit.tiles) {
        this.setTile(col, row, type);
      }
    }
  }

  // The tile type at a grid position. Outside the room counts as wall.
  getTile(col, row) {
    if (row < 0 || col < 0 || row >= this.tileGrid.length || col >= this.tileGrid[0].length) {
      return TILE.WALL;
    }
    return this.tileGrid[row][col];
  }

  // Changes one tile. Returns false (and does nothing) if the position is outside the room.
  setTile(col, row, type) {
    if (row < 0 || col < 0 || row >= this.tileGrid.length || col >= this.tileGrid[0].length) {
      return false;
    }
    if (this.tileGrid[row][col] !== type) {
      this.tileGrid[row][col] = type;
      this.tileVersion++;
    }
    return true;
  }

  // The exit whose door covers this pixel, or null. Each exit looks like:
  //   { side: "N"|"E"|"S"|"W", tiles: [{ side, tiles, toId, doorIndex, toDoor }]
  getExitAt(px, py) {
    const col = Math.floor((px - this.x) / this.tileSize);
    const row = Math.floor((py - this.y) / this.tileSize);
    return this.exits.find((e) => e.tiles.some((t) => t.col === col && t.row === row)) || null;
  }

  // The tile type at a pixel position.
  tileAtPixel(px, py) {
    const col = Math.floor((px - this.x) / this.tileSize);
    const row = Math.floor((py - this.y) / this.tileSize);
    return this.getTile(col, row);
  }

  // True when no solid tile lies on the straight line between two pixel points.
  // Samples every quarter tile, so a one tile wall can never be stepped over.
  hasLineOfSight(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const steps = Math.ceil(Math.hypot(dx, dy) / (this.tileSize / 4));
    for (let i = 1; i < steps; i++) {
      if (this.isWallAt(ax + (dx * i) / steps, ay + (dy * i) / steps)) {
        return false;
      }
    }
    return true;
  }

  // True when the pixel is on a solid tile (wall, closed door, interior wall). Pits are not solid.
  isWallAt(px, py) {
    return TILE_PROPERTIES[this.tileAtPixel(px, py)].solid;
  }

  // True when the pixel is over a pit.
  isPitAt(px, py) {
    return this.tileAtPixel(px, py) === TILE.PIT;
  }

  // The pit tiles a box covers, as "col,row" strings. Empty when it covers none.
  pitTilesUnder(b) {
    const ts = this.tileSize;
    const firstCol = Math.floor((b.x - this.x) / ts);
    const lastCol = Math.floor((b.x + b.w - 1 - this.x) / ts);
    const firstRow = Math.floor((b.y - this.y) / ts);
    const lastRow = Math.floor((b.y + b.h - 1 - this.y) / ts);
    const found = [];
    for (let r = firstRow; r <= lastRow; r++) {
      for (let c = firstCol; c <= lastCol; c++) {
        if (this.getTile(c, r) === TILE.PIT) {
          found.push(c + "," + r);
        }
      }
    }
    return found;
  }

  // True when any part of the box is over a pit.
  overlapsPit(b) {
    return this.pitTilesUnder(b).length > 0;
  }

  // True when a thing fw by fh tiles big can stand with its top-left tile at (col, row).
  // Nothing can stand on a wall or over a pit.
  canStandAt(col, row, fw = 1, fh = 1) {
    for (let r = row; r < row + fh; r++) {
      for (let c = col; c < col + fw; c++) {
        const properties = TILE_PROPERTIES[this.getTile(c, r)];
        if (properties.solid || properties.hazard) {
          return false;
        }
      }
    }
    return true;
  }

  // The shortest route over whole tiles, moving up, down, left and right only. A thing fw by fh
  // tiles big starts with its top-left tile at (startCol, startRow). The route ends on the first
  // tile where it covers the pixel (goalX, goalY). Returns the tiles to walk through, in order and
  // not counting the start, as { col, row, horizontal }. horizontal says whether the step into
  // that tile ran along a row. Returns [] when already there and null when there is no route.
  findTilePath(startCol, startRow, fw, fh, goalX, goalY, maxNodes = 4000) {
    const ts = this.tileSize;
    const covers = (col, row) => {
      const left = this.x + col * ts;
      const top = this.y + row * ts;
      return goalX >= left && goalX < left + fw * ts && goalY >= top && goalY < top + fh * ts;
    };
    if (covers(startCol, startRow)) {
      return [];
    }
    const seen = new Set([startRow * 10000 + startCol]);
    const queue = [{ col: startCol, row: startRow, horizontal: false, parent: null }];
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let head = 0; head < queue.length && head < maxNodes; head++) {
      const cur = queue[head];
      for (const [dc, dr] of steps) {
        const col = cur.col + dc;
        const row = cur.row + dr;
        const key = row * 10000 + col;
        if (seen.has(key) || !this.canStandAt(col, row, fw, fh)) {
          continue;
        }
        seen.add(key);
        const node = { col, row, horizontal: dc !== 0, parent: cur };
        if (covers(col, row)) {
          const path = [];
          for (let n = node; n.parent; n = n.parent) {
            path.push({ col: n.col, row: n.row, horizontal: n.horizontal });
          }
          return path.reverse();
        }
        queue.push(node);
      }
    }
    return null;
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
