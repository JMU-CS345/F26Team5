// Dialogue state model. No p5 drawing calls, so Jasmine can test it without a canvas.
// Tracks whether a conversation is active, which NPC is talking, and the current page.

class DialogueBox {
  constructor() {
    this.active = false;
    this.npc = null;
    this.pages = [];
    this.pageIndex = 0;
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
