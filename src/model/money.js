// Money: the coins, ingots and gems that monsters drop. Picking one up adds its value to the
// player's gold (the hidden Gold slot in PlayerInventory), so nothing else about gold changes.
// Model code: no p5 drawing calls. The pictures are in src/view/money-art.js.
// Loads after item-drop.js, because MoneyDrop is an ItemDrop.

// Every kind of money. value is the gold it is worth, w and h are its size in pixels (the same
// as its sprite, and the size of its pickup box). To add a kind, add a row here and its art row
// in MONEY_ART (money-art.js). The loot code picks it up with no other change.
const MONEY_TYPES = Object.freeze({
  coin: Object.freeze({ id: "coin", name: "Coin", value: 10, w: 8, h: 8 }),
  ingot: Object.freeze({ id: "ingot", name: "Ingot", value: 25, w: 16, h: 8 }),
  blueGem: Object.freeze({ id: "blueGem", name: "Blue Gem", value: 50, w: 16, h: 16 }),
  redGem: Object.freeze({ id: "redGem", name: "Red Gem", value: 100, w: 16, h: 16 }),
  greenGem: Object.freeze({ id: "greenGem", name: "Green Gem", value: 250, w: 16, h: 16 })
});

// The ids, most valuable first.
const MONEY_IDS = Object.freeze(
  Object.keys(MONEY_TYPES).sort((a, b) => MONEY_TYPES[b].value - MONEY_TYPES[a].value)
);

// How much a monster pays: its power times GOLD_PER_POWER, then up to GOLD_VARIANCE (a fraction)
// more or less, rounded to the nearest 10 and never under 10 (the smallest coin).
const GOLD_PER_POWER = 5;
const GOLD_VARIANCE = 0.25;
const GOLD_ROUNDING = 10;

// A dead enemy tosses its money out. Each piece starts MONEY_START_HEIGHT pixels up, is thrown
// upward at MONEY_TOSS_UP and sideways at a speed between MONEY_TOSS_SPEED_MIN and _MAX (pixels
// per frame), and falls with MONEY_GRAVITY until it lands. A lone piece is tossed straight up.
const MONEY_START_HEIGHT = 4;
const MONEY_TOSS_UP = 2.4;
const MONEY_GRAVITY = 0.2;
const MONEY_TOSS_SPEED_MIN = 0.6;
const MONEY_TOSS_SPEED_MAX = 1.2;

// Named loot pools an enemy type can use through its lootTable. goldMultiplier scales the pay.
const LOOT_TABLES = Object.freeze({
  boss: Object.freeze({ goldMultiplier: 3 })
});

// A drop in the world. It is an ordinary gold ItemDrop worth `value` gold, with its own size
// and picture, so picking it up needs no new code. It does not bob: once it has landed it lies on
// the floor. With a toss ({ vx, vy }, pixels per frame) it starts in the air and falls out first;
// z is its height above the floor and it cannot be picked up until it has landed. Without a toss
// it is already lying on the floor.
class MoneyDrop extends ItemDrop {
  constructor(x, y, moneyId, toss = null) {
    const money = MONEY_TYPES[moneyId];
    if (!money) {
      throw new TypeError("unknown money type: " + moneyId);
    }
    super(x, y, new Gold(), money.value);
    this.money = money;
    this.size = Math.max(money.w, money.h);
    this.vx = toss ? toss.vx : 0;
    this.vy = toss ? toss.vy : 0;
    this.z = toss ? MONEY_START_HEIGHT : 0;
    this.vz = toss ? MONEY_TOSS_UP : 0;
    this.landed = toss === null;
  }

  // Money never floats.
  get bobOffset() {
    return 0;
  }

  // False while the money is still in the air.
  get collectible() {
    return this.landed;
  }

  // One frame of the fall. A piece that would hit a wall or a pit stops moving sideways on that
  // axis and drops straight down. Pass the room so it can tell.
  update(room = null) {
    super.update();
    if (this.landed) {
      return;
    }
    const w = this.money.w;
    const h = this.money.h;
    if (room === null || moneyFitsAt(room, this.x + this.vx, this.y, w, h)) {
      this.x += this.vx;
    } else {
      this.vx = 0;
    }
    if (room === null || moneyFitsAt(room, this.x, this.y + this.vy, w, h)) {
      this.y += this.vy;
    } else {
      this.vy = 0;
    }
    this.vz -= MONEY_GRAVITY;
    this.z += this.vz;
    if (this.z <= 0) {
      this.z = 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.landed = true;
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.money.w, h: this.money.h };
  }
}

// The fewest pieces of money that add up to exactly `amount` gold, biggest first. For example 60
// is a blue gem and a coin. Throws when the amount cannot be made (5 or 15, with a smallest
// piece of 10 and an ingot of 25).
function makeChange(amount) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new TypeError("amount must be a non-negative whole number");
  }
  const best = [[]]; // best[a] is the shortest list of ids adding to a, or null if there is none
  for (let a = 1; a <= amount; a++) {
    best[a] = null;
    for (const id of MONEY_IDS) {
      const rest = a - MONEY_TYPES[id].value;
      if (rest >= 0 && best[rest] !== null
          && (best[a] === null || best[rest].length + 1 < best[a].length)) {
        best[a] = [...best[rest], id];
      }
    }
  }
  if (best[amount] === null) {
    throw new RangeError("cannot make " + amount + " gold out of coins, ingots and gems");
  }
  return best[amount].sort((a, b) => MONEY_TYPES[b].value - MONEY_TYPES[a].value);
}

// How many gold an attack adds to its enemy's power: its damage times the shots it fires at once.
function attackPower(attack) {
  if (!attack) {
    return 0;
  }
  let shots = 1;
  if (attack.kind === "shoot") {
    shots = attack.volleys ? Math.max(...attack.volleys.map((volley) => volley.count)) : attack.count || 1;
  }
  return attack.damage * shots;
}

// A number for how dangerous an enemy type is: its health, twice its contact damage, its best
// attack (counting phases), and a bonus for a shield. A Jelly is 5, a Ghoul 8, the Demon Knight 47.
// maxHealth can be passed in because a room can spawn enemies with more health than their type.
function enemyPower(type, maxHealth = type.maxHealth) {
  let attack = attackPower(type.attack);
  for (const phase of type.phases || []) {
    attack = Math.max(attack, attackPower(phase.attack));
  }
  return maxHealth + type.contactDamage * 2 + attack + (type.blocksFront ? 2 : 0);
}

// The gold one dead enemy pays. rng is a function giving 0 up to 1, so specs can fix the roll.
function rollGoldDrop(enemy, rng = Math.random) {
  const table = LOOT_TABLES[enemy.type.lootTable];
  const multiplier = table ? table.goldMultiplier : 1;
  const base = enemyPower(enemy.type, enemy.maxHealth) * GOLD_PER_POWER * multiplier;
  const varied = base * (1 - GOLD_VARIANCE + rng() * 2 * GOLD_VARIANCE);
  return Math.max(GOLD_ROUNDING, Math.round(varied / GOLD_ROUNDING) * GOLD_ROUNDING);
}

// True when a w by h box with its top-left at (x, y) sits clear of walls and pits.
function moneyFitsAt(room, x, y, w, h) {
  const points = [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]];
  return points.every(([px, py]) => !room.isWallAt(px, py) && !room.isPitAt(px, py));
}

// Makes the money a dead enemy drops and returns it (the caller adds it to room.items). Every
// piece starts on the enemy's middle and is tossed out in its own direction, so a pile fans out
// around the spot where the enemy died. An enemy that fell into a pit leaves nothing.
function dropMoneyFor(enemy, room, rng = Math.random) {
  if (enemy.fell) {
    return [];
  }
  const pieces = makeChange(rollGoldDrop(enemy, rng));
  const center = enemy.getCenter();
  return pieces.map((id, i) => {
    const money = MONEY_TYPES[id];
    let toss = { vx: 0, vy: 0 };
    if (pieces.length > 1) {
      const angle = (i / pieces.length) * Math.PI * 2 - Math.PI / 2;
      const speed = MONEY_TOSS_SPEED_MIN + rng() * (MONEY_TOSS_SPEED_MAX - MONEY_TOSS_SPEED_MIN);
      toss = { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    }
    return new MoneyDrop(center.x - money.w / 2, center.y - money.h / 2, id, toss);
  });
}
