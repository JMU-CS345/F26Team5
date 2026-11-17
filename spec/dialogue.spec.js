describe("DialogueBox", function () {
  let dialogue;
  let singlePageNpc;
  let multiPageNpc;

  beforeEach(function () {
    dialogue = new DialogueBox();
    singlePageNpc = new Npc(0, 0, "Bob", "Hello there!");
    multiPageNpc = new Npc(0, 0, "Alice", ["Line 1", "Line 2", "Line 3"]);
  });

  it("starts inactive with no speaker", function () {
    expect(dialogue.isActive()).toBe(false);
    expect(dialogue.getCurrentText()).toBe("");
    expect(dialogue.getSpeakerName()).toBe("");
  });

  it("starts dialogue for a single page NPC", function () {
    const started = dialogue.start(singlePageNpc);
    expect(started).toBe(true);
    expect(dialogue.isActive()).toBe(true);
    expect(dialogue.getSpeakerName()).toBe("Bob");
    expect(dialogue.getCurrentText()).toBe("Hello there!");
    expect(dialogue.isLastPage()).toBe(true);
  });

  it("advancing a single-page dialogue closes it", function () {
    dialogue.start(singlePageNpc);
    const hasMore = dialogue.advance();
    expect(hasMore).toBe(false);
    expect(dialogue.isActive()).toBe(false);
    expect(dialogue.getCurrentText()).toBe("");
  });

  it("advances through multi-page dialogue in order", function () {
    dialogue.start(multiPageNpc);
    expect(dialogue.getCurrentText()).toBe("Line 1");
    expect(dialogue.isLastPage()).toBe(false);

    expect(dialogue.advance()).toBe(true);
    expect(dialogue.getCurrentText()).toBe("Line 2");
    expect(dialogue.isLastPage()).toBe(false);

    expect(dialogue.advance()).toBe(true);
    expect(dialogue.getCurrentText()).toBe("Line 3");
    expect(dialogue.isLastPage()).toBe(true);

    expect(dialogue.advance()).toBe(false);
    expect(dialogue.isActive()).toBe(false);
  });

  it("close() immediately ends the conversation", function () {
    dialogue.start(multiPageNpc);
    dialogue.close();
    expect(dialogue.isActive()).toBe(false);
    expect(dialogue.getSpeakerName()).toBe("");
    expect(dialogue.getCurrentText()).toBe("");
  });

  it("handles start with null safely", function () {
    expect(dialogue.start(null)).toBe(false);
    expect(dialogue.isActive()).toBe(false);
  });
});
