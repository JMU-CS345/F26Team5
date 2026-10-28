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
- [ ] acceptance criteria are met

### Estimation

**Method:** *(story points, t-shirt sizes, hours)* t-shirt sizes (xs -> XL)

**Scale:** *(e.g., 1, 2, 3, 5, 8, 13)* (xs -> XL)

_

### Backlog and Board

**Where the backlog lives:** *(e.g., GitHub Projects board, link here)*
link: <https://github.com/orgs/JMU-CS345/projects/12/views/1>

**Board columns:** *(e.g., To Do → In Progress → In Review → Done)* To Do → In Progress → In Review → Done

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

- [x] No direct pushes to `main`
- [x] Required approvals before merge (1)
- [x] CI must pass before merge
- [x] Same protection on `production`

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
| Variables and functions | camelCase | `playerHealth`, `castSpell()` |
| Classes | PascalCase | `SpellBook` |
| Constants | UPPER_SNAKE_CASE | `MAX_MANA` |
| Files | kebab-case | `spell-book.js` |
| Test files | `<name>.spec.js` | `spell-book.spec.js` |

### Formatting

**Indentation:** *(2 spaces, 4 spaces, tabs)* 2 spaces

**Semicolons:** *(always / never)* always

**Quotes:** *(single / double)* double

**Maximum line length:** 100

**Tools:** *(e.g., Prettier and ESLint, with config files committed to the repo)* Prettier and ESLint, with config files committed to the repo

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

- Game logic (model) never calls p5 drawing functions directly, so it can be unit tested.
- Drawing code (view) never changes game state; input handling (controller) is the only thing that updates the model.

### Comments and Documentation

*(When are comments or JSDoc required?)* Inline comments only to explain why. more in depth docs explain what.

### Assets

**File naming:** *(e.g., all lowercase, hyphens, no spaces)* all lowercase, hyphens, no spaces

**Licensing and attribution:** *(Where do we record the source and license of art, sound, and fonts we did not make?)* In a place like`assets/CREDITS.md`, one line per asset with source URL and license.

---

## 6. Testing and Quality

**Test framework:** Jasmine

**Where tests live:** `tests/`

**What must have tests:** *(e.g., all model code; every bug fix gets a test that reproduces it; combat and puzzle rules)* model code, every bug fix has a test that reproduces it.

**Coverage expectations:** 90%

**Continuous integration:** *(What does GitHub Actions run on each PR?)* Lint, Jasmine tests, and a coverage check.

**Rule for failing CI:** *(e.g., nothing merges while CI is red)* Nothing merges while CI is red.

**Manual playtesting:** *(Who plays the build before each sprint review, and how are bugs reported?)* The whole team plays the build before each sprint review. Bugs are reported as GitHub issues.

---

## 7. Deployment

**Where the game is deployed:** GitHub Pages, https://jmu-cs345.github.io/F26Team5/

**What triggers a deploy:** *(e.g., a release PR from `main` into `production`, opened by the Scrum Master after each sprint review)* A release PR from `main` into `production`, opened by the Scrum Master after each sprint review.

**Who checks the deployed build, and when:** product manager, right after each deploy.

---

## 8. AI Tool Usage

**Allowed tools:** Any AI tools

**Allowed uses:** *(e.g., code generation, tests, documentation, review)* Code generation, tests, documentation, and review.

**Not allowed:** Submitting AI output the author does not understand, or private data into AI tools.

**Disclosure:** *(e.g., note AI assistance in the PR description)* Note AI assistance in the PR description.

**Responsibility:** *(e.g., whoever submits AI-generated code must understand it and is accountable for it)* Whoever submits AI-generated code must understand it and is accountable for it.

---

## 9. Working Agreements and Conflict

### Expected Effort

*(Hours per person per week.)* About 5 hours per person per week.

### Fair Contribution

*(What counts as contributing, and how is it tracked? e.g., PRs merged, reviews done, story points completed.)* PRs merged, reviews done, and story points completed, tracked on the project board and in git history.

### Conflict Resolution

*(What steps do we follow when there is a disagreement or a problem with a teammate?)*

1. Talk to the person directly
2. Raise it at the retrospective
3. Scrum Master mediates
4. Escalate to the instructor

### Missed Commitments

*(What happens when a member repeatedly misses commitments?)* The Scrum Master talks to them first, then the conflict resolution steps above apply.

### Amending This Constitution

*(How can this document be changed? e.g., proposed by PR, approved by team vote at a retrospective.)* Proposed by PR and approved by majority vote in Discord.

---

## 10. Sign-Off

*By signing, each member agrees to follow this constitution.*

| GitHub name | Signature (type your name) | Date |
|------|----------------------------|------|
|minhhaiquach | Minhhai |10/28/26|
| nick-reis | Nicolas Reiser |10/28/26|
|      |                            |      |
|      |                            |      |
