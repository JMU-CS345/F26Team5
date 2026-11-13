# Sprint Planning Report: Sprint 2

---

## 1. Meeting Details

**Date:** November 9–11, 2026 (we discussed our plans over these days)

**Scrum Master:** Nicolas Reiser

**Attendees:** Nicolas Reiser, Vincent Barr, Enzo Hins, Minhhai Quach, and Prabesh Dhakal all shared what they planned to work on.

**Absent:** No absences were reported in the planning discussion. We didn't record attendance for one specific meeting.

**Sprint name:** Sprint 2 — Building Out Mage Quest

---

## 2. Sprint Goal

For Sprint 2, we want to build on the playable room from last sprint by adding a real item and weapon system, more enemies, character customization, and rooms that can be loaded and generated. We also want to connect those pieces to a basic overworld and NPCs so there's more to do than just fight the same enemy in one room. We'll use placeholder art where we need to, but we should still be able to show the features working in the game.

---

## 3. Capacity and Velocity

**Sprint dates:** November 11–19, 2026.

**Velocity last sprint (points completed):** 16 out of 16.

**Average velocity so far:** 16 points per sprint, since we've only finished one sprint.

**Known absences or reduced availability this sprint:** Nobody has reported any yet. Our constitution says roughly 5 hours per person per week, which would be around 25 hours total.

**Points committed this sprint:** **45 points** across 14 issues. The task hours in Section 5 are rough planning estimates based on our use of AI-assisted development, not measured times. Everyone should still check whether those estimates make sense for their own work. We talked as a team and agreed we could handle a bigger sprint.

**Why this commitment is realistic:** Sprint 1 ended up being much easier than we expected, and we finished our work pretty quickly. After seeing that, all five of us agreed we could take on more in Sprint 2. That's why we went from 16 points to 45. It's a big jump, but we chose it based on how the first sprint actually went, not just to fill up the board. We also have the player movement, combat, room, and class-selection code from Sprint 1 to build on. Vincent is taking on the dungeon tileset and player sprites alongside the room and overworld work. We'll start with things other features depend on, especially the room files, inventory, player stats and weapons, and the Enemy refactor. We still need to keep an eye on dependencies and give ourselves time to test everything together, but the higher commitment was a team decision.

For sizing, we're using the same scale as Sprint 1: **XS = 1, S = 2, M = 3, L = 5, XL = 8**. The numbers in the backlog table are story points. The individual tasks in Section 5 are estimated in hours, as the assignment requires. Our task-hour estimates account for AI-assisted development, but we'll still need time to check the output, write or run tests, and review the PRs.

---

## 4. Committed Backlog Items

These are the 14 issues committed to Sprint 2. Vincent's dungeon tileset and player sprites have separate stories so each has its own scope and acceptance criteria.

| Issue # | User story | Estimate | Owner | Ready? |
|---------|------------|----------|-------|--------|
| [#11](https://github.com/JMU-CS345/F26Team5/issues/11) | Equip One Melee and One Missile/Projectile Weapon | S (2 points) | Nicolas | [ ] |
| [#10](https://github.com/JMU-CS345/F26Team5/issues/10) | Switch Between Weapons in Combat | M (3 points) | Nicolas | [ ] |
| [#14](https://github.com/JMU-CS345/F26Team5/issues/14) | Chest Loot with a Large Item Pool | L (5 points) | Nicolas | [ ] |
| [#31](https://github.com/JMU-CS345/F26Team5/issues/31) | Player Inventory | L (5 points) | Nicolas | [ ] |
| [#23](https://github.com/JMU-CS345/F26Team5/issues/23) | Character Appearance Customization | M (3 points) | Prabesh | [ ] |
| [#7](https://github.com/JMU-CS345/F26Team5/issues/7) | Starting Weapon and Stats per Class | M (3 points) | Nicolas | [ ] |
| [#28](https://github.com/JMU-CS345/F26Team5/issues/28) | Overworld Between Dungeons | M (3 points) | Vincent | [ ] |
| [#13](https://github.com/JMU-CS345/F26Team5/issues/13) | Premade Dungeon Rooms Defined in a File | M (3 points) | Vincent | [ ] |
| [#12](https://github.com/JMU-CS345/F26Team5/issues/12) | Randomized Dungeon Layout | L (5 points) | Vincent | [ ] |
| [#55](https://github.com/JMU-CS345/F26Team5/issues/55) | Demon Enemy: Mini-boss Placeholder | S (2 points) | Enzo | [ ] |
| [#54](https://github.com/JMU-CS345/F26Team5/issues/54) | Enemy Variants: Jelly and Zombie | M (3 points) | Enzo | [ ] |
| [#27](https://github.com/JMU-CS345/F26Team5/issues/27) | Talkable Friendly NPCs | M (3 points) | Minhhai | [ ] |
| [#56](https://github.com/JMU-CS345/F26Team5/issues/56) | Basic Dungeon Tileset | S (2 points) | Vincent | [ ] |
| [#57](https://github.com/JMU-CS345/F26Team5/issues/57) | Player Sprites and Animations | M (3 points) | Vincent | [ ] |

**Total points:** 45

**Notes:** The Ready? boxes will be checked once each issue meets our Definition of Ready. Some of the committed work depends on other issues. For example, I need to get the reusable Item and Inventory classes from #31 working before I can finish the loot pools in #14 or weapon equipment in #11. Vincent's room-file format (#13) also needs to be settled before the generator (#12) can use it. Enzo's Jelly and Zombie issue (#54) comes before the Demon (#55), since the Demon should use the same Enemy stats setup.

Vincent's art and animation work is tracked in two separate issues:

- **#56, Basic Dungeon Tileset:** Covers reusable floor tiles, exterior and interior walls, inside and outside wall corners, ceilings, pits, and doors. We kept this separate from **#13**, which is about defining room layouts in files and loading them, and **#12**, which is about arranging those rooms into random dungeons.
- **#57, Player Sprites and Animations:** Covers the player sprites, basic movement animations, and the option to use either a short or a tall player model. This is separate from **#23**, since Prabesh is handling the hair, eyes, skin color, and clothing customization on top of those models.

Keeping these separate from the broader dungeon and customization stories makes the responsibilities and testing requirements clearer. The full mini-boss story (#17) is **not** included this sprint; #55 only makes the Demon enemy, not the boss room, loot, and exit system.

---

## 5. Task Breakdown

The tasks below have **rough hour estimates**, separate from the story points above. They assume we'll use AI to speed up parts of development, with time rounded to 15-minute increments. These are still estimates, not exact promises. We're not skipping testing or PR reviews just because AI helps with development. Everyone should check whether the hours make sense for their own tasks. Tests and PR reviews are part of the plan, not something we should leave until the end. Reviewers are different from the person assigned to each issue.

### Issue #11: Equip One Melee and One Missile/Projectile Weapon — Nicolas (S, 2 points)

**Acceptance criteria:** The player can equip one melee weapon and one projectile weapon, and putting a new weapon in the same slot replaces the old one. The HUD shows both slots, highlights the weapon being used, and leaves an empty slot blank.

- [ ] Add melee/projectile slot restrictions and replacement rules (0.25 hours)
- [ ] Connect equip/unequip and active weapon selection to Player (0.5 hours)
- [ ] Display the two weapon slots on the HUD and use the selected weapon in combat (0.5 hours)
- [ ] Write Jasmine tests for valid slots, replacement, and switching (0.5 hours)
- [ ] Prabesh reviews the PR and checks the game behavior (0.25 hours)

### Issue #10: Switch Between Weapons in Combat — Nicolas (M, 3 points)

**Acceptance criteria:** Hitting an enemy with one element and then a different element gives a bonus effect or damage. Repeating the same element shouldn't give that bonus. We'll start with one working elemental combo, as the issue says.

- [ ] Agree on the first elemental combo and what bonus it gives (0.25 hours)
- [ ] Track recent elemental hits on enemies so a follow-up can be detected (0.5 hours)
- [ ] Apply the combo bonus only for the right element sequence (0.5 hours)
- [ ] Write Jasmine tests for valid combos, same-element attacks, and expired combos (0.5 hours)
- [ ] Vincent reviews the PR and tries the combo in-game (0.25 hours)

### Issue #14: Chest Loot with a Large Item Pool — Nicolas (L, 5 points)

**Acceptance criteria:** Chests draw random items from the loot pool for their dungeon, and different openings should be able to give different items. A chest has its own inventory, and the player can take items or gold from it. The same loot-roll logic should also be reusable for bosses later.

- [ ] Set up configurable loot pools for different dungeons (0.5 hours)
- [ ] Add randomized item selection and test that loot can vary (0.5 hours)
- [ ] Give chests their own inventory and a separate gold amount (0.5 hours)
- [ ] Let the player transfer chest items and gold into their inventory/counter (0.5 hours)
- [ ] Write Jasmine tests for rolls, transfers, and empty chests (0.5 hours)
- [ ] Enzo reviews the PR and opens a few test chests (0.25 hours)

### Issue #31: Player Inventory — Nicolas (L, 5 points)

**Acceptance criteria:** Opening inventory pauses the game. The player can select items and see actions like viewing weapon information or equipping it, and equipment can be swapped into the appropriate weapon or gear slots. Gold has its own counter and doesn't take up an inventory slot. Basic consumable actions should also work.

- [ ] Build reusable Item, Weapon, Equipment, and Inventory classes with add/remove methods (0.75 hours)
- [ ] Give Player an inventory, two weapon slots, three gear slots, and a separate gold counter (0.5 hours)
- [ ] Make the inventory screen open, close, and pause gameplay (0.75 hours)
- [ ] Add item selection, inspect/equip options, and a basic consume action (0.5 hours)
- [ ] Write Jasmine specs for inventory changes, slot restrictions, gold, and pausing (0.5 hours)
- [ ] Minhhai reviews the PR and checks that the inventory can be reused for NPC shops (0.25 hours)

### Issue #23: Character Appearance Customization — Prabesh (M, 3 points)

**Acceptance criteria:** After choosing a class, the player can pick skin color, eyes, hair, and clothing. The choices are saved and still show on the character when they move between rooms or go into town. It's just cosmetic and doesn't change the player's stats.

- [ ] Add a customization screen after the class selection menu (0.75 hours)
- [ ] Save all four appearance choices on Player (0.25 hours)
- [ ] Use eye sprites, skin tint, and temporary hair/clothing shapes on the player models (0.75 hours)
- [ ] Write Jasmine specs for saving appearance and keeping stats unchanged (0.5 hours)
- [ ] Nicolas reviews the PR and checks both player models (0.25 hours)

### Issue #7: Starting Weapon and Stats per Class — Nicolas (M, 3 points)

**Acceptance criteria:** Fire, Ice, and Mind mages start with a weapon and stats matching the class they chose. Weapons from other elements should still be usable, and other classes' spells shouldn't be permanently locked away.

- [ ] Agree on the starting stats for Fire, Ice, and Mind (0.25 hours)
- [ ] Work with Prabesh to move the hard-coded Player health, speed, cooldown, and damage numbers into a stats object (0.75 hours)
- [ ] Give each class starting values and a matching projectile weapon using the shared item system (0.75 hours)
- [ ] Write Jasmine specs for different class starts and off-class weapon/spell access (0.5 hours)
- [ ] Prabesh reviews the PR and checks the stats against the character menu (0.25 hours)

Prabesh also planned to work on a reusable Player stats object. We're coordinating that here because #7 is already in this sprint. The stats refactor alone doesn't mean #7 is finished; each class still needs its starting weapon and stats.

### Issue #28: Overworld Between Dungeons — Vincent (M, 3 points)

**Acceptance criteria:** A new character starts in a predetermined town, the player can enter a dungeon from town, and finishing a dungeon takes them to the next town. The towns should be the same each run, and later towns shouldn't let players go backward through the previous dungeon entrance.

- [ ] Create a basic town map and a way to tell whether the player is in town or a dungeon (0.5 hours)
- [ ] Add the town-to-dungeon and dungeon-to-next-town transitions (0.75 hours)
- [ ] Keep town layouts fixed and handle the blocked previous entrance (0.5 hours)
- [ ] Write Jasmine tests for transitions and playtest the route (0.25 hours)
- [ ] Prabesh reviews the PR and checks the transitions (0.25 hours)

### Issue #13: Premade Dungeon Rooms Defined in a File — Vincent (M, 3 points)

**Acceptance criteria:** Rooms are defined in a file and appear in-game with the same layout. The file includes the room's name, creator, dungeon type, and layout data. Doors need to line up so the generator can connect rooms without overlap.

- [ ] Choose a room-file format with tile grids, exits, and room metadata (0.5 hours)
- [ ] Make a few example room files that other developers can copy (0.5 hours)
- [ ] Load room files and draw their layouts using the shared tileset (#56) (0.5 hours)
- [ ] Write Jasmine specs for loading files and checking room/door data (0.5 hours)
- [ ] Nicolas reviews the PR and tries adding a room from a file (0.25 hours)

### Issue #12: Randomized Dungeon Layout — Vincent (L, 5 points)

**Acceptance criteria:** Dungeon rooms are laid out randomly and different runs can have different layouts. Rooms and exits need to connect without overlapping. A dungeon seed should be visible when the game is paused, so we can repeat a layout for debugging.

- [ ] Build randomized room placement using the existing room system and a seed (1 hour)
- [ ] Check that rooms don't overlap and door connections are valid (0.75 hours)
- [ ] Add movement between rooms and show the seed in the pause menu (0.5 hours)
- [ ] Write Jasmine specs for seeds, connected rooms, and non-overlapping layouts (0.5 hours)
- [ ] Enzo reviews the PR and tests a few generated layouts (0.25 hours)

### Issue #55: Demon Enemy: Mini-boss Placeholder — Enzo (S, 2 points)

**Acceptance criteria:** The Demon uses the shared Enemy stats system, with 30–50 health, speed 1, and 2–3 contact damage. It can chase the player, shoot a simple projectile, take damage, and die. A colored square is enough for now. This is a placeholder for #17, not the complete boss-room feature.

- [ ] Add the Demon's stats and placeholder sprite (0.25 hours)
- [ ] Make it shoot a simple projectile toward the player (0.5 hours)
- [ ] Reuse chasing, damage, and death behavior from the Enemy class (0.25 hours)
- [ ] Add Jasmine tests for Demon stats, projectiles, and death (0.5 hours)
- [ ] Vincent reviews the PR and tests the Demon fight (0.25 hours)

### Issue #54: Enemy Variants: Jelly and Zombie — Enzo (M, 3 points)

**Acceptance criteria:** The Enemy class uses a stats object for health, speed, contact damage, and detection range. Jelly (3–5 health, speed 0.5–1, damage 1) uses the existing sprite. Zombie (5–8 health, speed 0.5–1, damage 1–2) can use a colored square. Both chase when the player is in range and are removed when killed.

- [ ] Change the Enemy class so each enemy type can supply its own stats (0.5 hours)
- [ ] Add Jelly and Zombie configurations and their sprites/placeholders (0.25 hours)
- [ ] Connect both variants to the existing chasing, contact damage, and death code (0.25 hours)
- [ ] Add Jasmine specs for stats, chasing, damage, and death (0.25 hours)
- [ ] Minhhai reviews the PR and tests both types (0.25 hours)

### Issue #27: Talkable Friendly NPCs — Minhhai (M, 3 points)

**Acceptance criteria:** The player can walk up to an NPC, interact, read dialogue, advance longer dialogue, and close the text box to move again. We're using stationary NPCs for now. They can have simple dialogue choices, but buying and selling are part of #22.

- [x] Add stationary NPCs like a shopkeeper, villagers, and an older character (0.5 hours)
- [x] Add interaction range, a text box, and hardcoded dialogue choices (0.75 hours)
- [x] Make dialogue advance and close, returning control to the player (0.5 hours)
- [x] Write Jasmine tests for NPC interaction and dialogue state (0.5 hours)
- [ ] Vincent reviews the PR and checks the dialogue in-game (0.25 hours)

### Issue #56: Basic Dungeon Tileset — Vincent (S, 2 points)

**Acceptance criteria:** Normal dungeon rooms use reusable tiles for floors, walls, inside/outside corners, ceilings, pits, and doors. Other rooms can reuse the same tile types instead of needing separate artwork.

- [ ] Create the basic floor, wall, corner, ceiling, pit, and door tiles (0.5 hours)
- [ ] Connect the shared tileset to the room renderer (0.25 hours)
- [ ] Test tile lookup and room tile data where it makes sense (0.25 hours)
- [ ] Enzo checks the tiles in-game and reviews the PR/diff (0.25 hours)

**Scope note:** #56 is specifically for the reusable dungeon tileset, separate from the room-file loading in #13 and random generation in #12. Keeping it separate gives the tile work its own tasks and review.

### Issue #57: Player Sprites and Animations — Vincent (M, 3 points)

**Acceptance criteria:** The player can use a short or tall model, with basic movement sprites/animations, and the selected model stays consistent between rooms. The renderer should also work with Prabesh's cosmetic layers later.

- [ ] Add the short and tall player sprite assets (0.5 hours)
- [ ] Support choosing a model and saving that choice on Player (0.5 hours)
- [ ] Connect basic movement/direction animations to rendering (0.5 hours)
- [ ] Write Jasmine specs for model choice and saved state (0.25 hours)
- [ ] Nicolas reviews the PR and playtests both models (0.25 hours)

**Scope note:** #57 covers player models, sprites, and movement animations. Prabesh's #23 adds hair, eyes, skin color, and clothing, so we're keeping that customization work separate.

### Everyone

- [ ] Nicolas checks the Sprint 2 board against this report and makes sure sizes and estimates match.
- [ ] Each person opens a PR before the last day, updates issue task checkboxes, and responds to review feedback.
- [ ] Everyone playtests the combined build before the review and reports any bugs as GitHub issues (about 0.25 hours each).
- [ ] Minhhai handles the production deployment after the review, following our team constitution (about 0.25 hours).

---

## 6. Work Distribution

| Member | Stories owned | Points |
|---|---|---:|
| Nicolas Reiser | #11, #10, #14, #31, #7 | 18 |
| Vincent Barr | #28, #13, #12, #56, #57 | 16 |
| Enzo Hins | #55, #54 | 5 |
| Minhhai Quach | #27 | 3 |
| Prabesh Dhakal | #23 | 3 |
| **Total** | **14 issues** | **45** |

*If the work is not balanced, explain why:*

 Nicolas and Vincent have more points because their features are larger and a lot of them connect to each other. Nicolas is working on inventory, equipment, and combat, while Vincent has the rooms, dungeon generation, town, and artwork. Prabesh is also helping plan the Player stats model for #7, even though Nicolas owns that issue. Minhhai and Enzo can help test and integrate things after their main features are ready. We know the point split isn't even, but we talked about taking on more after Sprint 1 went by quickly and everyone agreed to the larger workload. We'll help each other with integration and reviews so one person isn't stuck waiting on another.

**PR reviewers:** We've assigned reviewers to spread the work around, since reviews were too uneven last sprint. Prabesh reviews #11, #7, and #28; Vincent reviews #10, #55, and #27; Enzo reviews #14, #12, and #56; Minhhai reviews #31 and #54; Nicolas reviews #23, #13, and #57. That's 3/3/3/2/3 reviews, so everyone has at least two and nobody is doing all of them.

---

## 7. Stories Split or Deferred

Enzo's enemy work is split between **#54**, which covers Jelly/Zombie and shared enemy stats, and **#55**, which covers the Demon placeholder. **#56, Basic Dungeon Tileset**, covers floors, walls, corners, ceilings, pits, and doors separately from the room-file work in **#13**. **#57, Player Sprites and Animations**, covers the short/tall player models and movement animations separately from Prabesh's appearance customization in **#23**. Each story has its own scope, tests, and PR review.

A few things are still for later, even though some of this sprint's features set them up:

- **#17 Full mini-boss room:** The Demon in #55 doesn't include locking doors, boss loot, dungeon completion, or opening an exit. Those are still required for #17.
- **#22 Working shops:** Minhhai can add a shopkeeper NPC now, but actually buying and selling items needs the inventory system and will come later.
- **#20 Permanent stat upgrades:** We can get a basic Player stats object working for #7, but carrying upgrades across runs is a different story.
- **#15 Monster drops and #26 gear set bonuses:** They depend on inventory and equipment being stable first.
- **#29 Cave rooms and #30 camera movement in larger rooms:** These are outside the basic dungeon work we're doing now.

---

## 8. Retrospective Follow-Through

Sprint 1 went well and was easier than we expected: we completed all 16 points pretty quickly. That's why we agreed to do more this sprint. The stuff we need to fix is mostly how we reviewed PRs and tracked tasks. Some PRs got approved really quickly, the reviews weren't split evenly, and completed issues still had unchecked tasks.

| Action item | How it shows up in this sprint |
|---|---|
| Enzo: include a short review checklist on PRs | Reviewers should run Jasmine, try the acceptance criteria in-game, and actually read the diff. For PRs over 100 lines, we shouldn't approve them in under 10 minutes. |
| Nicolas: spread out PR reviews | Every issue has a named reviewer, and everyone has two or three reviews instead of almost all of them going to one person. |
| Vincent: keep task checkboxes up to date | Check tasks off as they're done, and confirm the issue's tasks before closing it. |

---

## 9. Risks and Dependencies

- **Bigger sprint than last time:** We intentionally committed to 45 points because Sprint 1 was easier than expected and everyone agreed we had room to do more. Using AI should also help us get some implementation tasks done faster, but we'll still check the code ourselves. Since we've only done one sprint, 16 points probably isn't a great measure of our capacity yet. The main risk is that these features depend on each other more than the Sprint 1 stories did. We'll check progress during standups and make sure there's time to combine and test everything before the review.
- **Inventory first:** #31 is the base for #11 (equipping), #14 (chest loot), and a lot of the shop and reward work later. I should get the data classes working early so other code can use them.
- **Room files before generation:** #13 needs to define how rooms, doors, and tile grids work before #12 can put those rooms together. The tiles from #56 need to work with the same room format.
- **Player stats and character art:** Prabesh's customization has to work with Vincent's short/tall sprites. The shared stats work in #7 also needs to be coordinated with Prabesh so we don't both change the Player class in incompatible ways.
- **Combat features depend on each other:** #10 needs usable weapons and elemental hits. #7 needs the weapon data model. It's better to agree on how those work before everyone codes separate versions.
- **Enemy order:** Enzo should merge the shared Enemy refactor (#54) before the Demon (#55), or at least use the same interface, so he doesn't have to redo it.
- **Town and NPC integration:** #28 handles the overworld and dungeon transitions; #27 handles talking to NPCs. A stationary shopkeeper NPC is not the same thing as a working shop (#22).
- **Review time:** We had a few rushed reviews last sprint, so everyone should open PRs earlier, keep them reasonably small, and test the combined game instead of just individual features.

---

## 10. Checklist

- [x] Sprint goal written
- [ ] Every committed story meets the Definition of Ready
- [x] Every story has an owner
- [ ] Board updated: committed stories in the sprint, tasks created
- [x] Commitment compared to velocity
- [ ] Report committed to `scrum/planning/` via pull request