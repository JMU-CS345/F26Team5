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
