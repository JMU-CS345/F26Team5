// Dialogue state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks whether a conversation is active, which NPC is talking, and the current page.

class DialogueBox {
  constructor() {
    this.active = false;
    this.npc = null;
    this.pages = [];
    this.pageIndex = 0;
    this.choiceIndex = 0;
  }

  isActive() {
    return this.active;
  }

  // Starts conversation with an NPC
  start(npc) {
    if (!npc) {
      return false;
    }
    this.active = true;
    this.npc = npc;
    this.pages = typeof npc.getDialoguePages === "function" ? npc.getDialoguePages() : ["..."];
    if (!this.pages || this.pages.length === 0) {
      this.pages = ["..."];
    }
    this.pageIndex = 0;
    this.choiceIndex = 0;
    return true;
  }

  // Advances to the next page of dialogue, or closes if on the last page.
  // Returns true if advanced to another page, false if it closed.
  advance() {
    if (!this.active) {
      return false;
    }
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex++;
      return true;
    }
    this.close();
    return false;
  }

  close() {
    this.active = false;
    this.npc = null;
    this.pages = [];
    this.pageIndex = 0;
    this.choiceIndex = 0;
  }

  // Replaces the text with one page, for an NPC's answer to a choice.
  say(text) {
    if (this.active) {
      this.pages = [text];
      this.pageIndex = 0;
    }
  }

  // The NPC's choices show on its last page, otherwise there are none.
  getChoices() {
    if (!this.active || !this.isLastPage()) {
      return [];
    }
    return this.npc.choices || [];
  }

  hasChoices() {
    return this.getChoices().length > 0;
  }

  // step is 1 (down) or -1 (up). The cursor wraps around.
  moveChoice(step) {
    const count = this.getChoices().length;
    if (count > 0) {
      this.choiceIndex = (this.choiceIndex + step + count) % count;
    }
  }

  selectedChoice() {
    const choices = this.getChoices();
    if (choices.length === 0) {
      return null;
    }
    return choices[this.choiceIndex];
  }

  getCurrentText() {
    if (!this.active || this.pageIndex >= this.pages.length) {
      return "";
    }
    return this.pages[this.pageIndex];
  }

  getSpeakerName() {
    return this.npc && this.npc.name ? this.npc.name : "";
  }

  isLastPage() {
    return this.pageIndex >= this.pages.length - 1;
  }
}
