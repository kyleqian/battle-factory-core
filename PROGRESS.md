# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 115 — Bounded worker: closed ISSUES #18's tick 1493 (bar composites at `eva=0`, not "skip drawing") — `sendout.json` **252/256 → 253/256**; 1494/95 (bar) + 1496 (particle tie-break) investigated with 6 fresh RAM probes, left open with concrete negative findings (no curve-fit)

- **State:** `npm test` **556/556** (+1 Tier-1), `npm run build` green, tree
  clean. Full sweep: sendout **253/256** (was 252/256), s6-acceptance
  224/228 (unchanged — its own sampled frames are 40/120/192, ISSUES #5's
  pattern, re-confirmed still exactly x88-151, + 1496, this session's own
  remaining residual; 1493 isn't one of its sampled frames), menu-throw
  78/78, menu-materialize 62/62, menu-idle 69/69, menu-text 18/18,
  scene-assembly 256/256, transition 206/206 — zero regressions.
- **Did:** pixel-classified 1493-96 first (`tools/compare/scratch/
  diag_1493.mjs`/`crop_1493.mjs`, committed): 1491/1492 already 0px (closed
  incidentally by #112/§7.30's earlier fixes, not realized until now);
  1493-95 is a clean diagonal edge, app=Grovyle's flat tint, oracle=the
  window's own faded background; 1496 is a literal 2-color swap between two
  particles. Executed §7.29's named VRAM-tile-bytes lead for 1493-95
  (`probe_grovyle_vram.py`/`probe_grovyle_palette.py`/`probe_bar_vram.py`,
  all committed): Grovyle's own tile/accumulator/y2/rotation/palette are
  ALL byte-exact vs. the static extraction across the whole window (a clean
  negative — not the bug); the bar's own tile IS byte-exact too, through
  RAM tick 1493, THEN jumps to a totally different graphic at RAM 1494
  (destroyed+reused, the exact `open.png` pattern recurring). The REAL bug
  was a compositing-model gap the VRAM read incidentally surfaced:
  `drawOpponentSummaryExit` returned early once `blend` hit 0, treating
  "no blend" as "sprite absent" — but real hardware still composites a
  `blend=0` sprite as 100% target-2 (the plain, correctly-faded background,
  hand-verified bit-exact against `SENDOUT_BG_FADE_Y`). Fixed by replacing
  the early return with `SUMMARY_EXIT_LAST_ALIVE_ELAPSED=30` (draw through
  blend=0, stop only once the RAM-confirmed sprite-reuse actually happens).
  Tried extending to render 1494 (bar's tile is STILL genuine there per the
  same VRAM probe) — empirically over-corrects (3 new wrong pixels), so
  left at exactly render 1493, not shipped wider than verified.
- **1496 (particle z-order, §7.25/7.28's long-standing gap)**: RAM-derived
  the pixel-exact tie-break winner from oracle colors (spawn index 14 must
  beat 13, opposite of this engine's current rule) and RAM-probed both
  particles' real `gSprites[]` array positions (`probe_particle_slots.py`,
  committed) to test the one cheap hypothesis (slot-reuse scrambling
  creation order) — ruled OUT (array order matches spawn-index order
  exactly, no scrambling found). Real mechanism likely lives in
  `CreateSpriteAtEnd`'s actual `sSpriteOrder` semantics, not read this
  session (out of RAM-probe budget) — named, not guessed at, in ISSUES #18
  and `docs/battle-scene-notes.md` §7.31.
- **New Tier-1 test** (`tests/battleScene.test.ts`) pins the render-1493
  fix: both newly-fixed pixels equal the faded background, plus a same-tick
  control pixel a few columns over that must STILL show Grovyle's tint.
- **Next:** ISSUES #18's remainder — 1494/95 (bar, narrower-than-modeled
  real boundary) + 1496 (particle tie-break, `sSpriteOrder`/
  `CreateSpriteAtEnd` source read needed) — both have concrete RAM findings
  recorded (§7.31), don't re-run the five clean RAM probes already done.
  S7 (turn resolution) otherwise unblocked whenever picked up.
- **Notes:** stayed within scope (`battleScene.ts`, `tests/
  battleScene.test.ts`, `docs/battle-scene-notes.md`, `ISSUES.md`,
  `PROGRESS.md`, `tools/compare/scratch/*`) per the brief. Seven new
  scratch scripts committed (3 JS pixel diagnostics + 4 Python RAM/VRAM
  probes, cited directly by §7.31's findings) since a future session
  picking up 1494/95/1496 should be able to re-run them without rebuilding
  from scratch. No PAPERCUT this session.

---
## 114 — Supervisor wind-down: session end 2026-07-19 ~06:00 — S6 chain COMPLETE and acceptance-trace-committed (`s6-acceptance.json` **224/228**, every diff attributed); `sendout.json` **214 → 252/256**; suite **477 → 555**; 15 verified worker steps across two lanes

- **State (verified this minute):** `npm test` **555/555**, `npm run
  build` green, tree clean at `b5a499e`, no worktrees, no unmerged
  branches. Trace suite (23 committed): s6-acceptance 224/228 (3 frames =
  ISSUES #5's user-settled WIN0V pattern, x88-151-verified; 1 frame =
  ISSUES #18's 3px particle z-order tick 1496), sendout 252/256 (open:
  1493-96 only, ISSUES #18), menu-text 18/18, menu-throw 78/78,
  menu-materialize 62/62, menu-idle 69/69, scene-assembly 256/256,
  transition 206/206, all draft/room/summary traces at their long-
  established counts. ROADMAP: S6 → **[~]** with recorded status (not [x]
  while #18's 4 ticks stand; RNG-exactness + opponent-pin criteria met).
- **Session summary (supervised, ~23:50-06:00, 15 worker steps + 7
  supervisor merges, every step verified green before folding):** built
  the ENTIRE player-send-out→action-menu window from zero — text print,
  Brendan throw + ball arc + first true-rotation affine sampler (ball
  spin), materialize (BG fade twin, particles, color-fade + settle
  wobble), healthbox slide-in (RAM-exact), atomic menu draw + closed-form
  idle (literal gSineTable — gbaSin is ±1 off at indices 62/63).
  Sendout climbed 214→252 via: silhouette-edge render-lag+y2 (§7.21),
  harvest-bleed mask + §7.22 re-apply (§7.23), late-window compositing
  move (§7.24), the ball's REAL 3rd frame (open.png runtime VRAM
  overwrite, §7.25), SortSprites Y-tiebreak (§7.27), OBJ-vs-OBJ blend
  target-2 hardware quirk (#112 — also closed menu-throw's 8 ticks), and
  tick 1462's twin mechanisms (§7.30). Two wrong models were falsified by
  RAM before shipping (§7.21 shared-root, §7.26 creation-order). ISSUES
  #17 opened+closed same session; #18 filed+trimmed to 1493-96.
- **Next:** (1) ISSUES #18's remainder — 1493-95 (§7.29's untested VRAM
  tile-byte lead) + 1496 (particle z-order) → then S6 → [x] (or user
  re-scope); (2) S7 begins: turn resolution (docs/battle-turn-notes.md /
  turn-resolution-notes.md groundwork exists), fold ISSUES #16's
  healthbox-assembly wiring + deferred partial-HP/status oracle
  validation into its first drain trace; menu-idle window's harvested
  base can be regenerated from the engine's own render now that the
  chain is complete (cheap cleanup, noted #110); (3) S4 remainder stays
  deferred behind S5-S8 per the recorded re-scope.
- **Notes:** no usage-limit events all session. Two battleScene.ts merge
  conflicts (both both-sides-additive, hand-resolved; one briefly
  committed with markers — caught by the immediate post-merge test run,
  amended, and PAPERCUTS-noted via the truncated-merge-output lesson).
  PAPERCUTS gained 2 entries (baseline-A/B-first; extractor drops
  grovyleFrontAnim). Worker cost ~\$7/step avg, 9-39 min/step.

---

## 113 — Bounded worker: closed ISSUES #18's first bullet — sendout tick 1462 (1161px, §7.19's named "settled-bar gap + trainer-exit tail") — both co-located mechanisms fixed — **sendout.json 251/256 → 252/256**

- **State:** `npm test` **555/555** (+1 net: 1 corrected + 1 new Tier-1),
  `npm run build` green, tree clean. Full battle-family sweep against the
  live oracle: sendout **252/256** (was 251/256), scene-assembly 256/256,
  transition 206/206, menu-text 18/18, menu-throw 78/78, menu-materialize
  62/62, menu-idle 69/69, s6-acceptance 224/228 (unchanged — 1462 isn't one
  of its sampled ticks), draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66 — zero regressions.
- **Did:** pixel-classified 1462's 1161px diff by bounding box first
  (`tools/compare/scratch/diag_1462*.mjs`, throwaway): 365px sat outside
  the trainer's 64x64 bbox (icon/bar row), 796px inside it — confirming
  §7.19's two co-located, non-overlapping mechanisms. **(a) Settled-bar
  gap**: `drawSendOutHandoff` skipped the opponent bar+icons entirely at
  `t===handoffTick` (`drawBallIcons` always passed `opponent:false`;
  `drawOpponentSummaryExit` gates on `elapsed>=0`, i.e. handoff+1) — fixed
  with the exact one-line call §7.19 already named:
  `drawBallIcons(fb, t, {opponent: t === handoffTick, ...})`, reusing the
  existing settled-render path. Closed 365px→0. **(b) Trainer-exit tail**:
  NOT a new mechanism — `trainerExitX`'s own already-RAM-probed table
  (`TRAINER_EXIT_X2`) skipped its own index 0 (`et<0` fallback to unshifted
  `OPPONENT_CORNER.x`), so render 1462 showed x2=0 instead of the RAM-true
  x2=2 (`sendout-trainer-exit2.json`'s `sprite4x2`, re-probed live: reads 2
  at RAM 1461, +1 render lag lands at render 1462). §7.19's own "invisible
  at the pixel level" call on this value was wrong — a real 2px OAM shift,
  confirmed independently by an exhaustive oracle-pixel dx/dy sweep
  (`shift_1462.mjs`) landing on the identical +2 before the RAM probe was
  even re-run. Fixed by prepending `2` to `TRAINER_EXIT_X2` and dropping
  the `-1` from the index (`et = t - handoffTick`) — pure index-shift, the
  destroy-cutoff tick (1499) unchanged (verified by hand). Closed 796px→0.
  Tick 1462 is now bit-exact.
- **One pre-existing Tier-1 test corrected**: `tests/battleScene.test.ts`'s
  "opponent party-summary despawn" test asserted
  `pixelAtSentOut(1493,...) === pixelAtSentOut(1462,...)`, which passed
  before only because BOTH ticks accidentally showed background under bug
  (a). With 1462 now correctly showing the icon's own settled color
  `(74,66,90)`, rewrote the test to pin the three ticks' literal
  oracle-confirmed colors instead of the since-invalidated relationship.
- **Next:** ISSUES #18's remaining bullets (1493-95 blended-edge tail,
  1496 particle z-order — both explicitly out of scope for this step,
  untouched); S6 acceptance stays [~] until those close.
- **Notes:** stayed within `src/engine/battleScene.ts` +
  `tests/battleScene.test.ts` + `docs/battle-scene-notes.md` (new §7.30) +
  `ISSUES.md` (trimmed #18's first bullet), per the brief. No new
  committed artifacts (reused `sendout-trainer-exit2.json`, already
  committed); scratch diagnostic scripts intentionally not committed, per
  this file's own throwaway precedent. No PAPERCUT this session.

---
## 111 — Bounded worker: closed ISSUES #17 (ONIX color-fade-to-true-color + settle wobble) — `menu-materialize.json` **12/12 → 62/62** (widened 1652-1663 to 1652-1741+samples), also found+fixed two pre-existing bugs it was masking — **the S6 chain (send-out → settled action menu) now has NO unimplemented window**

- **State:** `npm test` **550/550** (+5 Tier-1), `npm run build` green, tree
  clean. Full 23-trace sweep against the live oracle at #110's exact counts
  (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67, confirm-flow
  79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu 38/38,
  example 4/4, menu-idle 69/69, menu-materialize **62/62** (was 12/12),
  menu-text 18/18, menu-throw 70/70, rent-3picks 157/190, rent-slot1
  125/139, room-entry 110/110, room-msgbox 142/142, room-npcs 98/98,
  scene-assembly 256/256, sendout 246/256, summary-info-magby 132/132,
  summary-info-onix 122/122, transition 206/206, walk-warpout 125/125) —
  zero regressions.
- **Did:** RAM-probed the fade+wobble directly (new
  `tools/probe/specs/menu-player-materialize-taskfade.json`, a full
  `gTasks[0..15]` scan reusing `sendout-grovyle-taskfade.json`'s own watch
  shape, plus `gSprites[6].y2`), cross-validated a second, independent way
  (brute-force pixel decode against `battle1-menu-dense.json`, `tools/
  compare/scratch/menu-audit/decode_player_tint_scratch3.mjs`) — both agree
  at all 39 checked ticks. **Color fade**: `Task_FadeMon_ToNormal_Step`'s
  `tCoeff` (16→0) collapses to a clean closed form once the render lag is
  folded in — 16 constant through render 1675, then -1/tick, true color at
  1691 (`playerMaterializeSettleTintCoeff`, `battleMenu.ts`). **Settle
  wobble**: NOT `DoBounceEffect` (ruled out — wrong amplitude, wrong trigger
  window) — it's ONIX's own species back-sprite entrance animation
  (`BattleAnimateBackSprite`→`GetSpeciesBackAnimSet(SPECIES_ONIX) =
  BACK_ANIM_V_SHAKE`, source-confirmed), a genuine third mechanism exactly
  as `docs/battle-menu-notes.md` §3 item 5 warned — kept as a literal
  RAM-derived table (`PLAYER_SETTLE_WOBBLE_Y2_TABLE`) per this run's own
  convention for exactly this situation. Settles permanently at **1702**,
  independently matching PROGRESS #109's own corrected settle pin (two
  unrelated derivations, same tick). New `drawPlayerMaterializeSettle`
  (`battleScene.ts`) reuses the existing `drawSpriteSheetAffineStretch`
  primitive at the identity matrix purely for its palette+tintCoeff blend
  support.
- **Two pre-existing bugs found and fixed, both masked until now by the much
  larger ONIX-missing gap they happened to overlap**: (1) `brendanThrowFrame`
  used `null` for both "before the throw" and "table exhausted" (a "table
  truncated both ends" case) — `drawSendOutHandoff` conflated the two and
  redrew Brendan's settled on-screen pose at `PLAYER_CORNER` (48,48) once
  his own throw-frame table ran out (render 1690+), when the real game has
  him long gone off-screen; fixed by gating on `t < BRENDAN_THROW_START_TICK`
  directly. (2) `drawPlayerBallOpenParticles` never had its own upper tick
  cutoff (live through render 1692 already) but was missing the SAME
  one-tick RAM-stall correction (`PARTICLE_STALL_LOGICAL_TICK`/
  `PARTICLE_LATE_SPAWN_START_INDEX`) the opponent's own particle function
  already has — a prior session explicitly left it unported since the
  window's then-relevant range stopped short of where it mattered; porting
  it verbatim closed the remaining 104px→13px residual to 0.
- **Widened `tools/compare/traces/menu-materialize.json`**: `captureFrames`
  1652-1710 contiguous + 1720/1730/1741 samples (62 total; the 1702-1741
  hold is one sha per #109, a few samples suffice — `menu-idle.json` owns
  1742+) — **62/62 at 0 diff**. 5 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the coefficient ramp, the wobble table
  (incl. the 1693≡1700 phase match the docs' own sha comparison
  independently found), and 5 oracle-pinned pixel samples.
- **With this landed, the S6 chain has NO unimplemented window left**:
  `menu-throw.json` (1574-1651, 70/70) → `menu-materialize.json`
  (1652-1741+, 62/62) → `menu-idle.json` (1742-1810, 69/69) are contiguous
  and all 0-diff.
- **Next:** S6 acceptance trace (uniform grid, anchor→1810 — supervisor's,
  per the brief); remaining known polish, all pre-existing and unrelated to
  this step: menu-throw's 8 icon-exit ticks (§7.26's icon
  `eva`/`iconExitDx` lead, not a reorder), `sendout.json`'s 10 remaining
  ticks (1462, 1470/71/79, 1491-96 — opponent-side, the concurrent worktree
  lane's).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` + `ISSUES.md`
  (deleted #17), per the brief. New committed artifacts: `tools/probe/specs/
  menu-player-materialize-taskfade.json`, `tools/compare/scratch/menu-audit/
  decode_player_tint_scratch3.mjs`. Did not touch the opponent-side sendout
  internals (1491-96, concurrent worktree's) or `docs/battle-scene-notes.md`/
  `tests/battleScene.test.ts`. No PAPERCUT this session.

