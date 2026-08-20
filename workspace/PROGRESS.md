# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1367 — [main worker, 2026-08-20] **#104 driver half FIXED: per-round grace re-arm + honest HANG reporting; unmasked finding — the terminal record-YES/cancel dead end is near-universal, not a deep-chain rarity (`428ba1c4`)**

- **State:** `tools/soak/randomRoundSoakDriver.ts`/`randomRoundSoak.ts` +
  `tests/randomRoundSoak.test.ts` changed (`428ba1c4`); no `src/`. `npm test`
  10152/10152 (223 skipped), `npm run build`, `npm run typecheck` all green.
- **Did:** `terminalGrace` now re-arms on every `graceActive` falling edge (a
  genuine re-chain) instead of counting down a single cumulative 9,000-frame
  budget shared across every chained round; expiry with no lobby reached and
  no re-chain now returns `HANG` + `hangSurface: "factoryTerminal"` + the
  decided round's own `endState`, instead of a false `OK`. New describe
  "ISSUES #104 (driver)": (a) seed 328 `winning` @ 260k frames now honestly
  reports HANG (was the silent-OK carry-21 "wall" of PROGRESS 1365/1366); (b)
  seed 34 `winning` reaches carry 14 (2 full chained round wins) before its
  own dead end, proving re-arming doesn't cap chaining depth. Retargeted the
  pre-existing ISSUES #89 seed-27 pin to `stopAtFirstRoundDecision: true` —
  it now also hits a #104 dead end at its old 80k budget, unrelated to its
  own (Baton Pass) concern.
- **Finding (big):** brief's own pin-(b) premise (seed 4/5 "finish OK" per
  `docs/soak-depth-measure-2026-08-19.md`) was FALSE once measured honestly —
  BOTH dead-end on `recordChoice` (`"cancel"`/`"yes"`) with carry 0. Widened
  to small honest samples post-fix: **`winning` 15/15 HANG@factoryTerminal
  (seeds 0:15), `vanilla` 10/10 (seeds 0:10), `full` 10/10 (seeds 0:10)** —
  reduced ranges, not the brief's full 0:60/0:20/0:60, given the 40-min cap
  (each seed now runs to ITS OWN genuine dead end or the frame budget, not a
  quick artificial cutoff). The dead end is NOT winning-policy-specific or
  win-only: `advanceFactoryTerminalRecordPrompt` is shared machinery for
  lost rounds too (loss presentation carries the same `recordChoice` field),
  and the terminal's random A/B/UP/DOWN walk (shared across all 3 policies)
  lands on YES/cancel with near certainty given enough presses across enough
  rounds. Also confirmed structurally: `lobbyFreeRoam` is architecturally
  unreachable via decline under the driver's default `generated-orchestrator`
  route (continuous-play chaining always re-chains a "no" straight into a
  fresh draft, `core.ts:~837-843`) — so every historical non-milestone,
  non-`stopAtFirstRoundDecision` "OK" sweep result, at ANY policy, was always
  a grace-expiry artifact, never a genuine reach of the Lobby. ISSUES #104
  trimmed to its (now clearly-scoped, high-value) engine-half remainder.
- **Next:** engine half of #104 (stub continuation for YES/cancel, RECORD is
  stub-only per the 2026-08-05 decision) is now the highest-value open item —
  fixing it should turn most of the sample above into genuine OKs at the
  Lobby (well, still capped by continuous-play chaining re-entering a draft
  instead — the decline path is unaffected, only yes/cancel gain a
  continuation). A full honest 0:60/0:20/0:60 gate re-sweep is still owed
  once that lands; today's reduced samples are real numbers, not a stand-in.
- **Notes:** no PAPERCUT. Time ran over the 40-min soft cap (~55 min) — the
  brief's pin-(b) seeds turned out to require live investigation (a wrong
  premise, not a typo) before an honest alternative could be written, and
  the full `npm test` run alone took ~3.3 min; landed everything green
  rather than cut the investigation short and risk a dishonest pin.

---

## 1366 — [supervisor fold, 2026-08-20] **Carry-21 "wall" is a driver-masked engine dead end (#104: terminal record-YES/cancel never continues; soak grace cumulative + expiry reported OK) — found by supervisor probe; switch lever C2 + #104-refutation test folded (`3fa78a98`)**

- **State:** master = 1365 sweep docs + side C2 (`5b31b1ea`: `winning`
  switches only out of a true-immunity wall with a ≥50%-HP bench answer;
  38/13/2 of 60 vs 36/10/0 decline-only, 30 switches) + side refutation
  pin (`bc8acc23`, end-turn skip claim REFUTED, later battler keeps its
  tick). Union: soak file + new test 33/33, smoke 444/444. PAPERCUTS bumped
  (`fdf46ebb`: absolute-path commit on master + reset --hard by a side
  worker; pinned-line census citations, incl. the supervisor's own hit).
- **Finding:** all three deepest 0:480 seeds (125/328/409) stop at
  `roundComplete carry<=21`. Probe (scratch print at grace expiry, reverted):
  `factoryTerminal.recordChoice:"yes"`, no `declineFarewellReleaseAge`, no
  re-chain; grace 9k→90k changes only the frame count. Driver's
  `terminalGrace` is set once and never re-armed → cumulative across
  re-chains (~1k each) → expiry reported OK. Filed **#104** (engine + driver
  halves). So "carry ≥ 28 not reached" (1365) is NOT evidence about the AI
  tier; the depth instrument was capped at ~3 re-chains since M-A.
- **Next:** main: driver half of #104 (per-round grace, HANG on stall) +
  pin; side: engine half (stub continuation for YES/cancel per the RECORD
  stub-only decision) + pin; then one more 0:480 sweep on the union for the
  carry ≥ 28 tier. Withheld: draft-by-strength (`e9a415a7`) pending n≥180.
- **Notes:** lesson banked — a sweep's "deepest seed stops at X" claim needs
  the END SURFACE of those seeds inspected before it is attributed to game
  difficulty; three sweeps attributed an instrument cap to the AI.

---

## 1365 — [main worker, 2026-08-20] **M-B FINAL RE-SWEEP DONE: `winning` 0:480, 0 CRASH/0 HANG across the doubled range — 3 seeds reach the full width of the carry-21 challenge (depth 27, new deepest), carry ≥ 28 not yet reached; #90/#154/#36 all confirmed clean**

- **State:** docs-only session. `docs/soak-deep-sweep-2026-08-20-final.{md,log}`
  (new — the milestone's final acceptance artefact), `PROGRESS.md`/
  `PROGRESS-archive.md` (this entry; 1360/1362 archived to keep the ledger
  at ~3). No `src/`/`tests/`/`tools/soak/` change — the sweep found zero new
  crash/hang signatures, so there was nothing to triage or fix.
- **Did:** swept `winning` seeds 0:480 (24×20-seed chunks, `--render-every
  0`, six batches of 4 parallel foreground processes) at master HEAD
  `a97d3b19` — the completed M-B tree (step 2a, swap-decline `781c8827`,
  #99/#100/#101/#103 fixes all folded). **480/480 OK, 0 CRASH, 0 HANG** (vs.
  238/240 OK, 2 CRASH in the 0:240 sweep that found #101/#103 — both fixes
  hold at double the range). carry≥7 205/480 (42.71%), carry≥14 54/480
  (11.25%), **carry≥21 5/480 (1.04%) — seeds 125, 271, 328, 406, 409**
  (vs. 1/240 (0.4%) previously — more than double the rate). carry≥28
  0/480 — not reached.
- **Deepest:** carry 21 (5 seeds, tied), battle-depth **27** (seeds 125,
  328, 409 — beats the prior deepest of 25 by two battles: the **full
  7-battle width** of the carry-21 challenge, not just partway). Verbose-
  traced all three via each seed's `draft confirm: YES` markers (a more
  reliable round-boundary marker than the prior doc's "open menu on slot 1"
  shorthand, which doesn't fire for every seed). Seed 328 is unambiguous —
  its own final `roundComplete` directly is the carry-21 round's result: it
  **wins the entire challenge outright** (first seed ever observed to do
  so). Seeds 125 and 409 hit the same 21/27 ceiling but *lose* battle 7 of
  that round instead (inferred from the ceiling itself: a win there would
  read `factoryWinStreak=28`/depth≥28 for the remainder of that seed's run,
  which never appears in either). **Headline: carry ≥ 28 — the full
  `CHECK_BAD_MOVE` + AI-triad tier — is not reached in this sweep; the
  closest approach is exact and three-seeds-deep: battle 7, the last battle,
  of the carry-21 challenge**, won once and lost twice.
- **Named-seed check:** #101 (seed 90), #102 (seed 154), #103 (seed 36) all
  in-range and clean — `roundLost carry<=0 depth<=3`, `roundLost carry<=0
  depth<=5`, `roundComplete carry<=14 depth<=20` respectively. #102 still
  does not reproduce (consistent with 1364's diagnosis-only finding); left
  open in `ISSUES.md` as-is (out of this step's scope).
- **Gates:** docs-only change, so `npm run test:smoke` run instead of full
  `npm test` per the brief's own rule; 444/444 green (baseline check before
  the sweep and unchanged after, since nothing under `src/`/`tests/`
  changed). No `npm run build` needed.
- **Next:** M-B's own queue is now empty from this worker's side — bar
  reached and reconfirmed at 2x range, zero live crashes, #102 diagnosis-
  only and out of scope. Supervisor closes M-B per ROADMAP.md convention
  (this worker does not edit ROADMAP.md). If a future step wants to chase
  carry≥28, the 328/125/409 chain above is the exact jumping-off point —
  battle 7 of the carry-21 round is the wall to push past.
- **Notes:** no PAPERCUT. Time discipline: 24-chunk sweep (6 parallel
  batches) landed by ~minute 22; the round-chain forensics for the
  deepest-2 write-up (goal 2) took longer than planned (~15 min) working
  out that `maxCarriedWinStreak`/`maxBattleDepth` are independent
  whole-run peaks, not paired to the same instant, and that "open menu on
  slot 1" isn't a reliable round-boundary marker — landed the doc inside
  the 45-min cap but with less slack than the brief's own 32-min
  chunk-launch cutoff implied.

---

Older entries: see `PROGRESS-archive.md`.
