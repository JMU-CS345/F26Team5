// What the minimap may reveal: pure minimapRoomState(room, dungeon).
describe("minimapRoomState", function () {
  // A line of four rooms: 0 - 1 - 2 - 3 (3 is the boss).
  function makeDungeon() {
    const rooms = [0, 1, 2, 3].map((id) => {
      return { id: id, role: "normal", visited: false, cleared: false, exits: [] };
    });
    rooms[0].role = "start";
    rooms[3].role = "boss";
    for (let i = 0; i < 3; i++) {
      rooms[i].exits.push({ toId: i + 1, tiles: [] });
      rooms[i + 1].exits.push({ toId: i, tiles: [] });
    }
    return { rooms: rooms, currentId: null };
  }

  function visit(dungeon, id) {
    dungeon.rooms[id].visited = true;
    dungeon.currentId = id;
  }

  function looks(dungeon) {
    return dungeon.rooms.map((r) => minimapRoomState(r, dungeon).look);
  }

  it("hides everything before the first visit", function () {
    expect(looks(makeDungeon())).toEqual(["hidden", "hidden", "hidden", "hidden"]);
  });

  it("shows the current room white and its neighbour as an outline", function () {
    const d = makeDungeon();
    visit(d, 0);
    expect(looks(d)).toEqual(["current", "outline", "hidden", "hidden"]);
  });

  it("shows visited rooms after the player moves on", function () {
    const d = makeDungeon();
    visit(d, 0);
    visit(d, 1);
    expect(looks(d)).toEqual(["visited", "current", "outline", "hidden"]);
  });

  it("does not reveal rooms two steps from any visited room", function () {
    const d = makeDungeon();
    visit(d, 1);
    expect(minimapRoomState(d.rooms[3], d).look).toBe("hidden");
  });

  it("hides the boss skull until the boss room was entered", function () {
    const d = makeDungeon();
    visit(d, 2);
    expect(minimapRoomState(d.rooms[3], d).look).toBe("outline");
    expect(minimapRoomState(d.rooms[3], d).skull).toBe(false);
    visit(d, 3);
    expect(minimapRoomState(d.rooms[3], d).skull).toBe(true);
  });

  it("shows a tick only for a visited, cleared room", function () {
    const d = makeDungeon();
    visit(d, 0);
    d.rooms[1].cleared = true; // never entered, so no tick
    expect(minimapRoomState(d.rooms[1], d).tick).toBe(false);
    d.rooms[0].cleared = true;
    expect(minimapRoomState(d.rooms[0], d).tick).toBe(true);
    visit(d, 1);
    expect(minimapRoomState(d.rooms[1], d).tick).toBe(true);
    expect(minimapRoomState(d.rooms[2], d).tick).toBe(false);
  });

  it("marks doors only on rooms the player has entered", function () {
    const d = makeDungeon();
    visit(d, 0);
    expect(minimapRoomState(d.rooms[0], d).doors).toBe(true);
    expect(minimapRoomState(d.rooms[1], d).doors).toBe(false);
    expect(minimapRoomState(d.rooms[2], d).doors).toBe(false);
  });

  it("works on a real dungeon: only the start room and its neighbours show", function () {
    const d = generateDungeon({ seed: 5 });
    enterRoomFlow(d, d.start);
    const neighbours = d.start.exits.map((e) => e.toId);
    for (const r of d.rooms) {
      const shown = minimapRoomState(r, d).look !== "hidden";
      expect(shown).toBe(r === d.start || neighbours.includes(r.id));
    }
    expect(minimapRoomState(d.start, d).look).toBe("current");
  });
});
