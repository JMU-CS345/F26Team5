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
});
