describe("Npc", function () {
  it("stores its position and name", function () {
    const npc = new Npc(100, 200, "Elder");
    expect(npc.pos.x).toBe(100);
    expect(npc.pos.y).toBe(200);
    expect(npc.name).toBe("Elder");
  });

  it("has a 16x16 size by default", function () {
    const npc = new Npc(0, 0, "Guard");
    expect(npc.length).toBe(16);
    expect(npc.width).toBe(16);
  });

  it("getBounds returns the correct rectangle", function () {
    const npc = new Npc(50, 75, "Merchant");
    const bounds = npc.getBounds();
    expect(bounds).toEqual({ x: 50, y: 75, w: 16, h: 16 });
  });

  it("getCenter returns the middle of the NPC", function () {
    const npc = new Npc(100, 200, "Sage");
    const center = npc.getCenter();
    expect(center.x).toBe(108);
    expect(center.y).toBe(208);
  });

  it("throws if created without a name", function () {
    expect(function () { new Npc(0, 0); }).toThrowError("NPC must have a name");
    expect(function () { new Npc(0, 0, ""); }).toThrowError("NPC must have a name");
    expect(function () { new Npc(0, 0, 42); }).toThrowError("NPC must have a name");
  });

  describe("dialogue and proximity", function () {
    it("defaults to a single placeholder page when no dialogue provided", function () {
      const npc = new Npc(0, 0, "Quiet Guy");
      expect(npc.getDialoguePages()).toEqual(["..."]);
    });

    it("accepts a string and normalizes to an array", function () {
      const npc = new Npc(0, 0, "Greeter", "Hello world!");
      expect(npc.getDialoguePages()).toEqual(["Hello world!"]);
    });

    it("stores multiple dialogue pages when provided an array", function () {
      const npc = new Npc(0, 0, "Storyteller", ["Page 1", "Page 2", "Page 3"]);
      expect(npc.getDialoguePages()).toEqual(["Page 1", "Page 2", "Page 3"]);
    });

    it("isPlayerNear returns true when player is within range", function () {
      const npc = new Npc(100, 100, "Guard");
      const fakePlayer = {
        getCenter: function () {
          return new p5.Vector(110, 100);
        }
      };
      expect(npc.isPlayerNear(fakePlayer, 30)).toBe(true);
    });

    it("isPlayerNear returns false when player is beyond range", function () {
      const npc = new Npc(100, 100, "Guard");
      const fakePlayer = {
        getCenter: function () {
          return new p5.Vector(200, 200);
        }
      };
      expect(npc.isPlayerNear(fakePlayer, 30)).toBe(false);
    });

    it("isPlayerNear handles missing or invalid player gracefully", function () {
      const npc = new Npc(100, 100, "Guard");
      expect(npc.isPlayerNear(null)).toBe(false);
      expect(npc.isPlayerNear({})).toBe(false);
    });
  });
});
