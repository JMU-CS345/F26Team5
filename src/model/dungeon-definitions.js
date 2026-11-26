// The three dungeons of the game: which rooms each one is built from, how many rooms it has, how
// tough its enemies are and how its tiles are tinted. The rooms themselves are in
// room-templates.js, and a dungeon is made fresh (and randomly) every run; the overworld
// entrances lead to these in order (the first overworld to the first dungeon, and so on).
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after dungeon-generator.js (and so after room-templates.js).
//
// Fields:
//   name         shown nowhere yet, but handy in specs and logs
//   roomCount    how many rooms, counting the start and boss rooms
//   healthScale  enemies spawn with this many times their normal health
//   tileTint     [r, g, b] the room pictures are tinted with, or null for the art as it is. A
//                stand-in for a tileset of its own: to give a dungeon its own sheets, load them in
//                room-view.js and have drawTile use them for rooms of that dungeon.
//   rooms        the names of the room templates the dungeon is built from. It needs at least one
//                start room, one boss room and one normal room.
// validateDungeonDefinitions() checks all of this, and the specs run it.

const DUNGEON_DEFINITIONS = Object.freeze([
  {
    name: "Mossy Cellars",
    roomCount: 8,
    healthScale: 1,
    tileTint: null,
    rooms: [
      "start-hall", "start-cross",
      "pillars", "gauntlet", "zombie-den", "bat-cave", "skeleton-hall", "island-hop", "split",
      "pit-moat", "corridor-wide", "corridor-tall",
      "dead-end-west", "dead-end-east", "dead-end-north", "dead-end-south",
      "boss-demon"
    ]
  },
  {
    name: "Sunken Crypt",
    roomCount: 10,
    healthScale: 1.5,
    tileTint: [150, 175, 255],
    rooms: [
      "start-cross",
      "open-field", "pit-checker", "pit-bridge", "pit-ring", "zigzag", "cross-blocks", "choke-point",
      "alcoves", "ruins", "bouncer-court", "bouncer-hall", "turret-room", "spark-crossfire",
      "shield-patrol", "corridor-wide", "dead-end-west", "dead-end-north",
      "boss-pits"
    ]
  },
  {
    name: "Ember Vault",
    roomCount: 12,
    healthScale: 2,
    tileTint: [255, 150, 130],
    rooms: [
      "start-hall",
      "turret-room", "spark-grove", "spark-crossfire", "knight-and-bark", "bouncer-court",
      "bouncer-hall", "pit-lanes", "ruins", "alcoves", "choke-point", "cross-blocks",
      "bastion", "turret-gallery", "killing-floor", "wizard-gang", "dead-end-south",
      "boss-court"
    ]
  }
]);

// The room templates a dungeon is built from, in room-templates.js order.
function templatesForDungeon(definition, templates = ROOM_TEMPLATES) {
  return templates.filter((t) => definition.rooms.includes(t.name));
}

// How much health the enemies of a room drawing have in all, before any health scaling. A rough
// measure of how hard the room is.
function roomThreat(template) {
  let total = 0;
  for (const row of template.rows) {
    for (const ch of row) {
      if (ENEMY_CHARS[ch] !== undefined) {
        total += ENEMY_TYPES[ENEMY_CHARS[ch]].maxHealth;
      }
    }
  }
  return total;
}

// Makes the dungeon for stage 0, 1 or 2 (the first, second or third). options are the ones for
// generateDungeon (seed, screenX, screenY and so on); the roomCount, templates, healthScale and
// tileTint come from the dungeon's definition. The result also says which dungeon it is:
// dungeon.stage (0, 1 or 2) and dungeon.name.
function generateDungeonFor(stage, options = {}) {
  const definition = DUNGEON_DEFINITIONS[stage];
  if (!definition) {
    throw new Error("There is no dungeon number " + (stage + 1) + " (there are " + DUNGEON_DEFINITIONS.length + ")");
  }
  const dungeon = generateDungeon({
    ...options,
    roomCount: definition.roomCount,
    templates: templatesForDungeon(definition),
    healthScale: definition.healthScale,
    tileTint: definition.tileTint
  });
  dungeon.stage = stage;
  dungeon.name = definition.name;
  return dungeon;
}

// Checks a list of dungeon definitions and returns a list of problems (empty if all is well).
function validateDungeonDefinitions(definitions = DUNGEON_DEFINITIONS, templates = ROOM_TEMPLATES) {
  const problems = [];
  const names = new Set();
  const known = new Map(templates.map((t) => [t.name, t]));

  definitions.forEach((d, i) => {
    const label = d && typeof d.name === "string" && d.name !== "" ? d.name : "dungeon #" + (i + 1);
    const bad = (message) => problems.push(label + ": " + message);
    if (!d || typeof d.name !== "string" || d.name === "") {
      bad("needs a name");
    } else if (names.has(d.name)) {
      bad("the name is used by another dungeon too");
    } else {
      names.add(d.name);
    }
    if (!Number.isInteger(d.roomCount) || d.roomCount < 4) {
      bad("roomCount must be a whole number of at least 4");
    }
    if (typeof d.healthScale !== "number" || !(d.healthScale >= 1)) {
      bad("healthScale must be a number of at least 1");
    }
    if (d.tileTint !== null && !(Array.isArray(d.tileTint) && d.tileTint.length === 3 &&
        d.tileTint.every((v) => Number.isInteger(v) && v >= 0 && v <= 255))) {
      bad("tileTint must be null or three whole numbers from 0 to 255");
    }
    if (!Array.isArray(d.rooms) || d.rooms.length === 0) {
      bad("rooms must be a list of room template names");
      return;
    }
    const seen = new Set();
    const pool = [];
    for (const name of d.rooms) {
      if (seen.has(name)) {
        bad("the room " + name + " is listed twice");
      }
      seen.add(name);
      if (!known.has(name)) {
        bad("the room " + name + " does not exist in room-templates.js");
      } else {
        pool.push(known.get(name));
      }
    }
    const roleCount = (role) => pool.filter((t) => (t.role || "normal") === role).length;
    if (roleCount("start") === 0) bad("needs at least one start room");
    if (roleCount("boss") === 0) bad("needs at least one boss room");
    if (roleCount("normal") === 0) bad("needs at least one normal room");
    if (pool.some((t) => t.role === "start" && !t.rows.join("").includes(OVERWORLD_EXIT_CHAR))) {
      bad("every start room needs a = way out to the overworld");
    }
    if (pool.some((t) => t.role === "boss" && !t.rows.join("").includes(ONWARD_DOOR_CHAR))) {
      bad("every boss room needs a > door to the next area");
    }
    if (roleCount("start") + roleCount("boss") + roleCount("normal") === pool.length) {
      problems.push(...validateRoomTemplates(pool).map((p) => label + ": " + p));
    }
  });
  return problems;
}
