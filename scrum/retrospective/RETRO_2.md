# Sprint Retrospective Report: Sprint 2

---

## 1. Meeting Details

**Date:** November 18, 2026

**Facilitator:** Nicolas Reiser

**Attendees:** Nicolas Reiser, Vincent Barr, Enzo Hins, Minhhai Quach, Prabesh Dhakal

**Absent:** None

---

## 2. Last Sprint's Action Items

| Action item | Owner | Done? | Did it help? |
|-------------|-------|-------|--------------|
| Add a PR review checklist and take more time reviewing larger PRs | Enzo | Partly | PR reviews got done, but a few were still approved pretty quickly. We need to be more consistent about checking changes before merging. |
| Spread PR reviews more evenly across the team | Nicolas | Partly | Reviews were completed, but some people still reviewed more PRs than others. |
| Check off issue tasks when the work is finished | Vincent | Partly | Some closed issues still had unchecked task boxes, which made it harder to tell what was finished. |

These were the action items from our [Sprint 1 retrospective](https://github.com/JMU-CS345/F26Team5/blob/main/scrum/retrospective/RETRO_1.md).

---

## 3. The Sprint in Numbers

**Points committed / completed:** 45 / 34

**PRs merged:** 16 between November 11 and 18, including a revert and a later merge into `main`.

**CI runs failed / total:** 0 / 28. One run got stuck, so we pushed another commit to get CI running properly. No runs are currently queued.

**Stories carried over:** 3 (#14 chest loot, #7 starting weapons and stats, and #28 overworld).

We completed 16 points in Sprint 1 and 34 in Sprint 2. We took on a lot more work this time and finished most of it, but we didn't get everything done.

---

## 4. Observations

### What went well

- Nicolas worked on the inventory system. We can now handle items, equipment, pickups, and gold, which will also help when we add chest loot. [PR #75](https://github.com/JMU-CS345/F26Team5/pull/75)
- Vincent got the dungeon generation, room layouts, tiles, and player sprites working. The game looks and plays a lot closer to what we planned. [PR #73](https://github.com/JMU-CS345/F26Team5/pull/73), [PR #53](https://github.com/JMU-CS345/F26Team5/pull/53)
- Enzo added the Jelly, Zombie, and Demon enemies. Having different enemies makes combat more interesting than fighting the same placeholder. [PR #62](https://github.com/JMU-CS345/F26Team5/pull/62)
- Minhhai got NPC dialogue working. The first version had to be reverted, but the updated version was ready for the release. [PR #74](https://github.com/JMU-CS345/F26Team5/pull/74)
- Prabesh implemented character customization, which was one of the things we showed the stakeholder. [PR #134](https://github.com/JMU-CS345/F26Team5/pull/134)
- We showed the stakeholder a working game on GitHub Pages. They said it looked good and didn't ask for any changes. We also finished 34 points this sprint compared with 16 last sprint.

### What did not go well

- We didn't finish chest loot, class starting equipment and stats, or the overworld. Chest loot and starting equipment needed the inventory and equipment systems first, and the overworld needed more time than we had left.
- We committed to 45 points after finishing 16 in Sprint 1. We got most of it done, but we probably should have planned some of the dependent features for later.
- We had to redo the NPC implementation after a revert, and there were sprite fixes close to the release. One CI run also got stuck, so we had to push another commit to get it running. That took extra time near the end of the sprint.
- Some issues were closed with unchecked task boxes, and PR reviews weren't spread evenly across the team. The GitHub board didn't always tell the whole story of what we'd finished.

### What puzzled us or what we want to try

- We should list which issues depend on other work during sprint planning. For example, it would have made more sense to finish inventory before committing to chest loot in the same sprint.
- We should break larger features like the overworld into smaller tasks and leave some time to test the GitHub Pages build before the next demo.

---

## 5. Root Cause

**Problem:** We finished most of the sprint, but chest loot, starting weapons and stats, and the overworld were not ready for the demo.

**Why?** Chest loot and starting equipment depended on inventory and equipment work being ready first. The overworld was also a bigger feature than we could finish during the sprint.

**Why?** We were still building those core systems while also trying to finish the features that depended on them. That didn't leave much room for extra fixes or testing.

**Why?** Sprint 1 went smoothly, so we committed to a lot more points in Sprint 2 without spending enough time looking at dependencies and how large some stories were.

**Root cause:** Our planning didn't account for the order of the work or leave enough time for the bigger features. We still finished a lot, but we need to plan those dependencies better next time.

---

## 6. Action Items for Next Sprint

| Action item | Owner | How we will know it worked |
|-------------|-------|----------------------------|
| List dependencies during planning and work on the foundation first | Nicolas | The sprint plan shows which issues depend on others, and larger features are broken into smaller tasks. |
| Assign PR reviewers and keep issue checklists updated | Enzo and Vincent | PRs have their assigned review, and closed issues have their tasks checked off. |
| Leave time to deploy and test GitHub Pages before the demo | Minhhai | We test the deployed version before presenting it to the stakeholder. |

We can track these on our [GitHub Project board](https://github.com/orgs/JMU-CS345/projects/27/views/4).

---

## 7. Constitution Changes

**Proposed change:** None.

**Pull request:** None.

**If no change is needed, why not?** Our [CONSTITUTION.md](https://github.com/JMU-CS345/F26Team5/blob/main/CONSTITUTION.md) already has rules for code reviews, testing, and finishing stories before calling them Done. We need to follow those rules more consistently instead of adding new ones.

---

## 8. Checklist

- [x] Every member contributed observations
- [x] Last sprint's action items reviewed
- [x] A root cause identified
- [x] Action items have owners and success measures
- [ ] Action items added to the board or next planning report
- [x] Constitution change considered, with reason no change is needed
- [ ] Report committed to `scrum/retrospective/` via pull request
