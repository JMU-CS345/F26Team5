describe("NPC model", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160);
    player = new Player(50, 50);
  });

  describe("construction and basic properties", function () {
    it("creates an NPC with default dimensions and state", function () {
      const npc = new NPC(60, 60);
      expect(npc.pos.x).toBe(60);
      expect(npc.pos.y).toBe(60);
      expect(npc.length).toBe(16);
      expect(npc.width).toBe(16);
      expect(npc.isTalking).toBe(false);
      expect(npc.isMoving).toBe(false);
      expect(npc.dialogue.length).toBeGreaterThan(0);
    });

    it("reports bounds and center", function () {
      const npc = new NPC(40, 50);
      expect(npc.getBounds()).toEqual({ x: 40, y: 50, w: 16, h: 16 });
      expect(npc.getCenter().x).toBe(48);
      expect(npc.getCenter().y).toBe(58);
    });

    it("accepts custom dialogue array", function () {
      const lines = ["Line 1", "Line 2", "Line 3"];
      const npc = new NPC(40, 50, lines);
      expect(npc.dialogue).toEqual(lines);
    });

    it("creates NPCs from presets", function () {
      const shopkeeper = createNPC("Shopkeeper", 100, 100);
      expect(shopkeeper.name).toBe("Shopkeeper");
      expect(shopkeeper.dialogue[0]).toContain("shop");

      const elder = createNPC("Elder", 120, 120);
      expect(elder.name).toBe("Elder");
      expect(elder.dialogue[0]).toContain("mage");

      const guard = createNPC("Guard", 80, 80);
      expect(guard.name).toBe("Guard");
      expect(guard.speed).toBeGreaterThan(0);
    });
  });

  describe("interaction range", function () {
    it("allows interaction when player is within talk distance", function () {
      const npc = new NPC(50, 50);
      player.pos.set(55, 55);
      expect(npc.canInteract(player)).toBe(true);
    });

    it("disallows interaction when player is too far away", function () {
      const npc = new NPC(50, 50);
      player.pos.set(120, 120);
      expect(npc.canInteract(player)).toBe(false);
    });

    it("handles null or undefined player safely", function () {
      const npc = new NPC(50, 50);
      expect(npc.canInteract(null)).toBe(false);
      expect(npc.canInteract(undefined)).toBe(false);
    });
  });

  describe("dialogue flow and text box", function () {
    it("opens dialogue and shows initial text on interact", function () {
      const npc = new NPC(50, 50, ["First line", "Second line"]);
      expect(npc.isTalking).toBe(false);
      expect(npc.getCurrentText()).toBe("");

      npc.interact();
      expect(npc.isTalking).toBe(true);
      expect(npc.getCurrentText()).toBe("First line");
    });

    it("advances through dialogue lines sequentially", function () {
      const npc = new NPC(50, 50, ["Line A", "Line B", "Line C"]);
      npc.interact();
      expect(npc.getCurrentText()).toBe("Line A");

      npc.interact();
      expect(npc.getCurrentText()).toBe("Line B");

      npc.interact();
      expect(npc.getCurrentText()).toBe("Line C");
    });

    it("closes dialogue after the last line and resets state", function () {
      const npc = new NPC(50, 50, ["One", "Two"]);
      npc.interact(); // opens line 0
      npc.interact(); // advances to line 1
      npc.interact(); // closes dialogue

      expect(npc.isTalking).toBe(false);
      expect(npc.getCurrentText()).toBe("");
      expect(npc.currentLine).toBe(0);
    });

    it("can be closed directly with closeDialogue", function () {
      const npc = new NPC(50, 50, ["One", "Two"]);
      npc.interact();
      expect(npc.isTalking).toBe(true);

      npc.closeDialogue();
      expect(npc.isTalking).toBe(false);
      expect(npc.getCurrentText()).toBe("");
    });
  });

  describe("dialogue choices", function () {
    it("presents choices on the final line if configured", function () {
      const npc = new NPC(50, 50, {
        dialogue: ["Intro"],
        choices: [
          { text: "Ask about dungeon", response: "It is dangerous." },
          { text: "Leave", response: "Farewell." }
        ]
      });

      npc.interact();
      expect(npc.hasChoices()).toBe(true);
      expect(npc.getCurrentChoices()).toEqual(["Ask about dungeon", "Leave"]);
    });

    it("displays the chosen response and closes on next interact", function () {
      const npc = new NPC(50, 50, {
        dialogue: ["Intro"],
        choices: [
          { text: "Option 1", response: "Response 1" },
          { text: "Option 2", response: "Response 2" }
        ]
      });

      npc.interact();
      expect(npc.choose(1)).toBe(true);
      expect(npc.getCurrentText()).toBe("Response 2");
      expect(npc.hasChoices()).toBe(false);

      npc.interact();
      expect(npc.isTalking).toBe(false);
    });

    it("rejects invalid choice indices", function () {
      const npc = new NPC(50, 50, {
        dialogue: ["Intro"],
        choices: [{ text: "Only", response: "One" }]
      });
      npc.interact();
      expect(npc.choose(5)).toBe(false);
      expect(npc.choose(-1)).toBe(false);
    });
  });

  describe("moving NPCs and acceptance criteria", function () {
    it("moves along waypoints when not talking", function () {
      const npc = new NPC(50, 50, {
        path: [
          { x: 50, y: 50 },
          { x: 60, y: 50 }
        ],
        speed: 1
      });

      expect(npc.isMoving).toBe(true);
      const startX = npc.pos.x;
      npc.update();
      expect(npc.pos.x).toBeGreaterThan(startX);
    });

    it("stops moving when interacted with, and resumes moving when dialogue closes", function () {
      const npc = new NPC(50, 50, {
        dialogue: ["Halt, traveler!", "Move along."],
        path: [
          { x: 50, y: 50 },
          { x: 100, y: 50 }
        ],
        speed: 2
      });

      // 1. Moving along path initially
      expect(npc.isMoving).toBe(true);
      npc.update();
      const posWhileMoving = npc.pos.x;
      expect(posWhileMoving).toBeGreaterThan(50);

      // 2. Interacted with: stops moving
      npc.interact();
      expect(npc.isTalking).toBe(true);
      expect(npc.isMoving).toBe(false);
      expect(npc.getCurrentText()).toBe("Halt, traveler!");

      // While talking, update does NOT advance position
      npc.update();
      npc.update();
      expect(npc.pos.x).toBe(posWhileMoving);
      expect(npc.isMoving).toBe(false);

      // Advance dialogue
      npc.interact();
      expect(npc.getCurrentText()).toBe("Move along.");
      npc.update();
      expect(npc.pos.x).toBe(posWhileMoving);

      // 3. Dialogue finished: closes and resumes moving
      npc.interact();
      expect(npc.isTalking).toBe(false);
      expect(npc.isMoving).toBe(true);

      // Next update continues movement along path
      npc.update();
      expect(npc.pos.x).toBeGreaterThan(posWhileMoving);
    });

    it("cycles waypoints once reaching a destination", function () {
      const npc = new NPC(50, 50, {
        path: [
          { x: 52, y: 50 },
          { x: 50, y: 50 }
        ],
        speed: 2
      });

      // Frame 1: reaches (52, 50) and advances waypoint to point 1
      npc.update();
      expect(npc.pos.x).toBe(52);
      expect(npc.currentWaypointIndex).toBe(1);

      // Frame 2: moves back toward (50, 50)
      npc.update();
      expect(npc.pos.x).toBe(50);
      expect(npc.currentWaypointIndex).toBe(0);
    });

    it("respects wall collisions in rooms", function () {
      // Room floor spans 16 to 144
      const npc = new NPC(20, 50, {
        path: [{ x: 5, y: 50 }], // target is inside left wall
        speed: 5
      });

      for (let i = 0; i < 20; i++) {
        npc.update(room);
      }
      expect(room.collidesWithWall(npc.getBounds())).toBe(false);
      expect(npc.pos.x).toBeGreaterThanOrEqual(room.x + room.tileSize);
    });
  });
});
