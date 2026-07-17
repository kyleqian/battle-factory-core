# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 25 — S5 slice 2 (worker, capped, LAST of this supervised session): STOPPED before implementing a fix — ISSUES #7's "count-dependent" AND "first-event-only" stall hypotheses BOTH RAM-DISPROVEN this session with clean counterexamples; best remaining evidence points to a species-render-cost-dependent race (same class as ISSUES #5), not a clean state rule

- **State:** unchanged from entry 24 — `npm test` **264/264**, `npm run
  build` green, all traces untouched. **No `src/`/`tests/` changes this
  session, no commits to code** (docs-only commit for this entry + ISSUES
  update) — per the brief's own fallback ("if the rule STILL resists,
  commit nothing half-wired, update ISSUES #7, stop").
- **Did:** Ran the discriminating RAM probes entry 24 asked for (corrected
  `struct Sprite` offsets, cadence-transition method - `MOVING_CMDS`'
  4/8/32-tick durations are RNG-independent so an observed `duration+1` gap
  unambiguously means one stall landed there): a fresh 4-rent/6-cursor-move
  trace including a **consecutive** RIGHT at the same 1-active-ball count
  (no rent in between), plus an independent re-derivation of entry 24's own
  original repro shape to cross-check its RIGHT#2 finding rather than trust
  it at face value. Result: the consecutive-RIGHT data point disproves
  "count==1 always stalls" (2nd RIGHT at count=1, no rent between, does
  NOT stall); three later cursor moves (3rd/5th/6th of the session) DO
  stall, disproving "only the first-ever cursor move stalls." What fits all
  8 data points with zero exceptions instead: whether the cursor's
  **entering** slot's species is BAYLEEF (never stalls, 3/3 independent
  occurrences, both directions, two different origin slots) vs
  MAGBY/BUTTERFREE/HAUNTER (always stalls, 5/5). Plain string length
  doesn't explain it (BAYLEEF/HAUNTER are both 7 chars, opposite outcomes) -
  `Select_PrintMonSpecies` computes a variable-width-font pixel offset
  (`GetStringRightAlignXOffset`), a plausible render-cost-dependent hardware
  race, the same *class* of bug as ISSUES #5's WIN0V jitter (also
  root-caused, also not fixed at this engine's tick granularity) rather
  than a game-state formula. Full evidence table and reasoning: ISSUES #7
  ("fourth worker update").
- **Next:** per ISSUES #7's own "Status": determine whether this is
  actually testable further (RAM-read the render-cost-determining register/
  variable directly rather than inferring it from stall outcomes) or
  whether it's unmodelable like ISSUES #5 and should be closed out the same
  way (root-caused, documented, not fixed). Get sign-off before spending
  more session budget here - two consecutive sessions have now each found
  the prior session's "confirmed" rule wrong on closer data, so this issue
  needs either new investigative tooling or an explicit decision to accept
  it as an ISSUES #5-style permanent gap. Do NOT hardcode a per-species
  lookup as a substitute fix. `rent-3picks.json` remains blocked.
- **Notes:** All probing was scratch Python under `/tmp` (mGBA/
  `EmeraldOracle` recipe, not committed) - no `src/` edits were at risk of
  being lost. This is the last worker of this supervised session; state is
  resume-ready via this entry + ISSUES #7's "fourth worker update."
  PAPERCUT: none beyond the usual oracle round-trip overhead.

---


