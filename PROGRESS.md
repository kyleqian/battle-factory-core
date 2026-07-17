# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 27 — S5 slice (worker, capped, LAST of today): STOPPED before implementing — the supervisor-sanctioned ISSUES #7 species-only stall table was RAM-DISPROVEN by a clean counterexample (HAUNTER stalls at one count/direction/origin, does not at another); no code change made, per the brief's own explicit stop condition

- **State:** unchanged from entry 26 — `npm test` **264/264**, `npm run
  build` green, working tree clean before this docs-only commit. No
  `src/`/`tests/` changes this session. All 8 traces (incl. `rent-slot1.json`
  125/139) untouched; `rent-3picks.json` still not built (remains blocked).
- **Did:** Followed the brief exactly through step 1 (probe before
  implementing). RAM-probed the two previously-unprobed species (ONIX,
  QUILAVA - both now confirmed **stall**, first-time data) and re-validated
  BAYLEEF (4th confirmation, still **no stall**) and HAUNTER at a new count/
  direction/origin than previously probed. Method: `EmeraldOracle` +
  corrected `struct Sprite` offsets (same as ISSUES #7's third/fourth
  updates), `ballSpriteId` read directly from
  `sFactorySelectScreen->mons[i].ballSpriteId` rather than assumed, two
  scripts each with exactly **one** active ball throughout (removes all
  multi-ball composition ambiguity), cadence-transition gaps cross-checked
  against 6-8 clean neighboring transitions per run before trusting any
  single reading. **Result: HAUNTER stalls at (count3, RIGHT, origin slot3 -
  prior data) but does NOT stall at (count1, LEFT, origin slot5 - this
  session's fresh probe)** - same entering species, opposite outcome,
  directly falsifying "the entering slot's species alone determines the
  stall." Per the SANCTIONED APPROACH's own explicit instruction ("if ANY
  probe contradicts the species-only rule, STOP, write the contradiction
  into ISSUES #7, do not implement"), stopped immediately - no
  `ballAnimStall` code change, no per-species table, no Tier-1 test, no
  `rent-3picks.json` work attempted. Full evidence table and reasoning:
  ISSUES #7 ("fifth worker update").
- **Next:** ISSUES #7 needs a fresh policy decision before more session time
  goes into it - this is now the *second* consecutive sanctioned/"confirmed"
  rule for this issue that broke on the next data point (species-only
  table, then this). Options queued in ISSUES #7's "Next session" note:
  (a) one more round of targeted single-ball isolated probes (cheap, ~15-20
  min each, this session's method) to find the actual missing variable
  (direction/origin/count in combination with species); (b) revisit the
  pre-simplification "fourth worker update" render-cost-race theory
  (`GetStringRightAlignXOffset` pixel-width timing); (c) accept it as an
  ISSUES #5-class permanent gap (root-caused, not fixable at this engine's
  tick granularity) and ship without `rent-3picks.json`. Whoever holds
  entry 26's user-delegated authority for #7 should pick before the next
  worker spends more budget here.
- **Supervisor ruling for the next session (user-delegated authority,
  2026-07-17 ~15:50 — binding unless the user overrides):** take entry
  27's option (a), with a required method change: **minimal-pair probe
  design only** — every new probe must differ from a known data point in
  exactly ONE variable (species, direction, origin slot, active-ball
  count, ball phase). Start from HAUNTER's contradiction pair
  (count3/RIGHT/origin3 = stall vs count1/LEFT/origin5 = no-stall):
  probe (count1, RIGHT, origin3-equivalent), then (count3, LEFT), etc.,
  until the second variable is isolated; then key the empirical stall
  table on the surviving factor set and proceed per entry 26's decision
  2 (implementation + Tier-1 pins + rent-3picks.json). Both prior rule
  collapses came from multi-variable probe jumps, not from the empirical
  approach. If the factor set still resists after ~5-6 minimal pairs,
  fall back to entry 27's option (b) (probe the render-cost determinant
  directly in RAM) before any thought of (c) — (c) would leave the RNG
  stream unpredictable after any cursor-move-with-rented-ball, which
  effectively blocks S5's exit trace and is a mission-level concession
  the user should make explicitly, not a default.
- **Notes:** all probing was scratch Python/TS under `/tmp` (not committed,
  per instructions) - no `src/` edits were ever at risk. This is the last
  worker of today's session; state is resume-ready via this entry + ISSUES
  #7's "fifth worker update". PAPERCUT: none beyond the usual oracle
  round-trip overhead; worth noting for future RAM-probe sessions that a
  pure-`gRngValue`-only comparison (no sprite-field reads) is a trap for
  this specific kind of test - a 1-tick stall only shows up in `gRngValue`
  at the exact tick a decision-point (`Random()`) draw lands on, not in a
  cumulative/far-future sample, so sparse `gRngValue`-only sampling silently
  under-detects stalls; the sprite-cadence method (direct `animCmdIndex`
  transition gaps) used by prior sessions is the reliable one and should be
  the default, not a fallback.

---

## 26 — Supervisor wind-down: session end 2026-07-17 ~15:20

- **State (verified this minute):** `npm test` **264/264**, `npm run build`
  green, working tree clean. Traces: `anchor` 1/1, `draft-cursor` 13/13,
  `draft-menu` 38/38, `draft-menu-slot6` 66/66, `summary-info-onix`
  122/122, `summary-info-magby` 132/132 — all 0 diff — and `rent-slot1`
  125/139 (gap 100% attributed to ISSUES #5). ROADMAP: S1-S3 [x], S4 [~]
  (slice 1 closed, remainder deferred behind S5 by supervisor re-scope),
  S5 [~], S6-S9 [ ] with heavy groundwork banked.
- **Session summary (supervised, ~10:54-15:20):** 9 main-lane worker steps
  + 7 worktree-lane steps, all verified. Landed: MAGBY summary trace (S4
  "≥2 slots" met); RENT/DESELECT + single-ball rock/idle RNG-exact
  (`rent-slot1.json`); ISSUES #5 root-caused (WIN0V cycle jitter,
  unmodelable at tick level — POLICY QUESTION TO USER, still open);
  multi-ball stall model (ISSUES #6 fixed: text-print stall) + two latent
  ballAnim timing bugs; post-confirm cursor-input gate fixed
  (`isCursorInputReady`); species-name-breathe rule pinned (no model
  needed under 105 cursor-mode ticks). Groundwork merged: moves/exp/items
  data, pre-battle-room scene (composite-verified 0/38400px), S6
  battle-bringup dossier + battle-1 assets + all 12 transition variants,
  S5 confirm-flow dossier, S7 turn-1 ground truth (RAM-truthed damage/
  order/HP-drain). Two PAPERCUTS entries added.
- **DECISIONS (user delegated to supervisor, 2026-07-17 ~15:10):**
  (1) ISSUES #5 policy: 0-diff stays the bar; re-time committed traces
  into jitter-clean windows where feasible; otherwise ship with every
  non-matching frame individually attributed to #5's documented pattern.
  #5 is now a settled policy note, not an open bug. (2) ISSUES #7:
  continue as DATA-DRIVEN empirical modeling (per-species stall table,
  context-validated via RAM probes) — the "no per-species lookup" guard
  is overruled because this race perturbs the RNG stream (unlike #5's
  pixel-only jitter) and must be exact for the S5-exit→transition path;
  an oracle-derived table has the same epistemic status as the engine's
  other pinned empirical constants. Supervisor's own width check
  sharpened this: ALL uppercase glyphs are 6px in font-normal, so
  name/category pixel-width and char-count theories are ALL dead
  (BAYLEEF total 11 chars sits between stalling HAUNTER 10 and MAGBY
  14); and every "count-dependent" data point is species-confounded
  (each non-stalling move entered BAYLEEF) — species alone may be the
  entire cursor-move rule.
- **Next:** worker in flight implementing the per-species stall table +
  rent-3picks.json; then confirm-flow implementation
  (docs/confirm-flow-notes.md), exit sequence
  (docs/prebattle-room-notes.md), S6 off its dossier + assets.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  parallel worktree lane ran 6 extraction/scout steps concurrently with
  zero merge conflicts.

---


