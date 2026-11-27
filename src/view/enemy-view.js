// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const ENEMY_DEATH_FRAMES = 24;
const enemySheets = {}; // sheet path -> loaded image
const dyingEnemies = []; // { enemy, age } ghosts that keep fading after the model dropped them

// Call once in setup(), with await.
async function loadEnemySheets() {
  for (const name of Object.keys(ENEMY_ART)) {
    for (const frame of allArtFrames(ENEMY_ART[name])) {
      if (!enemySheets[frame.sheet]) {
        enemySheets[frame.sheet] = await loadImageFile(frame.sheet);
      }
    }
  }
}

function drawEnemySprite(enemy, sprite, alpha = 255) {
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
  if (enemy.facingLeft && !sprite.directions && !sprite.aimFrames && !sprite.walk && !sprite.noFlip) {
    scale(-1, 1);
  }
  if (enemy.hurtTimer > 0) {
    tint(255, 110, 110, alpha);
  } else if (enemy.blockTimer > 0) {
    tint(170, 210, 255, alpha); // the shield took the hit
  } else if (enemy.state === "windup") {
    tint(255, 200, 120, alpha);
  } else {
    tint(255, alpha);
  }
  image(
    enemySheets[frame.sheet],
    -ax * pixelSize, -ay * pixelSize, w * pixelSize, h * pixelSize,
    frame.x, frame.y, w, h
  );
  pop();
}

function drawEnemySquare(enemy, alpha = 255) {
  const c = enemy.type.color;
  noStroke();
  fill(c[0], c[1], c[2], alpha);
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

// Sprite or colored square, whichever the type has.
function drawEnemyBody(enemy, alpha = 255) {
  const art = ENEMY_ART[enemy.typeName];
  if (art && art.sprite) {
    drawEnemySprite(enemy, art.sprite, alpha);
  } else {
    drawEnemySquare(enemy, alpha);
  }
}

// The short range lightning of a zap attack, in front of the enemy while the bolt is out. The art
// faces down and starts at the edge of the hitbox, and is turned to the side the enemy faces.
function drawEnemyZap(enemy) {
  const art = ENEMY_ART[enemy.typeName];
  if (!art || !art.zap || enemy.state !== "attack") {
    return;
  }
  const frames = art.zap.frames;
  const frame = frames[Math.floor(frameCount / art.zap.frameTime) % frames.length];
  const turns = { down: 0, left: HALF_PI, up: PI, right: -HALF_PI };
  const center = enemy.getCenter();
  // Pointing left or right, the bolt comes out of the hands, which sit sideRaise pixels above the
  // middle (the same lift the damage box has). Across the turned art, that is sideways.
  const raise = (enemy.getAttack() && enemy.getAttack().sideRaise) || 0;
  const lift = enemy.facingDir === "right" ? raise : enemy.facingDir === "left" ? -raise : 0;
  push();
  translate(center.x, center.y);
  rotate(turns[enemy.facingDir]);
  noTint();
  image(enemySheets[frame.sheet], -frame.w / 2 + lift, enemy.width / 2, frame.w, frame.h, frame.x, frame.y, frame.w, frame.h);
  pop();
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
  drawEnemyZap(enemy);
}

// An animated shot. With sprite.rotate the art faces down (or down and to the left for the
// diagonal frames) and is turned to the way the shot is flying, around the center of the hitbox.
function drawShotSprite(p, sprite) {
  let frames = sprite.frames;
  let turn = 0;
  if (sprite.rotate) {
    const eighths = Math.round(Math.atan2(p.vel.y, p.vel.x) / (Math.PI / 4));
    const diagonal = Math.abs(eighths) % 2 === 1;
    frames = diagonal ? sprite.diagonalFrames : sprite.frames;
    turn = eighths * (Math.PI / 4) - (diagonal ? (3 * Math.PI) / 4 : Math.PI / 2);
  }
  const frame = frames[Math.floor(p.age / sprite.frameTime) % frames.length];
  const w = frame.w || ENEMY_SPRITE_SIZE;
  const h = frame.h || ENEMY_SPRITE_SIZE;
  push();
  translate(p.pos.x + p.length / 2, p.pos.y + p.width / 2);
  rotate(turn);
  noTint();
  image(enemySheets[frame.sheet], -w / 2, -h / 2, w, h, frame.x, frame.y, w, h);
  pop();
}

// Draws one frame of a strike's art so that its art pixel (ax, ay) is at (x, y).
function drawStrikeFrame(frame, x, y) {
  const ax = frame.ax === undefined ? frame.w / 2 : frame.ax;
  const ay = frame.ay === undefined ? frame.h / 2 : frame.ay;
  image(enemySheets[frame.sheet], x - ax, y - ay, frame.w, frame.h, frame.x, frame.y, frame.w, frame.h);
}

// Lightning called down by a Shadow Wizard. While it warns, a pulsing ring and a faint spark mark
// the spot. While it strikes, the bolt comes down from the top of the screen onto the spot, with
// a small impact and then a big one.
function drawLightningStrike(p) {
  const art = p.shooter && ENEMY_ART[p.shooter] ? ENEMY_ART[p.shooter].strike : null;
  const x = p.pos.x + p.length / 2;
  const y = p.pos.y + p.width / 2;
  const pulse = 0.5 + 0.5 * sin(p.age * 0.6);
  push();
  noTint();
  if (p.age < p.warn) {
    noFill();
    stroke(255, 255, 160, 90 + pulse * 130);
    strokeWeight(1);
    ellipse(x, y, p.length * 1.4, p.length * 0.8);
    if (art) {
      tint(255, 60 + pulse * 90);
      drawStrikeFrame(art.impact[0], x, y);
    }
  } else if (p.isStriking()) {
    const sinceStrike = p.age - p.warn;
    if (art) {
      const body = art.body[Math.floor(p.age / art.frameTime) % art.body.length];
      const top = typeof camera !== "undefined" ? camera.y : 0;
      const segments = Math.min(24, Math.ceil((y - top) / body.h) + 1);
      for (let i = 0; i < segments; i++) {
        image(enemySheets[body.sheet], x - body.w / 2, y - body.h * (i + 1) + 6, body.w, body.h, body.x, body.y, body.w, body.h);
      }
      drawStrikeFrame(sinceStrike < p.active / 3 ? art.impact[0] : art.impact[1], x, y);
    } else {
      noStroke();
      fill(255, 255, 160);
      rect(x - 3, 0, 6, y);
      rect(p.pos.x, p.pos.y, p.length, p.width);
    }
  }
  pop();
}

function drawEnemyProjectile(p) {
  if (p.isStrike) {
    drawLightningStrike(p);
    return;
  }
  const art = p.shooter ? ENEMY_ART[p.shooter] : null;
  if (art && art.projectile) {
    drawShotSprite(p, art.projectile);
    return;
  }
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
function drawDyingEnemies(advance = true) {
  for (const ghost of dyingEnemies) {
    const enemy = ghost.enemy;
    const center = enemy.getCenter();
    const alpha = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 255, 0);
    const size = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 1, enemy.fell ? 0 : 0.3); // a fall shrinks to nothing
    push();
    translate(center.x, center.y);
    scale(size);
    translate(-center.x, -center.y);
    drawEnemyBody(enemy, alpha);
    pop();
    if (advance) {
      ghost.age++;
    }
  }
  if (!advance) {
    return;
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
