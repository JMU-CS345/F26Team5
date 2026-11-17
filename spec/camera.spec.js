describe("camera", () => {
  const viewW = 640;
  const viewH = 360;
  const bounds = { x: 320, y: 160, w: 640, h: 400 };

  describe("cameraFollow", () => {
    it("centers the view on the target", () => {
      expect(cameraFollow(500, 300, viewW, viewH)).toEqual({ x: 180, y: 120 });
    });
  });

  describe("cameraClamp", () => {
    it("leaves a camera that is inside the bounds alone", () => {
      const cam = cameraClamp({ x: 330, y: 180 }, viewW, 200, bounds);
      expect(cam.y).toBe(180);
    });

    it("stops at the top-left of the bounds", () => {
      const cam = cameraClamp({ x: 0, y: 0 }, 300, 300, bounds);
      expect(cam).toEqual({ x: 320, y: 160 });
    });

    it("stops at the bottom-right of the bounds", () => {
      const cam = cameraClamp({ x: 9999, y: 9999 }, 300, 300, bounds);
      expect(cam).toEqual({ x: 660, y: 260 });
    });

    it("centers the bounds when they are smaller than the view", () => {
      const cam = cameraClamp({ x: 0, y: 0 }, 1000, 1000, bounds);
      expect(cam).toEqual({ x: 320 - 180, y: 160 - 300 });
    });

    it("pins x when the room is exactly as wide as the view", () => {
      const cam = cameraClamp({ x: 100, y: 200 }, viewW, viewH, bounds);
      expect(cam.x).toBe(320);
    });
  });

  describe("cameraFor", () => {
    it("scrolls a 640x400 room vertically only", () => {
      const top = cameraFor(640, 170, viewW, viewH, bounds);
      const bottom = cameraFor(640, 550, viewW, viewH, bounds);
      expect(top).toEqual({ x: 320, y: 160 });
      expect(bottom).toEqual({ x: 320, y: 200 });
    });

    it("follows the target inside a bigger room", () => {
      const big = { x: 0, y: 0, w: 2000, h: 1500 };
      expect(cameraFor(1000, 700, viewW, viewH, big)).toEqual({ x: 680, y: 520 });
    });

    it("returns whole numbers", () => {
      const cam = cameraFor(500.4, 400.6, 300, 300, { x: 0, y: 0, w: 2000, h: 2000 });
      expect(Number.isInteger(cam.x)).toBe(true);
      expect(Number.isInteger(cam.y)).toBe(true);
    });
  });

  describe("world and screen conversion", () => {
    const cam = { x: 320, y: 200 };

    it("converts world to screen with zoom", () => {
      expect(worldToScreen(320, 200, cam, 2)).toEqual({ x: 0, y: 0 });
      expect(worldToScreen(340, 210, cam, 2)).toEqual({ x: 40, y: 20 });
    });

    it("converts screen to world with zoom", () => {
      expect(screenToWorld(40, 20, cam, 2)).toEqual({ x: 340, y: 210 });
    });

    it("round-trips a point", () => {
      const s = worldToScreen(555, 333, cam, WORLD_ZOOM);
      const w = screenToWorld(s.x, s.y, cam, WORLD_ZOOM);
      expect(w).toEqual({ x: 555, y: 333 });
    });
  });
});
