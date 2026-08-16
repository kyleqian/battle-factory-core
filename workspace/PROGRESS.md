# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1280 — [main worker, 2026-08-16] **Walk-up build step B1c: brainMoving walk/pan cadence re-derived from a fresh RAM probe (fixture 03: 43/256 → 162/256 exact); a smaller, honestly-flagged mid-ramp pixel residual remains**

- **State:** B1b's own diagnosis (`entryStep`'s per-tick table doesn't
  reproduce this branch's cadence) is now known to have been wrong: RAM
  shows the decoy/camera in this window follow the EXACT same per-tick
  shape as `ENTRY_STEPS`, just re-based onto a different zero point (a
  new `BRAIN_MOVEMENT_CLOCK_OFFSET` constant, 22, RAM-measured). Full
  `npm test` (1044 files / 9931 passed / 223 skipped), build, and
  typecheck green. Differential PASS. A smaller mid-ramp pixel residual
  remains and is flagged honestly (not relabeled measured) per this
  step's own acceptance rule.
- **Did:** (1) `tools/probe/probe-factory-brain-silver-entrance-movement-
  ram.py` — reads `gTotalCameraPixelOffsetY`/`gSprites`/`gObjectEvents`
  directly (same offsets S6 slice 2a already established) every frame
  896-1151 of the committed dense fixture 03, not pixel curve-fitting.
  Findings: pan is flat through frame 959, then a clean 1px/tick ramp to
  80 by frame 1039, settling one tick later (1040) — the identical shape
  `ENTRY_STEPS` already encodes, just starting 22 ticks later in that
  table (the ordinary path's own leading 23-flat-tick stall is a warp
  fade-in artifact, irrelevant to this msgbox-close-triggered window).
  Noland's own `nolandStep` formulas (screenY 24 flat, then
  `24 + (camPanY - 48)`) were ALREADY correct — only the elapsed value
  feeding `entryStep`/`scientistTurnFrame`/`nolandStep` was wrong; fixed
  by shifting at the `renderBattleRoomBrainEntranceScene` call site
  (`historicElapsed = movementElapsed + BRAIN_MOVEMENT_CLOCK_OFFSET`),
  not inside those pure functions (kept reusable/unchanged for the
  ordinary path). (2) Separately found and fixed: `SPEECH_APPEAR_ELAPSED`
  (`brainSettled` → `brainSpeech` handoff) was an unmeasured structural 0;
  RAM/pixel evidence measured it at 5 (the speech box was appearing 5
  ticks before oracle's real one, a distinct mismatch the walk/pan bug
  had been masking). (3) The compare trace itself
  (`factory-brain-silver-walkup-entrance-03-off.json`) had its own bug:
  its A-press landed ~20 ticks before oracle's real dismissal point (a
  B1b tuning artifact) — corrected its segment counts (314/1/196).
  (4) Updated 4 existing Tier-1 assertions in
  `tests/battleRoomBrainEntrance.test.ts`/`battleRoomBrainSpeech.test.ts`
  that called `nolandStep`/`entryStep`/`scientistTurnFrame` with the
  now-two-clocks-conflated raw `BRAIN_MOVEMENT_SETTLE_ELAPSED`, plus new
  tests pinning `BRAIN_MOVEMENT_CLOCK_OFFSET` itself against the RAM
  samples (elapsed 1/71/80 → pan 1/71/80).
- **Not closed — honest residual:** fixture 03 improves from a broad
  ~26-65% full-frame mismatch to a bounded ~5-13%-of-frame residual
  confined to the mid-ramp window only — **162/256 frames now exact
  (up from 43/256)**; every frame before the ramp and every frame once
  the room is genuinely settled (including all of B2's speech content)
  is exact. Direct RAM cross-checks at multiple ramp ticks (not just the
  endpoints) show `camPanY`/decoy-animation/Noland-position all matching
  oracle's real RAM exactly at those ticks — yet the rendered pixels
  still diverge mid-ramp. Cross-correlating diff frames against a pure
  vertical shift finds a best-fit +1px offset with only ~98-99%
  background-tile agreement (not 100%), and retrying
  `BRAIN_MOVEMENT_CLOCK_OFFSET` at 21/23 both regressed the overall
  match count — so it isn't a uniform clock-offset or simple render-lag
  fix. True mechanism undetermined; full detail + a concrete next-probe
  suggestion (`gSpriteCoordOffsetY`/OAM-buffer state across the ramp) in
  `battleRoom.ts`'s own module doc (search "Walk-up build step B1c").
- **Acceptance numbers (this step's own gate):** fixture 03
  `--summary` → **162/256** (was 0/256 effectively, honest residual
  remains, not closed). Fixture 02 `--summary` → **256/256** (unmoved).
  All 4 B2 speech windows `--summary` → **39/39, 39/39, 74/74, 28/28**
  (unmoved). Downstream reveal `--summary` → **690/701** (unmoved, the
  known #87 residual). Differential (`room-entry.json battle2-room-a.json
  s6-acceptance.json --base HEAD^`) → **PASS, 563/563 byte-identical**.
  Full `npm test` **1044 files / 9931 passed / 223 skipped**; build and
  typecheck green.
- **Next:** re-derive the remaining mid-ramp sub-tile residual (probe
  `gSpriteCoordOffsetY`/OAM state directly, not `camPanY` alone) if a
  future step's time budget allows; walk-up step A per
  `docs/walkup-step-a-design.md`; gold entrance/speech (oracle-blocked,
  see PROGRESS-archive.md 1279's own notes on the `BattleLab.prepare()`
  call-scene gap).
- **Notes:** Commits local only — pushing is Kyle's step.
  PAPERCUT: none new this session.

---

## 1279 — [supervisor wind-down, 2026-08-15] **B2 LANDED (silver Noland speech, four dense windows EXACT) + session wind-down: every 1274 queue item advanced, all gates green, full soak 60/60, DEFERRED empty**

- **State:** Session over (12 worker steps, 2 lanes). The silver
  walk-up is BUILT end-to-end from the BattleRoom entrance through the
  8-page speech, battle-cry, and battle handoff. Whole 1274 queue
  advanced: #89 FIXED, #90 FIXED, #87(c) EXECUTED, walk-up B1/B1b/B2 +
  step-A design, parity plan + steps 1-3. DEFERRED.md EMPTY.
- **B2 (cap-killed at its own ledger edit; tree clean, both feature
  commits landed — supervisor verified + wrote this entry):** silver
  speech machine in `battleRoom.ts` (JSON-verbatim 8 pages + battle-cry
  + repeat variant), per-tier in-session heard-flag
  (`factoryHeardBrainSpeech`/`markFactoryBrainSpeechHeard`, facility
  state), handoff into the existing brain battle start; compare-harness
  extension + 4 committed speech traces. Supervisor re-ran all four on
  the final tree: **39/39, 39/39, 74/74, 28/28 — exact**; downstream
  reveal window re-checked **690/701** (unmoved); differential 228/228
  byte-identical; apostrophe + wait-cursor renderer fixes landed with
  their windows.
- **Wind-down gates (final union, after folding animation-main — Dream
  Eater 187→189 exact incl. Leech Seed — and rust-main — weightdamage +
  tryhealhalfhealth + Pain Split leaves):** full npm **1,040 files /
  9,915 passed / 223 skipped**; build green; cargo **73** ok-suites;
  wasm rebuilt **492,683 B** `782c1b2a…`; forced-WASM **18 files / 803
  tests**; soak vanilla **20/20 OK**; soak full 0:60 **60/60 OK**
  (the standing gates). Informational: new opt-in `winning` policy
  0:60 = 59/60 + seed 49 budget-HANG at 600k — completes OK at
  693,051f with a bigger budget (deep chains legitimately run long;
  policy is opt-in, pass `--max-frames`; not an engine bug).
- **Next (ordered):** (a) Noland brainMoving walk/pan cadence residual
  (~frames 961-1112; documented in `battleRoom.ts` module doc) — fresh
  RAM/pixel derivation; (b) walk-up step A per
  `docs/walkup-step-a-design.md` (dispatchable; RETIRE question
  resolved from source — postwin semantics carry over verbatim);
  (c) gold entrance/speech (source-pinned, oracle-blocked, see Notes);
  (d) parity plan step 4 (deferred-by-design memo) + wider winning-
  policy sweeps as supervisor calls.
- **Notes:** **Recommendation for Kyle:** the top-layer
  `BattleLab.prepare()` brain staging gap (writes no symbol flags +
  fresh-draft fallthrough skips the PreBattleRoom call-scene, silver
  AND gold — RAM-probed, `docs/noland-silver-walkup-presentation-map
  .md`) blocks ALL oracle acceptance for the call-scene and gold
  content; fixing it oracle-side before step A ships is the honest
  order. Two open questions recorded there and in the step-A memo; no
  DEFERRED.md blockers. Launcher now seeds worktrees with the wasm
  artifact (papercut retired). Commits local only — pushing is Kyle's
  step.

## 1278 — [main worker, 2026-08-15] **Walk-up build step B1b: app-side room-entrance compare harness built + 2 of 3 flagged constants MEASURED (fixture 02 closes 256/256 exact); fixture 03's walk/pan window left an honest, un-closed residual**

- **State:** B1's oracle-dense-compare debt (flagged in 1277) is
  partially retired. The harness now exists and is re-runnable; two of
  the three flagged constants are genuinely dense-compare-measured.
  The third (`NOLAND_INITIAL_SCREEN_Y`/`nolandStep`'s walk-cadence
  reuse) is **not** closed and is **not** relabeled — per this step's
  own acceptance rule, an honest residual beats a false "measured".
  Full `npm test` (1029 files / 9871 passed / 223 skipped), build, and
  typecheck green; differential PASS.
- **Did:** (1) `generatedRoundBattle7NolandRoomEntranceStage`
  (`tools/compare/factoryRoundIntroGeneralizationStage.ts`) — the same
  seed-70/challenge-2 Battle-7 staging `generatedRoundRevealProofStage`
  uses, stopped at the real `battleRoomStateForOpponent()` seam
  (core.ts's postwin→prebattleRoom→battleRoom handoff, d60ca1b3)
  instead of jumping past the room. A synthetic `postwin` parked in
  `postwinPhase`'s terminal "counterRoom" bucket with
  `rightThisWayDismissElapsed` set satisfies `renderPostwinState`'s own
  precedence gate so it steps aside for `battleRoom` — no postwin
  dialogue replayed. Two new compare traces
  (`tools/compare/traces/factory-brain-silver-walkup-entrance-0{2,3}-
  off.json`) replay the committed dense fixtures (`docs/noland-silver-
  walkup-presentation-map.md` §5) against it. (2) **Calibrated against
  fixture 02 (closes 256/256 exact):** `BRAIN_MSGBOX_APPEAR_ELAPSED` 0→
  **24 MEASURED** (the box doesn't appear at all until the room's fade-
  in settles, not concurrently with it); new `NOLAND_IDLE_FRAME` constant **0
  MEASURED** (Noland faces the player before his own walk starts, not
  the decoy's own north-facing idle frame `nolandStep` was reusing for
  him — `renderBattleRoomBrainEntranceScene` now only calls
  `nolandStep` during `brainMoving`/`brainSettled`). Also found: fixture
  02's own first captured frame is elapsed 0's true anchor (fade ramp
  24,24,57,…,255 pixel-sampled to start exactly there), a more precise
  anchor than the tick-520-relative numbering the rest of the module
  doc uses for the other reference trace. (3) Differential
  (`compare:differential room-entry.json battle2-room-a.json
  s6-acceptance.json --base HEAD^`): **PASS, 563/563 byte-identical**
  — the ordinary path didn't move. (4) Re-checked
  `factory-round-battle7-noland-reveal-off --summary`: still
  **690/701** (downstream window, untouched as expected).
- **Not closed — honest residual:** fixture 03's `brainMoving` window
  (Noland/decoy walk + camera pan, ~103 elapsed ticks from box-close
  dismiss to shortly before settle) still mismatches substantially
  (up to ~26% of pixels) against fresh dense-compare evidence.
  `entryStep`'s per-tick table (built for the ordinary path's own
  decoy-only walk) doesn't reproduce this branch's simultaneous
  Noland+decoy cadence reused verbatim; a phase-shifted reuse was tried
  and made the mismatch *worse*, so the real schedule isn't simply a
  shifted `ENTRY_STEPS` and needs its own RAM/pixel derivation.
  `NOLAND_INITIAL_SCREEN_Y` (24) therefore stays the prior algebraic
  guess. `BRAIN_MOVEMENT_SETTLE_ELAPSED` (108) is comparatively
  well-supported (the residual's far boundary — oracle's real
  speech-box onset, B2's unimplemented job — lines up with this
  constant's predicted `brainSettled` entry within a few frames) but
  wasn't independently re-derived either. Full detail in
  `battleRoom.ts`'s own module doc (search "Walk-up build step B1b").
- **Next:** re-derive the brainMoving walk/pan cadence from fresh
  RAM/pixel evidence (fixture 03) before B2's speech work builds on
  this seam; B2 (silver/gold speech) itself; chained-round
  distribution-parity breadth.
- **Notes:** Commits local only — pushing is Kyle's step.
