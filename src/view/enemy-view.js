// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const enemySheets = {}; // sheet path -> loaded image

// Call once in setup(), with await.
async function loadEnemySheets() {
  for (const name of ENEMY_TYPE_NAMES) {
    const sprite = ENEMY_TYPES[name].sprite;
    if (!sprite) {
      continue;
    }
    const allFrames = allSpriteFrames(sprite);
    for (const frame of allFrames) {
      if (!enemySheets[frame.sheet]) {
        enemySheets[frame.sheet] = await loadImage(frame.sheet);
      }
    }
  }
}

function drawEnemySprite(enemy, sprite) {
  const frame = enemySpriteFrame(enemy, sprite, frameCount);
  const w = frame.w || ENEMY_SPRITE_SIZE;
  const h = frame.h || ENEMY_SPRITE_SIZE;
  const ax = frame.ax || w / 2; // the art x that sits at the center of the hitbox
  const ay = frame.ay || h; // the art y that sits at the bottom of the hitbox
  const pixelSize = sprite.scale || enemy.length / ENEMY_SPRITE_SIZE;
  push();
  translate(enemy.pos.x + enemy.length / 2, enemy.pos.y + enemy.width);
  if (enemy.state === "windup") {
    translate(sin(frameCount * 2) * 1.5, 0); // a small shake telegraphs the swing
  }
  // Plain sprites face right and flip. Art that picks its own direction must not flip.
  if (enemy.facingLeft && !sprite.directions && !sprite.aimFrames) {
    scale(-1, 1);
  }
  if (enemy.hurtTimer > 0) {
    tint(255, 110, 110);
  } else if (enemy.state === "windup") {
    tint(255, 200, 120);
  }
  image(
    enemySheets[frame.sheet],
    -ax * pixelSize, -ay * pixelSize, w * pixelSize, h * pixelSize,
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
