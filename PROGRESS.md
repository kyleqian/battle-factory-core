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
## 502 — [SUPERVISOR FINAL CLOSE 2026-07-27 ~03:35] extension round folded; session complete

- **State (final):** tree committed and green at **245 files / 3363 tests**,
  build clean, full CV verify script ALL PASS on the final merged tree,
  census 94/214 effects, 191/355 moves, 153/276 Factory-L50, 1900/2957
  weighted. Zero unmerged side branches, zero stale worktrees, clean
  `git status`, `animation-main` fully folded (0 unfolded commits at close;
  the animation supervisor session may still be live — later commits fold
  next orient). **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** All 18 workers across 14 rounds completed (1
  salvage).
- **Extension round (after entry 500's summary):** ISSUES #47 Channel 1
  (CBM ability-id stale-read collision) fixed faithfully with a generic
  collision model, +12 tests, zero existing-test churn (entry 501);
  Channel 2 exposed a REAL architectural finding — the engine's per-slot
  CBM/TTF/CV interleave vs. the ROM's logic-ID-major order — and was
  correctly NOT shipped as a guess; #47 is trimmed to that precisely-scoped
  remainder with both candidate fixes named. ∥ **Yawn/Thrash ladder CLOSED
  6/6**: Rung 6's Persim-via-Thrash same-pass fixture matched predictions
  on both seeds with zero src edits, also closing Rung 4's TAUROS
  remainder.
- **Next (in order):** ISSUES #47 Channel 2 (pick logic-ID-major
  restructure vs. scoped TTF preview, then land the 3 fixtures' mask-7
  net-score tests); §11 wiring for `turn4-doubleteam.json` (scout banked,
  new bridge shape named); remaining recipe-only sites (§19.5 sites 3-6,
  §24.5 leech-seed/ingrain/curse); ENDTURN items breadth. Entry 500 below
  has the full session summary.

---
## 501 — [BOUNDED WORKER 2026-07-27 ~04:05] ISSUES #47 Channel 1 (CBM ability-id collision) fixed; Channel 2 (CV) precisely scoped as a real remainder, not shipped

- **State:** tree green at **245 files / 3362 tests** (+12 over session
  start 245/3350), `npm run build` clean, `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers). Census re-run **byte-identical** (94/214
  effects, 191/355 moves, 153/276 Factory-L50, 1900/2957 weighted,
  `git status --porcelain docs/executable-frontier-census.md` empty) —
  expected: this step only changes a scoring handler's own inputs, not the
  move-script surface the census walks. Full
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts` reran
  **ALL PASS, exit 0**, completely untouched (no `src/` change this step
  corrects an oracle-pinned scenario's own annotation).
- **Did:** re-derived §25.10's mechanism from source myself before coding
  (`Cmd_get_weather`'s `AI_WEATHER_NONE` write is `#ifdef BUGFIX`-gated,
  `BUGFIX` commented out in `include/config.h:48` — confirmed directly, not
  taken on faith). **Channel 1 (CBM) fixed**: `runCbmRainDance`/`SunnyDay`/
  `Hail` (`src/engine/factoryAiCheckBadMove.ts`) now read the stale
  `funcResult` faithfully on a weatherless dispatch — `AI_CheckBadMove`'s own
  universal preamble (`get_ability AI_TARGET`, the soundproof check) always
  runs immediately before these three handlers in the same script/slot, so I
  threaded that call's own already-computed guess (`soundproofGuess`, zero
  new RNG draws) into `runCbmWeatherSetter` as the funcResult fallback when
  `currentWeather` is `undefined`. A small `ABILITY_ID_IN_WEATHER_RANGE`
  table (ability name -> the 4 IDs that can ever number-collide with
  `AI_WEATHER_*`, i.e. IDs 0-3 only) answers the collision generically —
  Ninjask/Anorith are test fixtures exercising the mapping, not special
  cases in the source. The clean `currentWeather`-defined path is untouched
  (always wins over the stale fallback, matching the real ROM's own
  unconditional write when a weather bit *is* set). No `factoryAiDecisionPolicy.ts`
  wiring change needed (`currentWeather`'s shape didn't change); construction-
  site grep for the 3 changed internal functions + `FactoryAiCheckBadMoveAttacker`
  confirmed only this file + its own 3 call sites + the 2 test files touch them.
- **Channel 2 (CV) NOT shipped — real blocker found, not a time-management
  punt.** Tracing §25.10's own CV mechanism to implement it, I found the real
  ROM's `ChooseMoveOrAction_Singles`/`BattleAI_DoAIProcessing`
  (`battle_ai_script_commands.c:395-416,572-616`) runs each `aiLogicId` to
  completion across all 4 movesetIndex slots before advancing to the next
  logic ID (CBM0-3, then TTF0-3, then CV0-3) — but this engine's
  `chooseFactoryAiScoredDecision` runs CBM/TTF/CV **per slot**
  (CBM0,TTF0,CV0,CBM1,...), harmless for every handler ported so far (no
  fixture's own design lets a CBM/TTF draw leak into a count), but Channel 2
  specifically needs TryToFaint's **slot-3** classification available before
  CheckViability's **slot-0** dispatch — chronologically inverted in the
  current loop. A correct fix is either a full 3-pass loop restructure or a
  narrower RNG-free preview of TryToFaint's last-slot classification (verified
  mechanically safe: `computeMostPowerful`/`canFaint` never draw) — but even
  the narrower option still leaves "what happens when the weather move sits
  in CV movesetIndex 1-3" as a real, never-live-verified design choice, not a
  mechanical follow-through. Shipping a guess there would violate this step's
  own "do not ship a half-model that silently changes non-colliding flows"
  bar, so I left it open and documented the exact blocker (ISSUES #47,
  trimmed rather than deleted per the file's own partial-fix contract) instead
  of guessing.
- **Tests:** new "Channel 1" describe block in
  `tests/factoryAiCheckBadMove.test.ts` (+12 tests): mechanism-level cases
  across all 4 collision IDs via `knownAbility` (proving the general mapping,
  not just Ninjask), the real Ninjask (id 3, collides only with Hail) /
  Anorith (id 4, silences the channel) species from doc §25.10.2, and a
  clean-weather-always-wins case for a colliding-ID target. **Zero existing
  tests needed a value change** — every prior CBM weather test used Shuckle
  (ability id 5, outside the 0-3 range), confirmed by inspection before
  writing new tests, not assumed. The 3 §25.10 fixtures' full mask-7 net-score
  reproduction (-7/+1/+1) is **not** landed — it needs Channel 2 too: e.g. for
  the Hail-vs-Ninjask collision fixture the engine now correctly contributes
  CBM's own -8 (fixed this session) but still scores CV's own contribution as
  0 instead of the ROM's live +1, landing the mask-7 decision at net -8, one
  short of the ROM's real net -7 (see ISSUES #47 for the precise remaining
  gap).
- **Next:** ISSUES #47's Channel 2 remainder (pick the 3-pass restructure or
  the scoped preview, then land the 3 fixtures' mask-7 net-score tests);
  Rung 6 (Persim-Berry ENDTURN_ITEMS2-via-Thrash fixture) + Rung 4's TAUROS
  live-fixture remainder; §11 wiring for `turn4-doubleteam.json`.
- **Notes:** no PAPERCUT. Ledger still at 3 entries (500/499 below), no
  archiving needed yet.

---
## 500 — [SUPERVISOR WIND-DOWN 2026-07-27 ~03:20] session summary

- **State:** tree committed and green at **245 files / 3350 tests** (session
  start: 230/3123), build green, full CV verify script ALL PASS on the
  final merged tree, census **94/214 effects, 191/355 moves, 153/276
  Factory-L50, 1900/2957 weighted** (start: 92/214, 187/355, 150/276,
  1884/2957), all self-checks pass. Zero unmerged side branches, zero stale
  worktrees, clean `git status`. **No DEFERRED entries.** No usage/rate
  limits; all 16 workers ran to completion (1 salvage, below).
- **Session (13 rounds / 16 workers over 2 lanes + 2 animation folds):**
  - **Seam program closed:** ENDEAVOR-opcode/window-3 brief found already
    landed (archived 464/465 — carried-Next-note drift; doc fixed, entry
    487); turn-4 settle staging module + all consumers wired (entry 488);
    §10 scout + `turn3-rockslide.json` wired first-try (entries 494/497) —
    the whole Grovyle ROCK_SLIDE HP chain (turns 1/3/4/5) is kernel-staged;
    §11 prep-scout banked for `turn4-doubleteam.json` (narrower gap than
    hypothesized, new bridge shape named).
  - **AI 22-handler program COMPLETE:** §24 Evasion + §25 weather-trio
    ground truth scouted, ported, and closed by the §26 SpeedDownFromChance
    port + live ledger (entries 489-493, 495-496 region; every handler now
    has live oracle evidence). The §18/§22 draw anomaly was SOLVED by a
    gAIScriptPtr-attributing probe — a real chained-draw-site port bug,
    fixed in DefenseUp/SpDefUp + a second audit-found instance in
    EvasionUp's toxic branch, both later oracle-corroborated (probe doc §7,
    ground truth §24.8). A whole-surface audit checked all 46 draw sites.
  - **Yawn/Thrash → ENDTURN_ITEMS2 ladder: Rungs 1-5 of 6 landed in one
    session** from a design scout (docs/yawn-thrash-endturn-design.md):
    SETYAWN + jumpifability widening (+ a generic NO_ACC_CALC accuracycheck
    fix unblocking 8 call sites), ENDTURN_YAWN with the real sleep
    transition, ENDTURN_ITEMS2 with moveTurn gating + live same-pass
    Chesto trigger (the roadmap's oldest carried breadth item, closed),
    Thrash lock-in (+ a jumpifstatus2 operand gap the doc's citation table
    missed), ENDTURN_THRASH (+ a ThrashConfuses gating correction). Census
    grew EFFECT_YAWN + EFFECT_RAMPAGE.
  - **NEW ISSUES #47:** the ported weather handlers diverge from the ROM's
    `get_weather` stale-read bug in two live-verified Factory-reachable
    channels (§25.10 banked complete; deliberate port decision pending).
  - **Animation folds:** at orient (`f422a97`, 2 Knock Off commits) and at
    wind-down (41 commits: Calm Mind, Shadow Ball, Water Gun, Synthesis
    coverage + tooling); union suites green both times. The animation
    supervisor session was still live at both folds; later commits fold
    next session.
- **Next (in order):** Rung 6 (Persim-Berry ENDTURN_ITEMS2-via-Thrash
  verification fixture — design doc §7, verification-only) + Rung 4's
  TAUROS live-fixture remainder; ISSUES #47 (stale-weather port decision,
  ground truth complete); §11 wiring for `turn4-doubleteam.json` (scout
  banked, new bridge shape named); remaining recipe-only sites (§19.5
  sites 3-6, §24.5's leech-seed/ingrain/curse trio); ENDTURN_ITEMS2's
  ITEMS1-vs-ITEMS2 breadth beyond the gated four rows as census targets.
- **Notes:** 1 worker failure (FromChance scout self-suspended on a
  ScheduleWakeup awaiting a second verify run — new failure class,
  salvage-committed after full supervisor verification; recorded in
  supervisor memory with the recipe). 1 process incident: a supervisor
  mid-worker PAPERCUTS commit swept the worker's staged rung (shared
  index) — content intact and verified, attribution misleading on
  `4e766d4`; rule refined to pathspec commits. 1 new PAPERCUTS entry
  (`bin/oracle lab` default output dir). The user's separate
  `codex/oracle-tooling-papercuts` session/worktree
  (`.worktrees/oracle-tooling`) was left untouched. Oracle services fresh
  all session.
