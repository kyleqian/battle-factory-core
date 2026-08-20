# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1358 — [main worker, 2026-08-20] **ISSUES #99 FIXED: soak driver's swap offer now answered by its own branch; depth re-measured for all three policies — vanilla's apparent carry-14 depth was a swap-accept-bug artifact, `full` moved off its 0/60 floor, `winning` found one new engine crash (#100)**

- **State:** `tools/soak/randomRoundSoakDriver.ts` (fix + additive
  `RunOptions.onNote` test hook), `tests/randomRoundSoak.test.ts` (new
  `describe("ISSUES #99 ...")`, 3 tests; one pre-existing strong-route pin
  corrected — see Notes), `docs/soak-depth-remeasure-2026-08-20.{md,log}`,
  `ISSUES.md` (#99 deleted, #100 filed), this entry. No other `src/` change.
- **Did:** `onPostwin`'s continuation-menu branch never cleared
  `continuationCursorPos` after GO ON was confirmed (engine projection,
  `src/engine/postwin.ts:899-904`), so it kept matching on every later
  postwin page — including the dialoguePage-4 swap offer — and answered it
  with A on the frozen cursor-0 (YES) before the swap-offer branch ever ran.
  Fix: moved the swap-offer branch above the continuation branch and gated
  the continuation branch on `dialoguePage === 0` (the engine's own live-menu
  guard in `acceptPostwinContinuation`). Pinned with 3 new tests (vanilla
  seed 0 always NO + never enters the swap screen; winning seed 0 logs a
  swap-offer decision; winning seeds 0-6 show both YES and NO) — ~4.5s
  combined, well under the 20s per-test timeout.
- **Before/after (carry >= 7 / >= 14 / >= 21 of 60 seeds, full table +
  before/after methodology in the doc):**
  | policy | before OK | before carry>=7/14/21 | after OK | after carry>=7/14/21 |
  |---|---|---|---|---|
  | vanilla | 60/60 | 16/3/0 | 60/60 | 21/0/0 |
  | full | 60/60 | 0/0/0 | 60/60 | 1/0/0 |
  | winning | 60/60 (recount) | 26/2/0 | **59/60** | 20/4/0 |
  vanilla's pre-fix carry-14 reach (deepest depth 20) was an artifact of
  accidentally accepting every swap; post-fix it never exceeds carry 7
  (deepest depth 10). `full` moved off its 0/60 never-carries floor (1/60).
- **New crash (not fixed, out of scope):** `winning` seed 15 crashes at
  battle 5 turn 5 — `STRINGID_NATUREPOWERTURNEDINTO` (METRONOME → NATURE
  POWER) has no `{B_CURRENT_MOVE}` resolver in
  `battleResolutionPresentation.ts`. Filed as **ISSUES #100** with repro +
  mechanism + fix lead; reported honestly as 59/60, not rounded up.
- **Gates:** standing soak gates rerun post-fix with default rendering:
  `--policy vanilla --seeds 0:20` **20/20 OK**; `--seeds 0:20` (full,
  default rendering) **20/20 OK**, cited together with the render-every-0
  `full` 0:60 measurement run (60/60 OK) for the `full` 0:60 gate per the
  brief's citation rule. `npm run test:smoke` 444/444 green throughout;
  full `npm test` and `npm run build` run once at the end (see Notes for
  the exact counts).
- **Next:** ISSUES #100 (NATURE POWER string resolver) is a clean, bounded
  next step — add the missing `B_CURRENT_MOVE` resolver case in
  `battleResolutionPresentation.ts`'s `messageLines`, mirroring the ~14
  existing sites, then re-run soak seed 15 winning to confirm green.
  M-B step 2 (raise `winning`'s win rate toward carry>=21) can now proceed
  from a clean, bug-free swap-decision baseline.
- **Notes:** one pre-existing pin ("earns all seven generated wins...",
  `testPolicy: "strong-route"`) had its literal frame/turn/renderCalls
  numbers corrected (59,656→40,566 frames, turn 18→5, renderCalls
  4,397→2,953): strong-route shares vanilla's non-exploring swap semantics,
  so it now genuinely declines every swap instead of the old bug's
  accidental accept-every-swap, producing a shorter, different, still-
  deterministic trajectory (comment explains why in the test file).
  `PAPERCUT: none this session — the earlier session's swap-offer-log gap
  (1357's PAPERCUT) is what #99 turned out to be.` Time discipline: fix +
  pin landed by ~25 min; measurement + gates (parallel foreground shell
  jobs, ~2.5min + ~6min wall) by ~45 min; full-suite/build run once at the
  end per the brief.

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

