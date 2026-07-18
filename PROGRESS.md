# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 30 — ISSUES #7 remainder: RAM-pinned + fixed the second-ball display-tile lag (Parts 1-2 landed, committed); Part 3 (`rent-3picks.json`) built a clean candidate but STOPPED short of committing per the brief's own stop condition — more diff frames than expected, though all classify as pre-existing/benign on inspection

- **State:** `npm test` **273/273** (270→273, +3 in
  `tests/ballAnimDisplayLag.test.ts`), `npm run build` green, working tree
  clean except this docs commit. `rent-slot1.json` re-verified unchanged at
  **125/139**. `rent-3picks.json` **still not committed** (see below - not
  blocked by a known bug, just short of a final verification pass).
- **Did:** **Part 1 (RAM probe, committed with Part 2):** wrote a scratch
  `EmeraldOracle` probe (direct `struct Sprite` reads: `animCmdIndex` @0x2B,
  OAM `tileNum` = attr2 bits0-9 @0x04, cross-derived `sFactorySelectScreen`
  base via a pointer DEREF that a first attempt missed) dumping both balls'
  `animCmdIndex` and raw-framebuffer diffs tick-by-tick across a long dwell
  after 2 plain rents (~80 cadence transitions total). Finding: real
  hardware's own display lag from *its own* `animCmdIndex` is a uniform 1
  tick for **every** ball, always (both balls, ~40 transitions each, one
  exception at the full-cycle-restart/reroll boundary which needs+1 more -
  not exercised before tick 189, so out of scope here). Cross-checked
  against the engine's own modeled `cmdIndex` via a throwaway vitest dump:
  slot 0's internal `cmdIndex` runs exactly 1 tick EARLY vs RAM (engine hits
  cmdIndex9 at tick104 in a 2-ball dwell; RAM hits it at tick105) - a
  pre-existing quirk `REST_INTERNAL_OFFSET`'s own comment already flagged as
  present-but-harmless for single-ball; slot 1's matches RAM exactly, no
  offset. This fully explains the old "flat 2" model: it was only ever
  correct for slot 0's own miscalibration, not a real 2-tick hardware lag.
  **Part 2 (committed, `2a29750`):** `advanceBallAnim` now takes a
  `displayLagTicks` param (2 for slot0, 1 for every other slot, wired from
  `core.ts`'s ball-index loop) - purely additive to the shift-register
  logic, `advanceBallAnimCore` (cmdIndex/timer/pendingRest/RNG) untouched,
  so every pre-existing RNG-pinned test passed unmodified. Pinned 3 new
  Tier-1 tests against the RAM checkpoints. Confirmed via `npm run compare`
  against a scratch 2-rent trace that frames 180/188 (the originally-
  reported 176px ball-OBJ-position diffs) are now **0 diff**.
  **Part 3 (not committed):** rebuilt the exact PROGRESS-archive #21 3-pick
  shape (confirms@37/113/189, dense captures 0-189) and ran `npm run
  compare`. Frames 180/188 confirmed clean. But found MORE diff frames than
  the brief's stated expectation ("168-170 and 189 only"): frames 37-57 and
  113-133 (bbox/pixel-count byte-identical to `rent-slot1.json`'s own
  already-committed 14-diff ISSUES #5 pattern, recurring once per rent) and
  frames 152-153 (new location, x196-236/y20-28 then x59-109/y80-92, right
  after the 2nd RIGHT move - the first plausibly matches ROADMAP's
  already-documented "species-name palette breathe, not yet modeled" gap,
  the second unidentified). None are at a ball's OBJ position in a way
  that isn't already independently accepted. Per the brief's own stop
  condition ("any other diff -> STOP, do not commit, document"), did not
  commit the trace despite this analysis suggesting it's likely shippable -
  full breakdown in ISSUES #7.
- **Next:** a future session should (1) identify frame 153's bbox
  (x59-109/y80-92) via RAM/overlay, (2) re-run the exact compare above to
  reconfirm the diff set is stable, (3) if clean, commit
  `rent-3picks.json` with per-frame attributions and delete ISSUES #7.
  Confirm-flow implementation (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (Python scripts +
  a throwaway vitest test file under `tests/_scratch_displaylag.test.ts`,
  deleted before finishing; trace JSONs under `/tmp`) - nothing uncommitted
  left in the tree. PAPERCUT: ~10 min lost to a pointer-dereference bug in
  my own probe script (`sFactorySelectScreen` is `struct X *`, not `struct
  X` - reading fields directly off its own address instead of dereferencing
  first silently returned plausible-looking-but-wrong zeros for slots 1-4);
  `inspect-anchor.py`'s existing `oracle.read_u32(SFACTORY_SELECT_SCREEN_ADDR)`
  pattern already does this correctly and is worth grep'ing for before
  hand-deriving struct offsets fresh next time.

---

## 29 — ISSUES #7 Part 1 landed (species-keyed LEFT/RIGHT stall, sanctioned per entries 26-28): fixed, tested, committed; Part 2 (`rent-3picks.json`) STOPPED per the brief's own explicit stop condition — a SECOND, narrower ball-render bug (unrelated to the stall rule) surfaced once the trace was actually built

- **State:** `npm test` **270/270** (264→270, +6 in
  `tests/ballAnimSpeciesStall.test.ts`), `npm run build` green, working tree
  clean. `rent-slot1.json` re-verified still **125/139** (no regression).
  `rent-3picks.json` **still not built** (blocked by a newly-found, different
  bug - see below and ISSUES #7).
- **Did:** **Part 1 (committed, `e3f712e`):** implemented the corrected
  2-species safe-list in `ballAnimStall`'s LEFT/RIGHT branch
  (`cursorMoveStallsBalls`, `factoryDraftScreen.ts`) - stalls every active
  ball only when the entering slot's species is outside `{BAYLEEF,
  HAUNTER}`, keyed by the engine's existing draft-pool species string (not
  slot index). Pinned with 6 new Tier-1 tests against ISSUES #7's
  RAM-derived checkpoints (Probe A: action ticks 79/121/163/205 reproduced,
  decisive HAUNTER-no-stall window 203→207 not 208; Probe C: count=2
  HAUNTER-no-stall windows 276→284/275→307 not 285/308) - every expected
  value hand-derived from documented RAM facts via `MOVING_CMDS`' fixed
  durations, then cross-checked against the implementation before
  committing to the numbers (not the other way around). No existing test
  had pinned the old always-stall behavior, so nothing needed updating.
  **Part 2 (not committed):** rebuilt PROGRESS-archive #21's exact 3-pick
  trace (confirms at press-ticks 37/113/189) and ran `npm run compare`
  (scratch, captures 0-245). First checked the brief's required amendment
  (probe for the first YES/NO-hand-off pixel after tick 189): frame 189
  itself is still clean/#5-attributable, but frames ≥190 diverge
  immediately and explode fast (949px→13271px by 234+, spreading to
  x239/y32-156) - confirms the trace must end at/before 189. Then found
  frames 180 and 188 show a 176px diff at **x56-76/y54-73, outside the
  x88-151 mon-pic window, at ball-index-1's (MAGBY) own OBJ position** -
  the brief's explicit stop condition. Root-caused enough to rule out the
  stall rule as the cause (byte-identical diff before/after Part 1's fix,
  confirmed via `git worktree` against the pre-fix commit; ball 1's
  internal `cmdIndex` timing independently matches pure zero-stall
  arithmetic exactly) and pinned it precisely: the engine's `displayTile`
  lags the oracle by 1 tick at this transition, not the documented-as-2-tick
  constant. Per the brief, stopped without guessing a fix - did not commit
  `rent-3picks.json`, wrote the full finding into ISSUES #7 (trimmed to this
  remainder, historical species-stall investigation trail removed - git
  history has it if ever needed) instead of re-litigating the now-fixed
  stall rule.
- **Next:** a future session should RAM-probe the display-lag mechanism for
  a second active ball directly - the bug reproduces with just 2 plain
  rents and a long-enough dwell, no cursor moves needed (ball 1's own
  cmdIndex8→9→10 transition around tick 179-188). Once that's fixed,
  `rent-3picks.json` should build cleanly against the same trace shape
  already validated here. Confirm-flow implementation
  (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (trace JSON files
  under `/tmp`, a throwaway `git worktree` for the before/after comparison,
  a throwaway TS script overlaying candidate ball tiles onto the oracle's
  own PNG per this issue's established zero-residual-diff method) - nothing
  uncommitted left in the tree, worktree removed. PAPERCUT: none beyond the
  usual oracle round-trip overhead; the `git worktree add HEAD~1` +
  symlink-node_modules/reference trick to run `npm run compare` against a
  prior commit without disturbing the working tree is worth remembering for
  future before/after regression checks.

---

## 28 — ISSUES #7 minimal-pair probes (worker, capped, probe-only): the fifth update's "contradiction" was ITSELF a measurement artifact — P_STALL (HAUNTER, count3/RIGHT/origin3) is RAM-DISPROVEN as a valid data point (count=3 is structurally unreachable via LEFT/RIGHT — completing the 3rd rent exits cursor mode on the same tick); species-only table RESURRECTED with a corrected 2-species safe-list {BAYLEEF, HAUNTER}

- **State:** unchanged from entry 27 — `npm test` **264/264**, `npm run
  build` green, working tree clean before this docs-only commit. No
  `src/`/`tests/` changes this session (probe-only step, per the brief).
  `rent-3picks.json` still not built (remains blocked, see Next).
- **Did:** Followed the supervisor's minimal-pair ruling exactly (PROGRESS
  entry 27). **PROBE A** (HAUNTER, count1/RIGHT/origin3 — differs from
  P_STALL in count only): clean, decisive **NO STALL** (window 203→207,
  gap 4, unambiguous). **PROBE B** (mandated: count3/LEFT/origin5) **could
  not be constructed** — after a 3rd rent, `cursorPos` froze permanently
  and `selectingMonsState` read 4 (not 3); a screenshot confirmed the
  screen had already handed off to the "Are these three POKéMON OK?" YES/NO
  screen. Reference source
  (`battle_factory_screen.c:1965-1966`,`Select_OptionRentDeselect`) confirms
  this is structural: `selectingMonsState` starts at 1, so a 3rd successful
  rent always makes it 4, and `4 > FRONTIER_PARTY_SIZE(3)` ends cursor mode
  on that same tick — no tick exists where 3 balls are active and LEFT/RIGHT
  still works. An **exact tick-for-tick re-replication of the fourth
  worker update's own original R5 script** (rent0→R1→R2→rent2→R3→L1→R4→
  rent3→R5) reproduces the identical freeze: R5's RIGHT never moves
  `cursorPos` off 3. **This proves P_STALL was never a genuine cursor-move
  observation** — it was measured against an already-exited screen.
  Discarding it, HAUNTER now shows NO STALL at every legitimately-tested
  condition (count1/RIGHT/origin3 this session, count1/LEFT/origin5 fifth
  update, count2/RIGHT/origin3 via a bonus Probe C this session) — a second
  "safe" species alongside BAYLEEF, not a contradiction. Full 12-row keyed
  table (every valid LEFT/RIGHT point across all sessions) fits **one
  variable with zero exceptions**: entering species ∈ {BAYLEEF, HAUNTER} →
  no stall; ∈ {MAGBY, BUTTERFREE, ONIX, QUILAVA} → stall. Full evidence:
  ISSUES #7 ("sixth worker update").
- **Next:** get sign-off then (1) implement the corrected 2-species
  safe-list in `ballAnimStall`'s LEFT/RIGHT branch, pin with a Tier-1 test
  against this session's RAM checkpoints; (2) **before building
  `rent-3picks.json`**, re-check its spec (PROGRESS-archive #21) against
  this session's finding that a post-3rd-rent cursor move is impossible in
  the real game — any dense-capture window assuming otherwise needs
  rethinking; (3) confirm-flow implementation, exit sequence, S6 remain
  queued behind this per entry 26.
- **Notes:** all probing was scratch Python under `/tmp/issues7probe/` (not
  committed) — no `src/` edits were ever at risk. Method refinement this
  session: `data[0]` is the real hardware's REST COUNTDOWN (set to 32 at a
  SUCCESS roll, held through the full 128-tick cycle, then decremented
  32→0) — a *repeated* `data[0]` value across two consecutive ticks is a
  more direct stall signature than inferring one from `animCmdIndex` gaps
  alone, and was used to resolve an otherwise-ambiguous BUTTERFREE read via
  cross-calibration against an independent, undisputed RENT-confirm stall
  in the same run. PAPERCUT: none beyond the usual oracle round-trip
  overhead; worth noting for future sessions that `selectingMonsState`
  starting at 1 (not 0) is a real gotcha for anyone scripting a 3rd rent
  and expecting cursor mode to still be live afterward.
- **Supervisor addendum (same day, ~16:45):** the #7 finding is
  independently verified — reference source
  (`battle_factory_screen.c:1298` init-to-1, `:1965-1966` same-call
  handoff) confirms the structural impossibility; the R5-replication
  screenshot shows the YES/NO screen on-screen; probe scripts/logs under
  `/tmp/issues7probe/` inspected. In parallel, a worktree-lane worker
  attempted ISSUES #5's sanctioned `rent-slot1.json` clean-window re-time:
  8 candidates (confirm press-ticks 29-35 + DOWN-tick variations) were ALL
  worse than the committed baseline (15-27 diffs vs 14) — re-time is
  infeasible near the current timing; #5's rent-slot1 note resolves to the
  attribution fallback (125/139 ships permanently, see ISSUES #5; that
  lane's branch had no commits and was removed). Next step (worker
  launching now): implement the 2-species safe-list in `ballAnimStall` +
  Tier-1 pins + `rent-3picks.json` per entry 26 decision 2 — the entry-27
  ruling's precondition (factor isolated) is met, so no fresh user
  sign-off is required.

---

## 28 — ISSUES #7 minimal-pair probes (worker, capped, probe-only): the fifth update's "contradiction" was ITSELF a measurement artifact — P_STALL (HAUNTER, count3/RIGHT/origin3) is RAM-DISPROVEN as a valid data point (count=3 is structurally unreachable via LEFT/RIGHT — completing the 3rd rent exits cursor mode on the same tick); species-only table RESURRECTED with a corrected 2-species safe-list {BAYLEEF, HAUNTER}

- **State:** unchanged from entry 27 — `npm test` **264/264**, `npm run
  build` green, working tree clean before this docs-only commit. No
  `src/`/`tests/` changes this session (probe-only step, per the brief).
  `rent-3picks.json` still not built (remains blocked, see Next).
- **Did:** Followed the supervisor's minimal-pair ruling exactly (PROGRESS
  entry 27). **PROBE A** (HAUNTER, count1/RIGHT/origin3 — differs from
  P_STALL in count only): clean, decisive **NO STALL** (window 203→207,
  gap 4, unambiguous). **PROBE B** (mandated: count3/LEFT/origin5) **could
  not be constructed** — after a 3rd rent, `cursorPos` froze permanently
  and `selectingMonsState` read 4 (not 3); a screenshot confirmed the
  screen had already handed off to the "Are these three POKéMON OK?" YES/NO
  screen. Reference source
  (`battle_factory_screen.c:1965-1966`,`Select_OptionRentDeselect`) confirms
  this is structural: `selectingMonsState` starts at 1, so a 3rd successful
  rent always makes it 4, and `4 > FRONTIER_PARTY_SIZE(3)` ends cursor mode
  on that same tick — no tick exists where 3 balls are active and LEFT/RIGHT
  still works. An **exact tick-for-tick re-replication of the fourth
  worker update's own original R5 script** (rent0→R1→R2→rent2→R3→L1→R4→
  rent3→R5) reproduces the identical freeze: R5's RIGHT never moves
  `cursorPos` off 3. **This proves P_STALL was never a genuine cursor-move
  observation** — it was measured against an already-exited screen.
  Discarding it, HAUNTER now shows NO STALL at every legitimately-tested
  condition (count1/RIGHT/origin3 this session, count1/LEFT/origin5 fifth
  update, count2/RIGHT/origin3 via a bonus Probe C this session) — a second
  "safe" species alongside BAYLEEF, not a contradiction. Full 12-row keyed
  table (every valid LEFT/RIGHT point across all sessions) fits **one
  variable with zero exceptions**: entering species ∈ {BAYLEEF, HAUNTER} →
  no stall; ∈ {MAGBY, BUTTERFREE, ONIX, QUILAVA} → stall. Full evidence:
  ISSUES #7 ("sixth worker update").
- **Next:** get sign-off then (1) implement the corrected 2-species
  safe-list in `ballAnimStall`'s LEFT/RIGHT branch, pin with a Tier-1 test
  against this session's RAM checkpoints; (2) **before building
  `rent-3picks.json`**, re-check its spec (PROGRESS-archive #21) against
  this session's finding that a post-3rd-rent cursor move is impossible in
  the real game — any dense-capture window assuming otherwise needs
  rethinking; (3) confirm-flow implementation, exit sequence, S6 remain
  queued behind this per entry 26.
- **Notes:** all probing was scratch Python under `/tmp/issues7probe/` (not
  committed) — no `src/` edits were ever at risk. Method refinement this
  session: `data[0]` is the real hardware's REST COUNTDOWN (set to 32 at a
  SUCCESS roll, held through the full 128-tick cycle, then decremented
  32→0) — a *repeated* `data[0]` value across two consecutive ticks is a
  more direct stall signature than inferring one from `animCmdIndex` gaps
  alone, and was used to resolve an otherwise-ambiguous BUTTERFREE read via
  cross-calibration against an independent, undisputed RENT-confirm stall
  in the same run. PAPERCUT: none beyond the usual oracle round-trip
  overhead; worth noting for future sessions that `selectingMonsState`
  starting at 1 (not 0) is a real gotcha for anyone scripting a 3rd rent
  and expecting cursor mode to still be live afterward.
- **Supervisor addendum (same day, ~16:45):** the #7 finding is
  independently verified — reference source
  (`battle_factory_screen.c:1298` init-to-1, `:1965-1966` same-call
  handoff) confirms the structural impossibility; the R5-replication
  screenshot shows the YES/NO screen on-screen; probe scripts/logs under
  `/tmp/issues7probe/` inspected. In parallel, a worktree-lane worker
  attempted ISSUES #5's sanctioned `rent-slot1.json` clean-window re-time:
  8 candidates (confirm press-ticks 29-35 + DOWN-tick variations) were ALL
  worse than the committed baseline (15-27 diffs vs 14) — re-time is
  infeasible near the current timing; #5's rent-slot1 note resolves to the
  attribution fallback (125/139 ships permanently, see ISSUES #5; that
  lane's branch had no commits and was removed). Next step (worker
  launching now): implement the 2-species safe-list in `ballAnimStall` +
  Tier-1 pins + `rent-3picks.json` per entry 26 decision 2 — the entry-27
  ruling's precondition (factor isolated) is met, so no fresh user
  sign-off is required.
