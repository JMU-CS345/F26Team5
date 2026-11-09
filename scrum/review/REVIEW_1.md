# Sprint Review Report: Sprint 1

**Commit demonstrated:** `01a73926042335e6940825a775ff0bd2cb6a1b92` (head of `production`, merged by release PR #50)

---

## 1. Meeting Details

**Date:** 11/9/2026

**Scrum Master:** Enzo Hins

**Attendees:** Enzo Hins, Minhhai Quach, Nicolas Reiser, Prabesh Dhakal, Vincent Barr

**Absent:** None

**Deployed build reviewed:** https://jmu-cs345.github.io/F26Team5/

**Release PR into `production`:** https://github.com/JMU-CS345/F26Team5/pull/50

---

## 2. Sprint Goal

**The goal we set:** A player starts at a menu, picks a Fire, Ice or Mind mage, then moves around a walled room and casts spells at an enemy that chases them. If the enemy kills them, they see a death screen.

**Did we meet it?** Yes. All six committed stories were done and merged with time to spare, so we have room to take on more next sprint.

---

## 3. Committed Items: Done or Not Done

| Issue # | User story | Estimate | Owner | Done? | Demoed by |
|---------|------------|----------|-------|-------|-----------|
| #1 | Movable Player | 1 | Enzo | Done | Minhhai |
| #2 | Single Room with Walls and Collision | 3 | Minhhai | Done | Nick |
| #5 | Class Selection Menu at Start of Run | 2 | Prabesh | Done | Vincent |
| #3 | Basic Enemy that Chases the Player | 3 | Nicolas | Done | Enzo |
| #6 | Health Indicator and Death Screen | 2 | Enzo | Done | Vincent |
| #4 | Spell Casting/Projectile Shooting | 5 | Vincent | Done | Minhhai |

Each story was reviewed and approved by a teammate other than its author before merging to `main` (PRs #38, #40, #41, #42, #43, #46), CI passed, and the issue is closed.

---

## 4. Metrics

| | Points |
|---|---|
| Committed | 16 |
| Completed | 16 |
| Completion rate | 100% |

**Velocity history:**

| Sprint | Committed | Completed |
|--------|-----------|-----------|
| 1      | 16        | 16        |
| 2      |           |           |
| 3      |           |           |
| 4      |           |           |
| 5      |           |           |

**Burndown or board snapshot:** n/a

---

## 5. Demo

### Issue #1: Movable Player

- [x] A player icon appears on the placeholder environment when the game loads
- [x] The icon moves in the direction of the key pressed
- [x] The icon does not move past the edge of the screen

### Issue #2: Single Room with Walls and Collision

- [x] The player stops when moving into a wall
- [x] A projectile disappears when it hits a wall

### Issue #5: Class Selection Menu at Start of Run

- [x] The menu shows Fire, Ice and Mind when a new game starts
- [x] The menu is shown again when a new run starts

### Issue #3: Basic Enemy that Chases the Player

- [x] The enemy moves toward the player when the player is in its detection range
- [x] The enemy is deleted when a projectile with enough damage hits it
- [x] The player loses health on contact and the enemy briefly stops moving

### Issue #6: Health Indicator and Death Screen

- [x] The health display decreases when the player takes damage
- [x] The run ends and a death screen appears when health reaches 0
- [x] Choosing restart on the death screen begins a new run

### Issue #4: Spell Casting/Projectile Shooting

- [x] A projectile shoots out when the player presses a button or left-clicks
- [x] The projectile changes to a placeholder spark and vanishes when it hits a wall or leaves the screen

---

## 6. Incomplete Work

None. All committed items were done.

| Issue # | What remains | New estimate | Back in backlog? |
|---------|--------------|--------------|------------------|
| n/a     | n/a          | n/a          | n/a              |

---

## 7. Stakeholder Feedback

Riley said everything looks good and asked us to continue faster with development. They want more structure in the environment.

---

## 8. Backlog Changes

**New stories added:** None yet. Each member is writing a feature plan due Tuesday morning, and we will turn those plans into issues with points after the team reviews them.

**Priorities changed:** Riley asked for more structure in the environment and faster development. The backlog already has environment stories (#12 Randomized Dungeon Layout, #13 Premade Dungeon Rooms, #29 Free-form Cave Rooms, #30 Camera Follows the Player, #28 Overworld Between Dungeons). We are moving those up for Sprint 2 and will commit more points, since we finished Sprint 1 early.

**Stories removed:** None.

---

## 9. Quality

**CI status on `production`:** passing

**Number of specs:** 102

**Known bugs in the deployed build:** None known. Some development artifacts are still in the build, but they are required for testing.

---

## 10. Checklist

- [x] Demo given from the deployed GitHub Pages build
- [x] Every committed item marked Done or Not Done
- [x] Metrics filled in
- [x] Product Owner feedback recorded
- [x] Backlog updated
- [x] Report committed to `scrum/review/` via pull request
