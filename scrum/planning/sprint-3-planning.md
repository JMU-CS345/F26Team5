# Sprint Planning Report: Sprint 3

---

## 1. Meeting Details

**Date:** 11/20/26

**Scrum Master:** Minhhai Quach 

**Attendees:** Nicolas Reiser, Vincent Barr, Enzo Hins, Minhhai Quach, Prabesh Dhakal (proposed)

**Absent:** None reported yet. Thanksgiving absences are covered in Section 3.

---

## 2. Sprint Goal

A player can complete a full run: start from a title screen, pick a class with its own weapon and stats, travel the overworld through the dungeons, open chests for loot, beat the final wizard boss, and see a completion screen that returns them to the main menu.

---

## 3. Capacity and Velocity

**Sprint dates:** November 20, 2026 to December 3, 2026 (proposed)

**Velocity last sprint (points completed):** 34 out of 45.

**Average velocity so far:** 25 points per sprint (16 + 34, divided by 2).

**Known absences or reduced availability this sprint:** Thanksgiving break (Nov 26 to 29) is expected to reduce availability for half of us with families.

**Points committed this sprint:** **37 points** across 12 issues.

**Why this commitment is realistic:** This is 3 points above the 34 we completed in Sprint 2. The extra 3 points are the overworld sprites story, which is the first thing we would drop after the menu extras. Without it, we are committing exactly what we finished last sprint. We are not committing less, even though Thanksgiving reduces capacity, because:

- Sprint 4 is our last sprint, and we want to save it for bug fixes, polish and the final demo. That means every core feature needed to finish the game has to land this sprint.
- Eight of the points are carryover stories (#14, #7 and #28) that were already started in Sprint 2.
- The menu and screen stories (#87, #88, #90, the completion screen and #92) are small and self-contained, with clear behavior that is easy to test.

If we fall behind, we will drop stories in this order: #92 (credits screen), #90 (pause menu), the overworld sprites (the overworld can use placeholder art), then #30 (camera). The sprint goal does not depend on any of them.

---

## 4. Committed Backlog Items

| Issue # | User story | Estimate | Owner | Ready? |
|---------|------------|----------|-------|--------|
| [#14](https://github.com/JMU-CS345/F26Team5/issues/14) | Chest loot with a large item pool *(carryover)* | 5 | Nicolas | [ ] |
| [#7](https://github.com/JMU-CS345/F26Team5/issues/7) | Starting weapon and stats per class *(carryover)* | 3 | Nicolas | [ ] |
| New issue | Overworld sprites: town tiles, buildings and dungeon entrances | 3 | Nicolas | [ ] |
| [#24](https://github.com/JMU-CS345/F26Team5/issues/24) | Final wizard boss | 5 | Enzo | [ ] |
| [#98](https://github.com/JMU-CS345/F26Team5/issues/98) | Hitbox model with once-per-swing hits | 3 | Enzo | [ ] |
| [#28](https://github.com/JMU-CS345/F26Team5/issues/28) | Overworld between dungeons *(carryover)* | 3 | Vincent | [ ] |
| [#30](https://github.com/JMU-CS345/F26Team5/issues/30) | Camera follows the player in large rooms | 3 | Vincent | [ ] |
| New issue | Completion screen after the boss that returns to the main menu | 2 | Prabesh | [ ] |
| [#92](https://github.com/JMU-CS345/F26Team5/issues/92) | Credits and attributions screen | 2 | Prabesh | [ ] |
| [#87](https://github.com/JMU-CS345/F26Team5/issues/87) | Menu widget: model and view for keyboard menus | 3 | Minhhai | [ ] |
| [#88](https://github.com/JMU-CS345/F26Team5/issues/88) | Title screen with New Run, Settings and Credits | 3 | Minhhai | [ ] |
| [#90](https://github.com/JMU-CS345/F26Team5/issues/90) | Pause menu on Esc | 2 | Minhhai | [ ] |

**Total points:** 37

**Notes:** The three carryover stories come first because the Sprint 2 review set finishing them as the priority. #24 (final boss) and the completion screen were pulled in because the game cannot be finished without them, and Sprint 4 is our last sprint. Existing boss support (a boss enemy type and boss rooms) gives #24 a starting point. The completion screen and the overworld sprites each need a new issue on the board. The overworld sprites give #28 its art, so Nicolas and Vincent work on the same area this sprint. Open issues #118 (class starting loadouts) and #114 (chests) duplicate #7 and #14, so they should be linked or closed as duplicates.

---

## 5. Task Breakdown

### Issue #14: Chest loot with a large item pool (reviewer: Prabesh)

- [ ] Add chest objects to rooms and a way to open them
- [ ] Build the loot pool and roll rewards from it
- [ ] Add rewards to the player's inventory
- [ ] Write specs for chest opening and loot rolls
- [ ] Open PR and address review

### Issue #7: Starting weapon and stats per class (reviewer: Minhhai)

- [ ] Define the starting weapon and stats for each class
- [ ] Apply the loadout when a run starts
- [ ] Write specs for each class's loadout
- [ ] Open PR and address review

### New issue: Overworld sprites (reviewer: Vincent)

- [ ] Create the issue on the board
- [ ] Find or draw town tiles, buildings and dungeon entrance sprites, and credit them in `assets/CREDITS.md`
- [ ] Load the sprites and use them in the overworld map from #28
- [ ] Write specs that the overworld sprites load and map to the right tiles
- [ ] Open PR and address review

### Issue #24: Final wizard boss (reviewer: Vincent)

- [ ] Add the wizard boss type using the existing boss support
- [ ] Design and build the wizard's attack patterns
- [ ] Spawn the wizard in the final area after all dungeons are cleared (coordinate with #28)
- [ ] Trigger the completion screen when the wizard dies
- [ ] Write specs for the boss spawn, attacks and defeat
- [ ] Open PR and address review

### Issue #98: Hitbox model with once-per-swing hits (reviewer: Prabesh)

- [ ] Add a hitbox model for attacks
- [ ] Make each swing hit an enemy at most once
- [ ] Write specs for hitbox overlap and once-per-swing behavior
- [ ] Open PR and address review

### Issue #28: Overworld between dungeons (reviewer: Enzo)

- [ ] Split into smaller tasks on the board (retro action item)
- [ ] Build the overworld map and player movement in it
- [ ] Connect dungeon entrances to the overworld
- [ ] Add the final area that opens after all dungeons are cleared
- [ ] Write specs for overworld and dungeon transitions
- [ ] Open PR and address review

### Issue #30: Camera follows the player in large rooms (reviewer: Nicolas)

- [ ] Add a camera that follows the player and stays inside the room
- [ ] Check collisions and enemy drawing with the camera offset
- [ ] Write specs for camera bounds
- [ ] Open PR and address review

### New issue: Completion screen (reviewer: Minhhai)

- [ ] Create the issue on the board
- [ ] Add a completion game state and screen
- [ ] Return to the main menu from the completion screen
- [ ] Write specs for the state change
- [ ] Open PR and address review

### Issue #92: Credits and attributions screen (reviewer: Enzo)

- [ ] Show the credits from `assets/CREDITS.md` on a screen
- [ ] Return to the title screen
- [ ] Write specs for opening and closing the screen
- [ ] Open PR and address review

### Issue #87: Menu widget: model and view for keyboard menus (reviewer: Nicolas)

- [ ] Build the menu model (selection, wrap-around, confirm)
- [ ] Build the menu view
- [ ] Write specs for menu navigation
- [ ] Open PR and address review

### Issue #88: Title screen with New Run, Settings and Credits (reviewer: Vincent)

- [ ] Start after #87 is merged
- [ ] Add the title screen using the menu widget
- [ ] Connect New Run to character creation and Credits to #92
- [ ] Write specs for the title screen flow
- [ ] Open PR and address review

### Issue #90: Pause menu on Esc (reviewer: Nicolas)

- [ ] Pause the game on Esc using the menu widget (#87)
- [ ] Add Resume and Quit to Title options
- [ ] Write specs for pausing and resuming
- [ ] Open PR and address review

### Before the sprint review

- [ ] Deploy to GitHub Pages and test the deployed build before the demo (Minhhai, retro action item)

---

## 6. Work Distribution

| Member | Stories owned | Points |
|--------|---------------|--------|
| Nicolas Reiser | #14, #7, overworld sprites (loot, loadouts and overworld art) | 11 |
| Enzo Hins | #24, #98 (combat) | 8 |
| Vincent Barr | #28, #30 (overworld and world) | 6 |
| Prabesh Dhakal | Completion screen, #92 | 4 |
| Minhhai Quach | #87, #88, #90 (menus) | 8 |

*If the work is not balanced, explain why:* Each person owns one area of the game: loot (Nicolas), combat (Enzo), the overworld (Vincent) and menus (Minhhai). Nicolas has the most points because he also makes the overworld sprites. His two carryover stories build on the inventory he finished in Sprint 2, so they should go faster than new work. Vincent has fewer points because #28 was underestimated in Sprint 2 and may run over. Prabesh has fewer points to cover reduced availability and to leave room to help with testing and reviews.

---

## 7. Stories Split or Deferred

- **Split:** #28 (overworld) will be broken into smaller tasks, because it was too large to finish in Sprint 2.
- **Deferred to Sprint 4 or later:** #26 (set bonuses for gear), #29 (free-form cave rooms), #108 (shared RNG module), #95 (key-binding presets), #99 (melee combo), and the audio and art epics (#83 to #86 and their issues). None of them are needed to finish a run, so they can be done in Sprint 4 if there is time.

---

## 8. Retrospective Follow-Through

| Action item | How it shows up in this sprint |
|-------------|--------------------------------|
| List dependencies during planning and work on the foundation first (Nicolas) | Section 9 lists the dependencies. #87 (menu widget) is the foundation for the other menu stories and should be merged early. |
| Assign PR reviewers and keep issue checklists updated (Enzo and Vincent) | Section 5 names a reviewer for every story. Nicolas and Vincent review three each, and everyone else reviews two. Issues should be closed only with their task boxes checked. |
| Leave time to deploy and test GitHub Pages before the demo (Minhhai) | Section 5 has a deploy-and-test task before the sprint review. |

---

## 9. Risks and Dependencies

**Dependencies:**
- #24 (final boss) needs the final area from #28 (overworld) to spawn in. Enzo and Vincent should agree early on how the final area is entered.
- The overworld sprites need the map layout from #28. Nicolas and Vincent should agree on the tile size and the tile list early.
- The completion screen is triggered by #24 and returns to the title screen from #88.
- #88 (title screen) and #90 (pause menu) depend on #87 (menu widget).
- #14 and #7 build on the inventory and equipment work that was merged in Sprint 2 (#31, #11, #10).

**Risks:**
- Thanksgiving break (Nov 26 to 29) reduces capacity, and we are committing to the same points as last sprint. Section 3 lists which stories to drop first.
- #28 (overworld) did not fit in Sprint 2, and it may still be larger than 3 points. #24 depends on it, so it is on the critical path.
- The wizard's attack patterns have not been designed yet, so #24 may take longer than estimated.
- Most open issues are assigned to Enzo on GitHub, so assignees need to be updated to match this plan.

---

## 10. Checklist

- [x] Sprint goal written
- [ ] Every committed story meets the Definition of Ready
- [x] Every story has an owner
- [ ] Board updated: committed stories in the sprint, tasks created
- [x] Commitment compared to velocity
- [ ] Report committed to `scrum/planning/` via pull request
