// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const enemySheets = {}; // sheet path -> loaded image

// Call once in setup(), with await.
async function loadEnemySheets() {
  for (const name of ENEMY_TYPE_NAMES) {
    const sprite = ENEMY_TYPES[name].sprite;
    if (!sprite) {
      continue;
    }
    for (const frame of sprite.frames) {
      if (!enemySheets[frame.sheet]) {
        enemySheets[frame.sheet] = await loadImage(frame.sheet);
      }
    }
  }
}

function drawEnemySprite(enemy, sprite) {
  const index = Math.floor(frameCount / sprite.frameTime) % sprite.frames.length;
  const frame = sprite.frames[index];
  // The art faces right, so flip it when the enemy faces left.
  push();
  translate(enemy.pos.x + enemy.length / 2, enemy.pos.y);
  if (enemy.facingLeft) {
    scale(-1, 1);
  }
  if (enemy.hurtTimer > 0) {
    tint(255, 110, 110);
  }
  image(
    enemySheets[frame.sheet],
    -enemy.length / 2, 0, enemy.length, enemy.width,
    frame.x, frame.y, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE
  );
  pop();
}

function drawEnemySquare(enemy) {
  const c = enemy.type.color;
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
}

// Boss health bar for the top of the screen, with a tick at each phase threshold.
function drawBossBar(enemy) {
  const barWidth = 480;
  const barHeight = 16;
  const x = (CANVAS_WIDTH - barWidth) / 2;
  const y = 24;
  push();
  textAlign(CENTER, BOTTOM);
  textSize(14);
  noStroke();
  fill(255);
  text(enemy.typeName, CANVAS_WIDTH / 2, y - 4);
  fill(40);
  rect(x, y, barWidth, barHeight);
  fill(220, 50, 50);
  rect(x, y, map(enemy.health, 0, enemy.maxHealth, 0, barWidth), barHeight);
  if (enemy.type.phases) {
    stroke(230);
    strokeWeight(1);
    for (const phase of enemy.type.phases) {
      const tickX = x + phase.below * barWidth;
      line(tickX, y, tickX, y + barHeight);
    }
  }
  noFill();
  stroke(200, 190, 180);
  strokeWeight(2);
  if (enemy.justChangedPhase()) {
    const amount = map(enemy.phaseFlashTimer, 0, ENEMY_PHASE_FLASH_FRAMES, 0, 1);
    stroke(lerpColor(color(200, 190, 180), color(255), amount));
    strokeWeight(lerp(2, 5, amount));
  }
  rect(x, y, barWidth, barHeight);
  pop();
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
}

function drawEnemyProjectile(p) {
  const c = p.color;
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(p.pos.x, p.pos.y, p.length, p.width);
}
