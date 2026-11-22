// Encounter recipes and where the enemies stand. Needs encounters.js, template-room.js,
// room-templates.js and rng.js loaded first (see SpecRunner.html).
describe("encounters", function () {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
  const NORMALS = ROOM_TEMPLATES.filter((t) => t.role === "normal");

  // Every floor tile you can walk to from a door, worked out here on its own.
  function reachableFromDoors(parsed) {
    const seen = new Set();
    const stack = [];
    const visit = (col, row) => {
      const inside = row >= 0 && col >= 0 && row < parsed.rows && col < parsed.cols;
      if (inside && parsed.grid[row][col] === TILE.FLOOR && !seen.has(row * parsed.cols + col)) {
        seen.add(row * parsed.cols + col);
        stack.push([col, row]);
      }
    };
    for (const door of parsed.doors) {
      for (const tile of door.tiles) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          visit(tile.col + dc, tile.row + dr);
        }
      }
    }
    while (stack.length > 0) {
      const [col, row] = stack.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        visit(col + dc, row + dr);
      }
    }
    return seen;
  }

  describe("recipes", function () {
    it("all follow the wave rules", function () {
      const problems = ENCOUNTER_RECIPES.flatMap(recipeProblems);
      expect(problems).toEqual([]);
    });

    it("cover every wave size from 2 to 7, with a few choices for each", function () {
      for (let size = 2; size <= 7; size++) {
        const count = ENCOUNTER_RECIPES.filter((r) => recipeSize(r) === size).length;
        expect(count).withContext("size " + size).toBeGreaterThanOrEqual(3);
      }
    });

    it("have a weight for each of the three dungeon tiers", function () {
      for (const r of ENCOUNTER_RECIPES) {
        expect(r.weights.length).toBe(3);
        expect(r.weights.every((w) => w >= 0)).toBe(true);
      }
    });

    it("give a role to every enemy type that is not a boss", function () {
      for (const name of ENEMY_TYPE_NAMES) {
        if (!ENEMY_TYPES[name].boss) {
          expect(ENEMY_ROLES[name]).withContext(name).toBeDefined();
        }
      }
    });

    it("can produce every enemy type that has a role", function () {
      const seen = new Set();
      const rng = createRng(3);
      for (let i = 0; i < 400; i++) {
        const size = 2 + (i % 6);
        const tier = 1 + (i % 3);
        pickWaveTypes(pickRecipe(size, tier, rng), tier, rng).forEach((t) => seen.add(t));
      }
      expect([...seen].sort()).toEqual(Object.keys(ENEMY_ROLES).sort());
    });

    it("has the classic 2 Eyeball, 2 Zombie, 1 Skeleton mix as a role recipe", function () {
      const classic = ENCOUNTER_RECIPES.find((r) => r.name === "five-classic");
      expect(classic.counts).toEqual({ chaser: 2, swarm: 0, ranged: 1, turret: 2 });
    });
  });

  describe("waveProblems", function () {
    it("accepts a mix with a chaser and a shooter", function () {
      expect(waveProblems(["Zombie", "Zombie", "Skeleton", "Eyeball", "Eyeball"])).toEqual([]);
    });

    it("rejects four eyeballs", function () {
      expect(waveProblems(["Eyeball", "Eyeball", "Eyeball", "Eyeball"]).length).toBeGreaterThan(0);
    });

    it("needs both a melee enemy and a shooter", function () {
      expect(waveProblems(["Zombie", "Jelly"]).length).toBe(1);
      expect(waveProblems(["Skeleton", "Eyeball"]).length).toBe(1);
    });

    it("allows at most 2 turrets and at most 3 of one type", function () {
      expect(waveProblems(["Zombie", "Eyeball", "SparkBark", "Eyeball"]).length).toBeGreaterThan(0);
      expect(waveProblems(["Jelly", "Jelly", "Jelly", "Jelly", "Skeleton"]).length).toBe(1);
    });
  });

  describe("budgets", function () {
    const total = (sizes) => sizes.reduce((a, b) => a + b, 0);

    it("gives small rooms 4 to 5 enemies in 1 or 2 waves at tier 1", function () {
      for (const seed of SEEDS) {
        const sizes = planWaveSizes("small", 1, createRng(seed));
        expect(total(sizes)).toBeGreaterThanOrEqual(4);
        expect(total(sizes)).toBeLessThanOrEqual(5);
        expect(sizes.length).toBeGreaterThanOrEqual(1);
        expect(sizes.length).toBeLessThanOrEqual(2);
      }
    });

    it("gives medium rooms 6 to 8 enemies in 2 waves and large rooms 9 to 12 in 3", function () {
      for (const seed of SEEDS) {
        const medium = planWaveSizes("medium", 1, createRng(seed));
        const large = planWaveSizes("large", 1, createRng(seed));
        expect(total(medium)).toBeGreaterThanOrEqual(6);
        expect(total(medium)).toBeLessThanOrEqual(8);
        expect(medium.length).toBe(2);
        expect(total(large)).toBeGreaterThanOrEqual(9);
        expect(total(large)).toBeLessThanOrEqual(12);
        expect(large.length).toBe(3);
      }
    });

    it("adds one enemy per tier above 1, and a wave at tier 3 for medium and large", function () {
      for (const seed of SEEDS) {
        const base = total(planWaveSizes("medium", 1, createRng(seed)));
        expect(total(planWaveSizes("medium", 2, createRng(seed)))).toBe(base + 1);
        expect(total(planWaveSizes("medium", 3, createRng(seed)))).toBe(base + 2);
        expect(planWaveSizes("medium", 3, createRng(seed)).length).toBe(3);
        expect(planWaveSizes("large", 3, createRng(seed)).length).toBe(4);
        expect(planWaveSizes("small", 3, createRng(seed)).length).toBeLessThanOrEqual(2);
      }
    });

    it("never makes a wave smaller than 2 or bigger than 7", function () {
      for (const seed of SEEDS) {
        for (const tier of [1, 2, 3]) {
          for (const size of ["small", "medium", "large"]) {
            for (const n of planWaveSizes(size, tier, createRng(seed))) {
              expect(n).toBeGreaterThanOrEqual(2);
              expect(n).toBeLessThanOrEqual(7);
            }
          }
        }
      }
    });
  });

  describe("every normal room over 200 seeds and 3 tiers", function () {
    for (const template of NORMALS) {
      it(template.name + " obeys the wave rules, enemies on reachable floor", function () {
        const parsed = parseRoomTemplate(template);
        const reachable = reachableFromDoors(parsed);
        const sizeName = roomSizeName(parsed.cols, parsed.rows);
        for (const seed of SEEDS) {
          const tier = 1 + (seed % 3);
          const room = new TemplateRoom(0, 0, parsed, { tier, seed });
          const waves = room.planWaves();
          expect(waves.length).toBeGreaterThanOrEqual(1);
          const count = waves.reduce((sum, wave) => sum + wave.length, 0);
          const budget = ROOM_BUDGETS[sizeName];
          expect(count).toBeGreaterThanOrEqual(budget.min + tier - 1);
          expect(count).toBeLessThanOrEqual(budget.max + tier - 1);
          for (const wave of waves) {
            const names = wave.map((s) => s.type);
            expect(waveProblems(names)).withContext(template.name + " seed " + seed).toEqual([]);
            const tiles = new Set();
            for (const spawn of wave) {
              const key = spawn.row * parsed.cols + spawn.col;
              const where = spawn.type + " " + spawn.col + "," + spawn.row;
              expect(reachable.has(key)).withContext(where).toBe(true);
              expect(parsed.grid[spawn.row][spawn.col]).toBe(TILE.FLOOR);
              expect(tiles.has(key)).toBe(false);
              tiles.add(key);
            }
          }
        }
      });

      it(template.name + " puts shooters and the rest on far drawn spots", function () {
        const parsed = parseRoomTemplate(template);
        const layout = buildEncounterLayout(parsed);
        const far = (list) => list.filter((s) => doorDistance(layout, s) >= SPAWN_DOOR_DISTANCE);
        const rangedSpots = far(layout.ranged);
        const meleeSpots = far(layout.melee);
        const isSpot = (list, s) => list.some((p) => p.col === s.col && p.row === s.row);
        // a wave that runs out of far drawn spots falls back to open floor, also far from doors
        const onSpotOrFar = (list, s) => {
          return isSpot(list, s) || doorDistance(layout, s) >= SPAWN_DOOR_DISTANCE;
        };
        for (const seed of SEEDS.slice(0, 40)) {
          const room = new TemplateRoom(0, 0, parsed, { tier: 1 + (seed % 3), seed });
          for (const wave of room.planWaves()) {
            const shooters = wave.filter((s) => RANGED_ROLES.includes(ENEMY_ROLES[s.type]));
            const others = wave.filter((s) => MELEE_ROLES.includes(ENEMY_ROLES[s.type]));
            if (shooters.length <= rangedSpots.length) {
              expect(shooters.every((s) => onSpotOrFar(rangedSpots, s))).toBe(true);
            }
            if (others.length <= meleeSpots.length) {
              expect(others.every((s) => onSpotOrFar(meleeSpots, s))).toBe(true);
            }
          }
        }
      });

      it(template.name + " has no spawned enemy touching a wall or a pit", function () {
        const parsed = parseRoomTemplate(template);
        for (const seed of SEEDS.slice(0, 40)) {
          const room = new TemplateRoom(0, 0, parsed, { tier: 1 + (seed % 3), seed });
          room.spawnEnemies();
          while (room.hasPendingWave()) {
            room.spawnPendingWave();
          }
          for (const enemy of room.enemies) {
            expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
            const c = enemy.getCenter();
            const tile = room.getTile(Math.floor(c.x / TILE_SIZE), Math.floor(c.y / TILE_SIZE));
            expect(tile).toBe(TILE.FLOOR);
          }
        }
      });
    }
  });

  describe("a room", function () {
    const open = ROOM_TEMPLATES.find((t) => t.name === "open-field");
    const make = (seed, tier) => new TemplateRoom(0, 0, parseRoomTemplate(open), { tier, seed });

    it("makes the same fight for the same seed and a different one for another", function () {
      expect(make(5, 1).planWaves()).toEqual(make(5, 1).planWaves());
      const mixes = new Set(SEEDS.map((seed) => JSON.stringify(make(seed, 1).planWaves())));
      expect(mixes.size).toBeGreaterThan(150);
    });

    it("keeps the tier on the room and on the enemies it spawns", function () {
      const room = make(1, 2);
      room.spawnEnemies();
      expect(room.tier).toBe(2);
      expect(room.enemies.every((e) => e.tier === 2)).toBe(true);
    });

    it("defaults to tier 1", function () {
      expect(new TemplateRoom(0, 0, parseRoomTemplate(open)).tier).toBe(1);
    });

    it("keeps letters drawn in a room that also has spots in its first wave", function () {
      const rows = open.rows.slice();
      rows[10] = rows[10].slice(0, 5) + "Z" + rows[10].slice(6);
      const drawn = parseRoomTemplate({ ...open, name: "x", rows });
      const room = new TemplateRoom(0, 0, drawn, { seed: 2 });
      expect(room.planWaves()[0].some((s) => s.col === 5 && s.row === 10 && s.type === "Zombie"))
        .toBe(true);
    });

    it("falls back to open floor far from the doors when it runs out of spots", function () {
      const parsed = parseRoomTemplate(open);
      const layout = buildEncounterLayout(parsed);
      layout.melee = layout.melee.slice(0, 1);
      layout.ranged = [];
      const spawns = placeWave(["Zombie", "Zombie", "Skeleton", "Eyeball"], layout, createRng(1));
      expect(spawns.length).toBe(4);
      const spot = layout.melee[0];
      const strays = spawns.filter((s) => !(s.col === spot.col && s.row === spot.row));
      for (const s of strays) {
        expect(doorDistance(layout, s)).toBeGreaterThanOrEqual(SPAWN_DOOR_DISTANCE);
      }
    });

    it("keeps drawn spots at least SPAWN_DOOR_DISTANCE tiles from every door", function () {
      const layout = buildEncounterLayout(parseRoomTemplate(open));
      layout.melee = layout.open.filter((s) => doorDistance(layout, s) < SPAWN_DOOR_DISTANCE);
      layout.ranged = [];
      for (const s of placeWave(["Zombie", "Zombie"], layout, createRng(3))) {
        expect(doorDistance(layout, s)).toBeGreaterThanOrEqual(SPAWN_DOOR_DISTANCE);
      }
    });

    it("swaps a Bouncer for a Zombie when it has no 3x3 room (a hall 2 tiles tall)", function () {
      const parsed = parseRoomTemplate({
        name: "tight",
        role: "normal",
        rows: ["####++####", "#........#", "#.mmmmm..#", "####++####"]
      });
      const layout = buildEncounterLayout(parsed);
      const spawns = placeWave(["Bouncer", "Skeleton"], layout, createRng(1));
      expect(spawns.map((s) => s.type).sort()).toEqual(["Skeleton", "Zombie"]);
    });
  });
});
