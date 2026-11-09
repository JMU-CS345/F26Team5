# Sprint Retrospective Report: Sprint 1

---

## 1. Meeting Details

**Date:** 11/9/2026

**Facilitator:** Enzo Hins

**Attendees:** Enzo Hins, Minhhai Quach, Nicolas Reiser, Prabesh Dhakal, Vincent Barr

**Absent:** None

---

## 2. Last Sprint's Action Items

n/a, this is Sprint 1.

| Action item | Owner | Done? | Did it help? |
|-------------|-------|-------|--------------|
| n/a         | n/a   | n/a   | n/a          |

---

## 3. The Sprint in Numbers

**Points committed / completed:** 16 / 16

**PRs merged:** 9 (11/2 to 11/8: the six story PRs #38, #40, #41, #42, #43 and #46, plus planning #36, sprites #44 and fixes #45)

**CI runs failed / total:** 0 / 13 (all Tests runs from 11/2 to 11/8 passed)

**Stories carried over:** 0

---

## 4. Observations

### What went well

- All six committed stories (16 points) were merged and closed by the end of the sprint, and none carried over. (Enzo)
- None of the 13 CI runs during the sprint failed, so no PR was blocked on a red build. (Nick)
- #4 (projectiles, 5 points, the biggest story) was reviewed carefully. Enzo requested changes on PR #41 before approving it, and Vincent fixed it. (Vincent)
- The room and collision work in #42 included the shared wall-hit check that projectiles reuse, as planned, so #4 and #2 fit together without rework. (Minhhai)
- #5, the class selection menu, merged in PR #46 even though it touches the main sketch file, which we had flagged as a merge-conflict risk in planning. (Prabesh)

### What did not go well

- Some reviews were very quick. PR #40 (142 lines) was approved 1 minute after it was opened, #44 about 1 minute, and #42 (310 lines) 5 minutes. That is too little time to check the acceptance criteria. (Enzo)
- Reviews were not spread out as our constitution asks. Of the 8 feature PRs, Enzo reviewed 4, Minhhai 2, Nick 1, Vincent 1, and Prabesh none. Two PRs (#4 and #6) also ended up with a different reviewer than the one named in the planning report. (Nick)
- Prabesh's #5 was the last story to merge. PR #46 was opened late on the last day (11/8, 12:24 a.m. ET) and merged that afternoon, which left no slack if it had needed changes. (Prabesh)
- PR #45 ("Various room and movement fixes") changed 20 files (+357/-249) after the room and enemy PRs merged, so some integration work was only caught after the stories were merged. (Minhhai)
- The task checkboxes inside the closed issues (#1, #4, #5, #6) were never ticked, so the issues don't show what was actually finished. (Vincent)

### What puzzled us or what we want to try

- Our constitution says Sprint 1 ends 11/8 but the board said 11/10. We followed the constitution. We want one source of truth for sprint dates.
- All 16 points were finished with time left over, so we want to see how much more we can commit in Sprint 2 without overcommitting.

---

## 5. Root Cause

**Problem:** Reviews were fast and uneven. Some PRs of 140 to 310 lines were approved within minutes, and one teammate reviewed half of the PRs while another reviewed none.

**Why?** Authors needed their PRs merged quickly because the next stories depended on them (#4 needed #2's wall check, #3 needed #4 and #6).

**Why?** We planned dependent stories into the same sprint, so several people were waiting on the same few merges.

**Why?** The reviewer was whoever was online and could approve fastest, not the person named in the planning report, and nothing in our process says what a review has to cover or how long it should take.

**Root cause:** We have no review checklist and no rule that follows the planned reviewer, so under time pressure a review becomes a quick approval.

---

## 6. Action Items for Next Sprint

| Action item | Owner | How we will know it worked |
|-------------|-------|----------------------------|
| Add a short review checklist to the PR description (run the specs, check each acceptance criterion in the build, read the diff). | Enzo | Every Sprint 2 PR over 100 lines has the checklist filled in, and none is approved in under 10 minutes. |
| Use the reviewer named in the planning report, and spread the rest so every member reviews at least one PR. | Nick (Scrum Master) | At the Sprint 2 retro, review counts differ by no more than 2 between teammates and Prabesh has reviewed at least one PR. |
| Tick the task checkboxes in each issue as tasks finish, and before closing an issue. | Vincent (Product Owner) | All Sprint 2 issues have every task ticked when closed. |

---

## 7. Constitution Changes

**Proposed change:** In Code Review > Who reviews what, replace the current wording with: "The reviewer named in the sprint planning report reviews the PR. Each teammate reviews at least one PR per sprint, and no teammate reviews more than twice as many PRs as another." The current rule ("keep reviews spread out") didn't hold in Sprint 1.

**Pull request:** to be opened (link to be added)

**If no change is needed, why not?** n/a

---

## 8. Checklist

- [x] Every member contributed observations
- [x] Last sprint's action items reviewed
- [x] A root cause identified
- [x] Action items have owners and success measures (Sprint 4: n/a)
- [ ] Action items added to the board or next planning report (Sprint 4: n/a)
- [ ] Constitution change proposed through a pull request, or the reason none is needed explained (Sprint 4: n/a)
- [ ] Report committed to `scrum/retrospective/` via pull request by 11:59 p.m. on the day of the retrospective
