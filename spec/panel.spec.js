describe("panel layout", function () {
  it("makes nine slices", function () {
    expect(panelSlices(10, 20, 200, 100).length).toBe(9);
  });

  it("keeps the corners at full size", function () {
    const slices = panelSlices(10, 20, 200, 100);
    expect(slices[0]).toEqual({ sx: 0, sy: 0, sw: 8, sh: 8, dx: 10, dy: 20, dw: 16, dh: 16 });
    expect(slices[8]).toEqual({ sx: 16, sy: 16, sw: 8, sh: 8, dx: 194, dy: 104, dw: 16, dh: 16 });
  });

  it("stretches the edges and the center to fill the rest", function () {
    const slices = panelSlices(0, 0, 200, 100);
    expect(slices[1].dw).toBe(168);
    expect(slices[3].dh).toBe(68);
    expect(slices[4].dw).toBe(168);
    expect(slices[4].dh).toBe(68);
  });

  it("covers the whole rectangle with no gaps", function () {
    const slices = panelSlices(5, 7, 150, 90);
    const widths = slices[0].dw + slices[1].dw + slices[2].dw;
    const heights = slices[0].dh + slices[3].dh + slices[6].dh;
    expect(widths).toBe(150);
    expect(heights).toBe(90);
    expect(slices[2].dx + slices[2].dw).toBe(155);
    expect(slices[6].dy + slices[6].dh).toBe(97);
  });

  it("grows a panel that is too small to fit its corners", function () {
    const slices = panelSlices(0, 0, 10, 10);
    expect(slices[1].dw).toBe(0);
    expect(slices[2].dx).toBe(16);
    expect(panelMinSize()).toBe(32);
  });

  it("insets the content area from the frame", function () {
    const content = panelContentRect(100, 100, 300, 200);
    expect(content.x).toBe(120);
    expect(content.y).toBe(120);
    expect(content.w).toBe(260);
    expect(content.h).toBe(160);
  });

  it("never gives the content area a negative size", function () {
    const content = panelContentRect(0, 0, 10, 10);
    expect(content.w).toBe(0);
    expect(content.h).toBe(0);
  });
});
