// Helpers shared by the specs. This file loads before every spec in SpecRunner.html.

// A plain room for specs: a ring of wall around open floor, with no doors and no template.
// The game itself only builds rooms from templates (TemplateRoom), so this lives with the specs.
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

// A small deterministic random source, so wandering specs repeat exactly.
function makeRng(seed) {
  let state = seed;
  return function () {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

// Puts the player this many pixels to the right of the enemy, center to center.
function placePlayerRightOf(enemy, player, distance) {
  const center = enemy.getCenter();
  player.pos.set(center.x + distance - player.length / 2, center.y - player.width / 2);
}

// Calls tryAttack and, when the enemy starts its telegraph (windup) instead of firing, lets the
// windup run out so the shot comes out. For specs about the shot itself, not the telegraph.
function tryAttackThroughWindup(enemy, player, room) {
  let shots = enemy.tryAttack(player, room);
  if (shots.length === 0 && enemy.state === "windup") {
    enemy.stateTimer = 0;
    shots = enemy.tryAttack(player, room);
  }
  return shots;
}
