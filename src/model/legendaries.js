// Handmade legendary weapons. Model code: no p5 drawing calls.
// Load after weapon-hooks.js and weapon-bases.js, and before weapon-generator.js.
//
// Each row is a weapon with a name, a fixed base and element, and one unique hook. The
// generator rolls the base stats as usual, applies `stats`, then adds two random affixes
// (no elements, since the weapon already has one). The hooks take the ctx and return effects
// described in weapon-hooks.js. They only use ctx, so the same ctx always gives the same
// effects, and each one answers a trigger with a fixed number of effects.
//
// Row fields: id, name, baseId, element, blurb, power (the card line for the unique effect),
// stats (function that changes the rolled stats in place), and onHit and/or onFire.

function legendaryFireball(ctx, x, y) {
  const w = hookWeapon(ctx);
  const next = nearestEnemy(ctx, x, y, 220);
  let angle = ctx.angle;
  if (next !== null) {
    angle = angleBetween(x, y, next.x, next.y);
  }
  return projectileEffect(x, y, angle, ctx.damage * 1.5, {
    speed: 4.5, range: 220, element: w.element
  });
}

// Emberfang: killing a target throws a fireball at the next enemy (or onward).
function emberfangHit(ctx) {
  if (ctx.target && ctx.target.health <= 0) {
    return [legendaryFireball(ctx, ctx.target.x, ctx.target.y)];
  }
  return [];
}

// Wayfinder: every shot comes back. A second shot starts at the end of the range and flies
// home along the same line.
function wayfinderFire(ctx) {
  const w = hookWeapon(ctx);
  const endX = ctx.source.x + Math.cos(ctx.angle) * w.range;
  const endY = ctx.source.y + Math.sin(ctx.angle) * w.range;
  return [projectileEffect(endX, endY, ctx.angle + Math.PI, ctx.damage * 0.7, {
    speed: w.shotSpeed, range: w.range, element: w.element,
    delayFrames: Math.round(w.range / w.shotSpeed)
  })];
}

// Starfall: every 5th shot also releases a ring of 8 shots.
function starfallFire(ctx) {
  if (!everyNth(ctx.count, 5)) {
    return [];
  }
  const w = hookWeapon(ctx);
  const effects = [];
  for (let i = 0; i < 8; i++) {
    effects.push(projectileEffect(ctx.source.x, ctx.source.y, (i * Math.PI) / 4,
      ctx.damage * 0.6, { speed: 3.5, range: 110, element: w.element }));
  }
  return effects;
}

// Gravemaul: each hit drags nearby enemies toward the target.
function gravemaulHit(ctx) {
  if (!ctx.target) {
    return [];
  }
  return [pullEffect(ctx.target.x, ctx.target.y, 100, 3)];
}

// Soulthirst: a kill heals 2.
function soulthirstHit(ctx) {
  if (ctx.target && ctx.target.health <= 0) {
    return [healEffect(2)];
  }
  return [];
}

// Thornspire: every 4th hit fires three piercing thorns forward.
function thornspireHit(ctx) {
  if (!everyNth(ctx.count, 4) || !ctx.target) {
    return [];
  }
  const w = hookWeapon(ctx);
  const effects = [];
  for (const turn of [-0.2, 0, 0.2]) {
    effects.push(projectileEffect(ctx.target.x, ctx.target.y, ctx.angle + turn,
      ctx.damage * 0.5, { speed: 5, range: 160, pierce: 2, element: w.element }));
  }
  return effects;
}

// Cinder Scepter: every hit bursts in a small fire blast.
function cinderHit(ctx) {
  if (!ctx.target) {
    return [];
  }
  return [areaEffect(ctx.target.x, ctx.target.y, 36, ctx.damage * 0.5, {
    element: hookWeapon(ctx).element
  })];
}

// Chorus: every 3rd shot is repeated twice, a moment apart.
function chorusFire(ctx) {
  if (!everyNth(ctx.count, 3)) {
    return [];
  }
  const w = hookWeapon(ctx);
  const effects = [];
  for (const delay of [10, 20]) {
    for (let i = 0; i < 3; i++) {
      effects.push(projectileEffect(ctx.source.x, ctx.source.y, ctx.angle + (i - 1) * 0.4,
        ctx.damage * 0.7, { speed: w.shotSpeed, range: w.range, element: w.element,
          delayFrames: delay }));
    }
  }
  return effects;
}

// Frostheart: every 6th shot is one huge piercing orb.
function frostheartFire(ctx) {
  if (!everyNth(ctx.count, 6)) {
    return [];
  }
  const w = hookWeapon(ctx);
  return [projectileEffect(ctx.source.x, ctx.source.y, ctx.angle, ctx.damage * 2.5, {
    speed: w.shotSpeed, range: w.range * 1.2, pierce: 5, element: w.element
  })];
}

// Reaver: hitting an enemy below 30% health finishes it with a bonus blow.
function reaverHit(ctx) {
  const t = ctx.target;
  if (t && t.health > 0 && t.health / t.maxHealth < 0.3) {
    return [areaEffect(t.x, t.y, 20, ctx.damage * 2, { element: hookWeapon(ctx).element })];
  }
  return [];
}

const LEGENDARIES = Object.freeze([
  {
    id: "emberfang", name: "Emberfang", baseId: "sword", element: "Fire",
    blurb: "A blade that never quite stops burning.",
    power: "Killing a target throws a fireball at the next enemy",
    stats: (s) => scaleStat(s, "damage", 1.3), onHit: emberfangHit
  },
  {
    id: "wayfinder", name: "Wayfinder", baseId: "wand", element: "Mind",
    blurb: "Its bolts always find their way home.",
    power: "Every shot flies back to you",
    stats: (s) => scaleStat(s, "damage", 1.3), onFire: wayfinderFire
  },
  {
    id: "starfall", name: "Starfall Staff", baseId: "staff", element: "Mind",
    blurb: "Gathers light for four shots, then lets it all go.",
    power: "Every 5th shot releases a ring of 8",
    stats: (s) => scaleStat(s, "damage", 1.2), onFire: starfallFire
  },
  {
    id: "gravemaul", name: "Gravemaul", baseId: "hammer", element: "Ice",
    blurb: "Heavy enough to bend the ground around it.",
    power: "Hits pull nearby enemies in",
    stats: (s) => scaleStat(s, "damage", 1.2), onHit: gravemaulHit
  },
  {
    id: "soulthirst", name: "Soulthirst", baseId: "dagger", element: "Mind",
    blurb: "Drinks what it cuts.",
    power: "Kills heal 2",
    stats: (s) => scaleStat(s, "damage", 1.4), onHit: soulthirstHit
  },
  {
    id: "thornspire", name: "Thornspire", baseId: "spear", element: "Ice",
    blurb: "Frost grows along the shaft.",
    power: "Every 4th hit fires 3 piercing thorns",
    stats: (s) => scaleStat(s, "damage", 1.25), onHit: thornspireHit
  },
  {
    id: "cinder-scepter", name: "Cinder Scepter", baseId: "scepter", element: "Fire",
    blurb: "Every shot leaves embers.",
    power: "Hits burst in a small fire blast",
    stats: (s) => scaleStat(s, "damage", 1.25), onHit: cinderHit
  },
  {
    id: "chorus", name: "Chorus Tome", baseId: "tome", element: "Mind",
    blurb: "The words repeat themselves.",
    power: "Every 3rd shot is repeated twice",
    stats: (s) => scaleStat(s, "damage", 1.2), onFire: chorusFire
  },
  {
    id: "frostheart", name: "Frostheart", baseId: "orb", element: "Ice",
    blurb: "A slow pulse of cold, and now and then a heavy one.",
    power: "Every 6th shot is a huge piercing orb",
    stats: (s) => scaleStat(s, "damage", 1.2), onFire: frostheartFire
  },
  {
    id: "reaver", name: "Reaver", baseId: "axe", element: "Fire",
    blurb: "It does not like leaving things half done.",
    power: "Hits on enemies under 30% health finish them",
    stats: (s) => scaleStat(s, "damage", 1.2), onHit: reaverHit
  }
]);

function getLegendary(id) {
  return LEGENDARIES.find((l) => l.id === id) || null;
}

// The legendaries that fit a kind ("melee", "ranged" or undefined for any).
function legendariesFor(kind) {
  if (kind === undefined) {
    return LEGENDARIES;
  }
  return LEGENDARIES.filter((l) => getWeaponBase(l.baseId).kind === kind);
}

// Checks the table. Returns a list of problems (empty if all is well).
function validateLegendaries(rows = LEGENDARIES) {
  const problems = [];
  const ids = new Set();
  for (const row of rows) {
    const bad = (message) => problems.push(row.id + ": " + message);
    if (ids.has(row.id)) {
      bad("the id is used by another legendary too");
    }
    ids.add(row.id);
    if (getWeaponBase(row.baseId) === null) {
      bad("baseId is not a weapon base");
    }
    if (!WEAPON_ELEMENTS.includes(row.element)) {
      bad("needs an element");
    }
    if (typeof row.onHit !== "function" && typeof row.onFire !== "function") {
      bad("needs onHit or onFire");
    }
    if (typeof row.stats !== "function") {
      bad("needs a stats function");
    }
    if (typeof row.name !== "string" || typeof row.power !== "string") {
      bad("needs a name and a power line");
    }
  }
  if (rows.length < 8 || rows.length > 10) {
    problems.push("there should be 8 to 10 legendaries");
  }
  return problems;
}
