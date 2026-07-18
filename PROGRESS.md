# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 58 — S6 scene-assembly engine slice: settled scene/text/cursor/ball-widgets byte-exact; BattleIntroSlide3 streak (1075-1226) and ball-widget entrance slide (1230-1291) BLOCKED, not byte-exact — partial deliverable, honestly reported

- **State:** `npm test` **407/407** (390→407, +17 `tests/battleScene.test.ts`),
  `npm run build` green. New `src/engine/battleScene.ts`, wired into
  `core.ts` as a new top-level scene mode (handoff from `battleRoom`'s
  "settled" phase at elapsed 197 = trace tick 1040, matching the brief's
  convention). New trace `tools/compare/traces/scene-assembly.json` (34
  segments truncated to 1295 frames, 256 every-frame captures 1040-1295)
  — `npm run compare` gives **42/256, NOT the required 256/256** (see
  below). All 17 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did:** (1) black hold 1040-1074 exact. (2) the **settled composite**
  (tick 1227 onward) is **byte-exact** (0/38400): `battle-bg.json`'s
  `static` bg at scroll (0,0) + `trainer-pic-bug-catcher.json` at corner
  **(144,8)** + `trainer-pic-brendan-back.json` frame 3 at corner
  **(48,48)** + `battle-window.json`'s bg0 tilemap at scroll (0,0) —
  confirmed twice independently: brute-force pixel search AND a fresh
  source derivation (`battle_controller_opponent.c:1306-1313`/
  `battle_controller_player.c:2317-2318`'s `xPos/yPos` formulas +
  `CalcCenterToCornerVec`'s `(-32,-32)` for a 64x64 OAM shape — both
  agree exactly). (3) text print cadence, the wait-cursor's 4-phase/
  36-tick bob, and the party-ball widgets' **final settled** positions +
  the previously-undrawn `ball_status_bar` diagonal-bar background
  (corner `(-24,40)` h-flipped opponent / `(136,96)` player, both found
  by brute force, 212/212 exact each) are all byte-exact — frames
  1227-1229 and 1292-1295 match with 0 diff. Fixed one wrong formula
  along the way: the down-arrow cursor's dest-Y is `137 - offset`, not
  `135 + offset` as `docs/battle-interface-assets.md` states (numerically
  different, empirically re-derived this session against 4 oracle ticks).
- **BLOCKED (honest, not improvised around):** (a) the `BattleIntroSlide3`
  per-scanline shift + BLDALPHA blend window (**ticks ~1075-1226**) is
  NOT byte-exact. `docs/battle-scene-notes.md` §2's described mechanism
  (WIN0V vertical-window growth, data[2] per-scanline horizontal shift,
  BLDALPHA cross-fade) does not reproduce real pixels when implemented
  as literally described — this session confirmed via direct pixel
  brute-forcing that the vertical window keeps growing past the
  dossier's claimed tick-1106 stop (a 4px/tick second phase through
  ~1119), and that a plausible shift+blend model (fixed-vs-shifted
  `static` bg, standard BLDALPHA formula) converges to the exact settled
  frame by 1227 but is wrong through most of 1075-1180 — `shiftTop`/
  `shiftBottom`/`windowRange`/`evaEvb` in `battleScene.ts` are this
  session's best-effort empirical fit, documented as NOT verified, not
  asserted correct. (b) the party-ball widgets' entrance slide (**ticks
  ~1230-1291**) is not modeled (hidden until settled tick 1292) — the
  groundwork itself already flagged this as unresolved, not a new gap.
- **Next:** RAM-probe (`tools/probe/ram-probe.py`) `gScanlineEffectRegBuffers`/
  `BLDALPHA`/`WIN0V` directly per-tick through 1075-1226 instead of
  continuing to blind-fit pixels; also check whether OBJ (trainer
  sprites) are themselves blend targets (`BLDCNT` lists
  `TGT2_BG3|TGT2_OBJ`) rather than drawn full-bright as this session's
  model does. Then derive the ball-icon entrance-slide timing
  (`CreatePartyStatusSummarySprites`'s own slide, likely a linear `x2`
  step like `SpriteCB_TrainerSlideIn` — not checked against source yet).
- **Notes:** PAPERCUT: none new. Most of this session went into
  reverse-engineering pixel mechanics by brute force because the
  groundwork dossier's described register semantics didn't reproduce
  byte-exact pixels when implemented literally — a future session should
  RAM-probe directly through the streak window rather than iterate
  blind against pixels alone.

---

## 57 — S6 groundwork (parallel worktree lane, merged): battle-interface assets extracted byte-exact (ball_display + down_arrow wait-cursor); new files only

- **State:** merge of `worker/wt-20260718-110943` (single commit `29f7840`)
  on top of #56; `npm test` **390/390** + `npm run build` green on the
  merged result. New: `tools/extract/extract-battle-interface.ts`,
  `src/assets/gen/battle-interface-ball-display.json` +
  `battle-interface-down-arrow.json`,
  `tools/compare/traces-groundtruth/battle-interface-assets.json` (137
  captures, ticks 1284-1420), `docs/battle-interface-assets.md`.
- **Did (worker, supervisor-verified):** (1) ball_display.png (party-
  status ball icons, Full/Empty/Fainted/Statused) extracted with its own
  embedded palette; screen positions derived from
  `CreatePartyStatusSummarySprites`' formulas + the sprite
  center-to-corner (-4,-4) convention; **1590/1590 px exact** across 12
  icons × 5 ticks; entrance slide settles at tick 1292 exactly. (2) the
  wait cursor: real path is `graphics/fonts/down_arrow_alt.png` (the
  brief's guessed battle_interface path doesn't exist) via `text.c`'s
  `sDarkDownArrowTiles`; a plain triangle that *renders* heart-shaped
  through `gBattleTextboxPalette` bank 0 (already in
  `battle-window.json` palette[0] — no new palette); bob =
  `sDownArrowYCoords={0,1,2,1}` at 9 ticks/phase (the 36-tick cycle);
  **4773/4773 px exact** across all 137 probe ticks. Honestly flagged:
  the source-row-vs-dest-row axis attribution of the bob is empirical —
  the engine slice should treat the additive dest-Y rule as the pinned
  behavior, not the hand-traced address math.
- **Next:** scene-assembly engine slice (1040-1300) briefed on the main
  lane now — all its assets and mechanism tables are banked (#55 + this).
  Send-out scout (1300-1560) in flight on the worktree lane (worker M).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 56 — S6 transition engine slice: CIRCLES_MEET battle transition (ticks 843-1040) implemented, oracle-pinned; `transition.json` committed 206/206

- **State:** `npm test` **390/390** (377→390, +13 in new
  `tests/battleTransition.test.ts`), `npm run build` green. New trace
  `tools/compare/traces/transition.json` (identical to the groundtruth
  dense trace: 1040 frames, 206 every-frame captures 835-1040) passes
  `npm run compare` **206/206, 0 diff**. All 16 pre-existing traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did:** new module `src/engine/battleTransition.ts`, wired into
  `core.ts`'s `renderBattleRoomState` as a pure post-process over
  `battleRoom.ts`'s existing "settled" phase — **no new `BattleRoomPhase`
  needed**, every stage (gray flicker, circle-sprite slide, center-logo
  BLDALPHA blend, exit-to-black fade) is a pure function of that phase's
  own `elapsed` counter (`te`, 0 = trace tick 843). Built from source
  (`battle_transition.c`'s `Task_BattleTransition_Intro`,
  `battle_transition_frontier.c`'s `Task_FrontierCirclesMeet`) then
  iterated against `battle1-transition-dense.json`'s 206 real PNGs
  (scratch Python, brute-force + formula cross-checks, not committed)
  until byte-exact — **two corrections to #53's own flagged-as-empirical
  groundwork**, both now source-derived: (1) the circle sprites' OAM
  placement is the plain symmetric `center-32/-32` corner
  (`sCenterToCornerVecTable[square][SPRITE_SIZE(64x64)]`), not a
  per-piece offset — #53's brute-forced asymmetric numbers were fitting
  the ring artwork's own transparent padding within its 64x64 tile, not
  the true OAM corner; (2) the sprites' creation/anchor tick is trace tick
  **921** (not 920), re-derived by brute-forcing against real pixels
  rather than RAM-tick arithmetic alone. Three distinct blend mechanisms
  pixel-verified independently (module doc has the full derivation): gray
  flicker uses the standard 5-bit `BlendPalette` formula (target
  RGB(11,11,11), no BG/OBJ split — `BlendPalettes` touches every palette
  in one call); the center-logo BLDALPHA ramp empirically matches mGBA's
  output only in **8-bit** space (`floor((c1*EVA+c2*EVB)/16)`), not the
  5-bit formula the other two mechanisms use; the exit-to-black fade
  reuses `paletteFade.ts`'s `blendComponentToBlack` at a **3-per-2-ticks**
  cadence (not the usual 2) and **does** carry the same BG/OBJ 1-tick lag
  `paletteFade.ts` documents elsewhere (re-confirmed here, contra an
  early false lead where a fused blend+fade pass was accidentally
  re-quantizing an already-8-bit value through `blendComponentToBlack`'s
  unconditional 5-bit round-trip at y=0 — fixed by skipping that call
  outright when there's no fade yet). The room scene's own share of the
  exit fade (tiles + NPCs) reuses `renderBattleRoomEntryScene`'s existing
  `bgFadeY`/`objFadeY` params from `core.ts` rather than a redundant
  overlay pass.
- **Next:** scene assembly (1031-1300), off `docs/battle-scene-notes.md`
  (PROGRESS #55) — the transition now holds solid black indefinitely past
  tick 1030, which is exactly where that slice needs to take over.
- **Notes:** no papercuts. RNG modeling (transition-variant selection) and
  the other 11 Factory transition variants remain explicitly out of scope
  per the brief — this slice covers CIRCLES_MEET only.

---

## 55 — S6 scene-assembly groundwork (parallel worktree lane, merged): BATTLE-SCENE ASSEMBLY window (1031-1300) mechanism fully decoded; docs + dense ground-truth trace; one missing asset identified

- **State:** merge of `worker/wt-20260718-104713` (commits `9d58839` +
  `503efe0`) on top of #54; `npm test` **377/377** + `npm run build` green
  on the merged result. New: `docs/battle-scene-notes.md` (332 lines,
  sha-cited) + `tools/compare/traces-groundtruth/battle1-scene-dense.json`
  (256 every-frame captures, ticks 1040-1295 — supervisor sanity-ran it
  green, 256 PNGs).
- **Did (worker, supervisor-verified):** (1) first non-black frame
  **corrected to 1075** (prior 1077 was stride-4 aliasing); all
  streak-phase boundaries + the 1227 settle (3-tick plateau) + first
  text glyph 1234 pinned with shas. (2) mechanism decoded: the
  "streaks" are `BattleIntroSlide3` (`battle_intro.c`) — a deterministic
  per-scanline horizontal BG shift (top/bottom halves converge ±240→0
  over 120 ticks) crossfaded via BLDALPHA 8:8→0:16 over 48 ticks; every
  value a plain tick formula, RAM-probed (`gTasks[0].data[]` vs
  `gBattle_BG1_X`/`WIN0V`) and cross-validated against pixel shas; task
  created 1073, destroyed 1227→1228. NO RNG anywhere in the window. (3)
  battle text = `B_WIN_MSG` window, `FONT_NORMAL`, same 1-tick/char
  cadence as the field box (all 5 space-hold ticks arithmetic-exact);
  the "♥" is NOT a charmap glyph — it's `down_arrow_alt.png`, the
  standard `\p` wait-cursor (a heart-shaped asset), whose 4-phase/
  36-tick bob explains the idle-cycle signature seen at 1292+ AND at the
  action menu. (4) party-ball icons identified
  (`CreatePartyStatusSummarySprites`); **missing asset flagged:**
  `graphics/battle_interface/ball_display.png` + pal not extracted
  (extraction worker K in flight); down-arrow cursor also unextracted;
  full settled-scene compositor honestly NOT-REACHED (needs trainer-pic
  placement coords).
- **Next:** transition engine slice (843-1031) briefed on the main lane
  now, off #53's §5; then scene assembly (1031-1300) off this entry once
  worker K's assets merge.
- **Notes:** worktree removed + branch deleted post-merge.


---

