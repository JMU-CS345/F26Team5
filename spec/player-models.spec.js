// Checks the player sheet layout: every frame row exists and every class has a sheet.
describe("PLAYER_MODELS frame rows", () => {
  const ROW_NAMES = ["turn", "hurt", "ko"];

  it("has the turn, hurt and KO rows on both models", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      for (const rowName of ROW_NAMES) {
        const entry = PLAYER_MODELS[name].frameRows[rowName];
        expect(entry).toBeDefined();
        expect(entry.frames).toBeGreaterThan(0);
      }
    }
  });

  it("has a jump row for every direction on both models", () => {
    expect(PLAYER_MODELS.Tall.frameRows.jumpDown).toBeDefined();
    expect(PLAYER_MODELS.Tall.frameRows.jumpUp).toBeDefined();
    expect(PLAYER_MODELS.Tall.frameRows.jumpRight).toBeDefined();
    expect(PLAYER_MODELS.Tall.frameRows.jumpLeft).toBeDefined();
    expect(PLAYER_MODELS.Short.frameRows.jumpDown).toBeDefined();
    expect(PLAYER_MODELS.Short.frameRows.jumpRight).toBeDefined();
    expect(PLAYER_MODELS.Short.frameRows.jumpLeft).toBeDefined();
  });

  it("puts every extra row after the 8 walking rows, each row used once", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      const rows = Object.values(PLAYER_MODELS[name].frameRows).map((entry) => entry.row);
      for (const row of rows) {
        expect(row).toBeGreaterThanOrEqual(8);
      }
      expect(new Set(rows).size).toBe(rows.length);
    }
  });

  it("lists walk frame columns that fit the sheet rows", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      for (const facing of ["down", "up", "right", "left"]) {
        for (const col of PLAYER_MODELS[name].walkCycles[facing]) {
          expect(col).toBeLessThan(3);
        }
      }
    }
  });
});

describe("playerSheetPath", () => {
  it("has a sheet for every class on both models", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      for (const mageClass of MAGE_CLASSES) {
        expect(PLAYER_MODELS[name].classSheets[mageClass]).toMatch(/^assets\/player\/.+\.png$/);
      }
    }
  });

  it("gives each class its own sheet", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      const paths = MAGE_CLASSES.map((mageClass) => playerSheetPath(name, mageClass));
      expect(new Set(paths).size).toBe(MAGE_CLASSES.length);
    }
  });

  it("falls back to the default sheet for no class", () => {
    expect(playerSheetPath("Tall", null)).toBe(PLAYER_MODELS.Tall.sheet);
  });
});
