describe("ItemDrop", () => {
  it("stores a validated item stack at a world position", () => {
    const potion = new Consumable({ id: "potion", name: "Potion" });
    const drop = new ItemDrop(20, 30, potion, 3);

    expect(drop.item).toBe(potion);
    expect(drop.quantity).toBe(3);
    expect(drop.getBounds()).toEqual({
      x: 20,
      y: 30,
      w: ITEM_DROP_SIZE,
      h: ITEM_DROP_SIZE
    });
  });

  it("uses ItemStack validation for its item and quantity", () => {
    const weapon = new Weapon({ id: "wand", name: "Wand" });
    expect(() => new ItemDrop(0, 0, weapon, 2)).toThrow();
    expect(() => new ItemDrop(0, 0, {}, 1)).toThrow();
    expect(() => new ItemDrop(Infinity, 0, weapon)).toThrow();
  });

  it("advances a bounded floating animation offset", () => {
    const drop = new ItemDrop(0, 0, new Gold(), 5);
    expect(drop.age).toBe(0);
    expect(drop.bobOffset).toBe(0);

    for (let frame = 0; frame < 30; frame++) {
      drop.update();
      expect(Math.abs(drop.bobOffset)).toBeLessThanOrEqual(ITEM_DROP_BOB_HEIGHT);
    }
    expect(drop.age).toBe(30);
  });
});
