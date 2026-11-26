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

// A solid wall from the top border to the bottom border, one tile thick, down the middle.
function wallDownTheMiddle(room) {
  const col = room.cols / 2;
  for (let row = 1; row < room.rows - 1; row++) {
    room.setTile(col, row, TILE.INTERIOR_WALL);
  }
}

// A Jelly-based type that swings, with short frame counts so specs stay small.
function meleeType(overrides = {}) {
  return {
    ...ENEMY_TYPES.Jelly,
    move: "bounce",
    speed: 1,
    attack: { kind: "melee", cooldown: 100, damage: 1, reach: 26, windup: 2, recover: 2 },
    ...overrides
  };
}

// A one tile thick wall down column 20 from border to border, with the given rows left open.
function wallWithGap(room, gapRows) {
  for (let row = 1; row < room.rows - 1; row++) {
    if (!gapRows.includes(row)) {
      room.setTile(20, row, TILE.INTERIOR_WALL);
    }
  }
}

function onTheGrid(value) {
  return Math.abs(value / 16 - Math.round(value / 16)) < 0.000001;
}

// The melee type used by the swing specs: bounces, then winds up, swings and recovers.
const SWING_TYPE = meleeType({ attack: { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 5, recover: 7 } });

// Taps the fire key toward dir: presses it for one frame, then lets go. Returns the shot the press
// made (a wand shoots as soon as the key is pressed). Letting go straight away charges nothing.
function shootTap(player, dir) {
  const shot = player.fire(dir);
  player.fire(new p5.Vector(0, 0));
  return shot;
}
