# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1357 — [main worker, 2026-08-20] **M-B step 1 DONE: `full` never wins a round because it's genuinely bad play, not an engine defect — verdict (a). Fight-menu's uniform-over-legality move roll is the dominant lever (ablation 0%→20.0%)**

- **State:** docs-only session (`docs/soak-full-policy-diagnosis-2026-08-20.md`,
  this entry). Zero `src`/`tools`/`tests` change: `git diff master@{u}..HEAD
  --stat` for this commit touches only `docs/` + `PROGRESS.md`. Scratch
  instrumentation (env-var-gated ablation toggles + an opt-in
  `collectRoundCensus` hook in `randomRoundSoakDriver.ts`, plus a scratch
  `_scratch_census.ts`) was added, run, then fully reverted
  (`git checkout -- tools/soak/randomRoundSoakDriver.ts` + `rm` the scratch
  script) — verified clean before this commit. `npm run test:smoke` 444/444
  green (confirms the scratch edits were behavior-neutral before revert).
- **Did:** read `roundController.ts`/`postwin.ts`/`core.ts`/
  `factoryRoundBattleOrchestrator.ts` first to establish that only a genuine
  in-battle result sets `round.rules.phase` to `roundLost`/`roundComplete`
  (RETIRE never touches it — confirmed zero `retire` hits in the
  orchestrator file), so the census's two watched edges are exhaustive. Then
  instrumented a per-round-attempt termination census (`full`, seeds 0:30,
  time-capped down from the brief's 0:60) and a 4-way single-knob ablation
  (`full`, seeds 0:30 each, draw-count-parity overrides so only the
  overridden decision's outcome changes, not the RNG stream length).
- **Result — verdict (a):** census = **108/108 round-attempts (30 seeds)
  ended in a genuine, fully-fainted honest loss** (`roundLost`,
  `faintedCount:3`, `hp:[0,0,0]`, every time); RETIRE was never once the
  actual end cause (rolled+accepted 0/108); zero `roundLost`-with-healthy-
  party and zero silent-stall cases — no candidate-(b) defect, no ISSUES
  entry filed. Ablation: **B (fight-menu picks `winning`'s highest-power
  legal slot instead of a uniform-over-*all 4*-slots roll, legal or not)
  moves carry>=7 from 0%→20.0% (6/30)** alone — more than a third of the way
  to `vanilla`'s established 26.7% — while A (no voluntary switches) only
  reaches 3.3% (1/30), and C (no swap accept) / D (no fight cancel) show
  **zero** effect (0/30 each). Ablation E (all four combined) **did not run**
  — time cap; said so explicitly in the doc. One `--seed 21 --verbose`
  spot-check cross-checked the census tabulation against the raw action log
  byte-for-byte (battle 3 loss → terminal → fresh draft, matching the
  `battleIndex:2`/`roundLost` record exactly).
- **Next:** M-B step 2 ("raise the win rate until carry >= 21 is observed")
  — ablation B's mechanism (`bestDamagingSlot()`, already implemented for
  `winning`) is a concrete, cheap, already-measured starting lever, though
  step 2 owns its own design. Dispatch as the next worker step.
- **Notes:** `PAPERCUT: seed 21's swap-screen entry (frame 11903) has no
  preceding "swap offer: YES" ActionLog line even though state.factorySwap
  was genuinely non-null by then (didn't affect this session's
  engine-state-based census, which doesn't read that log text; not chased
  further under the time cap), ~5 min lost confirming it was cosmetic.` Time
  discipline: the 50-minute cap forced seed ranges down to 0:30 (not 0:60)
  and dropped ablation E — an honest partial per the brief's own allowance,
  not a silent shortcut.
- **Supervisor salvage + correction (same session):** worker cap-killed at
  50 min (exit 143) after everything was written and the scratch reverted;
  supervisor re-checked every number against the raw `/tmp/mb-*.log`
  files (match) and committed. **Correction:** ablation C was a no-op, not
  a null — the PAPERCUT above IS a driver defect, filed as **ISSUES #99**
  (swap-offer YES/NO never answered by its own branch; every policy incl.
  `vanilla` accepts the swap and random-mashes the swap screen). So "swap
  accept not responsible" is withdrawn; re-measured post-fix in 1358.
  Side scout (`9b538b73`, folded) independently found #99 and measured
  `winning`'s losses: 48.4% end on a resisted/immune move; type-aware move
  choice moved carry>=14 4%→15% (60 seeds) — M-B step 2's first lever.

---

## 1356 — [planning session, 2026-08-19] **DEFERRED D2 ANSWERED: user picks option (b) — make deep play REACHABLE. Milestone M-B authored; supervisor launcher unblocked**

- **State:** planning-layer session, docs only. `ROADMAP.md` (M-B block),
  `DEFERRED.md` (D2 removed → **zero** `^## D<n> ... OPEN:` headings, verified
  against `run-supervisor.sh:264`'s exact regex — the launcher will start
  again), `PROGRESS.md` (this entry). No `src/`/`tools/`/test change; no
  suites required.
- **Did:** presented M-A's measured numbers to the user in plain terms and put
  D2's scope call to them directly. Offered three bounded options: accept and
  close; make deep play reachable; or first investigate `full`'s 0/60
  never-wins result. **User picked "make deep play reachable"** — the
  supervisor's own leaning, and the bounded option, not the open-ended one.
- **Result — milestone M-B, "the late game gets reached by playing, and
  survives it."** Bar: a sweep observes carry ≥ 21 (a genuine third
  consecutive round win, ladder battle 22+) under still-arbitrary-but-legal
  play, and the depth that opens is swept for crashes. Four ordered steps:
  (1) **why does `full` never win a round?** — folded in from the user's third
  option because it is cheap and load-bearing: `full` is the DEFAULT policy
  and the standing `full` 0:180 gate's policy, so that gate has never once
  observed a won round; the lead is that plainer `vanilla` wins 27% while
  `full` wins 0%, so `full`'s extra exploration is actively harmful — report
  before changing anything; (2) raise the win rate until carry ≥ 21 is
  observed, opt-in only, standing gates and `DEFAULT_RUN_OPTIONS` untouched,
  and it stays arbitrary-but-legal play (never an AI oracle, never a
  scenario-tied win script — that is `strong-route`'s job); (3) sweep the
  newly-reachable depth, target carry ≥ 28 (challenge 4+, where the full
  `CHECK_BAD_MOVE`+triad AI switches on); (4) triage by the standing
  convention — fix crashes that block going deeper, file the rest.
  Acceptance is a committed sweep log showing carry ≥ 21 reached by play,
  with the crash outcome stated honestly including "we got there and it
  broke." Out of scope, named: parity plan C5 (oracle evidence for a
  genuinely-chained deep arrival, still gated on trace cost), cross-session
  saving, the Open level rule set.
- **Next:** dispatch M-B step 1 (read-only diagnosis of `full`'s win path) as
  the next supervisor session's opening step; steps 2-4 follow from what it
  finds. #39's split (batch 9 landed, function-kind pool now 0) and ladder
  Slice 3 remain demoted filler.
- **Notes:** no PAPERCUT. Process note that held up well: 1353 wrote M-A's
  falsifiability clause *before* the measurement, and the result landed
  between its two branches (35.6% past challenge 1 is not "shallow"; 5.6% at
  challenge 2 is not "routinely ≥ 2") — which is exactly why the supervisor
  correctly refused to self-authorize and filed D2 instead of picking a
  branch. Pre-committing both outcomes did its job; keep doing it.

---

## 1355 — [supervisor wind-down, 2026-08-19] **Milestone M-A COMPLETE same-day (steps 1-3): play regularly passes challenge 1 (27-36%), ~5% enter challenge 3, NOTHING reaches carry 21 in 300 seeds — follow-on scope decision filed as DEFERRED D2; scanner H3 folded; walk-up ROADMAP line found stale TWICE and corrected to program-COMPLETE**

- **Final gates (SUPERSEDED line below — rerun after #39 batch 9 landed
  late-session; both runs supervisor-independent):** at the FINAL tree
  (`0a9caeda` + this docs commit): full `npm test` **1,068 files /
  10,126 passed / 223 skipped**; `npm run build` green; soak vanilla
  0:20 **20/20 OK**; soak full 0:60 **60/60 OK** — and the full-0:60
  depth block byte-matches the sweep doc's same-range numbers
  (determinism cross-check). Batch 9 itself verified: scanner CANONICAL
  76→75 + function-kind pool 0 (rerun live), test pins inspected
  (absence + exact-0 pins, not vacuous), differential independently
  rerun on 2 of 6 traces **438/438 byte-identical** (worker's own full
  run: 1241/1241). NOTE: my brief stated the move direction backwards;
  the worker correctly followed the established battleScene→canonical
  direction (matches batches 5-8 and the acceptance numbers) — right
  call. Earlier same-day gates at the pre-batch-9 tree (10,126 passed,
  build green, sweep-satisfied soaks) stand in history. DEFERRED.md
  carries **D2 (OPEN)** — the post-M-A scope decision, reserved to the
  user by the M-A block itself.
- **Did (4 worker rounds + 1 read-only scout, 2 lanes):** (1) M-A step 1
  (entry 1354 below, supervisor-verified incl. a seed-0 diagnostics
  trajectory audit). (2) Side: scanner **H3-let-write** hazard
  (`e99c3511`, fold `79a0c6ad`) — batch-8's two hand-exclusions now
  auto-blocked, `playerHealthboxHpOverlayForHp` correctly still eligible
  (pool = 1 function-kind); union checks 26/26 + smoke 444/444; a stray
  main-tree copy of the edit (absolute-path papercut, hit #3) was
  byte-identical and discarded. (3) M-A steps 2-3 (`78f11bee`,
  `a395d436`, `1e654c62`): winning 0:180 + vanilla 0:60 + full 0:60,
  **all 300 seeds OK**, distributions + per-seed lines committed
  (`docs/soak-depth-measure-2026-08-19.{md,log}`); supervisor recounted
  winning carry≥7 from raw lines (64/180 exact match). Worker cap-killed
  at 90min mid-OPTIONAL-extension (full toward 0:180) — nothing lost,
  tree was clean and all goals committed. (4) Side scout on the
  "fixture 03 brainMoving cadence" residual returned **premise
  inverted**: the cadence was already derived and closed 256/256 by
  entries 1280/1296/1307/1308 (walk-up program fully COMPLETE per 1317);
  scout live-reverified 02+03 both 256/256, differential 563/563, full
  suite green, and correctly committed nothing. ROADMAP walk-up line
  corrected twice (`b1fd9734` — itself still stale-based — then
  `477e7570` program-COMPLETE).
- **The M-A number** (full table in the doc): winning 64/180 (35.6%)
  carry≥7, 10/180 (5.6%) carry≥14, 0/180 carry≥21; vanilla 16/60 /
  3/60 / 0/60, deepest anywhere = vanilla seed 24 at battle-depth 20
  (= standing in ladder battle 21); full policy 0/60 ever complete a
  round. ROADMAP M-A block updated with the result; the block's two
  pre-recorded outcomes bracket it, so the scope call goes to D2.
- **Next:** user resolves D2 (mechanically blocks the next supervisor
  session). #39 batch 9 landed same-day (`2f8edef2` move+reconnect,
  `dc89b145` test-pin fix): moved `playerHealthboxHpOverlayForHp`,
  scanner CANONICAL 76→75, function-kind eligible pool 1→0 (none left).
  Available filler regardless: the non-function/topological CANONICAL
  remainder (5 eligible non-function symbols + the ~70 hazard-blocked
  ones per the scanner's own summary), or decision (b).
- **Notes:** process lesson recorded on top of 1353's rule — verifying a
  queue item against the tree must grep for the artifact's NEWEST
  archive mention, not stop at the first hit near the cited entry (my
  scout brief and first ROADMAP "correction" both did the latter;
  the scout's live verification caught it). PAPERCUTS bumped:
  freshness false-positive (hit 7), side absolute-path edits (hit 3).
  Both lane branches (animation-main, rust-main) were EMPTY at orient
  and stayed empty. Commits local only — pushing is Kyle's step.

---
