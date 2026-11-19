# Sprint Review Report: Sprint 2

---

## 1. Meeting Details

**Date:** November 18, 2026

**Scrum Master:** Nicolas Reiser

**Attendees:** Nicolas Reiser, Vincent Barr, Enzo Hins, Minhhai Quach, Prabesh Dhakal

**Absent:** None

**Deployed build reviewed:** https://jmu-cs345.github.io/F26Team5/

**Release PR into `production`:** [PR #78](https://github.com/JMU-CS345/F26Team5/pull/78)

---

## 2. Sprint Goal

**The goal we set:** Build on the playable game from Sprint 1 by adding inventory and weapons, new enemies, character customization, randomized dungeons, NPCs, and more of the game world.

**Did we meet it?** Partly. We finished 11 of our 14 stories and showed the stakeholder the game on GitHub Pages. We didn't finish chest loot, class starting weapons and stats, or the overworld. We still got most of the features we planned working and made a lot more progress than in Sprint 1.

---

## 3. Committed Items: Done or Not Done

We counted stories based on what was ready for our GitHub Pages demo. The three unfinished stories are marked Not Done rather than counting partial progress.

| Issue # | User story | Estimate | Owner | Done? | Demoed by |
|---------|------------|----------|-------|-------|-----------|
| [#11](https://github.com/JMU-CS345/F26Team5/issues/11) | Equip one melee and one projectile weapon | 2 | Nicolas | Done | Team |
| [#10](https://github.com/JMU-CS345/F26Team5/issues/10) | Switch between weapons in combat | 3 | Nicolas | Done | Team |
| [#14](https://github.com/JMU-CS345/F26Team5/issues/14) | Chest loot with a large item pool | 5 | Nicolas | Not Done | — |
| [#31](https://github.com/JMU-CS345/F26Team5/issues/31) | Player inventory | 5 | Nicolas | Done | Team |
| [#23](https://github.com/JMU-CS345/F26Team5/issues/23) | Character appearance customization | 3 | Prabesh | Done | Team |
| [#7](https://github.com/JMU-CS345/F26Team5/issues/7) | Starting weapon and stats per class | 3 | Nicolas | Not Done | — |
| [#28](https://github.com/JMU-CS345/F26Team5/issues/28) | Overworld between dungeons | 3 | Vincent | Not Done | — |
| [#13](https://github.com/JMU-CS345/F26Team5/issues/13) | Premade dungeon rooms | 3 | Vincent | Done | Team |
| [#12](https://github.com/JMU-CS345/F26Team5/issues/12) | Randomized dungeon layout | 5 | Vincent | Done | Team |
| [#55](https://github.com/JMU-CS345/F26Team5/issues/55) | Demon enemy placeholder | 2 | Enzo | Done | Team |
| [#54](https://github.com/JMU-CS345/F26Team5/issues/54) | Jelly and Zombie enemy variants | 3 | Enzo | Done | Team |
| [#27](https://github.com/JMU-CS345/F26Team5/issues/27) | Talkable friendly NPCs | 3 | Minhhai | Done | Team |
| [#56](https://github.com/JMU-CS345/F26Team5/issues/56) | Basic dungeon tileset | 2 | Vincent | Done | Team |
| [#57](https://github.com/JMU-CS345/F26Team5/issues/57) | Player sprites and animations | 3 | Vincent | Done | Team |

---

## 4. Metrics

| | Points |
|---|---:|
| Committed | 45 |
| Completed | 34 |
| Completion rate | 75.6% |

**Velocity history:**

| Sprint | Committed | Completed |
|--------|-----------|-----------|
| 1 | 16 | 16 |
| 2 | 45 | 34 |

We more than doubled the amount of work we completed compared with Sprint 1. Three stories carried over, for a total of 11 points.

[Sprint 2 GitHub Project board](https://github.com/orgs/JMU-CS345/projects/27/views/4)

---

## 5. Demo

We showed the stakeholder the game running on GitHub Pages. These are the parts of the completed stories that we demonstrated.

### Issue #11: Equip One Melee and One Projectile Weapon

- [x] Equipping weapons through the inventory and equipment system.

### Issue #10: Switch Between Weapons in Combat

- [x] Switching between equipped weapons during gameplay.

### Issue #31: Player Inventory

- [x] Opening the inventory and managing items and equipment.
- [x] Picking up items and tracking gold separately from inventory slots.

### Issue #23: Character Appearance Customization

- [x] Customizing the player's appearance.

### Issue #13: Premade Dungeon Rooms

- [x] Using premade room layouts in the dungeon.

### Issue #12: Randomized Dungeon Layout

- [x] Moving through generated dungeon rooms and layouts.

### Issue #55: Demon Enemy Placeholder

- [x] Showing the Demon enemy and its behavior.

### Issue #54: Jelly and Zombie Enemy Variants

- [x] Showing the Jelly and Zombie enemies in combat.

### Issue #27: Talkable Friendly NPCs

- [x] Interacting with an NPC and displaying dialogue.

### Issue #56: Basic Dungeon Tileset

- [x] Showing the dungeon tiles and room artwork.

### Issue #57: Player Sprites and Animations

- [x] Showing the player sprites and movement animations.

The unfinished chest loot, class starting equipment and stats, and overworld stories were not counted as Done.

---

## 6. Incomplete Work

| Issue # | What remains | New estimate | Back in backlog? |
|---------|--------------|--------------|------------------|
| [#14](https://github.com/JMU-CS345/F26Team5/issues/14) | Finish chest interactions, loot pools, and adding the rewards to inventory | 5 | [x] |
| [#7](https://github.com/JMU-CS345/F26Team5/issues/7) | Set up each class's starting weapon and stats and test the loadouts | 3 | [x] |
| [#28](https://github.com/JMU-CS345/F26Team5/issues/28) | Finish the overworld connecting the dungeons | 3 | [x] |

These are the three stories we need to bring into the next sprint. The inventory and equipment work is already there, so we have something to build on for the first two.

---

## 7. Stakeholder Feedback

We showed the stakeholder our game on GitHub Pages. They said it looked good. They didn't give us any other feedback or ask us to change anything.

---

## 8. Backlog Changes

**New stories added:** None.

**Priorities changed:** We need to finish chest loot (#14), starting weapons and stats (#7), and the overworld (#28) before moving on to more dependent features.

**Stories removed:** None.

The three incomplete stories are on the [Sprint 2 project board](https://github.com/orgs/JMU-CS345/projects/27/views/4) and will carry into the next sprint.

---

## 9. Quality

**CI status on `production`:** Passing. One CI run got stuck during the sprint, and we pushed another commit to get it running properly. There were no failed runs and none are currently queued.

**Number of specs:** 625 Jasmine specs passing, with 0 failures reported in [PR #78](https://github.com/JMU-CS345/F26Team5/pull/78).

**Known bugs in the deployed build:** We didn't record a separate bug list during the review. We had fixed sprite-loading and rendering issues before the release in [PR #76](https://github.com/JMU-CS345/F26Team5/pull/76) and [PR #77](https://github.com/JMU-CS345/F26Team5/pull/77). The three unfinished stories are tracked as incomplete work, not bugs.

---

## 10. Checklist

- [x] Demo given from the deployed GitHub Pages build
- [x] Every committed item marked Done or Not Done
- [x] Metrics filled in
- [x] Stakeholder feedback recorded
- [x] Backlog changes recorded
- [ ] Report committed to `scrum/review/` via pull request
