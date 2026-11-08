// Drawing code for the class selection menu. Reads the model, never changes it.
// The class buttons are p5 DOM buttons, made in sketch.js.

const CLASS_COLORS = {
  Fire: [230, 90, 40],
  Ice: [90, 180, 240],
  Mind: [170, 110, 230]
};

function drawClassMenu() {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("Mage Quest", width / 2, height / 2 - 120);
  textSize(18);
  text("Choose your class", width / 2, height / 2 - 70);
  textSize(12);
  fill(180);
  text("Click a class or press 1, 2 or 3", width / 2, height / 2 + 110);
}

// Shows the chosen class during a run, top right.
function drawClassLabel(mageClass) {
  noStroke();
  fill(...CLASS_COLORS[mageClass]);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text(mageClass + " Mage", width - 10, 17);
}
