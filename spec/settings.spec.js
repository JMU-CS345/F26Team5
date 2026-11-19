describe("settings", function () {
  function fakeStorage(text) {
    const data = {};
    if (text !== undefined) {
      data[SETTINGS_KEY] = text;
    }
    return {
      data: data,
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => { data[key] = value; }
    };
  }

  const throwingStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); }
  };

  it("uses the shared storage key", function () {
    expect(SETTINGS_KEY).toBe("mageQuest.settings");
  });

  it("returns the defaults when nothing is saved", function () {
    expect(loadSettings(fakeStorage())).toEqual({
      controls: "classic",
      musicVolume: 0.4,
      sfxVolume: 0.55,
      screenShake: true,
      damageNumbers: true
    });
  });

  it("returns the defaults when the saved text is not JSON", function () {
    expect(loadSettings(fakeStorage("{not json"))).toEqual(defaultSettings());
  });

  it("returns the defaults when storage throws", function () {
    expect(loadSettings(throwingStorage)).toEqual(defaultSettings());
  });

  it("does not crash when saving to storage that throws", function () {
    expect(saveSettings(defaultSettings(), throwingStorage)).toBe(false);
  });

  it("round trips saved settings", function () {
    const storage = fakeStorage();
    const settings = {
      controls: "twinstick",
      musicVolume: 0.2,
      sfxVolume: 1,
      screenShake: false,
      damageNumbers: false
    };
    expect(saveSettings(settings, storage)).toBe(true);
    expect(JSON.parse(storage.data[SETTINGS_KEY])).toEqual(settings);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it("replaces bad fields with defaults and clamps volumes", function () {
    const text = JSON.stringify({ controls: "gamepad", musicVolume: 7, sfxVolume: "loud",
      screenShake: "yes" });
    const loaded = loadSettings(fakeStorage(text));
    expect(loaded.controls).toBe("classic");
    expect(loaded.musicVolume).toBe(1);
    expect(loaded.sfxVolume).toBe(0.55);
    expect(loaded.screenShake).toBe(true);
  });

  it("lists both control presets", function () {
    expect(CONTROL_PRESET_IDS).toEqual(["classic", "twinstick"]);
    for (const id of CONTROL_PRESET_IDS) {
      expect(CONTROL_PRESETS[id].lines.length).toBeGreaterThan(0);
    }
  });
});
