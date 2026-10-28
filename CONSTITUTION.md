# Team Constitution

*This document records how our team works together on Mage Quest. Fill in every field. Replace the italic guidance with your team's decisions. Changes to this document go through a pull request like any other change.*
---

## 1. Team and Roles

### Team Number: 5

### Team Name: Team Fortress 3

_

### Members

| Name | GitHub username | Preferred contact | Usual availability |
| ------ | ----------------- | ------------------- | -------------------- |
| Enzo Hins | SketchyRock | @rock75 | Whenever |
| Nicolas Reiser | nick-reis | @nickw1738 | whenever |
| Vincent Barr | Vincent-Barr | @Vincent Barr | whenever |
| Minhhai Quach | minhhaiquach | @ minhhaiku | whenever |
| Prabesh Dhakal | PrabeshDhakal-commits56 | 4344358638 | Whenever|

_

### Scrum Master

**Sprint 1 Scrum Master:** Enzo Hins

**Does the role rotate?** The Scrum master will rotate every sprint, however if the first scrum master proves to be compitent, then they will stay.
_

### Product Owner

*Choose one team member who will interact with the instructor (stakeholder) to clarify and prioritize stories, and to collect new ones.* Vincent

_

### Other Responsibilities

Who is responsible for maintaining the project board / backlog in good order? *(Scrum Master?)* Enzo (SM)

Who is responsible for deploying the main branch to production to update GitHub pages? Minhhai

### Decision Making

*(How do we decide things: consensus, majority vote, Scrum Master decides? What happens if we are deadlocked?)* Majority vote in discord

_

---

## 2. Scrum Process

### Sprint Length and Dates

| Sprint | Start | End | Review / Retro date |
| -------- | ------- | ----- | --------------------- |
| 1 | 11/2 | 11/8 | 11/9 |
| 2 | 11/9 | 11/15 | 11/16 |
| 3 | 11/16 | 11/29 | 11/30 |
| 4 | 11/30 | 12/6 | 12/7 |
| 5 | 12/7 | presentation day | presentation day |

### Meetings

| Meeting | When |
| --------- | ------ |
| Daily standup | Wed/Fri |
| Sprint planning | Mon |
| Sprint review | Mon |
| Sprint retrospective | Mon |

_

### Definition of Ready

*A backlog item may be pulled into a sprint only when:*

- [ ] it is written as a user story
- [ ] it has acceptance criteria
- [ ] it has an estimate

### Definition of Done

*An item is done only when:*

- [ ] code is reviewed and approved by at least one teammate
- [ ] all tests pass in CI
- [ ] merged to `main`
- [ ] works in the deployed build
- [ ] the issue is closed
- [ ]

### Estimation

**Method:** *(story points, t-shirt sizes, hours)* t-shirt sizes (xs -> XL)

**Scale:** *(e.g., 1, 2, 3, 5, 8, 13)* (xs -> XL)

_

### Backlog and Board

**Where the backlog lives:** *(e.g., GitHub Projects board, link here)*
link: <https://github.com/orgs/JMU-CS345/projects/12/views/1>

**Board columns:** *(e.g., To Do → In Progress → In Review → Done)*

_

---

## 3. Communication

### Primary Channel

**Channel:** *(Discord, Slack, GroupMe, ...)* Discord

**Expected response time:** *(e.g., within 12 hours on weekdays)* within 12 hours weekdays

### What Goes Where

*(What is discussed in the chat channel vs. in GitHub issues vs. in PR comments?)* comments are made are in issues and prs, however everything should be fully communicated in discord because everyone has notifications for it.

_

### Reporting Blockers or Falling Behind

*(How and how early does a member tell the team they are stuck or behind?)* @everyone on discord, explaining their roadblock

_

### Absences

*(How much notice is required? How is the absent member's work covered?)* within 4 hours of the meeting time the missing member must notify the group of their absence. the missing member will cover their own work before the next meeting unless brought up with the group to be handled otherwise.

_

---

## 4. Git and GitHub Workflow

### Branch Naming

**Format:** *(e.g., `type/issue-short-description`)* "type/short-title-description"

**Allowed types:** *(e.g., `feature`, `fix`, `docs`, `refactor`, `test`, `chore`)*:

- feature: Introduces a new feature to the codebase.
- fix: Patches a bug in the codebase.
- docs: Documentation change or addition. No codebase alteration.
- refactor: Large codebase changes to existing infrastructure.
- test: Add testing to ensure functionality.

**Examples:**

- test/test-suite-class-picker
- feature/main-menu-settings-button

### Branch Protection on `main`

- [ ] No direct pushes to `main`
- [ ] Required approvals before merge
- [ ] CI must pass before merge
- [ ] Same protection on `production`

### Commit Messages

*(Format and style, e.g., imperative mood: "Add rune puzzle validation". Do we follow Conventional Commits?)*

Use the format "type: imperative summary" for example, "fix: handle empty search results" with a concise subject that says what the change does, and add a body only when more context is needed

_

### Pull Requests

**Maximum size:** *(e.g., aim for under 300 changed lines)* stay near ~300 line for a PR

**Description template:** *(e.g., What / Why / How to test / Screenshot)* What / Why / How to test / Screenshot - discuss with the person revewing the PR

**Linking issues:** *(e.g., every PR includes `Closes #N`)* every PR includes "Closes #N" <- issue number

_

### Code Review

**Review turnaround:** *(e.g., within 24 hours of being requested)* within 24 hrs

**Who reviews what:** *(e.g., any teammate; or a rotating assignment)* any teammate, however keep reviews spread out, so no one person has sole responsibility of too many.

_

### Merging

**Merge style:** *(merge commit, squash and merge, or rebase and merge)* squash and merge

**Who merges:** *(the author after approval, or the reviewer)* the reviewer can approve a PR and the author merges

**After merge:** *(e.g., delete the branch)* after merge delete branch

_

---

## 5. Code Conventions

### Naming

| Kind | Convention | Example |
| ------ | ------------ | --------- |
| Variables and functions | | |
| Classes | | |
| Constants | | |
| Files | | |
| Test files | | |

### Formatting

**Indentation:** *(2 spaces, 4 spaces, tabs)*

**Semicolons:** *(always / never)*

**Quotes:** *(single / double)*

**Maximum line length:** _

**Tools:** *(e.g., Prettier and ESLint, with config files committed to the repo)*

_

### Project Structure

*(Where does each kind of file live?)*

```
src/
  model/        (e.g., game logic, no p5 drawing calls)
  view/         (e.g., drawing code)
  controller/   (e.g., input handling)
assets/
spec/
```

### Architecture Rules

*(e.g., game logic never calls p5 drawing functions directly, so it can be unit tested)*

-
-

### Comments and Documentation

*(When are comments or JSDoc required?)*

_

### Assets

**File naming:** *(e.g., all lowercase, hyphens, no spaces)*

**Licensing and attribution:** *(Where do we record the source and license of art, sound, and fonts we did not make?)*

_

---

## 6. Testing and Quality

**Test framework:** Jasmine

**Where tests live:** _

**What must have tests:** *(e.g., all model code; every bug fix gets a test that reproduces it; combat and puzzle rules)*

_

**Coverage expectations:** 90+%

**Continuous integration:** *(What does GitHub Actions run on each PR?)*

_

**Rule for failing CI:** *(e.g., nothing merges while CI is red)*

_

**Manual playtesting:** *(Who plays the build before each sprint review, and how are bugs reported?)*

_

---

## 7. Deployment

**Where the game is deployed:** GitHub Pages, URL here

**What triggers a deploy:** *(e.g., a release PR from `main` into `production`, opened by the Scrum Master after each sprint review)*

**Who checks the deployed build, and when:** _

---

## 8. AI Tool Usage

**Allowed tools:** _

**Allowed uses:** *(e.g., code generation, tests, documentation, review)*

_

**Not allowed:** _

**Disclosure:** *(e.g., note AI assistance in the PR description)*

_

**Responsibility:** *(e.g., whoever submits AI-generated code must understand it and is accountable for it)*

_

---

## 9. Working Agreements and Conflict

### Expected Effort

*(Hours per person per week.)*

_

### Fair Contribution

*(What counts as contributing, and how is it tracked? e.g., PRs merged, reviews done, story points completed.)*

_

### Conflict Resolution

*(What steps do we follow when there is a disagreement or a problem with a teammate?)*

1. *(e.g., talk to the person directly)*
2. *(e.g., raise it at the retrospective)*
3. *(e.g., Scrum Master mediates)*
4. *(e.g., escalate to the instructor)*

### Missed Commitments

*(What happens when a member repeatedly misses commitments?)*

_

### Amending This Constitution

*(How can this document be changed? e.g., proposed by PR, approved by team vote at a retrospective.)*

_

---

## 10. Sign-Off

*By signing, each member agrees to follow this constitution.*

| GitHub name | Signature (type your name) | Date |
|------|----------------------------|------|
|      |                            |      |
|      |                            |      |
|      |                            |      |
|      |                            |      |
