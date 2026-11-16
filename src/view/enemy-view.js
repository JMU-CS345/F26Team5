// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const ENEMY_DEATH_FRAMES = 24;
const enemySheets = {}; // sheet path -> loaded image
const dyingEnemies = []; // { enemy, age } ghosts that keep fading after the model dropped them

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

function drawEnemySprite(enemy, sprite, alpha = 255) {
  const index = Math.floor(frameCount / sprite.frameTime) % sprite.frames.length;
  const frame = sprite.frames[index];
  // The art faces right, so flip it when the enemy faces left.
  push();
  translate(enemy.pos.x + enemy.length / 2, enemy.pos.y);
  if (enemy.facingLeft) {
    scale(-1, 1);
  }
  if (enemy.hurtTimer > 0) {
    tint(255, 110, 110, alpha);
  } else {
    tint(255, alpha);
  }
  image(
    enemySheets[frame.sheet],
    -enemy.length / 2, 0, enemy.length, enemy.width,
    frame.x, frame.y, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE
  );
  pop();
}

function drawEnemySquare(enemy, alpha = 255) {
  const c = enemy.type.color;
  noStroke();
  fill(c[0], c[1], c[2], alpha);
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

// Sprite or colored square, whichever the type has.
function drawEnemyBody(enemy, alpha = 255) {
  if (enemy.type.sprite) {
    drawEnemySprite(enemy, enemy.type.sprite, alpha);
  } else {
    drawEnemySquare(enemy, alpha);
  }
}

function drawEnemy(enemy) {
  if (enemy.isDead()) {
    return;
  }
  if (enemy.isSpawning()) {
    drawEnemyBody(enemy, map(enemy.spawnTimer, ENEMY_SPAWN_FRAMES, 0, 40, 255));
    return;
  }
  drawEnemyBody(enemy);
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

function startEnemyDeath(enemy) {
  dyingEnemies.push({ enemy: enemy, age: 0 });
}

function clearDyingEnemies() {
  dyingEnemies.length = 0;
}

// Draws each dead enemy where it fell, fading out and shrinking toward its center.
function drawDyingEnemies() {
  for (const ghost of dyingEnemies) {
    const enemy = ghost.enemy;
    const center = enemy.getCenter();
    const alpha = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 255, 0);
    const size = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 1, 0.3);
    push();
    translate(center.x, center.y);
    scale(size);
    translate(-center.x, -center.y);
    drawEnemyBody(enemy, alpha);
    pop();
    ghost.age++;
  }
  // Keep only the ghosts that still have frames left.
  for (let i = dyingEnemies.length - 1; i >= 0; i--) {
    if (dyingEnemies[i].age >= ENEMY_DEATH_FRAMES) {
      dyingEnemies.splice(i, 1);
    }
  }
}

// Debug overlay (F3): hitbox, detection radius, type name and health.
function drawEnemyDebug(enemy) {
  const center = enemy.getCenter();
  push();
  noFill();
  strokeWeight(1);
  stroke(0, 255, 0);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
  stroke(255, 255, 0, 120);
  circle(center.x, center.y, 2 * enemy.detectionRange);
  noStroke();
  fill(255);
  textSize(8);
  textAlign(CENTER, BOTTOM);
  text(enemy.typeName + " " + enemy.health + "/" + enemy.maxHealth, center.x, enemy.pos.y - 2);
  pop();
}
