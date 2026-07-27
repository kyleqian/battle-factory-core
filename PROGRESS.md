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
## 504 — [BOUNDED WORKER 2026-07-27 ~10:10] ISSUES #47 CLOSED for its live-verified shape: logic-ID-major restructure (option a) landed, Channel 2 modeled, 3 staged fixtures reproduce exactly; trimmed to one precisely-scoped, underivable remainder

- **State:** tree green at **247 files / 3376 tests** (+6 over session start
  247/3370), `npm run build` clean, `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers). Census re-run **byte-identical**
  (94/214 effects, 191/355 moves, 153/276 Factory-L50, 1900/2957 weighted,
  `git status --porcelain docs/executable-frontier-census.md` empty). Full
  `tools/probe/verify-factory-ai-checkviability-ground-truth.ts` reran
  **ALL PASS, exit 0** (all pre-existing checks + the 3 new weather-stale
  fixtures, all as ORACLE observations, `src/` untouched by that script).
- **Did:** implemented the supervisor's option (a) from entry 501's
  blocker: `chooseFactoryAiScoredDecision` (`factoryAiDecisionPolicy.ts`)
  now runs three full logic-ID-major passes over all 4 movesetIndex slots
  — CBM(0..3), then (mask 7) TTF(0..3), then CV(0..3) — matching
  `ChooseMoveOrAction_Singles`/`BattleAI_DoAIProcessing`
  (`battle_ai_script_commands.c:395-416,572-616`) exactly, replacing the
  old per-slot CBM/TTF/CV interleave. Verified via full `npm test` (247/247
  files, only +6 new tests, **zero existing-test churn** — confirms the
  doc's own claim that every fixture to date avoids a same-decision
  CBM/TTF draw, so reordering never perturbs a committed RNG value) before
  touching Channel 2 at all. **Channel 2 modeled**: `AI_TryToFaint`'s own
  `Cmd_get_how_powerful_move_is` writes `funcResult` to
  `MOVE_POWER_OTHER`/`MOVE_NOT_MOST_POWERFUL`/`MOVE_MOST_POWERFUL` (0/1/2,
  confirmed directly from `battle_ai_script_commands.c:1174-1240` +
  `include/constants/battle_ai.h:33-35`) — numerically
  `AI_WEATHER_SUN`/`RAIN`/`SANDSTORM` — and `Cmd_if_can_faint` never
  touches it, so a running `ttfExitFuncResult` (updated only on a
  non-null `mostPowerful`) exactly reproduces the real register's value
  after TTF's whole pass. Threaded into `runCheckViability` as a new
  `staleFuncResultFallback` param (mirrors Channel 1's
  `staleAbilityGuess` shape in `factoryAiCheckBadMove.ts`), consulted only
  when `currentWeather` is unset, and supplied by the caller **only for
  the CV pass's first actually-scripted slot** (`AI_CheckViability`'s own
  preamble never writes `funcResult`, so that slot alone is provably
  intact) — traced `AI_CV_RainDance`'s own Gate S (`get_ability AI_USER`)
  far enough to confirm it ALSO overwrites `funcResult` whenever it runs
  (not-user-faster), so the fallback is additionally gated off in that
  branch (`userFaster` only) rather than applied blindly.
- **Tests:** new "Channel 2" describe block in
  `tests/factoryAiScoredDecision.test.ts` (+6 tests, 2 seeds x 3 fixtures)
  reproducing all 3 of doc §25.10's staged fixtures' mask-7 net scores
  exactly — `hail-staleweather-collision` (Ninjask, net -7, Hail never
  wins), `hail-staleweather-control` (Anorith, net +1, Hail always wins),
  `cv-raindance-noraindish-stalesun` (Lotad no-Rain-Dish, net +1, Rain
  Dance always wins) — species/moveset/ability lifted verbatim from the
  3 staged battle-lab fixtures; verified every filler slot nets exactly 0
  (Splash always, Growl-vs-Shuckle per the doc's own established
  baseline) and that no stray RNG draw fires (checked type-effectiveness
  arithmetic by hand for all 4 slots in all 3 fixtures before writing
  assertions, then confirmed empirically via a scratch probe against the
  real engine — zero quadruple-effective rolls, zero ability-guess draws,
  5 total draws in every case, matching the doc's own "deterministic,
  both seeds identical" claim).
- **Scope closed vs. left open:** ISSUES #47 trimmed (not deleted) to the
  one sub-case that is genuinely underivable without new evidence: a
  weather move sitting at CV moveset index 1-3, behind another real
  move's own CV dispatch at an earlier index in the same pass — whether
  that earlier handler's own script writes `funcResult` before the
  weather handler's `get_weather` runs would require auditing every
  other already-ported `AI_CV_*` handler's own side effects, and no
  fixture (staged or banked) isolates this sub-case. Not guessed.
- **Next:** ISSUES #47's movesetIndex-1-3 remainder (needs a new live
  fixture + a per-handler funcResult audit, not a quick follow-up); §11
  wiring for `turn4-doubleteam.json`; Rung 6/Rung 4 TAUROS live-fixture
  remainders; §19.5 sites 3-6 / §24.5 recipe-only live staging.
- **Notes:** no PAPERCUT. Archived entry 501 to `PROGRESS-archive.md` to
  keep this ledger at 3 live entries (504/503/502).

---
## 503 — [SUPERVISOR ORIENT 2026-07-27 ~09:35] new session: animation-main folded (fast-forward onto the live animation supervisor's own sync-merge); round 1 dispatched

- **State:** union baseline verified green at **247 files / 3370 tests**
  (245/3363 + animation's Dragon Claw/Encore work), `npm run build` clean,
  both oracle services fresh (`check-oracle-freshness.sh` PASS). No DEFERRED
  entries. Hard deadline this session: **15:28**.
- **Fold:** `master..animation-main` had 11 commits (Dragon Claw exact 35/276,
  Encore strengthened checkpoint). The live animation supervisor session had
  just merged master into `animation-main` (cd27abf), so the fold resolved as
  a fast-forward of master onto that union — both branches now at cd27abf;
  union suite + build verified here. No "For the main program:" note in the
  animation ledger top entry.
- **Round 1 (dispatched, 2 lanes, genuinely disjoint):** main → ISSUES #47
  Channel 2 with the supervisor decision made: **option (a), logic-ID-major
  restructure** of `chooseFactoryAiScoredDecision` matching the ROM's proven
  CBM(0-3)→TTF(0-3)→CV(0-3) order (option (b)'s preview rejected — it leaves
  the movesetIndex-1-3 carry a permanent guess; (a) models the mechanism),
  then the 3 staged fixtures' mask-7 net-score tests (-7/+1/+1). Side →
  ENDTURN_ITEMS1 `RESTORE_HP`/`RESTORE_PP` registration (45 + 2 Factory-legal
  carriers, doc §1/§2b), the two barriered reachable rows, with a live Sitrus
  fixture per the Chesto/Persim pattern.
- **Next:** verify round 1; then §11 wiring for `turn4-doubleteam.json`
  (main) ∥ §19.5 sites 3-6 / §24.5 recipe-only live staging (side, freed
  once #47 stops touching the AI verify surface).

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
  §24.5 leech-seed/ingrain/curse); ENDTURN items breadth. Entry 500
  (archived) has the full session summary.

