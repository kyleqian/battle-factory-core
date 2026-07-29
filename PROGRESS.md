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

## 701 — [BOUNDED MAIN WORKER 2026-07-29 ~14:32] Battle-command seam Slice 5 landed

- **State:** implementation `c9353673`; tree green at **516 files / 5229
  tests + 1 deliberate animation-lane skip**, production build, and
  `git diff --check`.
- **Did:** action chrome now redraws the active battler prompt, all four
  labels, and the typed 2x2 cursor from source battle-window tiles/font.
  Source no-wrap action navigation keeps BAG/RUN inert; POKéMON enters a
  request-owned `party-handoff`, and only an exact returned legal party index
  proceeds to ordinary submission. FIGHT B preserves the request/action
  cursor. Tier 1 pins all 16 cursor transitions and the switch handoff.
- **Next:** design §4 Slice 6: connect the generated command boundary and
  complete battle-pic catalogs to this lifecycle, then add the explicit-OFF
  128-frame breadth proof.
- **Notes:** all fourteen windows exact: Battle 2 **209/209**, FIGHT
  **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42, 44/44,
  93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No core, party-screen,
  icon consumer, trace/capture list, issue, census, roadmap, animation,
  battle/turn/tick selector, PP/HP/RNG, or turn-order change. PAPERCUT:
  parallel compare commands race over `tools/compare/out/latest`, ~1 min.

---

## 700 — [BOUNDED MAIN WORKER 2026-07-29 ~14:06] Battle-command seam Slice 4 landed

- **State:** implementation `1b72c15c`; tree green at **516 files / 5211
  tests + 1 deliberate animation-lane skip**, production build,
  `git diff --check`, and import/barrier ratchet **6/6**.
- **Did:** the generic command render view now derives both composed
  healthboxes exclusively from `BattleCommandFieldBattler`, and derives the
  FIGHT rows from live active `moveIds`/`currentPP`/packed PP bonuses. The
  Battle-2 seam consumes that view directly; its generic path no longer calls
  the fourteen-turn PP reconstruction. Tier 1 covers non-full HP and
  poison/burn/paralysis on each side plus MAGBY's non-ONIX four-move set.
- **Next:** dispatch design §4 Slice 5: build generic action-cursor chrome and
  the typed POKéMON handoff; retain the complete fourteen-window regression
  set and do not begin Slice 6's generated route or battle-pic wiring.
- **Notes:** all fourteen windows exact: Battle 2 **209/209**, FIGHT
  **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42, 44/44,
  93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No battler art,
  generated route, action cursor, party screen, trace/capture list, core,
  issue, census, roadmap, animation, or battle/turn/absolute-tick selector
  changed. PAPERCUT: none.

---

## 699 — [BOUNDED MAIN WORKER 2026-07-29 ~13:42] Battle-command seam Slice 3 landed

- **State:** implementation `4d27ff46` + scope cleanup `0a14c6ad`; tree green
  at **515 files / 5205 tests + 1 deliberate animation-lane skip**,
  production build, `git diff --check`, and import/barrier ratchet **6/6**.
- **Did:** added the phase-only
  `renderBattleCommandPresentation(framebuffer, presentation, assets)` seam
  and swapped only the canonical Battle-2 blank/action/FIGHT path onto it.
  The legacy handoff now projects action age and open/close deltas into typed
  phase-relative clocks; render selection and the lagged FIGHT cursor consume
  `BattleCommandPresentationState`. A-confirm/turn resolution remains on its
  unchanged predecessor.
- **Next:** dispatch design §4 Slice 4: feed live presentation PP and both
  arbitrary healthboxes through the generic render path; retain the complete
  fourteen-window regression set.
- **Notes:** all fourteen windows exact: Battle 2 **209/209**, FIGHT
  **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42, 44/44,
  93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No core, trace,
  recording import, turn-resolution renderer, new battle/turn/tick selector,
  issue, census, roadmap, animation, PP/HP/RNG, or capture list changed.
  PAPERCUT: concurrent lane builds caused host memory pressure and one
  signal-143 retry, ~10 min.
- **Supervisor fold (post-step):** side-lane battle-pic extraction merged
  (`3e0737f3`): both battle-pic catalogs now cover all **376** Factory
  species (374 Level-50 + 2 Open-only; back 3.5 MB, front 6.8 MB), existing
  11 front/12 back entries byte-identical, deterministic double-run proven,
  generated-data coverage test added. Slice 6's arbitrary-field asset
  dependency is banked; no consumer wiring yet. The Terra worker could not
  finish `npm test` under cross-lane contention and honestly said so —
  supervisor ran the full suite in the worktree (**516/5206** green) before
  merging; union after merge **516 files / 5207 tests + 1 skip**, build,
  `git diff --check` clean. Cross-lane full-suite contention papercut
  (both lanes, ~30 min combined) bumped in PAPERCUTS.md.

---
