describe("Menu", function () {
  let log;

  function makeMenu(disabledIndex) {
    log = [];
    const items = ["A", "B", "C"].map((name, i) => ({
      label: name,
      enabled: i !== disabledIndex,
      action: () => log.push(name)
    }));
    return new Menu(items, () => log.push("back"));
  }

  it("starts on the first item", function () {
    expect(makeMenu(-1).index).toBe(0);
  });

  it("starts on the first enabled item when the first is disabled", function () {
    expect(makeMenu(0).index).toBe(1);
  });

  it("wraps from the first item to the last and back", function () {
    const menu = makeMenu(-1);
    menu.previous();
    expect(menu.index).toBe(2);
    menu.next();
    expect(menu.index).toBe(0);
  });

  it("skips a disabled item in both directions", function () {
    const menu = makeMenu(1);
    menu.next();
    expect(menu.index).toBe(2);
    menu.previous();
    expect(menu.index).toBe(0);
  });

  it("skips a disabled item when wrapping", function () {
    const menu = makeMenu(0);
    menu.next();
    expect(menu.index).toBe(2);
    menu.next();
    expect(menu.index).toBe(1);
  });

  it("fires the action of the selected item on confirm", function () {
    const menu = makeMenu(-1);
    menu.next();
    expect(menu.confirm()).toBe(true);
    expect(log).toEqual(["B"]);
  });

  it("fires the back callback", function () {
    const menu = makeMenu(-1);
    expect(menu.back()).toBe(true);
    expect(log).toEqual(["back"]);
  });

  it("does nothing on back when there is no back callback", function () {
    expect(new Menu([{ label: "A", action: () => {} }]).back()).toBe(false);
  });

  it("does not confirm when every item is disabled", function () {
    log = [];
    const menu = new Menu([{ label: "A", enabled: false, action: () => log.push("A") }]);
    menu.next();
    expect(menu.confirm()).toBe(false);
    expect(log).toEqual([]);
  });

  it("handles an empty menu without errors", function () {
    const menu = new Menu([]);
    menu.next();
    menu.previous();
    expect(menu.selectedItem()).toBeNull();
    expect(menu.confirm()).toBe(false);
    expect(menu.adjust(1)).toBe(false);
    expect(menu.back()).toBe(false);
  });

  it("calls adjust with the direction, and reads function labels", function () {
    let value = 5;
    const menu = new Menu([{
      label: () => "Volume " + value,
      adjust: (direction) => { value += direction; }
    }]);
    expect(menu.adjust(1)).toBe(true);
    expect(menu.labelOf(menu.selectedItem())).toBe("Volume 6");
  });

  it("goes back to the first enabled item on reset", function () {
    const menu = makeMenu(0);
    menu.next();
    menu.reset();
    expect(menu.index).toBe(1);
  });
});

describe("handleMenuKey", function () {
  function twoItemMenu(log) {
    return new Menu([
      { label: "A", action: () => log.push("A") },
      { label: "B", action: () => log.push("B"), adjust: (d) => log.push("adjust" + d) }
    ], () => log.push("back"));
  }

  it("moves with up, down, W and S and confirms with Enter", function () {
    const log = [];
    const menu = twoItemMenu(log);
    expect(handleMenuKey(menu, 40)).toBe(true);
    expect(menu.index).toBe(1);
    handleMenuKey(menu, 87);
    expect(menu.index).toBe(0);
    handleMenuKey(menu, 83);
    handleMenuKey(menu, 13);
    expect(log).toEqual(["B"]);
  });

  it("uses left and right to adjust in a vertical menu", function () {
    const log = [];
    const menu = twoItemMenu(log);
    menu.next();
    handleMenuKey(menu, 39);
    handleMenuKey(menu, 65);
    expect(log).toEqual(["adjust1", "adjust-1"]);
  });

  it("uses left and right to move in a horizontal menu", function () {
    const menu = twoItemMenu([]);
    handleMenuKey(menu, 39, true);
    expect(menu.index).toBe(1);
    handleMenuKey(menu, 37, true);
    expect(menu.index).toBe(0);
  });

  it("goes back on Escape and ignores other keys", function () {
    const log = [];
    const menu = twoItemMenu(log);
    expect(handleMenuKey(menu, 27)).toBe(true);
    expect(handleMenuKey(menu, 81)).toBe(false);
    expect(log).toEqual(["back"]);
  });
});
