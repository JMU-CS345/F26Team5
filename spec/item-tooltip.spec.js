describe("item tooltip lines", function () {
  const meleeOf = (damage, extra = {}) => new MeleeWeapon({
    id: "m" + damage, name: "Blade " + damage, damage: damage, baseId: "sword", ...extra
  });
  const textsOf = (lines) => lines.map((l) => l.text);

  it("starts with the name in the rarity colour, then the base", function () {
    const lines = itemTooltipLines(meleeOf(3, { rarity: "rare" }));
    expect(lines[0]).toEqual({ text: "Blade 3", color: "rarity" });
    expect(lines[1].text).toBe("Rare melee weapon");
  });

  it("lists stats, affix lines and the sell value", function () {
    const weapon = generateWeapon(createRng(5), { rarity: "epic", kind: "melee" });
    const texts = textsOf(itemTooltipLines(weapon));
    expect(texts).toContain("Damage: " + weapon.damage);
    for (const effect of weaponEffectLines(weapon)) {
      expect(texts).toContain(effect);
    }
    expect(texts[texts.length - 1]).toBe("Sell value: " + weapon.value + " gold");
  });

  it("shows green lines for better stats and red for worse", function () {
    const lines = itemTooltipLines(meleeOf(4), meleeOf(2));
    const damage = lines.find((l) => l.text.endsWith("Damage") && l.text.startsWith("+"));
    expect(damage.color).toBe("green");
    const worse = itemTooltipLines(meleeOf(1), meleeOf(2))
      .find((l) => l.text.endsWith("Damage") && l.text.startsWith("-"));
    expect(worse.color).toBe("red");
  });

  it("shows no compare lines for the equipped weapon itself or an empty slot", function () {
    const weapon = meleeOf(3);
    const own = textsOf(itemTooltipLines(weapon, weapon));
    const none = textsOf(itemTooltipLines(weapon, null));
    expect(own).toEqual(none);
    expect(none.some((t) => t.startsWith("+") || t.startsWith("-"))).toBe(false);
  });

  it("leaves out stats that are the same", function () {
    const lines = itemTooltipLines(meleeOf(3), meleeOf(3));
    expect(textsOf(lines).some((t) => t.startsWith("+") || t.startsWith("-"))).toBe(false);
  });

  it("does not compare a melee weapon with a ranged one", function () {
    const wand = new ProjectileWeapon({ id: "w", name: "Wand", damage: 1, baseId: "wand" });
    const lines = itemTooltipLines(meleeOf(3), wand);
    expect(textsOf(lines).some((t) => t.startsWith("+") || t.startsWith("-"))).toBe(false);
  });

  it("names the armor slot and compares defense", function () {
    const better = new Helmet({ id: "a", name: "Iron Hat", defense: 3 });
    const worse = new Helmet({ id: "b", name: "Cap", defense: 1 });
    const lines = itemTooltipLines(better, worse);
    expect(lines[1].text).toBe("Head armor");
    expect(textsOf(lines)).toContain("Defense: 3");
    const diff = lines.find((l) => l.text === "+2 Defense");
    expect(diff.color).toBe("green");
    const down = itemTooltipLines(worse, better).find((l) => l.text === "-2 Defense");
    expect(down.color).toBe("red");
  });

  it("shows what a potion restores and a locked flag", function () {
    const flask = new Consumable({
      id: "p", name: "Potion", healthRestore: 2, value: 5, description: "Red."
    });
    flask.locked = true;
    const texts = textsOf(itemTooltipLines(flask));
    expect(texts).toContain("Restores 2 health");
    expect(texts).toContain("Sell value: 5 gold");
    expect(texts).toContain("Locked");
  });

  it("puts the tooltip left of the item when the right side would leave the screen", function () {
    expect(tooltipBoxX(300, 240, 230, 1280)).toBe(300);
    expect(tooltipBoxX(1128, 1064, 230, 1280)).toBe(834);
    expect(tooltipBoxX(100, 20, 230, 200)).toBe(0);
  });

  it("handles a plain item with no description", function () {
    const texts = textsOf(itemTooltipLines(new Item({ id: "g", name: "Gem", value: 4 })));
    expect(texts).toEqual(["Gem", "Sell value: 4 gold"]);
  });
});
