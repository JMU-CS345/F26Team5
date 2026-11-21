// Checks the Tall and Short playermodels: sheets, layer sheets and walk cycles.
describe("PLAYER_MODELS", () => {
  it("has the Tall and Short models, in menu order", () => {
    expect(PLAYER_MODEL_NAMES).toEqual(["Tall", "Short"]);
    expect(PLAYER_MODELS.Tall.spriteH).toBe(32);
    expect(PLAYER_MODELS.Short.spriteH).toBe(16);
  });

  it("gives every model a walk cycle for each facing", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      for (const facing of ["down", "up", "right", "left"]) {
        expect(PLAYER_MODELS[name].walkCycles[facing].length).toBeGreaterThan(0);
      }
    }
  });

  it("has a layer sheet for every layer part", () => {
    for (const name of PLAYER_MODEL_NAMES) {
      for (const layer of APPEARANCE_LAYER_ORDER) {
        expect(PLAYER_MODELS[name].layerSheets[layer]).toContain(".png");
      }
    }
  });
});
