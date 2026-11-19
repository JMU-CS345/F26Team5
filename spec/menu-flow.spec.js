describe("ConfirmDialog", function () {
  let dialog;
  let log;

  beforeEach(function () {
    log = [];
    dialog = new ConfirmDialog();
    dialog.show("Restart?", () => log.push("yes"));
  });

  it("is closed until it is shown", function () {
    expect(new ConfirmDialog().isOpen()).toBe(false);
    expect(dialog.isOpen()).toBe(true);
  });

  it("starts on No, so Enter does nothing", function () {
    expect(dialog.menu.labelOf(dialog.menu.selectedItem())).toBe("No");
    dialog.menu.confirm();
    expect(log).toEqual([]);
    expect(dialog.isOpen()).toBe(false);
  });

  it("runs the action when Yes is picked and closes first", function () {
    dialog.menu.previous();
    dialog.menu.confirm();
    expect(log).toEqual(["yes"]);
    expect(dialog.isOpen()).toBe(false);
  });

  it("closes on Esc without running the action", function () {
    dialog.menu.back();
    expect(dialog.isOpen()).toBe(false);
    expect(log).toEqual([]);
  });

  it("goes back to No every time it opens", function () {
    dialog.menu.previous();
    dialog.close();
    dialog.show("Quit?", () => log.push("quit"));
    expect(dialog.menu.index).toBe(1);
  });

  it("works through the arrow and Enter keys", function () {
    handleMenuKey(dialog.menu, 37, true);
    handleMenuKey(dialog.menu, KEY_ENTER, true);
    expect(log).toEqual(["yes"]);
  });
});

describe("cursor memory", function () {
  function makeMenu() {
    return new Menu([
      { label: "A" },
      { label: "B" },
      { label: "C", enabled: false },
      { label: "D" }
    ]);
  }

  it("keeps the row when the screen is reopened", function () {
    const menu = makeMenu();
    menu.next();
    menu.reopen();
    expect(menu.index).toBe(1);
  });

  it("keeps a separate row for each menu", function () {
    const first = makeMenu();
    const second = makeMenu();
    first.next();
    second.next();
    second.next();
    first.reopen();
    second.reopen();
    expect(first.index).toBe(1);
    expect(second.index).toBe(3);
  });

  it("reset still goes back to the top", function () {
    const menu = makeMenu();
    menu.next();
    menu.reset();
    expect(menu.index).toBe(0);
  });

  it("moves off a row that has become disabled", function () {
    const menu = makeMenu();
    menu.index = 2;
    menu.reopen();
    expect(menu.index).toBe(3);
  });
});

describe("ScreenFade", function () {
  it("is clear on the first screen", function () {
    const fade = new ScreenFade();
    fade.watch("title");
    expect(fade.alpha()).toBe(0);
  });

  it("starts black on a new screen and clears in 8 frames", function () {
    const fade = new ScreenFade();
    fade.watch("title");
    fade.watch("settings");
    expect(fade.alpha()).toBe(255);
    for (let frame = 0; frame < FADE_FRAMES; frame++) {
      fade.watch("settings");
      fade.update();
    }
    expect(fade.alpha()).toBe(0);
  });

  it("does not restart while the screen stays the same", function () {
    const fade = new ScreenFade();
    fade.watch("title");
    fade.watch("credits");
    fade.update();
    fade.watch("credits");
    expect(fade.left).toBe(FADE_FRAMES - 1);
  });
});

describe("controlRows", function () {
  it("splits each preset line into key and action", function () {
    const rows = controlRows({ lines: ["WASD move, J melee", "E interact"] });
    expect(rows).toEqual([
      { key: "WASD", action: "move" },
      { key: "J", action: "melee" },
      { key: "E", action: "interact" }
    ]);
  });

  it("keeps multi-word actions whole", function () {
    const rows = controlRows(CONTROL_PRESETS.classic);
    expect(rows[1]).toEqual({ key: "J", action: "melee" });
    expect(rows[2].action).toBe("fire toward facing");
  });
});
