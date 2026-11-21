# Sprint Planning Report: Sprint 3

*DRAFT. Items marked **(proposed)** are assumptions made while drafting. The team should confirm or change them before this is merged.*

---

## 1. Meeting Details

**Date:** November 20, 2026 (proposed)

**Scrum Master:** Minhhai Quach (proposed; the constitution says the role rotates, Enzo was Sprint 1 and Nicolas was Sprint 2)

**Attendees:** Nicolas Reiser, Vincent Barr, Enzo Hins, Minhhai Quach, Prabesh Dhakal (proposed)

**Absent:** None reported yet. Thanksgiving absences are covered in Section 3.

---

## 2. Sprint Goal

A player picks a class and starts a run from a title screen with that class's weapon and stats. They can swing the equipped melee weapon with a hit-based combo, open chests for loot, follow a camera through large rooms, and travel between dungeons through the overworld.

---

## 3. Capacity and Velocity

**Sprint dates:** November 20, 2026 to December 3, 2026 (proposed)

**Velocity last sprint (points completed):** 34 out of 45. Sprint 1 was 16 out of 16.

**Average velocity so far:** 25 points per sprint (16 + 34, divided by 2).

**Known absences or reduced availability this sprint:** Thanksgiving break (Nov 26 to 29) is expected to reduce availability for everyone. Individual absences are not recorded yet and need to be confirmed.

**Points committed this sprint:** **31 points** across 10 issues (proposed)

**Why this commitment is realistic:** It is below Sprint 2's 34 completed points and slightly above the 25-point average. The Sprint 2 retro found that committing 45 points was too much, so this plan stays under the last completed total to leave room for Thanksgiving break. Eleven of the 31 points are carryover stories that are already partly understood. Foundation work (#108, #98, #87, #95) is scheduled before the stories that use it.

---

## 4. Committed Backlog Items

Estimates for the new items are proposed and should be confirmed by the team.

| Issue # | User story | Estimate | Owner | Ready? |
|---------|------------|----------|-------|--------|
| [#14](https://github.com/JMU-CS345/F26Team5/issues/14) | Chest loot with a large item pool *(carryover)* | 5 | Nicolas | [ ] |
| [#7](https://github.com/JMU-CS345/F26Team5/issues/7) | Starting weapon and stats per class *(carryover)* | 3 | Nicolas | [ ] |
| [#28](https://github.com/JMU-CS345/F26Team5/issues/28) | Overworld between dungeons *(carryover)* | 3 | Vincent | [ ] |
| [#30](https://github.com/JMU-CS345/F26Team5/issues/30) | Camera follows the player in large rooms | 3 | Vincent | [ ] |
| [#98](https://github.com/JMU-CS345/F26Team5/issues/98) | Hitbox model with once-per-swing hits | 3 | Enzo | [ ] |
| [#99](https://github.com/JMU-CS345/F26Team5/issues/99) | Melee 3-hit combo from the equipped melee weapon | 3 | Enzo | [ ] |
| [#87](https://github.com/JMU-CS345/F26Team5/issues/87) | Menu widget: model and view for keyboard menus | 3 | Minhhai | [ ] |
| [#88](https://github.com/JMU-CS345/F26Team5/issues/88) | Title screen with New Run, Settings and Credits | 3 | Minhhai | [ ] |
| [#95](https://github.com/JMU-CS345/F26Team5/issues/95) | Key-binding layer with Classic and Twin-stick presets | 3 | Prabesh | [ ] |
| [#108](https://github.com/JMU-CS345/F26Team5/issues/108) | Shared RNG module | 2 | Prabesh | [ ] |

**Total points:** 31

**Notes:** The three carryover stories come first because the Sprint 2 review set finishing them as the priority. The new items are the first foundation issues of the combat, menus and loot epics, so later sprints can build on them. Open issues #118 (class starting loadouts) and #114 (chests) look like the work behind #7 and #14, so they should be linked or merged into those stories on the board.

---

## 5. Task Breakdown

Reviewers are assigned so every member reviews two stories.

### Issue #14: Chest loot with a large item pool (reviewer: Prabesh)

- [ ] Add chest objects to rooms and a way to open them
- [ ] Build the loot pool and roll rewards using the shared RNG (#108)
- [ ] Add rewards to the player's inventory
- [ ] Write specs for chest opening and loot rolls
- [ ] Open PR and address review

### Issue #7: Starting weapon and stats per class (reviewer: Minhhai)

- [ ] Define the starting weapon and stats for each class
- [ ] Apply the loadout when a run starts
- [ ] Write specs for each class's loadout
- [ ] Open PR and address review

### Issue #28: Overworld between dungeons (reviewer: Enzo)

- [ ] Split into smaller tasks on the board (retro action item)
- [ ] Build the overworld map and player movement in it
- [ ] Connect dungeon entrances to the overworld
- [ ] Write specs for overworld and dungeon transitions
- [ ] Open PR and address review

### Issue #30: Camera follows the player in large rooms (reviewer: Nicolas)

- [ ] Add a camera that follows the player and stays inside the room
- [ ] Check collisions and enemy drawing with the camera offset
- [ ] Write specs for camera bounds
- [ ] Open PR and address review

### Issue #98: Hitbox model with once-per-swing hits (reviewer: Vincent)

- [ ] Add a hitbox model for attacks
- [ ] Make each swing hit an enemy at most once
- [ ] Write specs for hitbox overlap and once-per-swing behavior
- [ ] Open PR and address review

### Issue #99: Melee 3-hit combo from the equipped melee weapon (reviewer: Prabesh)

- [ ] Start after #98 is merged
- [ ] Add a 3-hit combo chain using the equipped melee weapon
- [ ] Write specs for combo timing and reset
- [ ] Open PR and address review

### Issue #87: Menu widget: model and view for keyboard menus (reviewer: Nicolas)

- [ ] Build the menu model (selection, wrap-around, confirm)
- [ ] Build the menu view
- [ ] Write specs for menu navigation
- [ ] Open PR and address review

### Issue #88: Title screen with New Run, Settings and Credits (reviewer: Enzo)

- [ ] Start after #87 is merged
- [ ] Add the title screen using the menu widget
- [ ] Connect New Run to class selection
- [ ] Write specs for the title screen flow
- [ ] Open PR and address review

### Issue #95: Key-binding layer with Classic and Twin-stick presets (reviewer: Vincent)

- [ ] Add a key-binding layer that maps keys to actions
- [ ] Add the Classic and Twin-stick presets
- [ ] Write specs for both presets
- [ ] Open PR and address review

### Issue #108: Shared RNG module (reviewer: Minhhai)

- [ ] Add a seedable RNG module
- [ ] Write specs for repeatable results with the same seed
- [ ] Open PR and address review. Merge early, since #14 uses it.

### Before the sprint review

- [ ] Deploy to GitHub Pages and test the deployed build before the demo (Minhhai, retro action item)

---

## 6. Work Distribution

| Member | Stories owned | Points |
|--------|---------------|--------|
| Nicolas Reiser | #14, #7 | 8 |
| Vincent Barr | #28, #30 | 6 |
| Enzo Hins | #98, #99 | 6 |
| Minhhai Quach | #87, #88 | 6 |
| Prabesh Dhakal | #95, #108 | 5 |

*If the work is not balanced, explain why:* Nicolas has two more points than the others because he owns two carryover stories that he already started in Sprint 2. Prabesh has one fewer point because both of Prabesh's stories are foundation work that other stories depend on.

---

## 7. Stories Split or Deferred

- **Split:** #28 (overworld) will be broken into smaller tasks, because it was too large to finish in Sprint 2.
- **Deferred:** #24 (final wizard boss), #26 (set bonuses for gear), #29 (free-form cave rooms), and the audio and art epics (#83 to #86 and their issues) stay in the backlog. Most of them depend on combat, loot and menus being finished first.
- **Deferred within epics:** The rest of the menus, combat and loot epics (for example #89, #90, #100 and #109 to #118) wait until their foundation issues are merged.

---

## 8. Retrospective Follow-Through

| Action item | How it shows up in this sprint |
|-------------|--------------------------------|
| List dependencies during planning and work on the foundation first (Nicolas) | Section 9 lists the dependencies. #108, #98, #87 and #95 are the foundation items and should be merged early. |
| Assign PR reviewers and keep issue checklists updated (Enzo and Vincent) | Section 5 names a reviewer for every story, and each member reviews two. Issues should be closed only with their task boxes checked. |
| Leave time to deploy and test GitHub Pages before the demo (Minhhai) | Section 5 has a deploy-and-test task before the sprint review. |

---

## 9. Risks and Dependencies

**Dependencies:**
- #14 (chest loot) uses #108 (shared RNG), so #108 should be merged first.
- #99 (melee combo) depends on #98 (hitbox model), and both belong to Enzo.
- #88 (title screen) depends on #87 (menu widget), and both belong to Minhhai.
- #14 and #7 build on the inventory and equipment work that was merged in Sprint 2 (#31, #11, #10).

**Risks:**
- Thanksgiving break (Nov 26 to 29) may reduce capacity.
- #28 (overworld) did not fit in Sprint 2, and it may still be larger than 3 points.
- Several issues are listed under one assignee on GitHub (Enzo), so assignees need to be updated to match this plan.
- The estimates for new items are proposed and have not been checked by their owners.

---

## 10. Checklist

- [x] Sprint goal written
- [ ] Every committed story meets the Definition of Ready
- [x] Every story has an owner
- [ ] Board updated: committed stories in the sprint, tasks created
- [x] Commitment compared to velocity
- [ ] Report committed to `scrum/planning/` via pull request
