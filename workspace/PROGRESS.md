# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1282 — [main worker, 2026-08-16] **Walk-up build step A, Brief 2 LANDED: postwin.ts AskSwapBeforeHead short path + soak driver brain-branch recognition; found + cataloged an unrelated post-brain-win opponent-generation crash (#91)**

- **State:** `docs/walkup-step-a-design.md` Brief 2 is built: a brain
  postwin's `GO ON` now skips the three ordinary scouting pages, types
  the JSON-exact "I'm terribly sorry, but I can't tell you anything
  about the FACTORY HEAD." one-liner (`dialoguePage` 1), then jumps
  straight to the swap YES/NO prompt (`dialoguePage` 4) — closing the
  gap Brief 1 left open. Every pre-existing `postwin.test.ts` assertion
  passes unmodified, plus 4 new tests (47 total). Full `npm test`
  **1044 files / 9939 passed / 223 skipped**, `npm run build`, and
  `npm run typecheck` green. Differential PASS (563/563 byte-identical,
  `--base 74013f83`, the merge before this step's first change).
- **Did:** (1) `postwin.ts`: new `POSTWIN_BRAIN_CANT_TELL_TEXT`
  (pulled from `askSwapBeforeHead` in the walkup-script JSON, never
  retyped) plus a structural "+2-after-settle" accept-ready delay
  (same convention Brief 1's call-scene boxes already use, explicitly
  flagged evidence-aligned-not-calibrated per the brief — no dense
  pixel compare attempted). `postwinDialogueVisibleChars`/
  `postwinDialogueInputReady`/`acceptPostwinDialoguePage` gained a
  `frontierBrain && dialoguePage===1` branch; the jump target is
  `dialoguePage=4` instead of `+1`. Page 4 itself (swap offer text,
  cursor, decline, "Right this way") is reused byte-for-byte unchanged
  for both routes — verified (not assumed) the default-YES cursor and
  the DOWN-swallowed-while-settling gating already fall out correctly
  from the existing `swapCursorPos===null`/`postwinDialogueInputReady`
  idiom, no new gating code needed. (2) `core.ts`: the battle-win-
  completion trigger (which advances the round controller /
  orchestrator) now fires off `dialoguePage===1` for brain instead of
  `===3` — **a real functional fix**, not just rendering: unchanged,
  a brain round would never advance past its first postwin. Also fixed
  two render branches that would have shown the ORDINARY route's text
  during brain's dialoguePage-1 typing and the lingering-old-text
  window at the 1→4 transition. (3) `tools/soak/randomRoundSoakDriver.ts`
  (:665-714 region): the call-scene/one-liner surfaces get explicit
  soak-log labels (they already advanced correctly via the pre-existing
  generic `pressAdvance` fallback); the continuation-menu and swap-offer
  blocks were already brain-route-agnostic (shared machinery), confirmed
  by tracing, not assumed — only the log label gained a `brain ` prefix.
- **Soak evidence (short runs only, per the brief's own house rule —
  each ~2-3s via `runSeed` in a scratch vitest probe, not committed):**
  a `factoryRoundBattleOrchestrator` seeded with `factoryWinStreak: 20`
  (battleIndex 0 immediately silver-brain-eligible) won battle 0 under
  both `strong-route` and `winning` policy across several `rngValue`s,
  then drove the **entire call-scene (all 5 boxes) and the
  `AskReadyForHead` GO-ON-menu accept with zero issues** — confirming
  this step's own new code. Immediately after, a **pre-existing,
  unrelated engine bug** (now `ISSUES #91`) fires: `core.ts`'s
  `preGenerateFactoryRoundNextOpponent` seam (triggered every `GO ON`,
  unconditionally, to pre-generate the next opponent) throws
  `storedTrainerIds must contain the 1 prior battle selections` in
  `factoryTrainerSchedule.ts`, because a Frontier-Brain opponent
  generation never appends its own `storedTrainerIds` history entry.
  This blocks live-reaching `AskSwapBeforeHead`'s own one-liner content
  via a real soak win (it fires one tick before `dialoguePage` would
  advance to 1) — filed as `ISSUES #91` with full repro/root-cause,
  **not fixed** (out of scope: `factoryRoundBattleOrchestrator.ts`
  opponent-generation logic, not `postwin.ts`/soak-driver). The short
  path's own sequencing is still fully proven at the Tier-1 level
  (below), independent of this blocker.
- **Acceptance numbers:** 4 new Tier-1 tests in `postwin.test.ts` pin:
  the one-liner text against the JSON verbatim (incl. the shared swap-
  ask text, byte-identical between routes), the `dialoguePage` 1→4
  jump (skipping 2/3) with its input-gate boundary, the swap prompt's
  default-YES + input-gated-until-settled behavior converging into the
  unchanged decline/dismiss/handoff flow, and an explicit ordinary-
  route-unchanged (1→2→3→4) sanity check. Full `npm test`
  **1044/9939/223**; build + typecheck green; differential **PASS,
  563/563 byte-identical**. `executableFrontierRatchet.test.ts` barrier
  counts: **unwidened**.
- **Next:** `ISSUES #91` (post-brain-win `storedTrainerIds` fix, in
  `factoryRoundBattleOrchestrator.ts`/`factoryTrainerSchedule.ts` —
  blocks live soak reachability of `AskSwapBeforeHead`'s one-liner and
  any battle after a mid-round brain win); dense oracle calibration of
  step A's brain-specific timing once the side lane's fixtures are
  banked; the B1c mid-ramp pixel residual; gold entrance/speech.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT:
  the soak-driver reachability investigation (tracing exactly when
  `round.rules.currentOpponent` advances relative to the postwin flow)
  took a large share of this step's budget before an empirical probe
  settled it faster than the static source trace — worth remembering
  that `runSeed()` + a scratch vitest file is the fast path for this
  class of "what does the state machine actually do" question.

---

## 1281 — [main worker, 2026-08-16] **Walk-up build step A, Brief 1 LANDED: postwin.ts brain call-scene + AskReadyForHead menu (Tier-1 + differential; dense oracle calibration deferred as scoped)**

- **State:** `docs/walkup-step-a-design.md` Brief 1 is built: `postwin.ts`'s
  state machine now has a `frontierBrain`-gated branch inserted after the
  shared heal line, replacing the ordinary route's direct fall-through
  into the continuation menu. Non-brain path untouched — every existing
  `postwin.test.ts` assertion passes unmodified, plus 4 new tests (43
  total). Full `npm test` **1044 files / 9935 passed / 223 skipped**,
  `npm run build`, and `npm run typecheck` green. Differential PASS
  (below). No oracle evidence attempted this step, per the brief's own
  scoping (Tier-1 + differential only; a side-lane worker is banking
  dense fixtures in parallel for a later calibration step).
- **Did:** (1) `PostwinState` gained `frontierBrain`/`callScenePage`
  (0-5)/`callScenePageEdgeElapsed`/`callSceneDismissElapsed`.
  `createPostwinStateFromRound` derives `frontierBrain` from the
  upcoming opponent's `frontierBrain` field alone (memo §2.2; `.status`
  tier not needed) — no call-site signature change needed. (2) The
  5-box call scene (phone SE wait message / attendant-return message /
  3-page boss message) is pulled **directly from
  `factory-brain-walkup-script.json`** at module load (import + `.split`,
  same idiom `battleRoom.ts`'s silver-speech box queue already uses) —
  never retyped, including the apostrophe-normalization convention
  (`facility's` → `facility’s`). Each box advances on A via
  `acceptPostwinCallScenePage`, mirroring `dialoguePage`'s own index
  convention. (3) `AskReadyForHead` reuses `continuationCursorPos`/
  `acceptPostwinContinuation`/`beginPostwinQuestion`
  **completely unchanged** — only `postwinNextVisibleChars`/
  `postwinContinuationInputReady`/`advancePostwin`'s `menuVisible` gain a
  `frontierBrain` branch computing the prompt's own visible-chars/menu-
  visible/menu-ready timing from the call scene's own dismiss edge
  instead of `healDismissElapsed` (RECORD/REST/RETIRE therefore carry
  over verbatim with zero new code, confirming the design memo's §3
  RESOLVED note). (4) `core.ts` wired: input routing for call-scene A-
  presses (mirrors the existing scouting-page 1-3 wiring) and minimal
  rendering (call-scene box text via the existing `drawLines` helper;
  the AskReadyForHead multichoice window's visibility gate branches off
  the call scene's own dismiss edge instead of `healDismiss` directly).
  **Timing honesty:** every new delay constant reuses this file's own
  established MSGBOX_DEFAULT conventions (4-tick first-glyph delay,
  +2-after-settle accept-ready, the same "+4 visible/+5 ready after
  settle" shape `POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY`/
  `_INPUT_READY_DELAY` already derive) rather than inventing new
  numbers — structural defaults, explicitly flagged as NOT
  independently oracle-measured for this window (module-doc comments
  cite this, matching the `SPEECH_APPEAR_ELAPSED`-was-an-unmeasured-0
  precedent). Attendant walk-away/return movement is not separately
  timed (folded into the box-to-box transition, same simplification
  `battleRoom.ts`'s own brain-speech box queue documents for its own
  unmeasured window) — a presentation-only gap, not a state-machine one.
- **Acceptance numbers:** New Tier-1 tests (4, in `postwin.test.ts`)
  pin: `createPostwinStateFromRound`'s brain-flag derivation (both
  true/false), `CALL_SCENE_BOX_TEXTS`/prompt text against the raw JSON
  byte-for-byte, the full box-by-box index/text-transition walk through
  all 5 boxes into `AskReadyForHead`'s menu (incl. an early-A-swallowed
  check and a RETIRE-still-works check), and an explicit ordinary-path-
  unchanged sanity check. Differential
  (`compare:differential room-entry.json battle2-room-a.json
  s6-acceptance.json --base HEAD^`) → **PASS, 563/563 byte-identical**.
  Full `npm test` **1044/9935/223**; build + typecheck green.
  `executableFrontierRatchet.test.ts` barrier counts: **unwidened** (no
  new `unsupportedBranch(...)` call sites added).
- **Not built this step (by design, per the brief):** `AskSwapBeforeHead`
  's short path past GO ON (Brief 2 — a brain postwin selecting GO ON
  today falls through to the ordinary scouting-page 1-3 content, a
  known documented gap, not a crash); the soak driver's brain-branch
  exercise (also Brief 2); any brain-specific RETIRE bookkeeping
  (explicitly out of scope per memo §3); dense oracle pixel calibration
  of the call-scene/menu window (blocked on the same `BattleLab.
  prepare()` staging gap the memo's §4 flagged, now fixed per harness
  commit 3e29880b — reachable, but calibrating against it is scoped to
  a later step, not this one).
- **Next:** Brief 2 (`AskSwapBeforeHead` short path + soak driver
  update); dense-oracle calibration of step A's brain-specific timing
  once the side lane's fixtures are banked; the B1c mid-ramp pixel
  residual (`battleRoom.ts` module doc); gold entrance/speech.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT:
  none new this session.

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
