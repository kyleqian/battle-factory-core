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

---
## 485 — [SUPERVISOR WIND-DOWN 2026-07-26 ~21:20] session summary

- **State:** tree committed and green at **230 files / 3123 tests**, build
  green. Census **92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted** (session start: 90/214, 185/355, 148/276,
  1830/2957), all 32 self-checks pass. Single main worktree, zero unmerged
  side branches, zero stale worktrees, clean `git status`. **No DEFERRED
  entries — nothing blocks the next `run-supervisor.sh`.** No usage/rate
  limits; all 5 workers ran to completion.
- **Session (3 rounds / 5 workers over 2 lanes + 1 supervisor fix + 1 fold):**
  - **Round 1:** Counter/Mirror Coat registered end-to-end (entry 482,
    ISSUES #46 closed, +54 weighted, supervisor-rerun live probe all 8
    scenarios PASS) ∥ side §22 ground truth (CosmicPower/CalmMind +
    `AI_CV_SpDefUp`, 4 fixtures, supervisor-rerun verify ALL PASS, Gate F
    `if_in_bytes` inversion re-verified against raw assembly).
  - **Round 2:** §22 pair ported (entry 483, ninth pair, 27 tests) ∥ side
    §23 ground truth (LightScreen/Reflect, 4 fixtures, supervisor-rerun
    ALL PASS + assembly spot-check of the twin CV bodies/type lists).
  - **Round 3:** §23 four-handler pair ported (entry 484, tenth pair,
    29 tests, 13.8 min).
  - **Supervisor fix (`c4ea1d6`):** round-3 worker flagged that entry 483's
    `spDefStage` was never wired into `factoryAiDecisionPolicy.ts`'s
    `attackerForCbm` — maxed SPDEF could not reach the CosmicPower/CalmMind
    -8 gates in real decisions. Wired + mask-1 regression test (mask 7
    can't isolate it: `AI_CV_SpDefUp` reads the same stage for its own -1).
  - **Animation fold (wind-down):** `animation-main` (7 commits: psychic
    orientation closure, Knock Off components) merged into master; union
    suite 230/3123 + build green. The animation supervisor was still
    mid-session at fold time (worker `animation-20260726-205051` live);
    commits it lands after `960b6b9` fold next session.
- **Next (in order):** EvasionUp/EvasionDown/weather-trio pairs (the last
  6 of 22 CV handlers — LightScreen/Reflect done this session); §19.5's
  unstaged AccuracyDown sites 2-6 (mixed movesets); §18 5-6-draw window
  discrepancy (now recurring for `SpDefUp` too, §22.3-22.4 — probe
  candidate, sRandCount attribution); ENDTURN_ITEMS2 after Yawn/Thrash;
  `SpDefUp`/§23 DRAW SITE recipe-only leftovers. Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap + seam-scout §9 items (carried
  from entry 468, untouched again — AI-pair track was prioritized).
- **Notes:** zero PAPERCUTS flagged by any worker. Established cadence
  held: paired rounds (main port ∥ side prep-scout for the next pair),
  supervisor-verified every merge with own reruns. Oracle services fresh
  all session.

---
## 484 — [2026-07-26] LightScreen/Reflect CBM+CV pair ported (§23, tenth pair)

- **State:** tree committed and green at **226 files / 3109 tests** (+28
  over entry 483's 3081), build green (`tsc -b && vite build`). Census
  **unchanged at 92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 self-checks pass** (reran
  `tools/report/executable-frontier-census.ts`: byte-identical, no diff —
  this AI-decision port touches `battle_ai_scripts.s`, not the effect-
  execution subsystem the census measures). `executableFrontierRatchet
  .test.ts`'s per-module barrier counts **unmoved** (no new barrier; both
  effects already had existing table-lookup fallback entries).
- **Did:** landed §23's full four-handler pair per its ground truth
  (`docs/factory-ai-checkviability-ground-truth.md` §23, merged prior round,
  supervisor-verified ALL PASS both seeds). (1) `factoryAiCheckBadMove.ts`:
  added `runCbmLightScreen`/`runCbmReflect` — the smallest CBM handler shape
  in the doc to date, a single AI_USER-own-`SIDE_STATUS_*`-bit test with
  zero stat-stage read and zero `get_ability` call. Added `lightScreenUp?`/
  `reflectUp?` booleans to `FactoryAiCheckBadMoveAttacker` (same optional/
  default-false convention as `spDefStage?` etc., entry 483). (2)
  `factoryAiCheckViability.ts`: added `runCvLightScreen`/`runCvReflect`,
  sharing one body (`runCvSideScreenTypeGate`, the `DefenseDown`/`SpDefDown`
  shared-body-plus-`kind`-parameter precedent) — one HP gate on AI_USER's
  OWN hp, then the TARGET's own innate type1/type2 against a type list
  (LightScreen's 8-type special list / Reflect's 9-type physical list, exact
  complements covering all 17 Gen 3 types), then a single draw site. No new
  `FactoryAiCheckViabilityBattler` fields needed — `attacker.hp`/`maxHp` and
  `target.types` already existed. (3) `factoryAiDecisionPolicy.ts`: wired
  the two new CBM boolean fields onto `FactoryAiScoredBattlerView` and into
  `attackerForCbm`; the CV side needed zero wiring changes (its two inputs
  were already threaded through). (4) Tests: 8 CBM gate tests (both
  handlers' true/false/omitted/cross-flag-irrelevance cases), 12 CV
  handler-level tests (Gate A, Gates B/C on both type lists, DRAW SITE both
  polarities, for both handlers), 9 mask-7 `chooseFactoryAiScoredDecision`
  end-to-end tests reproducing §23.2/§23.3's Anorith/Shuckle/Vulpix
  reach/control fixtures (policy-own-draws: reach = 4 setup + 4 CV + 1 tie =
  9, control = 4 setup + 0 + 1 tie = 5; oracle's own live totals 10/6 are a
  documented superset, the extra +1 being `BattleTurnPassed`, outside this
  policy's scope, doc §23.4) plus a LightScreen≡Reflect cross-handler draw-
  count parity check — 29 tests total, following the SpDefUp port pattern
  (entry 483) exactly. Uniquely for this pair, per §23.2, zero HP-banding or
  damage staging was needed in any fixture (Gate A only cares about AI_USER's
  own hp, which stays at its construction-time full value throughout).
- **Next:** EvasionUp/EvasionDown/weather-trio pairs (the last 6 of 22 CV
  handlers); §19.5's unstaged AccuracyDown sites 2-6 (need mixed movesets);
  entry 476's §18 5-6-draw window discrepancy (probe candidate, sRandCount
  attribution); ENDTURN_ITEMS2 after Yawn/Thrash; Gate A (opponent HP<50%)
  for LightScreen/Reflect remains unstaged live (doc §23.5 item 4, would
  need a real-damage fixture variant, out of scope for this zero-damage
  design). Seam — turn-4 `anchorOpponentAfterTurn4Hp` staging gap and
  seam-scout §9 items remain carried from entry 468. Animation program is
  independent (its own supervisor, entry 481, archived).
- **Notes:** no ISSUES.md changes (none were open on this pair). No
  PAPERCUTS this step.

---
## 483 — [2026-07-26] SpDefUp/CosmicPower/CalmMind CBM+CV pair ported (§22)

- **State:** tree committed and green at **226 files / 3081 tests** (+27
  over entry 482's 3054), build green (`tsc -b && vite build`). Census
  **unchanged at 92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 self-checks pass** — this AI-decision port
  touches a wholly separate subsystem (`battle_ai_scripts.s`) from the one
  the census measures (`battle_scripts_1.s` effect execution), so no
  refresh was expected or needed; reran `tools/report/executable-frontier-
  census.ts` to confirm (file byte-identical, no diff). `executableFrontier
  Ratchet.test.ts`'s per-module barrier counts **unmoved** (no new
  unsupported-branch barrier — this step only widened reachability of four
  effects already present in each file's own table-lookup fallback set).
- **Did:** landed §22's full pair per its exact ground truth (`docs/factory-
  ai-checkviability-ground-truth.md` §22, merged last round at `c5d0848`).
  (1) `factoryAiCheckBadMove.ts`: added `runCbmCosmicPower`/`runCbmCalmMind`
  — two genuinely SEPARATE dual-stat handlers (the `AI_CBM_BulkUp`/
  `DragonDance` shape, §18.1 precedent), not aliases of each other or of
  `AI_CBM_DefenseUp`/`AI_CBM_SpAtkUp`: `CosmicPower` composes
  `runCbmDefenseUp` (DEF, -10) + inlines SPDEF (-8); `CalmMind` composes
  `runCbmSpAtkUp` (SPATK, -10) + inlines SPDEF (-8) — exactly mirroring how
  `runCbmBulkUp` already composes `runCbmAttackUp`. Added `spDefStage?`
  to `FactoryAiCheckBadMoveAttacker` (same optional/`DEFAULT_STAT_STAGE`
  convention as `speedStage`/`spAtkStage`). (2) `factoryAiCheckViability.ts`:
  added `runCvSpDefUp`, the single shared CV target for all four dispatching
  effects (`EFFECT_SPECIAL_DEFENSE_UP(_2)`/`EFFECT_COSMIC_POWER`/
  `EFFECT_CALM_MIND`) — byte-for-byte `AI_CV_DefenseUp`'s own gate topology
  and odds (`STAT_DEF`→`STAT_SPDEF`) with Gate F's **`if_in_bytes` polarity
  INVERTED** vs `DefenseUp`'s own `if_not_in_bytes` (re-verified against the
  raw assembly per §22.1, not copied from the sibling) — reused the existing
  `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` set directly rather than duplicating an
  identical byte list under a second name. (3) Tier-1 tests: 10 CBM tests
  (both handlers' independent/combined/omitted-field gates), 12 CV
  handler-level tests (Gates A-F, DRAW SITES 1-5, Gate F's inverted verdict
  proven on the same Seismic Toss/Dragon Rage moves `DefenseUp`'s own tests
  use, plus a pass-through barrier check), 5 mask-7
  `chooseFactoryAiScoredDecision` end-to-end reproduction tests (Anorith/
  Machamp, both dispatch moves × both reach/control fixtures, policy-own-
  draws model: reach = clean 4 `sp-def-up-roll-4` draws, control =
  deterministic 0, CosmicPower≡CalmMind draw-count parity) — 27 tests
  total, following the SpeedUp/SpAtkUp (§20/§21, entry 478) port pattern
  exactly. The oracle's own live window totals (control 8/8, reach 14/13,
  §22.3) are a documented superset (extra per-slot draws outside this
  engine's own AI-decision scope, plus the still-unresolved "5-6 not 4"
  anomaly §18.4/§22.3-22.4 first flagged for `DefenseUp` and now confirmed
  recurring here) — same subset relationship every prior HP-banded/last-
  move pair (`DefenseUp`/`AccuracyDown`) already established, not a
  mismatch; not independently re-verified against the live oracle this
  round (that verification is the already-merged, supervisor-rerun §22.6
  ground truth work, not this porting step).
- **Next:** LightScreen/Reflect/EvasionUp/EvasionDown/weather-trio pairs
  (the last 8 of 22 CV handlers, a side-lane scout is staging §23
  concurrently); §19.5's unstaged AccuracyDown sites 2-6 (need mixed
  movesets); entry 476's §18 5-6-draw window discrepancy (probe candidate,
  sRandCount attribution — now a 2-handler-wide anomaly per this step);
  ENDTURN_ITEMS2 after Yawn/Thrash. DRAW SITE 1/2/3 + site 5's empty-last-
  move sub-case remain documented recipe-only for `SpDefUp` too (same
  deferred status as every prior pair). Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap and seam-scout §9 items remain
  carried from entry 468. Animation program is independent (its own
  supervisor, entry 481).
- **Notes:** no ISSUES.md changes (none were open on this pair). No
  PAPERCUTS this step.

