// NPC model. No p5 drawing calls, so Jasmine can test it without a canvas.

const NPC_LENGTH = 16;
const NPC_WIDTH = 16;
const NPC_TALK_DISTANCE = 40; // max interaction distance in pixels

class NPC {
    constructor(x, y, dialogue = ["Hello, traveler!", "Be careful in the dungeons."]) {
        this.pos = new p5.Vector(x, y);
        this.length = NPC_LENGTH;
        this.width = NPC_WIDTH;
        this.dialogue = dialogue;
        this.currentLine = 0;
        this.isTalking = false;
        this.isMoving = false;
    }

    getCenter() {
        return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
    }

    // Returns true if player is within speaking range
    canInteract(player) {
        if (!player) return false;
        const playerCenter = player.getCenter ? player.getCenter() : new p5.Vector(player.pos.x + player.length / 2, player.pos.y + player.width / 2);
        return this.getCenter().dist(playerCenter) <= NPC_TALK_DISTANCE;
    }

    // Advances dialogue or closes text box if finished
    interact() {
        if (!this.isTalking) {
            this.isTalking = true;
            this.currentLine = 0;
            this.isMoving = false; // Pause NPC movement when talking
        } else {
            if (this.currentLine < this.dialogue.length - 1) {
                this.currentLine++;
            } else {
                this.closeDialogue();
            }
        }
    }

    closeDialogue() {
        this.isTalking = false;
        this.currentLine = 0;
    }

    getCurrentText() {
        if (!this.isTalking || this.dialogue.length === 0) return "";
        return this.dialogue[this.currentLine];
    }
}