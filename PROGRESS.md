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

## 694 — [BOUNDED MAIN WORKER 2026-07-29 ~11:52] Rung-14 forced-switch request/presentation seam landed

- **State:** implementation `af9db399`; tree green at **507 files / 5175
  tests**, production build, `git diff --check`, and Battle Scene OFF oracle.
  Both censuses regenerate byte-identically at SHA-256 **8b18f754…5261 /
  3ff4c7f3…dc6c**; import/barrier ratchet remains **6/6**.
- **Did / equivalence:** `partySelect.ts` now constructs immutable row identity,
  live HP/status, fainted/legal flags, and the presentation request from a
  `BattleForcedSwitchRequest` plus full player rental records/party via
  `createFactoryCorpusPartyMember`. The canonical ONIX/MAGBY/BAYLEEF state is
  structurally equal to the prior state, and `core.ts` uses the generic
  constructor. Confirmed SEND OUT submits `{kind:"switch", partyIndex:1}`
  through ordinary `submitBattleDecision`; no new acknowledgement protocol.
- **OFF evidence:** canonical and delayed party-select remain **200/200 +
  200/200 exact**. All ten downstream party-owned windows also remain exact:
  rung 2 **43/43 ×2**, rung 3 **46/46 ×2**, rung 4a **16/16 ×2**, rung 5
  **144/144 ×2**, rung 6 **195/195 ×2**.
- **Sweep / next:** all seeds **4–30** retain outcomes/cursors (**25/27 wins;
  6:791 and 12:1846 losses**), including full previously-unlisted pins
  **9:1252, 10:1657, 25:1497, 27:1882, 28:1999**. Supervisor continues
  rung-14 with battle-command; arbitrary-species party icons/chrome remain a
  later asset slice. No trace/profile/capture list, census byte, ratchet,
  issue, roadmap checkbox, animation, or turn/tick branch moved. PAPERCUT:
  none.

---

## 693 — [BOUNDED MAIN WORKER 2026-07-29 ~11:37] day-audit switch-history + continuous-cursor findings closed

- **State:** implementation `0df6ce0d`, continuous-cursor pin `63394a08`;
  current tree green at **507 files / 5173 tests**, production build and
  `git diff --check`. Both censuses regenerate byte-identically at
  **8b18f754…5261 / 3ff4c7f3…dc6c**; import/barrier ratchets remain **6/6**.
- **Did:** `Cmd_switchindataupdate` now clears only the switched battler's
  source-exact last-move/result/choiced-move and AI move/ability history;
  item-effect and opposing history persist. Tier-1 covers player voluntary
  through next AI sync, player forced, trainer voluntary, and literal buffer
  clearing. Challenge 2 now also starts from challenge 1's returned cursor:
  **514721516 → 782337733**, generation calls **0–204–487**, rentals
  **278/213/206/205/212/246**, opponent 99 **224/243/236**; fixed-seed
  rank proof retained.
- **Equivalence / sweep:** all seeds **4–30** retain exact outcomes and
  cursors (**25/27 wins; 6:791 and 12:1846 legitimate losses**); all
  **31–60** rows are byte-identical to the frozen census (**25/30 wins**).
  No cursor table moved, so no re-pin commit exists. All six R13-D banked
  receipt/control tests remain exact.
- **Next:** supervisor resumes rung-14's ordered forced-switch then
  battle-command presentation seams. No issue, roadmap, animation,
  presentation, oracle capture/profile, census byte, ratchet, or tick branch
  moved. PAPERCUT: none.
