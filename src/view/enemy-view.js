// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const enemySheets = {}; // sheet path -> loaded image

// Call once in setup(), with await.
async function loadEnemySheets() {
  for (const name of ENEMY_TYPE_NAMES) {
    const sprite = ENEMY_TYPES[name].sprite;
    if (!sprite) {
      continue;
    }
    // Frames for special states (windup, attack) can use other sheets, so load those too.
    let allFrames = sprite.frames.slice();
    if (sprite.states) {
      for (const stateName of Object.keys(sprite.states)) {
        allFrames = allFrames.concat(sprite.states[stateName]);
      }
    }
    for (const frame of allFrames) {
      if (!enemySheets[frame.sheet]) {
        enemySheets[frame.sheet] = await loadImage(frame.sheet);
      }
    }
  }
}

function drawEnemySprite(enemy, sprite) {
  let frames = sprite.frames;
  if (sprite.states && sprite.states[enemy.state]) {
    frames = sprite.states[enemy.state];
  }
  const frame = frames[Math.floor(frameCount / sprite.frameTime) % frames.length];
  const w = frame.w || ENEMY_SPRITE_SIZE;
  const h = frame.h || ENEMY_SPRITE_SIZE;
  const ax = frame.ax || w / 2; // the art x that sits at the center of the hitbox
  const pixelSize = sprite.scale || enemy.length / ENEMY_SPRITE_SIZE;
  // The art faces right, so flip it when the enemy faces left.
  push();
  translate(enemy.pos.x + enemy.length / 2, enemy.pos.y + enemy.width);
  if (enemy.state === "windup") {
    translate(sin(frameCount * 2) * 1.5, 0); // a small shake telegraphs the swing
  }
  if (enemy.facingLeft) {
    scale(-1, 1);
  }
  if (enemy.hurtTimer > 0) {
    tint(255, 110, 110);
  } else if (enemy.state === "windup") {
    tint(255, 200, 120);
  }
  // The feet sit on the bottom of the hitbox, so a tall frame rises above it.
  image(
    enemySheets[frame.sheet],
    -ax * pixelSize, -h * pixelSize, w * pixelSize, h * pixelSize,
    frame.x, frame.y, w, h
  );
  pop();
}

function drawEnemySquare(enemy) {
  const c = enemy.type.color;
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
}

// A health bar above bosses only, so ordinary enemies stay clean.
function drawBossBar(enemy) {
  noStroke();
  fill(60);
  rect(enemy.pos.x, enemy.pos.y - 6, enemy.length, 3);
  fill(220, 50, 50);
  rect(enemy.pos.x, enemy.pos.y - 6, map(enemy.health, 0, enemy.maxHealth, 0, enemy.length), 3);
}

function drawEnemy(enemy) {
  if (enemy.isDead()) {
    return;
  }
  if (enemy.type.sprite) {
    drawEnemySprite(enemy, enemy.type.sprite);
  } else {
    drawEnemySquare(enemy);
  }
  if (enemy.type.boss) {
    drawBossBar(enemy);
  }
}

function drawEnemyProjectile(p) {
  const c = p.color;
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(p.pos.x, p.pos.y, p.length, p.width);
}
