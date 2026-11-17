describe("Audio rules", function () {
  const SOUND_NAMES = [
    "swing", "hit", "shoot", "hurt", "dash", "pickup", "chest", "menu", "death",
    "levelup", "perfect"
  ];

  describe("volumeFor", function () {
    it("reads music and sound effect volumes separately", function () {
      const settings = { musicVolume: 0.2, sfxVolume: 0.9 };
      expect(volumeFor("music", settings)).toBe(0.2);
      expect(volumeFor("sfx", settings)).toBe(0.9);
    });

    it("clamps volumes to the 0 to 1 range", function () {
      expect(volumeFor("music", { musicVolume: 3 })).toBe(1);
      expect(volumeFor("sfx", { sfxVolume: -0.5 })).toBe(0);
    });

    it("treats missing, non-numeric and NaN volumes as silent", function () {
      expect(volumeFor("music", {})).toBe(0);
      expect(volumeFor("sfx", { sfxVolume: "loud" })).toBe(0);
      expect(volumeFor("sfx", { sfxVolume: NaN })).toBe(0);
    });

    it("is silent when there are no settings", function () {
      expect(volumeFor("music", null)).toBe(0);
    });
  });

  describe("fileFor", function () {
    it("returns a file path for every sound effect name", function () {
      for (const name of SOUND_NAMES) {
        const file = fileFor(name);
        expect(file).toMatch(/^assets\/audio\/[a-z-]+\.mp3$/);
      }
    });

    it("returns null for a sound name that does not exist", function () {
      expect(fileFor("explosion")).toBeNull();
      expect(fileFor("")).toBeNull();
    });

    it("does not treat object properties as sound names", function () {
      expect(fileFor("toString")).toBeNull();
      expect(fileFor("constructor")).toBeNull();
    });

    it("has a file entry for every sound the other branches call", function () {
      expect(Object.keys(SFX_FILES).sort()).toEqual(SOUND_NAMES.slice().sort());
    });
  });

  describe("loadSettings", function () {
    const KEY = "mageQuest.settings";

    afterEach(function () {
      localStorage.removeItem(KEY);
    });

    it("returns the defaults when nothing is saved", function () {
      localStorage.removeItem(KEY);
      expect(loadSettings()).toEqual({
        controls: "classic",
        musicVolume: 0.4,
        sfxVolume: 0.55,
        screenShake: true,
        damageNumbers: true
      });
    });

    it("returns the defaults when the saved JSON is bad", function () {
      localStorage.setItem(KEY, "{not json");
      expect(loadSettings().musicVolume).toBe(0.4);
    });

    it("returns the defaults when saved data is not an object", function () {
      localStorage.setItem(KEY, "42");
      expect(loadSettings().sfxVolume).toBe(0.55);
      localStorage.setItem(KEY, "[1, 2]");
      expect(loadSettings().sfxVolume).toBe(0.55);
    });

    it("returns the defaults when storage throws", function () {
      spyOn(Storage.prototype, "getItem").and.throwError("storage blocked");
      expect(loadSettings().sfxVolume).toBe(0.55);
    });

    it("uses saved values and fills in fields that are missing or the wrong type", function () {
      localStorage.setItem(KEY, JSON.stringify({ musicVolume: 0.1, sfxVolume: "high" }));
      const loaded = loadSettings();
      expect(loaded.musicVolume).toBe(0.1);
      expect(loaded.sfxVolume).toBe(0.55);
      expect(loaded.controls).toBe("classic");
    });
  });

  describe("playback", function () {
    let fakeAudio;

    beforeEach(function () {
      musicAudio = null;
      musicRequested = false;
      musicPaused = false;
      fakeAudio = {
        paused: true,
        loop: false,
        volume: 1,
        play: jasmine.createSpy("play").and.returnValue(Promise.resolve()),
        pause: jasmine.createSpy("pause")
      };
      spyOn(window, "Audio").and.returnValue(fakeAudio);
    });

    afterEach(function () {
      localStorage.removeItem("mageQuest.settings");
    });

    it("ignores an unknown sound name without creating audio", function () {
      playSfx("explosion");
      expect(window.Audio).not.toHaveBeenCalled();
    });

    it("plays a sound effect at the saved sound effect volume", function () {
      localStorage.setItem("mageQuest.settings", JSON.stringify({ sfxVolume: 0.25 }));
      playSfx("shoot");
      expect(window.Audio).toHaveBeenCalledWith("assets/audio/shoot.mp3");
      expect(fakeAudio.volume).toBe(0.25);
      expect(fakeAudio.play).toHaveBeenCalled();
    });

    it("does not play a sound effect when its volume is zero", function () {
      localStorage.setItem("mageQuest.settings", JSON.stringify({ sfxVolume: 0 }));
      playSfx("hit");
      expect(window.Audio).not.toHaveBeenCalled();
    });

    it("handles a blocked sound effect without throwing", async function () {
      fakeAudio.play.and.returnValue(Promise.reject(new Error("autoplay blocked")));
      expect(function () {
        playSfx("pickup");
      }).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("starts music as a loop once a key press asks for it", function () {
      playMusic();
      expect(fakeAudio.loop).toBe(true);
      expect(fakeAudio.play).toHaveBeenCalled();
    });

    it("handles blocked music without throwing", async function () {
      fakeAudio.play.and.returnValue(Promise.reject(new Error("autoplay blocked")));
      expect(function () {
        playMusic();
      }).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("does not restart music that is already playing", function () {
      playMusic();
      fakeAudio.paused = false;
      playMusic();
      expect(fakeAudio.play.calls.count()).toBe(1);
    });

    it("pauses and resumes the music", function () {
      playMusic();
      pauseMusic();
      expect(fakeAudio.pause).toHaveBeenCalled();
      fakeAudio.paused = true;
      resumeMusic();
      expect(fakeAudio.play.calls.count()).toBe(2);
    });

    it("does not start music on resume before any key press", function () {
      resumeMusic();
      expect(fakeAudio.play).not.toHaveBeenCalled();
    });

    it("does not start music from a key press while paused", function () {
      playMusic();
      pauseMusic();
      fakeAudio.paused = true;
      playMusic();
      expect(fakeAudio.play.calls.count()).toBe(1);
    });
  });
});
