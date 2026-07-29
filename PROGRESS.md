# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 698 — [BOUNDED MAIN WORKER 2026-07-29 ~12:47] Battle-command seam Slice 2 landed

- **State:** implementation `a4a2a9dc`; tree green at **515 files / 5198
  tests + 1 deliberate animation-lane skip**, production build, and
  `git diff --check`. Import/barrier ratchet remains **6/6**.
- **Did:** added the request-owned, phase-relative action/FIGHT lifecycle:
  six-frame entry, source 5/6-tick FIGHT open/close, JOY_NEW 2x2 navigation
  with one-tick display lag, B-close/reopen cursor persistence, and exact
  request-slot legality. The submission bridge forwards only a completed
  pending decision through ordinary `submitBattleDecision`; Tier 1 proves
  exact targets, stale/illegal kernel rejection, and legal slot 3.
- **Next:** dispatch design §4 Slice 3: swap only the canonical Battle-2
  action/FIGHT renderer to the generic lifecycle and run all fourteen menu
  regressions; no turn-resolution integration.
- **Notes:** state-only pixel gates remain exact:
  `battle2-action-menu-dense` **209/209**, `fight-submenu` **235/235**, reopen
  **90/90**. No core, renderer, trace, issue, census, roadmap, animation,
  PP/HP/RNG/turn-order, pseudo-decision, or absolute-tick branch changed.
  PAPERCUT: none.

---

## 697 — [BOUNDED MAIN WORKER 2026-07-29 ~12:36] Battle-command seam Slice 1 landed

- **State:** implementation `9e5799bf`; tree green at **515 files / 5193
  tests + 1 deliberate animation-lane skip**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Import/barrier ratchet
  remains **6/6**.
- **Did:** added immutable
  `createBattleCommandPresentation(BattleCommandRequest,
  BattleScriptRulesContext)`: request-owned exact move targets and switch
  indexes, live active HP/status/moves/PP, party-indexed persistent identity,
  generated species name/gender conversion, and phase-relative initial
  cursors. Canonical Battle-2 render-state projection is deeply equal to the
  old model; a noncanonical fixture proves sparse slots, self-targeting,
  statuses, changed parties, and both active party indexes.
- **Next:** dispatch design §4 Slice 2: phase-relative action/FIGHT lifecycle
  reducer plus ordinary `submitBattleDecision` bridge, without renderer/core
  integration.
- **Notes:** state-only pixel gates remain exact:
  `battle2-action-menu-dense` **209/209**, `fight-submenu` **235/235**, reopen
  **90/90**. No core, renderer, trace, census, issue, roadmap, animation,
  recording import, or battle/turn/absolute-tick dispatch changed. PAPERCUT:
  none.

---

## 696 — [BOUNDED MAIN WORKER 2026-07-29 ~12:22] Rung-14 battle-command seam design complete

- **State:** docs-only design step complete; inherited tree remains green at
  **513 files / 5187 tests + 1 deliberate animation-lane skip**, production
  build, and `git diff --check`. No oracle lifecycle or freshness action.
- **Did:** added `docs/battle-command-seam-design.md`: current action/FIGHT
  render inventory with file/line evidence; request-ID-owned, phase-relative
  adapter/lifecycle and ordinary `submitBattleDecision` bridge; canonical
  structural-equivalence contract; immutable 14-trace regression table; six
  <=45-minute implementation slices; explicit asset and out-of-scope bounds.
- **Next:** dispatch Slice 1, the equivalence state-construction swap:
  `BattleCommandRequest + BattleScriptRulesContext` → immutable presentation
  state, proving canonical Battle-2 deep equality before any core/render
  behavior changes.
- **Notes:** canonical minimum stays `battle2-action-menu-dense` **209/209**,
  `fight-submenu` **235/235**, and reopen **90/90**; renderer slices retain all
  fourteen named exact windows. Healthbox/text mechanisms are generic;
  arbitrary field species still need complete front/back battle-pic assets
  (the banked 376-species party-icon catalog is party-screen-only). No source,
  test, trace, census, asset, roadmap, issue, or animation file changed.
  PAPERCUT: none.
- **Supervisor fold (post-step):** side-lane rung-14 draft generated-slots
  adapter merged (`73543153`): `createDraftScreenStateFromRentalRecords`
  converts six rental records via `createFactoryCorpusPartyMember`; the
  canonical route now constructs through it from `ANCHOR_DRAFT_RENTAL_RECORDS`
  (worker correctly found the pinned generated six 278/213/206/205/212/246
  differ from the anchor pool 156/149/180/153/179/181, so equivalence anchors
  on the recorded identities). Additive 376-species name/category extraction
  in `draft-pool-header.json` (no visual assets). Union verified by
  supervisor: **514 files / 5190 tests + 1 skip**, build, `git diff --check`;
  draft traces **13/13, 38/38, 66/66** exact (66-frame rerun by supervisor).

---

## 695 — [SUPERVISOR WIND-DOWN 2026-07-29 ~12:05] 14-round session: rung 13 complete, sweep census empty through seed 60, six rung-14 slices live, day-audit defect fixed same-day

- **State:** master green at **513 files / 5187 tests + 1 deliberate
  animation-lane skip** (Hypnosis bounded partial, theirs), production
  build, `git diff --check` clean, censuses idempotent, ratchets 6/6,
  DEFERRED.md **empty all session**, no orphan worktrees or worker
  branches. `animation-main` folded three times (orient ff; +9 commits
  mid-day: Whirlwind/Block X/Light Screen/Spore exact; +6 at wind-down:
  Hydro Pump exact, Hypnosis partial). The animation supervisor was still
  live at my wind-down — any post-12:00 tail is for the next orient fold.
- **Session totals (14 rounds / 18 workers, 0 failed steps, supersedes
  the 691 mid-session checkpoint):** beyond 691's items — rung 13
  A/B/C/D complete with four §7 ROM receipts; sweep blocker census
  emptied AND extended blocker-free through seed 60 (50 seven-win / 7
  legitimate losses / 0 halts across seeds 4-60,
  docs/seed-sweep-31-60-census.md); reveal sites 27 wired / 11 named
  (docs/ai-reveal-sites.md); King's Rock; ISSUES #48 closed; Toxic
  CBM/CV port closing the last receipt carve-out (census delta IMMUNITY
  10→12). Rung-14 slices landed: seam map, swap entry, commentary app
  stage, generic trainer-pic selection (50 pics), forced-switch
  request/presentation seam (canonical + delayed 200/200, ten send-out
  windows exact), plus asset prep: 376-species party-icon catalog.
  Read-only day-audit went 3-for-3 for the pattern: found the
  switch-in history-clearing defect (source `SwitchInClearSetData`,
  battle_main.c:3222/3260) — fixed and pinned same-session with zero
  cursor movement — and the #48 continuous-cursor acceptance gap, now
  pinned (challenge-2 generation 0-204-487 at cursor 514721516→782337733).
- **Next (ordered):** (i) rung-14 remaining: battle-command generic seam
  (highest cost, needs a bounded command-menu seam design first), draft
  window generated-slots adapter, arbitrary-species party-menu breadth
  (icons banked), trainer-pic OFF window for a non-canonical trainer once
  a generated route reaches it; (ii) commentary explicit-OFF route's
  missing pre-battle checkpoint (entry 690, likely harness-side); (iii)
  reveal class-B sites with their named barriers; (iv) remaining CBM/CV
  arms per the Toxic pattern; (v) Gate-6 interaction matrix; (vi) ISSUES
  #39 window-by-window retirement continues via these seams.
- **Notes:** oracle freshness FAIL at orient was a docs-only false
  positive (entry 681 evidence) — both services kept, healthy all day.
  cwd trap 11th bite mid-session (compound cd+merge+remove block;
  recovered by the standard recipe, lesson in memory + PAPERCUTS). Side
  worktrees basing on live main-worker intermediate commits cost two
  workers ~5 min each before the named-green-commit mitigation; filed in
  PAPERCUTS.md. PAPERCUT: none new otherwise.

---
