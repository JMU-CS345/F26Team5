# Sprint Planning Report: Sprint 1

---

## 1. Meeting Details

**Date:** 11/2/2026

**Scrum Master:** Enzo Hins

**Attendees:** Enzo Hins, Minhhai Quach, Nicolas Reiser, Prabesh Dhakal, Vincent Barr

**Absent:** None

---

## 2. Sprint Goal

A player starts at a menu, picks a Fire, Ice or Mind mage, then moves around a walled room and casts spells at an enemy that chases them. If the enemy kills them, they see a death screen.

---

## 3. Capacity and Velocity

**Sprint dates:** 11/2/2026 to 11/8/2026

**Velocity last sprint (points completed):** n/a

**Average velocity so far:** n/a

**Known absences or reduced availability this sprint:** None

**Points committed this sprint:** 16 (1 + 3 + 2 + 3 + 2 + 5)

**Why this commitment is realistic:** for the first sprint we are just gauging how much we can tackle.

---

## 4. Committed Backlog Items

All six have acceptance criteria in the issue and an estimate. Sizes from the board are converted to Fibonacci points (XS=1, S=2, M=3, L=5).

| Issue # | User story | Estimate | Owner | Ready? |
|---------|------------|----------|-------|--------|
| #1 | Movable Player | 1 | Enzo | [x] |
| #2 | Single Room with Walls and Collision | 3 | Minhhai | [x] |
| #5 | Class Selection Menu at Start of Run | 2 | Prabesh | [x] |
| #3 | Basic Enemy that Chases the Player | 3 | Nicolas | [x] |
| #6 | Health Indicator and Death Screen | 2 | Enzo | [x] |
| #4 | Spell Casting/Projectile Shooting | 5 | Vincent | [x] |

**Total points:** 16

**Notes:** These are the top six items on the board, so nothing higher was skipped. We pulled #5 ahead of #3, #4 and #6 because the goal starts at the menu. For #5 we only pick a class this sprint. Class weapons and stats are #7, which comes later, so all three classes play the same for now. The board's Sprint 1 runs to 11/10, but our constitution says it ends 11/8, so we're going with that.

---

## 5. Task Breakdown

Task sizes are Fibonacci points, not hours. Every story has a test task and a review task, and the reviewer is never the author.

### Issue #1: Movable Player (Enzo)

- [ ] Set up the p5 sketch with a black canvas and the src folders (2)
- [ ] Player model plus WASD and arrow key input (2)
- [ ] Draw the player and stop at the screen edges (1)
- [ ] Jasmine specs for movement and edges (1)
- [ ] Review PR (Minhhai) (1)

### Issue #2: Single Room with Walls and Collision (Minhhai)

- [ ] Room model with 16x16 wall tiles around the edge (2)
- [ ] Draw the white wall tiles (1)
- [ ] Player stops at walls (3)
- [ ] Wall hit check that projectiles can reuse (1)
- [ ] Jasmine specs for the room and collision (2)
- [ ] Review PR (Nicolas) (1)

### Issue #5: Class Selection Menu at Start of Run (Prabesh)

- [ ] Game state model (menu, playing, dead) (2)
- [ ] Menu screen with Fire, Ice and Mind (3)
- [ ] Save the chosen class and start the run (1)
- [ ] Show the menu again on each new run (1)
- [ ] Jasmine specs for state changes and class choice (2)
- [ ] Review PR (Vincent) (1)

### Issue #3: Basic Enemy that Chases the Player (Nicolas)

- [ ] Enemy model with speed, low health and detection range (2)
- [ ] Move toward the player when in range (3)
- [ ] Contact hurts the player and the enemy pauses briefly (2)
- [ ] Remove the enemy when a projectile kills it (2)
- [ ] Draw the colored square (1)
- [ ] Jasmine specs for chase, contact damage and death (3)
- [ ] Review PR (Enzo) (1)

### Issue #6: Health Indicator and Death Screen (Enzo)

- [ ] Max health and current health on the player (1)
- [ ] Draw the health bar or number (1)
- [ ] "You died" screen with a restart button (2)
- [ ] Simple death animation (2)
- [ ] Jasmine specs for damage, death and restart (2)
- [ ] Review PR (Prabesh) (1)

### Issue #4: Spell Casting/Projectile Shooting (Vincent)

- [ ] Projectile model with direction and speed (2)
- [ ] Fire with a key (facing direction) or left click (toward cursor) (3)
- [ ] Draw the projectile (1)
- [ ] Spark and remove on wall hit or leaving the screen (2)
- [ ] Jasmine specs for firing and removal (2)
- [ ] Review PR (Minhhai) (1)

### Everyone

- [ ] Playtest the deployed build before the review and file bugs as issues (2)
- [ ] Minhhai deploys main to production after the review (2)

---

## 6. Work Distribution

| Member | Stories owned | Points |
|--------|---------------|--------|
| Enzo | #1, #6 | 3 |
| Minhhai | #2 | 3 |
| Prabesh | #5 | 2 |
| Nicolas | #3 | 3 |
| Vincent | #4 | 5 |

*If the work is not balanced, explain why:*

Vincent has the most (5) because #4 is the biggest story. Everyone else is 2 or 3. Minhhai also does the production deploy, and everyone reviews someone else's PR.

---

## 7. Stories Split or Deferred

Nothing needed splitting. For #3, moving along ground tiles in straight lines is optional in the issue, so the enemy just moves straight at the player for now. Everything from #7 on stays in the backlog, since it builds on the room, combat and class menu from this sprint.

---

## 8. Retrospective Follow-Through

n/a, this is Sprint 1.

| Action item | How it shows up in this sprint |
|-------------|--------------------------------|
| n/a | n/a |

---

## 9. Risks and Dependencies

#1 has to merge first because everything else builds on the player and sketch setup. #4 needs the wall hit check from #2, and #3 needs the health from #6 and the projectiles from #4, so those authors should talk early and use stubs in their tests until the real code merges. #5 touches the main sketch and will conflict if it merges late. Main is protected, so a slow review or failing CI can hold things up. This is also our first sprint, so the estimates are guesses.

---

## 10. Checklist

- [x] Sprint goal written
- [x] Every committed story meets the Definition of Ready
- [x] Every story has an owner
- [x] Board updated: committed stories in the sprint, tasks created
- [x] Commitment compared to velocity
- [x] Report committed to `scrum/planning/` via pull request
