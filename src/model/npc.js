// stores position of npcs
const NPC_LENGTH = 16;
const NPC_WIDTH = 16;
const NPC_TALK_DISTANCE = 40; // pixels in order to interact with npc

class NPC {
    constructor(x, y, dialouge = ["Hello MQ!", "I'm an NPC."]) {
        this.pos = new Vector(x, y);
        this.dialouge = dialouge;
        this.length = NPC_LENGTH;
        this.width = NPC_WIDTH;

        // used to iterate over what dialogue array should be displayed.
        this.currentline = 0;
        //booleans for whether or not npc is currently talking or being talked to
        this.isTalking = false;
    }
    getCenter() {
        return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
    }

    // Returns true if player is within speaking range
    canInteract(player) {
        if (!player) {
            return false;
        }
        const playerCenter = 
    }
}


// check proximity between player and npc when e is pressed, if close enough then trigger interact



// TODO: draw npc in src/view/npc-view.js
