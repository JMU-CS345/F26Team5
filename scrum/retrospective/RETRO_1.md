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

**CI runs failed / total:** 0 / 13 (every Tests run from 11/2 to 11/8 passed)

**Stories carried over:** 0

---

## 4. Observations

### What went well

- All six stories (16 points) got merged and closed, nothing carried over (Enzo)
- 0 of 13 CI runs failed this sprint so we never got stuck on a red build (Nick)
- #4 projectiles was the biggest story at 5 points. Enzo asked for changes on PR #41 before approving and Vincent fixed it, so that one actually got a real review (Vincent)
- The room work in #42 had the wall hit check that projectiles reuse, like we planned, so #2 and #4 fit together without redoing stuff (Minhhai)
- #5 touches the main sketch file which we said might cause merge conflicts in planning, but PR #46 merged fine (Prabesh)

### What did not go well

- Some reviews were really fast. PR #40 (142 lines) got approved about a minute after it was opened, #44 too, and #42 (310 lines) in 5 minutes. Thats not enough time to check the acceptance criteria (Enzo)
- Reviews werent spread out like the constitution says. Of the 8 feature PRs Enzo reviewed 4, Minhhai 2, Nick 1, Vincent 1 and Prabesh none. #4 and #6 also got a different reviewer than the planning report said (Nick)
- #5 was the last story to merge. PR #46 was opened at 12:24 a.m. ET on 11/8, the last day, and merged that afternoon. If it needed changes we wouldnt have had time (Prabesh)
- PR #45 ("Various room and movement fixes") touched 20 files (+357/-249) after the room and enemy PRs were already merged, so we only caught some integration stuff after the fact (Minhhai)
- Nobody ticked the task checkboxes in the closed issues (#1, #4, #5, #6) so they dont really show what got done (Vincent)

### What puzzled us or what we want to try

- The constitution says Sprint 1 ends 11/8 but the board said 11/10. We went with the constitution, but we should pick one place for the dates
- We finished all 16 points with time left, so we want to see how much more we can take on in Sprint 2 without overdoing it

---

## 5. Root Cause

**Problem:** Reviews were fast and uneven. A few PRs of 140 to 310 lines got approved in minutes, and one person reviewed half the PRs while someone else reviewed none.

**Why?** People wanted their PRs merged quick because the next stories depended on them (#4 needed the wall check from #2, #3 needed #4 and #6).

**Why?** We put dependent stories in the same sprint, so a few people were all waiting on the same merges.

**Why?** Whoever was online approved it, not the reviewer from the planning report, and nothing says what a review should cover or how long it should take.

**Root cause:** No review checklist and no rule to use the planned reviewer, so when we are rushed a review turns into a quick approve.

---

## 6. Action Items for Next Sprint

| Action item | Owner | How we will know it worked |
|-------------|-------|----------------------------|
| Put a short review checklist in the PR description (run the specs, check each acceptance criterion in the build, read the diff) | Enzo | Every Sprint 2 PR over 100 lines has it filled in and none gets approved in under 10 minutes |
| Use the reviewer from the planning report and spread the rest so everyone reviews at least one PR | Nick (Scrum Master) | At the Sprint 2 retro review counts are within 2 of each other and Prabesh has reviewed at least one PR |
| Tick the task checkboxes in each issue as tasks finish, and before closing it | Vincent (Product Owner) | Every Sprint 2 issue has all its tasks ticked when its closed |

---

## 7. Constitution Changes

**Proposed change:** In Code Review > Who reviews what, change it to: "The reviewer named in the sprint planning report reviews the PR. Each teammate reviews at least one PR per sprint, and no teammate reviews more than twice as many PRs as another." The current "keep reviews spread out" line didnt really work in Sprint 1.

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
