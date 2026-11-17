describe("credits data", function () {
  // One entry per row of the table in assets/CREDITS.md. Keep this list in sync with that
  // file, because specs cannot fetch it. "creator" is the Creator column.
  const CREDITS_MD_ROWS = [
    { asset: "assets/enemy/tiny-creatures.png", creator: "Clint Bellanger", license: "CC0" }
  ];
  // The sentence under the table: everything else was drawn by Vincent Barr.
  const CREDITS_MD_REST_CREATOR = "Vincent Barr";

  it("has a matching entry for every row of CREDITS.md", function () {
    for (const row of CREDITS_MD_ROWS) {
      const entry = CREDITS.assets.find((a) => a.asset === row.asset);
      expect(entry).toBeDefined();
      expect(entry.creator).toBe(row.creator);
      expect(entry.license).toContain(row.license);
    }
  });

  it("credits everything else to Vincent Barr", function () {
    const entry = CREDITS.assets.find((a) => a.creator === CREDITS_MD_REST_CREATOR);
    expect(entry).toBeDefined();
  });

  it("has no empty fields in any asset entry", function () {
    for (const entry of CREDITS.assets) {
      for (const field of ["asset", "description", "creator", "license", "source"]) {
        expect(typeof entry[field]).toBe("string");
        expect(entry[field].trim()).not.toBe("");
      }
    }
  });

  it("lists the team, course and instructor", function () {
    expect(CREDITS.team).toEqual(["Enzo", "Nick", "Vincent", "Minhhai", "Prabesh"]);
    expect(CREDITS.course).toBe("JMU CS345 Fall 2026");
    expect(CREDITS.instructor).toBe("Prof. Riley");
  });

  it("puts every name and asset creator in the line list", function () {
    const text = creditsLines().map((line) => line.text).join("\n");
    for (const name of CREDITS.team) {
      expect(text).toContain(name);
    }
    expect(text).toContain("Prof. Riley");
    expect(text).toContain("Clint Bellanger");
    expect(text).toContain("Vincent Barr");
    expect(text).toContain("JMU CS345 Fall 2026");
  });
});
