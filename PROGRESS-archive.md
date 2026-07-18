# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

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

## 54 — S6 slice 2c: OPPONENT-SPEECH MSGBOX window (ticks 718-843) implemented, oracle-pinned; `room-msgbox.json` committed 142/142

- **State:** `npm test` **377/377** (365→377, +12 in `tests/battleRoom.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/room-msgbox.json`
  (851 frames, captures 710-851) passes `npm run compare` **142/142, 0
  diff** (first try). All 15 pre-existing traces re-verified at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions.
- **Did:** extended `battleRoom.ts`'s state machine off #51's groundwork
  (BattleRoomPhase gains `msgboxIdle`/`msgboxClosing`/`settled` alongside
  the existing `entering`) rather than rebuilding: "entering" stays a pure
  function of the same global `elapsed` through print-complete (msgbox
  appear/print folded in exactly like scientistTurnFrame/opponentStep —
  `msgboxVisual(elapsed)`, appear atomic at elapsed 198/tick 718, 1
  char/tick incl. spaces, print-complete at elapsed 218/tick 738 — both
  values derived from `MSGBOX_LINE1.length + MSGBOX_LINE2.length`, not
  separately-pinned magic numbers), then hands off to `msgboxIdle` (static,
  matches prebattleRoom.ts's own "idle" no-op-under-advance convention).
  core.ts's tick() gates the SAME idiom prebattleRoom.ts's A-press already
  established: `msgboxIdle && newKeys.has("A")` creates `msgboxClosing`
  directly on the press tick; **the close latency (`MSGBOX_CLOSE_TICKS=4`)
  was derived analytically, not guessed** — battle1-intro.json's own
  committed segment 29 (`["A"], frames:2`, right after 838 no-input frames)
  makes readKeys.ts's edge-triggered newKeys fire exactly once, on the
  tick() call producing captured frame 839 (frame 840's call sees A already
  held); working backward from the pinned "static through 842, vanished by
  843" pixels, 4 is the only tick count consistent with both the segment
  data and the pixels — independently re-confirmed via a fresh oracle probe
  before writing any code (frame 717 sha == frame 843's sha, frames
  838-842 == frame 738's "print-complete" sha). Reused
  `prebattleRoomRender.ts`'s box compositor rather than duplicating it —
  exported `drawMessageBoxFrame` (was private) and factored a new
  `drawMessageBoxText` helper (also used by that module's own single-line
  `drawMessageBox` now, a small dedup); `battleRoomRender.ts` calls both
  twice for the two lines (`IT’S WAY TOO` / `HOT HERE`, curly apostrophe
  charmap 180, #51-pinned). No new extractor/asset — confirms #51's own
  finding that this is the literal same `prebattle-room-msgbox.json` box.
  The one pre-existing test needing no change at all: `battleRoom.test.ts`'s
  "holds A for 200 ticks -> elapsed 200" assertion (written for slice 2a)
  turned out to still hold byte-for-byte, since 200 < the print-complete
  boundary (218) — holding A during "entering" is a no-op by construction
  (only `msgboxIdle` reads input), so no existing assertion needed editing.
- **Next:** the transition-to-black engine slice (tick 843+, gray flicker
  871-918 → circle sprites → center-logo blend → fade to black by 1031),
  off #53's own groundwork (RAM-pinned 8-tick gray-flicker toggle, circle-
  sprite linear-slide constants, centerBg asset byte-exact, 6-step
  2-ticks/step fade cadence). `docs/battle-scene-notes.md` scene-assembly
  scout (1031-1300) may also be ready by then per #53's "Notes".
- **Notes:** assumption flagged (not oracle-exercised this session, per the
  brief's own allowance): only the one pinned idle-phase press (well after
  print-complete) is verified; an earlier press right at print-complete is
  modeled as behaving identically (same 4-tick close, no idle-duration
  dependency) — the simplest mechanism consistent with the single pinned
  data point, matching `prebattleRoom.ts`'s own "idle" convention (no
  timeout/duration-sensitivity there either). No papercuts.

---

## 53 — S6 transition groundwork (parallel worktree lane, merged): NO heal-icon overlay exists; ticks 843-1031 fully pinned; CIRCLES_MEET assets confirmed byte-exact; docs + ground-truth trace only

- **State:** merge of `worker/wt-20260718-102848` (single commit `9ca09a6`)
  on top of #52; `npm test` **365/365** + `npm run build` green on the
  merged result. New: `tools/compare/traces-groundtruth/
  battle1-transition-dense.json` (206 every-frame captures, ticks
  835-1040 — supervisor sanity-ran it green, 206 PNGs);
  `docs/battle-bringup-notes.md` gains §5 under Slice-0 ground truth.
- **Did (worker, supervisor-verified):** (1) **the "heal-icon overlay"
  does not exist** — screen byte-identical for all of 843-870;
  `HealPlayerParty` (`script_pokemon_util.c:30-59`) is pure stat
  restoration, zero graphics calls; the earlier dossier claim was a
  coarse-sampling mislabel of the transition's own visuals (corrected).
  (2) full pixel pinning: gray flicker 871-918 matches the RAM-pinned
  8-tick toggle with consistent 1-tick render lag; circle-sprite
  positions at checkpoints 920-970 match source's linear-slide constants,
  pixel-verified 0/3216 per piece; center-logo blend 970-1017 pinned,
  centerBg asset 0/6028; fade-to-black 1018-1031 is a clean 6-step,
  2-ticks-per-step linear fade, black by 1030. (3) coverage: `battle-
  transition-frontier-circles.json` fully covers CIRCLES_MEET
  (`...-logo.json` is only for LOGO_WIGGLE/WAVE — a different source
  image; no gap). Flagged for the engine slice: OAM corner-vector
  convention found empirically; BLDALPHA checked only at tBlend=16;
  fade cadence not source-explained.
- **Next:** main lane slice 2c (speech box 718-843) briefed now off
  PROGRESS #51's groundwork; then the transition engine slice (843-1031)
  directly off this entry's §5. Scene-assembly scout (1031-1300, new
  docs/battle-scene-notes.md) in flight on the worktree lane (worker I).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 52 — S6 slice 2b: SCIENTISTS-TURN + OPPONENT WALK-IN window (ticks 624-717) implemented, oracle-pinned; `room-npcs.json` committed 98/98

- **State:** `npm test` **365/365** (357→365, +8 in `tests/battleRoom.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/room-npcs.json`
  (717 frames, captures 620-717) passes `npm run compare` **98/98, 0 diff**
  (first try — no fix-up needed). All 14 pre-existing traces re-verified at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** chose slice-boundary option (a) from the brief — implemented
  through the settled no-box scene and ended the trace at **tick 717**
  (the 713-717 tail is static, matching #51's own §8.2 finding that the
  room settles by 712); the msgbox print window (718+) stays slice 2c's,
  untouched. RAM-probed all 16 `gObjectEvents` slots + their `gSprites`
  every tick 600-745 (custom script, same struct-offset conventions as
  #50, scratch under `/tmp/s6b/`), cross-checked against source
  (`scripts.inc`'s `EventScript_ScientistsFaceBattle` +
  `EventScript_EnterRoom`'s remove/setxy/add sequence,
  `event_object_movement.c`'s `MovementAction_WalkInPlaceFasterRight/Left`
  + `InitMoveInPlace`, `object_event_anims.h`'s `sAnimTable_Standard`).
  Extended `src/engine/battleRoom.ts` with `scientistTurnFrame(elapsed)`
  and `opponentStep(elapsed)`, wired into `battleRoomRender.ts`/`core.ts`
  (no extractor/asset changes needed — #49's `battle-room-layout.json`
  already carried the scientists' turn directions + opponent spawn/settle
  tiles). Findings: (1) **the scientists' turn is 2 visually-distinct
  ticks, not 4** — the RAM `duration=4` passed to `InitMoveInPlace` counts
  movement-step calls, but the anim's own frame duration is 2 ticks/entry
  and `SetStepAnimHandleAlternation` starts already at cmdIndex 2 (same
  precedent as #50's decoy walk starting at a non-zero cmdIdx); net effect
  is pre-turn (elapsed ≤105) → transient frame 8 (106-107) → settled turned
  frame 2 (≥108), all 6 scientists in exact lockstep (one shared
  `waitmovement`). (2) **the opponent is added and takes its first walk
  step within the same engine tick** — RAM shows it fully hidden through
  elapsed 111, then active *and already one sub-pixel step into its walk*
  at elapsed 112 (screenY -23, not the formula spawn of -24). (3) its walk
  screenY is a **clean 1px/tick ramp with no sub-tile easing** (same
  convention as #50's camera pan), `screenY(elapsed) = elapsed - 135`
  from elapsed 112 to the settle at 191 (screenY 56, independently
  cross-checked against the proven `tileScreenPos` tile-formula since the
  opponent is static there) — screen X never moves and is drawn via that
  same tile formula, sidestepping the raw-sprite-x encoding entirely. (4)
  the walk's picture-frame cycle is `sAnim_GoSouth` (`[3,0,4,0]`, 8
  ticks/frame, matching this game's established 1px/tick object-movement
  speed — 5 tiles × 16 ticks/tile = 80 ticks, elapsed 112-191 exactly);
  settle switches to frame 2 (`sAnim_GoWest` cmdIndex 1) — face west, per
  `Movement_OpponentEnter`'s trailing `face_left`.
- **Next:** S6 slice 2c — the opponent-speech msgbox (ticks 718-843),
  fully groundwork-pinned already (#51: print cadence, appear/close
  choreography, byte-exact frame asset = `prebattle-room-msgbox.json`).
  Then 740+ (heal icon, transition-to-black) per the parallel scouting
  lane.
- **Notes:** no papercuts. Scratch RAM-probe script (`/tmp/s6b/probe.py`)
  removed after use, nothing committed beyond the deliverables.

---

## 51 — S6 slice 2c groundwork (parallel worktree lane, merged): opponent-speech msgbox = same asset as pre-battle box (source-proofed); print cadence + appear/close choreography fully pinned; docs-only

- **State:** merge of `worker/wt-20260718-100953` (single docs commit
  `161f0ae`) on top of #50; `npm test` **357/357** + `npm run build` green
  on the merged result. Docs-only — `docs/battle-room-notes.md` §8 added
  (+180/−5).
- **Did (worker, supervisor-verified):** (1) **no new msgbox asset
  needed** — both "Right this way, please!" and the opponent speech are
  `msgbox X, MSGBOX_DEFAULT` → `Std_MsgboxDefault` → window 0 =
  `sStandardTextBox_WindowTemplates[0]` (27×4 at (2,15)), the literal
  same `message_box.png` frame already derived as
  `prebattle-room-msgbox.json`; byte-exact verified (border 3292/3292 px
  over 7 ticks, frame+fill+text 9948/9948 over 4 ticks). The prior
  "shorter variant, y=115" read was a within-tile gradient artifact —
  corrected in place. (2) print cadence pinned: room settled (no box) by
  712; box+full-white fill appear **atomically at 718**; first glyph 719;
  **exactly 1 tick/character incl. space ticks** (full tick→char table in
  §8.2); line 2 starts 731; print-complete/settle **738**. Rendered
  string confirmed pixel+charmap-exact: `IT'S WAY TOO` / `HOT HERE` with
  the curly apostrophe (charmap 180 — ASCII `'` isn't in the charmap).
  (3) close pinned: A-press #2 pulse 838-839, no visible change through
  842, box vanishes **atomically at 843** — full framebuffer
  byte-identical to tick 717's pre-appear state, static through 851.
- **Next:** S6 slice 2b (scientists turn + opponent walk-in, 624-739,
  main lane — brief going out now), then 2c (speech box) directly off
  this section. Heal-icon + transition-to-black groundwork (843-1031) in
  flight on the worktree lane (worker G).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 50 — S6 slice 2a: battle-room ENTRY window (ticks 520-624) implemented, oracle-pinned; `room-entry.json` committed 110/110

- **State:** `npm test` **357/357** (349→357, +8 in new `tests/battleRoom.test.ts`,
  1 existing test in `tests/prebattleRoomFlow.test.ts` updated for the new
  handoff behavior), `npm run build` green. New trace
  `tools/compare/traces/room-entry.json` (624 frames, captures 515-624)
  passes `npm run compare` **110/110, 0 diff**. All 13 pre-existing traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** consumed #49's assets unchanged (no re-extraction needed —
  walk-cycle/turn frames turned out pixel-exact on first try). RAM-probed
  ticks 510-629 directly (custom script mirroring `tools/probe/ram-probe.py`'s
  conventions, struct offsets for `Sprite`/`ObjectEvent` from
  `include/sprite.h`/`include/global.fieldmap.h`, not committed — scratch
  under `/tmp/s6entry/`), cross-checked against a dense oracle pixel probe
  (every frame 515-545) for the fade curve. New `src/engine/battleRoom.ts`
  (state machine + oracle-pinned per-tick table) and
  `src/engine/battleRoomRender.ts` (tilemap+border+sprite compositor under
  a panning camera), wired into `core.ts` as a third top-level scene mode
  (`battleRoom`) that `prebattleRoom`'s `warpFade` phase hands off to at a
  fixed elapsed count (`WARP_FADE_TO_ROOM_ELAPSED`) matching the
  ground-truth trace's own first visible-room frame. Findings, all resolving
  #49's SS6 open items for this sub-window: (1) **fade-in reuses
  `paletteFade.ts`'s `FADE_IN` exactly** (same shape as the pre-battle
  room's own fade-in) but the call site indexes it by `elapsed` directly,
  not `elapsed+1` like every other fade call site in this codebase —
  pixel-sampled and algebraically confirmed, 0 mismatches. (2) **the camera
  pans a clean 1px/tick**, resolving #49's "may not be a clean 1px/tick"
  open question — `gTotalCameraPixelOffsetY` read directly is static then
  increments by exactly 1 every tick for 80 ticks, no sub-tile curve. (3)
  **the decoy is screen-fixed the whole window** (a finding, not assumed):
  it walks in exact lockstep with the camera pan (both driven by the shared
  `waitmovement`), so net screen position is constant — only its
  `sAnim_GoNorth` walk-cycle frame changes; this contradicts the natural
  first guess (that its raw RAM `sprite.y` directly gives screen position)
  and cost the first `npm run compare` attempt (216-425px/frame diff,
  root-caused and fixed same session). (4) the 6 scientists are static
  (face-south, pre-turn) the whole window, confirmed by RAM, and shift on
  screen via the same tile-camera formula as the room tiles.
- **Next:** S6 slice 2b — scientists turn + opponent walk-in (ticks
  624-739). Open for that slice: opponent walk-in gfx already extracted
  (#49, `OBJ_EVENT_GFX_BUG_CATCHER`), scientist turn-in-place transient
  frames extracted but still pixel-unverified (#49 SS6 risk 3).
- **Notes:** no papercuts. Scratch RAM-probe script and oracle fade-curve
  probe both inline/`/tmp`, nothing committed beyond the deliverables.

---

## 49 — S6 groundwork (parallel worktree lane, merged): Battle Factory BATTLE ROOM scene extracted, composite-verified 0/38400 at tick 624; NO ENGINE CODE

- **State:** merge of `worker/wt-20260718-094141` (single commit `f943df7`,
  new files only) on top of #48; `npm test` **349/349** + `npm run build`
  green on the merged result. New: `tools/extract/extract-battle-room.ts`
  (deterministic, byte-identical across two runs),
  `src/assets/gen/battle-room-tileset.json` (88 tiles/5 palettes/153
  metatiles), `src/assets/gen/battle-room-npcs.json` (3 nine-frame sheets:
  fake-player decoy, scientist, opponent `OBJ_EVENT_GFX_BUG_CATCHER`),
  `src/data/gen/battle-room-layout.json`, `docs/battle-room-notes.md`.
- **Did (worker, supervisor-verified):** extracted the warp-destination
  room (`BattleFrontier_BattleFactoryBattleRoom`) covering ground-truth
  ticks 520-838. Composite checks: tick 624 **0/38400 full-frame**
  (supervisor independently re-diffed the committed composite vs the
  oracle capture: 0 px), ticks 740-838 **0/21600 on y<90** (region
  excludes the not-yet-extracted opponent-speech msgbox; the full-frame
  residual at tick 800 is confined exactly to the msgbox rows). Findings:
  the camera **pans** (tracks the invisible real player, warp (6,11) →
  settle (6,6)) despite the source's "camera is supposed to remain still"
  comment; opponent gfx resolved via `gTowerMaleFacilityClasses[28]`; no
  attendant object exists in this map.
- **Next:** S6 slice 2a — engine implementation of room entry (fade-in +
  camera pan + decoy walk, ticks 520-624, ending at the verified tick-624
  composite), then 2b (scientists turn + opponent walk-in 624-739), then
  2c (opponent speech msgbox 739-843). Open items from
  `docs/battle-room-notes.md` §6 for those slices: camera pan sub-tile
  timing not derived; tick 520-535 brightness fade-in observed
  (~10→~97 mean) but not modeled; walk-cycle/turn transient frames
  extracted but pixel-unverified; opponent-speech msgbox variant art not
  yet extracted (deliberately deferred behind #48's derivation fix).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 48 — ISSUES #15 root-caused and fixed: pre-battle msgbox frame now derived from `prebattle-room-msgbox.json`, baked asset deleted

- **State:** `npm test` **349/349** (+2 regression tests), `npm run build`
  green, working tree clean. Full 13-trace sweep at exact prior counts —
  **accept-prebattle 137/137**, **walk-warpout 125/125** (acceptance bar),
  anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95 — zero regressions. ISSUES.md: **#15 deleted**.
- **Did:** Root-caused the "one-GBA-step" color offset that made the accept
  worker bake `prebattle-msgbox-frame.json` from a literal oracle capture
  instead of deriving it: `tools/extract/gbaColor.ts`'s `to5Bit()` assumed
  every reference PNG/pal 8-bit value approximates its true 5-bit GBA
  channel via `floor(c5*255/31)` (true for this map's own tileset/NPC
  sprites, verified by direct PLTE-byte inspection), but
  `graphics/text_window/message_box.png`'s embedded palette instead stores
  exact `c5*8` values (a different, plainer export convention) - the old
  formula silently rounded those down one GBA step (e.g. raw 248 -> 5-bit
  30 instead of 31 -> 247 not 255). Fixed by recovering the 5-bit value via
  `v8>>3` (top 5 bits), the correct general inverse regardless of which
  forward convention produced the reference byte - verified against both
  conventions' full value ranges before changing it, and confirmed
  byte-identical regeneration for every *other* extracted asset (tileset,
  layout, NPCs - only `prebattle-room-msgbox.json` actually changed when
  re-extracted). Once fixed, that asset's own palette contains the oracle-
  exact interior white (idx1) *and* the message text's fg/shadow colors
  (idx2/idx3) exactly - the old "two-asset rule" (docs/prebattle-room-
  notes.md §3) was itself an artifact of the same bug, not a real asset-
  boundary. Reverse-engineered `prebattleRoomRender.ts`'s new
  `drawMessageBoxFrame` from the real source
  (`WindowFunc_DrawDialogueFrame`, `reference/pokeemerald/src/menu.c:319-
  402`, the standard width=27/height=4 field window) rather than pixel-
  matching by hand, then byte-exact verified it against the (now-deleted)
  baked capture before deleting it: all 9948 non-transparent frame pixels
  matched exactly, 0 mismatches. Pinned the root cause with two Tier-1
  regressions (`tests/extract.test.ts`: `to5Bit(248)===31`,
  `gbaRoundTrip(248)===255`; `tests/prebattleRoom.test.ts`: msgbox palette
  idx1/2/3 now exactly white/fg/shadow).
- **Next:** S6 slice 1b+ (battle-room entry, heal-icon/transition window) -
  unaffected by this step, per its scope. No open ISSUES entries.
- **Notes:** no papercuts. Scratch verification (pixel sampling, brute-force
  tile-match scripts used to derive/confirm the tile-placement algorithm)
  was all inline `node -e`, nothing committed.

---

## 47 — S6 slice 1b (parallel worktree lane, merged): slice-0 §4 loose ends resolved — transition = CIRCLES_MEET (RAM-confirmed), transition-end = tick 1227, post-freeze draws re-attributed; docs-only

- **State:** merge `a004db2` (branch `worker/wt-20260718-091648`, single
  docs commit `c005d87`) on top of #46; `npm test` **348/348** + `npm run
  build` green on the merged result. Docs-only — `docs/battle-bringup-notes.md`
  +227/−47, no engine/asset/fixture changes.
- **Did (worker, supervisor-verified):** (1) transition variant **RESOLVED**:
  `gTasks[6].data[1]` (`tTransitionId`) reads **34 =
  `B_TRANSITION_FRONTIER_CIRCLES_MEET`** from tick 869 — enum ordinal
  independently re-counted by the supervisor against
  `include/battle_transition.h`; corroborated by `gTasks[7].func` becoming
  `Task_FrontierCirclesMeet` (its state machine matching source math
  tick-for-tick) and screenshots (3 circles converging, ticks 960-990).
  The 1077-1197 "streak" frames are **not** the transition — all
  transition tasks are destroyed by `CB2_InitBattleInternal`'s
  `ResetTasks()` at tick 1044 (same tick as the independently-pinned RNG
  freeze); they're `BeginBattleIntro`'s scene assembly. (2)
  transition-end **pinned**: scene settled (modulo text) tick **1227**
  (plateau through 1229); text milestones "would like to battle!"
  no-heart 1272-1273, ♥ at 1274, true steady state from 1292 = the same
  4-phase/36-tick idle cycle as the action menu (the old "1290 stable"
  claim was a 6-frame transient — corrected in place). (3) post-freeze
  RNG draws re-attributed: **1741 is `TryDoEventsBeforeFirstTurn`'s draw**
  (RAM-confirmed via the `gBattleMainFunc` handoff; the old attribution
  to 1747 was a proximity guess); 1745 (2-step) plausibly opponent-AI
  switch heuristics (`AI_TrySwitchOrUseItem`, bracketed by controller
  busy-bits, not single-stepped); 1747 (5-step) genuinely unpinned
  (AI chain, player controller, TryDoEvents all source-ruled-out) — an
  S7 concern, flagged in the dossier, not an S6 blocker.
- **Next:** S6 slice 2 — battle-room entry scene (frames 520-838). A
  parallel extraction worker (battle-room map/NPCs/opponent overworld
  sprite, new files only) is in flight on the worktree lane as of this
  entry.
- **Notes:** worktree removed + branch deleted post-merge. Worker A's
  ROADMAP slice-1a note was worker-written (convention is propose-only) —
  ratified as accurate; the slice-1b roadmap note is the supervisor's own,
  this commit.

---

## 46 — S6 slice 1a: A-press → closemessage → guided walk → warp fade (ticks 400-519) implemented, oracle-pinned; `walk-warpout.json` committed 125/125

- **State:** `npm test` **348/348** (341→348, +7 in `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/walk-warpout.json`
  (520 frames, captures 395-519) passes `npm run compare` **125/125, 0
  diff**. All 12 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6
  66/66, example 4/4, summary-info-onix 122/122, summary-info-magby
  132/132, confirm-decline 67/67, accept-prebattle 137/137, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** RAM-probed the whole window directly (`tools/probe/ram-probe.py`,
  scratch spec/output under `/tmp/s6-worker/`, not committed) rather than
  fitting pixel diffs blind: watched `gObjectEvents[0/1]` (player/attendant
  - localId/currentCoords/movementActionId/facing), `gSprites[0/1]`
  (x/y/animNum/animCmdIdx/invisible flag), and `gSpriteCoordOffsetX/Y`
  every tick 395-520. Cross-referencing against `sAnim_Go*`'s ANIMCMD
  tables (`object_event_anims.h`) decoded exact per-tick walk-animation
  frames; cross-referencing screen positions (`sprite.xy + coordOffsetXY -
  {8,16}`) against the room's already-known camera-origin formula proved
  **the player sprite stays screen-fixed at (112,56) the entire walk** (the
  field camera exactly cancels the player's own movement) - only the room
  tiles + the independently-moving attendant actually scroll on screen, a
  finding that collapsed the whole camera-scroll gotcha the brief flagged
  into "no per-tick player-position bookkeeping needed." Also discovered a
  real one-tick **render-lag**: RAM state at tick N only becomes visible in
  the rendered frame N+1 (verified against the ground truth's own frame-403
  boundary). Baked the resulting 80-tick walk (frame 403 → 482, when motion
  freezes) as an oracle-pinned lookup table (`prebattleRoom.ts` `WALK_STEPS`,
  same style as this file's existing `WINDOW_STEPS`/`UNREVEAL_WINDOW_STEPS`
  tables) rather than a general movement formula - safest match for exact
  byte-parity given per-tile timing already deviates from the naive 16-
  frames/tile assumption in places. Pixel-sampled the warp fade separately
  (a static room pixel across frames 478-505) and fit it to the *existing*
  `BlendPalette` shape already modeled in `paletteFade.ts` - new
  `WARP_FADE_OUT` timing constant (startDelay 4), reusing `bgFadeY`/
  `objFadeY` unchanged. New phases `messageClosing` (2-tick input-
  registration lag, matching this file's existing `confirmReveal`
  precedent) → `walking` (80 ticks, `WALK_STEPS`-driven) → `warpFade` (fades
  to black and then holds solid black forever, matching the step's explicit
  "may simply hold black from 501 onward" scope cut). Extended
  `extract-prebattle-room.ts` to pull all 9 standard picture-table poses per
  NPC (was 1 each) - `prebattle-room-npcs.json`'s shape changed from a
  single `tileset` to a `frames[9]` array; updated `prebattleRoomRender.ts`
  (`drawRoomTiles`/`drawNpcFrame` now take an explicit origin/frame index)
  and `tests/prebattleRoom.test.ts` to match. Core.ts wires the A-press
  (`newKeys.has("A")` while `phase==="idle"`) directly into `messageClosing`
  - the only input this screen ever reads in this slice.
- **Next:** S6 slice 1b+: battle-room entry (frame 520+, scientists facing,
  opponent walk-in, opponent overworld speech "IT'S WAY TOO HOT HERE"),
  then the heal-icon/nature-reroll/transition-select window (ticks 842-869)
  and the transition itself - all pinned in `docs/battle-bringup-notes.md`'s
  "Slice-0 ground truth" section (not touched this step, per the step
  brief - a parallel worker owns that file). ISSUES.md still just #15.
- **Notes:** no papercuts this session. All RAM-probe scratch (specs,
  dense-capture trace JSONs used only to derive the table, PNG output under
  `/tmp/s6-worker/`) is scratch per convention, not committed - only
  `tools/compare/traces/walk-warpout.json` (the final byte-exact parity
  trace) and the engine/asset/test diffs are. `docs/battle-bringup-notes.md`
  was read but **not edited**, per the step brief.

---

## 45 — Supervisor wind-down: session end 2026-07-18 ~01:20; S5 COMPLETE [x], S6 slice 0 banked

- **State (verified this minute):** `npm test` **341/341**, `npm run build`
  green, working tree clean. All 12 parity traces verified this session at
  final counts: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, **confirm-decline 67/67** (new),
  **accept-prebattle 137/137** (new) — plus rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95 (all three ISSUES #5 settled policy).
  Ground-truth trace `traces-groundtruth/battle1-intro.json` committed.
  ISSUES backlog: only **#15** (baked msgbox frame asset, non-blocking
  debt). ROADMAP: **S5 marked [x]**; S4 remainder deferral extended behind
  the S5→S8 critical path (recorded decision); S6 slice 0 done.
- **Session summary (supervised, ~21:20-01:20):** 7 worker steps, all
  supervisor-verified green, zero trace regressions at every step:
  (1) S5 decline path landed (confirm-decline.json first cut 13/67;
  ISSUES #11/#12/#13 filed from its attributions); (2) ISSUES #11
  species-name breathe modeled exactly, 53/67 (`tools/probe/ram-probe.py`
  banked, papercut retired); (3) ISSUES #12 partial — prior hypothesis
  RAM-disproven, ball-grid snapshot fix, 54/67; (4) ISSUES #12 rc2 +
  #13 fixed → **67/67**; (5) S5 accept path (exit fade → pre-battle room →
  message print), 123/137, ISSUES #14 filed + #15 debt filed;
  (6) ISSUES #14 fixed → **137/137** → S5 [x]; (7) S6 slice 0
  ground-truth pinning (battle1-intro.json + dossier corrections).
  Suite 297→341 Tier-1 tests; traces 10→12 parity + 1 ground truth.
- **Next:** S6 slice 1 — engine implementation against
  battle1-intro.json's pinned targets, suggested order: message A-press +
  closemessage + warp fade (extends S5 scene machinery), then the
  heal-icon window (nature-reroll/transition-select ticks 842-869), then
  the transition itself. Early in slice 1 resolve the dossier §4 loose
  ends: transition-end bound (1200-1290), transition-variant pixel
  confirmation (2 of 12 candidates), the 2 unexplained post-freeze
  `Random()` draws (ticks 1741/1745). ISSUES #15 whenever convenient.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  no parallel-lane use this session (all 7 steps serial in the main tree).
  One supervisor error: the ISSUES #15 filing clobbered #14's heading
  line (worker caught + restored it, `ba6ff0d`). PAPERCUTS: battle1-intro
  ground-truth entry retired this commit (trace now committed).


---


## 44 — S6 slice 0: ground-truth bring-up pinning complete — battle1-intro.json (1886f/254 captures) committed, RNG/transition/personality checkpoints RAM-verified, dossier extended; NO ENGINE CODE

- **State:** `npm test` **341/341** (unchanged, no engine touched), `npm run
  build` green. `tools/compare/traces-groundtruth/battle1-intro.json`
  (new dir, +README) committed: 1886 frames (`accept-prebattle.json`'s
  verified 392-frame prefix + A-press@400 + 2 more player-paced A-presses
  + idle through transition/intro/both send-outs), 254 dense captures.
  `bin/oracle run` on it verified green; spot-checked anchor (1/1) and
  confirm-decline (67/67) still exact — zero regressions.
- **Did:** Two chained oracle probe passes (sparse locator, then a dense
  final pass around each located boundary) pinned every frame boundary
  the step asked for (message-close, warp-fade black window, transition
  start/first-visual, both send-out text settles, first-action-menu
  settle at tick 1750 with its 36-frame idle cycle) — see
  `docs/battle-bringup-notes.md`'s new "Slice-0 ground truth, 2026-07-18"
  section for the full sha256-cited list. `tools/probe/ram-probe.py`
  (gRngValue + gBattleTypeFlags + gEnemyParty[0..2].personality, every
  tick from 395) then pinned: the 1/VBlank cadence and its exact freeze
  tick (1044→1045, then one explicit draw at 1066, then a 675-tick true
  battle freeze 1066-1740); all 3 opponent personality rolls (28/16/95
  rejection iterations for Grovyle/Murkrow/Pidgeotto respectively,
  cross-validated 3-for-3 against this file's own expected-nature table
  via `personality % 25`); and the transition-select roll (tick 868→869,
  narrowed to 2 of 12 candidates — see below). **Two corrections to the
  existing dossier filed with full RAM evidence** (not re-probing what
  was already trusted — these surfaced from this session's own new data):
  (1) the 3 nature-rerolls + transition-select happen during the
  **heal-icon animation** (ticks 842-869), roughly 160-200 ticks *before*
  the transition's black screen (1031) — not "the same frame" as the
  transition start, as previously assumed; (2) **4** explicit `Random()`
  draws survive the per-frame freeze, not the previously-documented 2 —
  two of them (ticks 1741, 1745) are unexplained, flagged for a future
  source re-read.
- **Next:** S6 slice 1+ (actual engine implementation: battle transition
  effect, scene init, intro text, first action menu) can now build against
  this committed ground truth instead of re-scouting it. Two loose ends
  flagged in the dossier's §4: (a) the transition-visual identification
  is narrowed to `CIRCLES_MEET` or `CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ` (2
  of 12) via RNG math but not pixel-confirmed — a future session should
  either find the right RAM field for the resolved transition id or do a
  frame-by-frame source cross-check; (b) transition-end (trainer/bg fully
  assembled) is bounded to ticks 1200-1290, not resolved tighter.
  Suggested `ROADMAP.md` S6 wording (not edited here, worker convention):
  append under S6 "**Groundwork banked (2026-07-18):**
  `tools/compare/traces-groundtruth/battle1-intro.json` (1886f, 254
  captures) pins the full A-press-through-first-action-menu window with
  sha256-cited frame boundaries and RAM-verified RNG/personality/
  transition-candidate checkpoints (`docs/battle-bringup-notes.md`
  'Slice-0 ground truth'); engine slices can now implement against fixed
  targets instead of re-scouting timings."
- **Notes:** PAPERCUT retired (not fixed by me, supervisor's file):
  `PAPERCUTS.md`'s "No committed oracle trace for the battle-1 bring-up
  path" entry is superseded by this commit. No new papercuts this
  session. All scratch work (`/tmp/s6-worker/`: probe scripts, sparse/
  dense locator trace JSONs, ram-probe spec/output) is scratch per
  convention, not committed. `src/engine/`, `src/assets/`, `src/data/`,
  and `tools/extract/` were **not touched** — confirmed via `git status`
  before both commits.

---

## 43 — ISSUES #14 root-caused and fixed (two distinct bugs, both the same "accept's own extra-work-free path renders early" mechanism family); `accept-prebattle.json` 123/137 → **137/137**, entry DELETED

- **State:** `npm test` **341/341** (337→341, +4 `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. `accept-prebattle.json`: **123/137 → 137/137, byte-
  exact on every frame.** All 12 other traces re-verified at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-
  menu-slot6 66/66, example 4/4, rent-slot1 125/139, rent-3picks 157/190,
  summary-info-magby 132/132, summary-info-onix 122/122, confirm-flow 79/95,
  confirm-decline 67/67) — zero regressions. ISSUES #14 DELETED.
- **Did:** Also fixed a doc bug inherited from the prior session: the
  supervisor's ISSUES #15 insertion had clobbered #14's own heading line,
  leaving its body under an orphaned continuation fragment (separate commit,
  restored before starting). Root-caused #14 in two layers, both found by
  replaying `accept-prebattle.json`'s exact button script through a scratch
  engine harness and cross-referencing `confirmReveal` state per tick against
  `npm run compare`'s per-frame diff-pixel counts (RAM/IO-register probing,
  the step brief's suggested first approach, was superseded once this
  cross-reference made the mechanism obvious without it). **Root cause #1**
  (the 4-row window-edge band, frames 262-269/270-279, ~11 of the 14 listed
  frames): the accept path's `UNREVEAL_WINDOW_STEPS`/`UNREVEAL_FLASH_WIDTHS`
  table read lands exactly **one tick early** vs decline - confirmed
  air-tight by reproducing every one of the residual's diff-pixel counts
  exactly (96/48/24/12/9px = the precise pixel deltas between adjacent table
  entries × 3 flash centers). Same "decline's extra same-tick work delays
  the render by a tick" mechanism already fixed for `monsVisible` (ISSUES
  #9/#13 family) — just not previously applied to this table. Fixed by
  factoring the table lookup into a pure `closingWindowStep(tick)` and
  reading it at `elapsed+1` (clamped to the last tick, matching decline's
  own tail-hold behavior via the pre-existing `closingFlashResidual`) for
  `accepting`, unchanged for decline. **Root cause #2** (a 36px residual on
  frame 262 surfaced only after fixing #1): the same early-render mechanism
  also hits the window's live ball-grid layer on accept's very first closing
  tick (elapsed 1) - a naive display-only lag (the usual fix for this
  family, tried first and reverted when it broke frame 263) doesn't work
  here because the immediately-following tick permanently freezes via the
  pre-existing `ballAnimStall` mechanism (ISSUES #13), so lagging the stored
  value leaves the wrong tile frozen for the whole stall instead of
  self-correcting. Fixed via a new `ConfirmRevealState.preCloseBallAnims`
  snapshot (every active ball's state as of the tick closing started,
  mirroring the existing `decliningBallAnim` pattern but for all slots)
  consumed by `factoryDraftScreen.ts`'s window-ball rendering only at
  `accepting && elapsed === 1`. Both fixes pinned in
  `tests/prebattleRoomFlow.test.ts` (window/flash table-shift equivalence
  vs. a live decline replay across every tick + the tail clamp, and the
  ball-snapshot's exact one-tick lifecycle).
- **Next:** ISSUES.md backlog is back to just #15 (message-box asset debt,
  out of scope for this step). S6 (battle bring-up) is the next roadmap
  stage, off its already-banked groundwork (`docs/battle-bringup-notes.md`).
- **Notes:** no papercuts this session beyond the doc-heading fix above
  (itself filed/fixed, not left standing). All scratch probing (a Node
  replay harness importing `core.ts` directly, plus Python/PIL pixel
  sampling of `tools/compare/out/latest`) was scratch, deleted before
  finishing - nothing uncommitted beyond the intended
  `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/prebattleRoomFlow.test.ts` + `ISSUES.md`/`PROGRESS.md`/
  `PROGRESS-archive.md`.

---

## 42 — S5 COMPLETE: YES-press accept path (exit fade → pre-battle room → fully-printed "Right this way, please!") implemented, oracle-pinned; `accept-prebattle.json` committed at 123/137, ISSUES #14 filed for the residual

- **State:** `npm test` **337/337** (329→337, +8 `tests/prebattleRoomFlow.test.ts`,
  +2 rewritten in `tests/confirmDecline.test.ts`), `npm run build` green. All
  11 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95, confirm-decline 67/67) —
  zero regressions. New trace `tools/compare/traces/accept-prebattle.json`
  (dense, 137 captures spanning the YES press through the fully-printed,
  settled idle message) committed at **123/137**, all 14 non-matching
  frames individually attributed to a new, precisely-evidenced entry
  (ISSUES #14).
- **Did:** Implemented S5's last piece end-to-end: new `src/engine/
  prebattleRoom.ts` (scene-mode state machine: fadingOut → black → fadingIn
  → roomHold → printing → idle) and `src/engine/prebattleRoomRender.ts`
  (static room composite reusing the already-dossier-verified 17x14-block +
  NPC-sprite assets, plus the message box), wired into `core.ts`'s
  `EngineState`/`tick`/`render` via a new top-level `prebattleRoom` field
  (same shape as `summaryScreen.transition`'s own exclusive-ownership
  pattern). Dense oracle probes this session (own dense captures, not
  reused from prior scratch) pinned: (1) the exit fade-out reuses
  `paletteFade.ts`'s existing `EXIT_FADE_OUT` timing verbatim (same
  `BeginNormalPaletteFade(PALETTES_ALL,0,0,16,RGB_BLACK)` call, source-
  confirmed) but only *starts* once the 20-tick closing/un-reveal
  (`Select_HideChosenMons()`, the SAME function decline calls) finishes -
  not at the button press itself; (2) a new, distinct 14-tick black hold
  (`EXIT_TO_ROOM_BLACK_HOLD_TICKS`, NOT the summary screen's 20); (3) the
  room fade-in reuses `FADE_IN` verbatim; (4) an 8-tick settled-room hold
  before the message box appears (`ROOM_HOLD_TICKS`); (5) the message box
  frame+interior appears fully-formed in one tick (no grow animation) -
  baked directly from an oracle capture into a new asset
  (`src/assets/gen/prebattle-msgbox-frame.json`) after this session's own
  tile/palette brute-force match against `prebattle-room-msgbox.json`
  turned up unexplained ~1-GBA-step color mismatches (PAPERCUT, see below);
  (6) text prints exactly 1 character/tick linearly (no pauses - the
  dossier's own sha-diff-only pass had mistaken 3 space-character ticks for
  timing stalls), glyph origin (16,121) and colors pixel-derived this
  session (corrects `docs/prebattle-room-notes.md` §3's own Risk 1/2 - see
  `prebattleRoomRender.ts`'s module doc for the corrected box geometry,
  y112-159 not y96-159). Root-caused and fixed two real accept-vs-decline
  source divergences along the way (both source-grepped, not guessed):
  `Select_ErasePopupMenu(SELECT_WIN_YES_NO)` is decline-only (accept's
  YES/NO box + cursor highlight stay visible through the whole closing AND
  the exit fade, new `drawYesNoOverlayFaded` export); and the 3 mon pics
  vanish one tick earlier on accept than decline's own cutoff (decline's
  extra same-tick `Select_HandleMonSelectionChange`/`Select_
  PrintSelectMonString` work delays that frame's render, same "extra work
  costs a tick" family as ISSUES #9/#13). RNG continuity (ROADMAP S6's
  correction note) verified two ways: a hermetic hold-yourself test proving
  `rngValue` advances every single tick with no gaps through the whole
  window, and a `tools/probe/ram-probe.py` cross-check pinning the exact
  `gRngValue` at the fully-printed idle tick (bit-exact match, both new
  Tier-1 tests in `tests/prebattleRoomFlow.test.ts`). Ball anims (and their
  RNG rolls) keep advancing through "fadingOut" specifically (source-
  confirmed: `Select_DestroyAllSprites` only runs once the fade completes,
  `battle_factory_screen.c:1512-1519`), then stop for good.
- **Next:** S5 is now fully `[x]`-ready per its own acceptance criteria
  (supervisor to confirm and tick `ROADMAP.md`, per protocol this worker
  doesn't edit it). A future session should pick up ISSUES #14 (the
  window-edge residual below) opportunistically, or move straight to S6
  (battle bring-up) off its already-banked groundwork
  (`docs/battle-bringup-notes.md`).
- **Notes:** **ISSUES #14 filed, not fixed:** a 4-row band at the shrinking
  reveal window's current top/bottom edge shows a wrong color for 8 frames
  of the accept-path closing animation, tapering to 0 by the time the
  window fully collapses (same halving-tapering shape as ISSUES #5's flash-
  bar family) - full pixel evidence + what was ruled out (not a window-
  bounds/table-timing bug, `bg3ColorWide` is flat there, `target2Color`'s
  `bg1Color` fallback is the likely site) is in the entry itself. Chased for
  a meaningful chunk of this session's budget before stopping to bank the
  two *confirmed* source-level bugs instead of guessing further at this
  third one. PAPERCUT: `prebattle-room-msgbox.json`'s own tile/palette data
  didn't reproduce the oracle's box art byte-for-byte when composited per
  the standard `DrawDialogueFrame` tile-index algorithm (source-read
  correctly, cross-checked against the extracted JSON) - colors were
  consistently one GBA 5-bit step brighter than the palette's own entries
  at several positions (border edges, text shadow), not yet root-caused.
  Worked around by baking the exact oracle pixels for the box's pre-text
  frame directly into a new asset instead of re-deriving from tiles/
  palette - functionally correct (0 diff on the box itself) but a future
  session should figure out why the tile-based derivation didn't match
  before extending it (e.g. to a 2nd map's message box) elsewhere. ~20 min
  lost this session on that specific investigation before the baking
  shortcut was chosen.

---

---

## 41 — ISSUES #12 root cause #2 fixed + ISSUES #13 root-caused and fixed; `confirm-decline.json` 54/67 → **67/67**, both entries DELETED

- **State:** `npm test` **328/328** (325→328, +3 in `tests/confirmDecline.test.ts`;
  the 324→325 en route was the #12 pin), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **54/67 → 67/67, byte-exact on every frame.**
  Both ISSUES #12 and #13 DELETED.
- **Did (Part 1, ISSUES #12 root cause #2):** Dense per-tick pixel diff of
  oracle vs app in the WIN_OPTIONS box (x176-224/y112-144, fresh
  `npm run compare` capture into `tools/compare/out/confirm-decline`)
  showed the YES/NO glyph text is already fully erased (replaced by plain
  window-background pixels) at closing `elapsed===1` — one tick before the
  old `elapsed<2` model — while the cursor-highlight sprite's own red
  pixels stay visible through `elapsed===2`, one tick *after* the old
  `cursorVisible` cutoff, only gone at `elapsed===3`. Fixed in
  `confirmReveal.ts`'s closing branch: `yesNoVisible` now only true at
  `elapsed===0`; `cursorVisible` true through `elapsed<=2`. Pinned
  (`confirmDecline.test.ts`, new ISSUES #12 describe block asserting all 4
  boundary ticks). This alone took `confirm-decline.json` to 55/67 (254
  byte-exact, 255 down from 973px to a 45px residual in the ball-grid area
  — see Part 2).
- **Did (Part 2, ISSUES #13):** RAM-probed `gSprites[]` (position-scanned
  the 6 ball sprites by their known screen centers, `35*i+32,64` —
  confirmed indices 0-5 = grid slots 0-5 exactly) and cross-checked
  `animCmdIndex`/`animNum` tick-by-tick against this engine's own predicted
  `ballAnims[]` state (scratch Python probe via the mgba-venv interpreter +
  a scratch Node replay of `core.ts`, both deleted after use) plus direct
  oracle-vs-app pixel sampling at each ball's grid position. Ground truth:
  starting at the closing phase's `elapsed 0->1` boundary, every
  still-active ball (slots 0/1; slot 2 is already null from the decline
  itself) needs exactly one more internal tick of stall on top of the
  decline's own already-modeled `Select_PrintSelectMonString` stall — a
  **permanent** one-tick downstream shift (proven by diffs recurring on
  every subsequent `MOVING_CMDS` transition all the way to frame 302, long
  after `confirmReveal` itself goes null — only explainable by a genuine
  internal-timer stall via the existing `ballAnimStall` skip-a-tick
  mechanism, ISSUES #6's family, not a brief display-only lag like
  `isRevealStallActive` which self-corrects and can't cascade). Fixed:
  `core.ts` now sets `ballAnimStall = activeSlotsBeforeAction` on the same
  `wasClosingAtZero`-derived tick the speciesNameFade activation already
  fires on. This alone closed 10 of the remaining 11 #13-listed frames plus
  255's residual (66/67). The 12th residual, frame 273 (3px at the 3
  `REVEAL_FLASH_CENTERS`, y=64, exact `FLASH_BLENDED_COLOR` value): the
  closing zoom-out's own final width-1 flash pixel outlives `confirmReveal`
  going null by exactly 1 tick — a pure OAM-teardown render lag, kept
  deliberately separate from (and NOT changing) `confirmReveal`'s own
  already-RAM-verified 20-tick un-reveal duration that gates cursor-input
  readiness. Fixed via a new `DraftScreenState.closingFlashResidual`
  boolean (same shape as this codebase's other post-hoc trailing-render
  fields, e.g. `rentConfirmRedraw`), set for exactly the tick
  `confirmReveal` transitions "closing"->null, consumed by
  `drawConfirmReveal`'s now-non-early-returning null branch. **67/67.**
  Both fixes pinned (`confirmDecline.test.ts`, 3 new describe blocks: the
  #12 boundary timing, the #13 `ballAnimStall` extension + frozen-state
  equality check, and the `closingFlashResidual` one-tick pulse).
- **Next:** ISSUES.md backlog is now EMPTY. S5's last piece: the YES-press
  accept path (exit fade → pre-battle room, `docs/prebattle-room-notes.md`).
  Then S6 off its banked dossier.
- **Notes:** all RAM probing (`tools/probe/ram-probe.py` for the ball-sprite
  position scan + `animCmdIndex` watch, addresses derived from
  `gSprites`'s linker symbol + `sizeof(struct Sprite)=0x44` from
  `reference/pokeemerald/include/sprite.h`) and pixel sampling (scratch
  Python/PIL over `tools/compare/out/confirm-decline`'s fresh captures) was
  scratch, deleted before finishing - nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` and the position-scan method from
  PROGRESS-archive #35 both worked as documented.

---

## 40 — ISSUES #12: hypothesis disproven + real root cause #1 found/fixed (declined-ball window-render hold); root cause #2 characterized, still open; `confirm-decline.json` 53/67 → 54/67

- **State:** `npm test` **324/324** (323→324, +1
  `tests/confirmDecline.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **53/67 → 54/67**; **frame 253 now byte-exact**
  (was 156px); frame 254 251px→95px, frame 255 1129px→973px (both
  shrunk, not yet closed). Step brief's acceptance bar (all of 253-255
  fixed, >=56/67) **not fully met** — see Notes for why this is the right
  stop point rather than a rushed table.
- **Did:** RAM-probed (`tools/probe/ram-probe.py`, scratch spec/output not
  committed) `confirm-decline.json`'s actual decline tick-by-tick and
  **disproved** the prior worker's "decline branch fires 1 tick early"
  hypothesis: `selectingMonsState`/`mons[2].selectedId`/`monPicAnimating`
  all flip together at the exact tick this engine's decline branch already
  fires — timing was already correct. `fadeSpeciesNameActive`'s real
  1-tick-later flip (and its existing `wasClosingAtZero` compensation) is
  confirmed correct and kept; comment updated to record the disproof.
  Pixel-diffed oracle vs app at frames 253-255 (`tools/compare/out/latest`)
  and found the REAL root cause: the un-reveal's "still-shown" hold already
  freezes the 3 front-sprite mon pics via `decliningSpecies`, but the wide
  window's *background ball-grid layer* did not get the same treatment,
  reading live (already-deselected) ball state instead. Verified exactly
  via `blend8` math against `pokeball.selectedPalette`/`grayPalette` (matches
  oracle's declined-ball RGB byte-for-byte with `selectedPalette`, confirmed
  frozen/non-animating across all 3 oracle frames, switching to gray only at
  frame 256). Fixed: new `ConfirmRevealState.decliningBallAnim` snapshot
  (`core.ts`, same hold window as `decliningSpecies`), consumed by
  `factoryDraftScreen.ts`'s `drawConfirmReveal` to override the window's
  ball array for the declined slot. 1 new Tier-1 test pinning the snapshot's
  elapsed-0-through-2 lifetime. Characterized (not fixed) a SECOND, separate
  residual now isolated at frames 254/255: the YES/NO box text + cursor
  highlight (`WIN_OPTIONS`, y112-144 — outside the mon-pic window's y32-96
  clip, unrelated to the window-shrink table) actually starts a multi-tick
  erase transition one tick earlier than modeled and the highlight persists
  one tick later than modeled; full evidence + probe plan filed in ISSUES
  #12 (re-scoped, not deleted). Full trail in the ISSUES #12 entry and
  commit history.
- **Next (supervisor-set, per the original brief):** ISSUES #12's remaining
  YES/NO box erase-transition timing (evidence + a concrete RAM-probe plan
  already filed), then ISSUES #13 (stretch, untouched this session — no
  cap time left after #12), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** stopped here rather than push into #12's second sub-bug because
  the erase-transition timing needs its own dense probe (sprite-invisible
  RAM read + per-tick pixel scan) to avoid guessing a wrong table under time
  pressure — a disproven hypothesis + a real, tested, committed partial fix
  is the honest stopping point per the brief's own instruction ("a clean
  disproof + re-filed entry is an acceptable outcome, a silent workaround is
  not"). All scratch RAM-probe specs/outputs and one scratch pixel-math
  script were deleted before finishing; nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` (committed last session) worked
  as documented, first try.

---

## 39 — ISSUES #11 fixed: species-name breathe (`Select_Task_FadeSpeciesName`) modeled exactly, RAM-pinned; `confirm-decline.json` 13/67 → 53/67

- **State:** `npm test` **323/323** (310→323, +13
  `tests/speciesNameFade.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions, the
  breathe never fires within any of their action budgets.
  `confirm-decline.json`: **13/67 → 53/67** (one short of the step brief's
  "exactly 54/67" target - see Notes for why, and why that's the right stop
  point rather than a sign the model is wrong).
- **Did:** Built `tools/probe/ram-probe.py` (generic, reusable per-tick
  RAM-probe over a button-segment script; committed per `PAPERCUTS.md`) and
  used it to pin `fadeSpeciesNameActive`/`fadeOut`/`coeffDelay`/`coeff`/
  `faceSpeciesNameDelay` tick-by-tick (`sFactorySelectScreen+0x2A2..0x2A9`,
  cross-verified against the already-RAM-confirmed `monPicAnimating` at
  `+0x2A0`) from both the anchor (idle) and `confirm-decline.json`'s actual
  decline. Confirmed the state machine matches `Select_Task_FadeSpeciesName`
  exactly, including a subtle quirk: `FADESTATE_RUN`'s `coeff === 0` check is
  unconditional, so the pre-onset ramp bounces through six 16-tick
  `FADESTATE_DELAY` pauses (1 RUN tick each) before `coeff` ever leaves 0 -
  103 ticks of active time, matching ROADMAP.md's empirically-observed
  "~104 cumulative cursor-mode ticks" idle-stable budget exactly (was never
  explained before). Cross-checked `BlendPalette` (reusing
  `paletteFade.ts`'s already-verified `blendComponentToBlack`) against a
  direct pixel probe: reproduces ISSUES #11's oracle sample (coeff 5 → RGB
  173,0,0) exactly, plus the full table (0..6 → 255,239,222,206,189,173,156).
  Found a genuine GBA render lag (RAM `coeff` steps at tick T, the rendered
  pixel only changes at T+1) - modeled via a `renderCoeff` field, same shape
  as this codebase's other queued-write lags (ISSUES #5, `paletteFade.ts`).
  New `src/engine/speciesNameFade.ts` (state + advance + activate/
  deactivate + `speciesNameColor`), wired into `core.ts`: deactivates on
  cursor-mode A (popup open), reactivates on B-close/OTHERS/non-confirming
  RENT-DESELECT directly, and on decline with an extra RAM-required 1-tick
  delay (see Notes and ISSUES #12's update). `factoryDraftScreen.ts` now
  renders WIN_SPECIES through a per-tick-blended palette instead of the
  fixed one. 13 new Tier-1 tests (`tests/speciesNameFade.test.ts`): waveform
  boundaries (7-tick cadence, peak-6 flip, 16-tick pause), the blend table,
  the anchor-onset tick, pause/resume (not reset) semantics, and the
  core.ts wiring. Full mechanics + evidence trail in commit `2013459`.
- **Next (supervisor-set, per the original brief):** ISSUES #12/#13 chases
  (both got new evidence this session, see below - still open, out of
  scope for this step), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** **why 53/67, not the brief's "exactly 54/67":** with #11's
  constant baseline gone, an **11th** ball-area frame surfaced - **273**
  (3px, `x=44/120/196,y=64`), the same y54-73 ball-region family as ISSUES
  #13's already-documented 10 frames but much smaller and previously
  invisible under the uniform ~129px species-color diff that used to cover
  256-306. Verified this can't be caused by this session's change (`git
  diff` of the speciesNameFade commit touches only `drawText`'s palette
  argument for the WIN_SPECIES window - zero lines touching `ballAnims`,
  `drawSprite`, or `drawConfirmReveal`), so it's a pre-existing #13-pattern
  gap the original characterization simply didn't enumerate, not a
  regression. Documented as new evidence in ISSUES #13 (not fixed - out of
  scope for this step) rather than chased further. Also appended new
  evidence to ISSUES #12: RAM shows `fadeSpeciesNameActive` truly flips one
  tick after this engine's OTHER decline effects, even though they're the
  same synchronous C statement in the source - likely evidence the existing
  decline branch itself fires 1 tick early (a candidate root cause for #12's
  253-255 residual), compensated here only for this module's own activation
  timing, not fixed at the source. All RAM/pixel probing beyond the
  committed `tools/probe/ram-probe.py` script itself (its one-off spec
  JSONs, a scratch pixel-cross-check script) was scratch, deleted before
  finishing. PAPERCUT: building the per-tick RAM-probe harness from scratch
  (symbol/pointer-deref plumbing, mGBA's exit-139/stdout-spew quirks) ate
  a large fraction of this session before any engine code was written -
  now moot for future sessions since `tools/probe/ram-probe.py` is
  committed and reusable (usage note in its own docstring), but worth
  flagging: ~25-30 min lost this session to (re)deriving it.

---

## 38 — S5 decline path landed: YES/NO cursor UP/DOWN + B/A-on-NO decline + 20-tick un-reveal, oracle-pinned; `confirm-decline.json` committed at 13/67 (54 frames individually attributed, none new/unexplained)

- **State:** `npm test` **310/310** (297→310, +13), `npm run build` green. All
  10 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json` **committed** at 13/67 frames byte-exact; every
  non-matching frame individually attributed in the commit message (none
  newly introduced by unrelated code).
- **Did:** Implemented `docs/confirm-flow-notes.md` §2/§3: YES/NO cursor
  UP/DOWN (repeat-gated toggle) and decline (B anywhere or A-on-NO, modeled
  once): same-tick `mons[2].selectedId`->0, `selectingMonsState` 4->3,
  message revert, YES/NO erased; new `confirmReveal.ts` "closing" phase for
  the 20-tick un-reveal, pixel-pinned tick-by-tick (NOT a mirror of the
  open direction; reuses `monPic.ts` `CLOSE_TABLE_B` values; new
  `decliningSpecies` snapshot field). `core.ts` input gate now keys off
  `confirmReveal` presence; re-pick works the tick it clears. Ball 3 leaves
  the rented set same-tick. 15 new Tier-1 tests
  (`tests/confirmDecline.test.ts`). Full mechanics in commit `9a8e96b`.
  **Trace:** `confirm-decline.json` (dense captures 240-306: DOWN dwell,
  decline, un-reveal, resettle, re-pick A) at 13/67 — frames 240-252 (the
  whole cursor-move + decline + early un-reveal) byte-exact; the 54 diff
  frames split into three groups, now filed as **ISSUES #11** (species-name
  breathe, frames 256-306 baseline — decline re-activates it immediately,
  so it is no longer dodgeable and must be modeled), **#12** (un-reveal
  first-ticks residual, 253-255), **#13** (periodic ball-area bumps on 10
  frames, stall-analogue suspect).
- **Next (supervisor-set):** ISSUES #11 (breathe model — required before
  `confirm-decline.json` can meet the trace bar), then #12/#13 chases, then
  S5's last piece: the YES-press accept path (exit fade → pre-battle room,
  `docs/prebattle-room-notes.md`). Then S6 off its banked dossier.
- **Notes:** all RAM/pixel probing (scratch `tools/compare/scratch/*.ts` +
  `bin/oracle`-backed dense traces, direct RGB sampling via Node/pngjs) was
  scratch, deleted before finishing - nothing uncommitted left beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `tests/confirmReveal.test.ts` (renamed
  field) + `tools/compare/traces/confirm-decline.json` + docs changes.
  PAPERCUT: pixel-archaeology on a brand-new state transition (no RAM-probe
  harness available this session, oracle screenshots only) ate a large
  fraction of the session's budget - a reusable RAM-probe script (the
  dossier mentions one built ad hoc last session at
  `sFactorySelectScreen+0x2A0` for `monPicAnimating`) would have cut this
  significantly; worth banking as a real tool next time this kind of
  RAM-verified-dossier-to-pixel-exact-implementation gap comes up.

---

## 37 — Supervisor wind-down: session end 2026-07-17 ~21:00

- **State (verified this minute):** `npm test` **297/297**, `npm run build`
  green, working tree clean. Traces (all re-run by the supervisor at
  wind-down): `anchor` 1/1, `draft-cursor` 13/13, `draft-menu` 38/38,
  `draft-menu-slot6` 66/66, `summary-info-onix` 122/122,
  `summary-info-magby` 132/132 — all 0 diff — plus `rent-slot1` 125/139,
  `rent-3picks` **157/190** (new this session), `confirm-flow` **79/95**
  (new this session), every diff frame in all three individually
  attributed to ISSUES #5's settled pattern. ISSUES.md backlog is EMPTY
  of open bugs (only the #5 settled-policy note + mechanism record
  remain). ROADMAP: S5 slices 1-3 complete; S5 remainder = decline path
  (B/NO) + YES-press exit fade into the pre-battle room
  (`docs/prebattle-room-notes.md`).
- **Session summary (supervised, ~16:08-21:00):** 8 worker steps (7 main
  lane + 1 worktree lane), all supervisor-verified. Landed: (1) ISSUES #7
  resolved after a multi-session saga — the minimal-pair probe step proved
  the HAUNTER "contradiction" was a measurement artifact (a 3rd rent exits
  cursor mode same-tick, so the lone count=3 data point never happened),
  the species-keyed stall safe-list {BAYLEEF, HAUNTER} landed RAM-pinned;
  (2) per-slot displayTile lag fix; (3) cursor-redraw fast path with 2+
  rented balls + OPEN_TABLE_B degenerate-window fix, shipping
  `rent-3picks.json`; (4) confirm-flow state machine + reveal render
  (`confirmReveal.ts`), with five further render/timing bugs root-caused
  across ISSUES #8/#9/#10 (incl. a real `font.ts` glyph-width bug and a
  previously-unmodeled 4th stall source), shipping `confirm-flow.json`;
  (5) ISSUES #5's rent-slot1 re-time question closed empirically (8
  candidates all worse — attribution fallback is now policy). ISSUES
  #7/#8/#9/#10 all closed and deleted.
- **Next:** S5 remainder, in order: the decline path (B/NO,
  `docs/confirm-flow-notes.md` §3), then the YES-press exit fade +
  pre-battle room + attendant dialogue (`docs/prebattle-room-notes.md`,
  scene already extracted + composite-verified). Then S6 off its banked
  dossier (`docs/battle-bringup-notes.md`) + battle-1 assets.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  the one worktree-lane step (rent-slot1 re-time sweep) produced a clean
  negative result and its branch was removed unmerged (no commits). The
  user's own `run-supervisor.sh` remote-control edit was committed on
  request (`c52d42a`).

---

## 36 — ISSUES #10 root-caused and fixed (RAM/oracle-pixel-verified); `confirm-flow.json` COMMITTED — S5's confirm-reveal render surface is now trace-pinned; ISSUES #9 and #10 both deleted

- **State:** `npm test` **297/297** (296→297, +1 net in
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 pre-existing
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. **`confirm-flow.json` committed** at 79/95
  frames matched, the 16 non-matching frames individually attributed below.
- **Did:** Built a scratch oracle trace (`rent-3picks.json`'s 19 segments +
  90-tick idle, dense `captureFrames` 195-230) and sampled RGB directly at
  the 2 flash-bar centers unshared with any other on-screen element (x=44,
  x=196 - x=120 was ruled out, it sits under an unrelated always-present
  element that coincidentally shares `FLASH_BLENDED_COLOR`) plus a clean
  edge probe at x=8-20 (bar1's own left edge vs the wide window's fixed
  `WIDE_WINDOW_LEFT=16` - a value no flash-bar width can ever produce, the
  one unambiguous discriminator between "bar still on screen" and "window
  opened"). Found: the true flash-width sequence
  (`1,1,4,4,8,8,16,16,32,32,64,64` - unchanged, every value and the doubling
  cadence pixel-confirmed exact) starts exactly 1 tick later than modeled -
  the engine's `elapsed=-1` (existing 1-tick OAM-creation lag) needed a
  *second* hidden tick before `FLASH_WIDTHS[0]` applies, matching the shape
  `monPic.ts`'s own `OPEN_TABLE_*` already models (multiple hidden ticks
  before its first `flash(1)`). Cross-verified against the window-growth
  boundary too: with the extra hidden tick, `WINDOW_STEPS`' previously-added
  2nd `{64,65}` degenerate hold (PROGRESS #33) becomes redundant - dropping
  it (12→11 entries) is the exact 1-tick compensation needed to keep the
  total confirm-to-"shown" duration unchanged, so every already-RAM-verified
  downstream absolute tick (ISSUES #9's ball-anim/stall timing) stays where
  it was; row-scanned BG3 wash content at x=120 for frames 222-226 confirmed
  the growth step (60,69) lands exactly 1 tick after the single degenerate
  hold, not 2. Fixed in `confirmReveal.ts` (`FLASH_WIDTHS` now indexed
  `elapsed-1`, hidden below `elapsed<1`; `WINDOW_STEPS` lost its duplicate
  hold; `advanceConfirmReveal`'s flash→window transition threshold bumped by
  1 to match) and re-pinned in `tests/confirmReveal.test.ts` (boundary
  ticks shifted, 1 test added for the new 2nd hidden tick). Rebuilt
  `confirm-flow.json` (same recipe, `captureFrames` 185-279) and ran
  `npm run compare`: frames 210-279 (the entire flash + window + shown/
  YES-NO-dwell portion, where every ISSUES #9/#10 diff lived) are now
  **byte-exact**. The only remaining diffs, frames 189/190/191/192/193/194/
  195/196/197/198/199/201/203/205/207/209 (107/949/2892/512/512/512/512/512/
  448/64/32/16/8/4/3/1px), exactly reproduce ISSUES #5's own pre-documented
  pattern (tapering 189→199 then the halving tail 199/201/203/205/207/209 -
  32/16/8/4/3/1px, verbatim-matching PROGRESS #35's own prior characterization
  of this same window) - the 3rd pick's own popup-close catch-up, unrelated
  to this session's fix (untouched code path). Committed the trace with each
  attributed frame listed in the commit message. Full 9-trace suite +
  `confirm-flow.json` + `npm test` + `npm run build` all green (counts
  above); ISSUES #9 and #10 both deleted (git keeps history).
- **Next:** S5's confirm-reveal render surface is now fully trace-pinned
  modulo ISSUES #5 (policy-settled, no further fix attempts). S5's remainder:
  the decline path (stretch goal, still open), the YES-press exit fade +
  pre-battle room (`docs/prebattle-room-notes.md`), then S6.
- **Notes:** all RAM/pixel probing (`bin/oracle run` + direct RGB sampling
  via a scratch Node script, `/tmp/issue10/`) was scratch, deleted before
  finishing - nothing uncommitted left beyond the intended
  `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts` +
  `tools/compare/traces/confirm-flow.json` + docs changes. PAPERCUT: none
  this session.

---

## 35 — ISSUES #9's ball-anim drift root-caused and fixed (2 independent display-lag bugs, both RAM-verified); `confirm-flow.json` STILL not committed — the fix cleared every ball-OBJ diff but exposed a 5th, unrelated gap in confirmReveal's own flash-bar timing, filed as new ISSUES #10

- **State:** `npm test` **296/296** (292→296, +4), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** RAM-probed all 3 ball slots simultaneously (`gSprites[]` located
  by known screen position, `animCmdIndex`/`animNum`/`data[0]` every tick)
  across confirm-flow.json's exact button script (rent-3picks.json's 19
  segments + 90-tick idle, 280 ticks) and cross-correlated tick-by-tick
  against `ballAnim.ts`'s internal state for the same replay (scratch Python/
  TS dump scripts, not committed). Found two independent, clean,
  state-derivable causes, both display-only (RNG-critical internal state
  untouched): (1) slot 0's `displayLagTicks=2` (ISSUES #7) was permanent,
  but RAM-proved to apply only during its *first* moving cycle -
  `REST_INTERNAL_OFFSET`'s own extra tick already resyncs slot 0's internal
  `cmdIndex` with RAM the moment it first enters "resting" (RAM-confirmed:
  slot 0's *second* moving cycle matches RAM's own `animCmdIndex` exactly,
  transition for transition, zero drift) - added `BallAnimState.hasRested`,
  slot 0 now uses lag 2 only while `!hasRested`, lag 1 after (matching every
  other slot always). (2) A previously-unmodeled 4th stall source -
  `Select_CreateChosenMonsSprites()`'s own per-frame cost, same shape as the
  already-modeled LEFT/RIGHT/RENT-confirm text-print stalls
  (`ballAnimMultiBall.test.ts`'s root cause) - adds 1 more display-lag tick
  to every currently-active ball, landing near the reveal's
  window-fully-grown hold (RAM-confirmed via all 3 slots' own next
  `cmdIndex`-transition boundary after that point, all consistent with one
  shared, screen-level event, empirically bounded to a 4-tick window given
  this trace's own granularity) - added `confirmReveal.ts`'s
  `isRevealStallActive` predicate, read by `core.ts`'s ball-anim loop.
  Exhaustive cross-check: **0 `displayTile` mismatches across all 3 slots
  for the full 280-tick window** (down from 15 pre-fix). Pinned with 4 new
  Tier-1 tests (`ballAnimDisplayLag.test.ts`). Committed
  (`src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts`).
  **Trace rebuild (not committed):** rebuilt `confirm-flow.json` (same
  recipe as before) and ran `npm run compare`: frames 223-279 (the entire
  window-hold + shown/YES-NO-dwell portion, where every prior ball-OBJ diff
  lived) are now **byte-exact**. Frames 189-209 remain diffing but match
  ISSUES #5's own already-accepted pattern exactly (tapering 189→199 then a
  halving tail 199/201/.../209 - 32/16/8/4/3/1px - the 3rd pick's own
  popup-close catch-up). Frames 210-222 (confirmReveal's own `flash` phase)
  still diff, but pixel-sampled and confirmed **not** ISSUES #5 (a clean,
  deterministic, always-same-direction 1-tick-early shift on *every*
  `FLASH_WIDTHS` doubling step, not a chaotic absolute-tick-dependent
  hardware race) - a genuinely new, unrelated gap in the reveal's own
  flash-bar tick bookkeeping, filed as **ISSUES #10** with the full
  pixel-level evidence. Per the brief's stop condition (residual diff not
  attributable to #5), did not commit the trace.
- **Next:** ISSUES #10 (RAM/register-probe `confirmReveal.ts`'s flash-phase
  tick bookkeeping - likely one more hold tick, same family as this file's
  already-fixed `WINDOW_STEPS` gap, or an `elapsed`-offset bug rather than
  the shared table's values), then rebuild and commit `confirm-flow.json`
  clean modulo ISSUES #5's frames 189-209. One unrelated, pre-existing,
  out-of-window gap also surfaced at absolute tick 114 (a `ballAnimStall`/
  display-lag-chain interaction during slot 0's first cycle, outside
  confirm-flow.json's captured range, already baked into rent-3picks.json's
  long-standing 157/190 count) - not chased, no evidence yet of a clean
  rule. After #10: the decline path (stretch goal, still open), then the
  YES-press exit fade + pre-battle room (`docs/prebattle-room-notes.md`),
  S6.
- **Notes:** all RAM probing (position-scanned `gSprites[]`, same recipe as
  ISSUES #6/#7's own) and the trial `confirm-flow.json` were scratch -
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts` changes and the `ISSUES.md`/
  `PROGRESS.md` docs. PAPERCUT: none beyond the usual RAM-probe setup cost
  (mgba-venv interpreter segfaults at teardown, exit 139, benign, already
  documented).

---

---

## 34 — ISSUES #8 CLOSED: all 3 remaining render gaps root-caused and fixed (gap 1 reattributed to #5, gap 2 was a 1-tick-early phase transition not a per-slot stagger, gap 3 was a highlight/text draw-order bug plus a real font.ts glyph-overrun bug); `confirm-flow.json` still NOT committed — rebuilding it surfaced a 4th, distinct gap, filed as new ISSUES #9

- **State:** `npm test` **292/292** (291→292, +1), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby
  132/132, summary-info-onix 122/122) — zero regressions. `confirm-flow.json`
  **not committed** (see below).
- **Did:** Rebuilt `confirm-flow.json` (rent-3picks.json's exact prefix +
  90-tick idle, dense captures 185-279) and diagnosed each of #8's 3 gaps
  in priority order. **Gap 1 (frames 190/191, up to 2922px):** cross-checked
  against this same trace's own ball1/ball2 closes (frames 38/39, 114/115 -
  plain deselect closes, unrelated to the reveal) and found byte-for-byte
  identical bbox/magnitude/failure shape, matching ISSUES #5's own
  mechanism record verbatim ("up to 3343px/8.71%"). The 3rd pick's popup
  close is the same `CloseMonPic` path every RENT/DESELECT confirm uses
  (`core.ts`'s RENT branch, unconditional) — never a confirmReveal bug, just
  #5's already-accepted WIN0V hardware-cycle race hitting this instance
  harder. The prior session's "ruled out" call compared only against #5's
  steady 512px frames, not its own documented peak transient frames. No
  code change; #8 updated instead of "fixed" for this lead. **Gap 2 (frame
  233, 4058px):** a fresh RAM probe (`gSprites[]` scanned by screen
  position, same recipe as before) confirmed the previously-recorded slot0-
  vs-slots1/2 sprite-creation stagger is real *in RAM* — but diffing
  consecutive oracle PNGs across the transition shows all 3 front sprites'
  actual pixels appear on the exact same rendered frame, one tick later
  than this engine modeled. The RAM-level stagger is fully absorbed by the
  same BuildOamBuffer-before-RunTasks lag documented elsewhere in this
  codebase and never reaches the screen — modeling 3 per-slot flags would
  have been wrong. Fixed by adding one more hold tick to `WINDOW_STEPS`
  (11→12 entries); `monsAndYesNoVisible` stays a single flag.
  **Gap 3 (frame 249, 81px):** two bundled causes. (a) `drawConfirmReveal`
  drew the YES/NO text *before* the cursor-highlight sprite, opposite the
  working RENT/SUMMARY/OTHERS menu's order in the same file — the highlight
  blotted out "YES"'s own letters when the cursor sat on that row; fixed by
  reordering. (b) A real `font.ts` bug, unrelated to confirmReveal: `drawText`
  painted every glyph's full 16px template cell with the background color
  when `colors.bg != 0`, not just the glyph's own proportional advance width
  — invisible everywhere else (always landing on already-matching
  background) except the last character of the one message long enough to
  reach a border ("Are these three POKéMON OK?"'s "?", 2px short of the info
  window's own yellow frame). Cross-checked against
  `reference/pokeemerald/src/text.c:608-609` (glyphWidth clamped to the
  glyph's own width before `GLYPH_COPY`) and this font's own extracted
  bitmap data (every glyph's ink is confined to columns 0..width-1) —
  confirmed the clamp is safe for every character. Fixed by bounding the
  fill loop to `font.widths[code]`. Frame 189 (107px) re-checked last per
  the brief: unchanged, byte-identical to rent-3picks.json's own already-
  #5-attributed frame 189 — not a 4th gap. **New finding (ISSUES #9):**
  with all 3 of #8's gaps fixed, `confirm-flow.json` still isn't clean
  modulo #5 — periodic small diffs (36-180px) appear in individual rented
  balls' own 32x32 OBJ regions (all 3 slots implicated at different times)
  scattered through both the reveal window and the ~90-tick settled dwell.
  Confirmed pre-existing (byte-identical bboxes already present in the
  *pre-fix* compare run, just +30px from the now-fixed font bug) and
  confirmed NOT ISSUES #5 (wrong region/shape) — it's `ballAnim.ts`'s model
  being exercised, for the first time in any committed trace, by a long
  undisturbed 3-ball idle with zero cursor/menu input to ever resync it
  (`ballAnimStall` stays `[]` the whole window). Filed as ISSUES #9 with
  full bbox/frame evidence rather than folded into #8's now-resolved scope.
- **Next:** ISSUES #9 (RAM-probe `gSprites[]`/`ballAnim.ts`'s internal state
  across a dense 3-ball idle window, same recipe as the now-closed #6/#7),
  then rebuild and commit `confirm-flow.json`. After that: the decline path
  (stretch goal, still open), the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM probing (`gSprites[]` position-scan, per the last
  worker's papercut note) and the trial `confirm-flow.json` were scratch —
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/confirmReveal.ts`/`factoryDraftScreen.ts`/`font.ts` +
  `tests/confirmReveal.test.ts` changes. PAPERCUT: none this session beyond
  the usual RAM-probe setup cost (mgba-venv interpreter segfaults at
  teardown, exit 139, benign — already documented in
  `tools/extract/inspect-anchor.py`'s own docstring, cost a few minutes to
  remember before checking stdout instead of the exit code).

---

## 33 — ISSUES #8 leads 1-2 CLOSED (real BG3 wide-window content + RAM-verified window-hold fix, both committed); lead 3 (`confirm-flow.json`) STOPPED short of commit per the brief's stop condition — diffs shrank by ~4-10x but a 3rd, unrelated-looking gap remains

- **State:** `npm test` **291/291** (290→291, +1 net in
  `tests/confirmReveal.test.ts` — one test split into two to cover the new
  boundary), `npm run build` green. All 9 committed traces re-verified at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1 125/139,
  rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. `confirm-flow.json` **not committed** (see
  below).
- **Did:** **Part 1 (BG3 ground truth):** RAM/VRAM-dumped BG3's actual
  tilemap (mapBaseIndex 27 → VRAM 0x0600D800, rows 4-11) during the wide
  reveal window. Found (and cross-confirmed against source,
  `Select_InitBgs`, `battle_factory_screen.c:1202-1206`) that the wide
  window's content is literally 3 copies of the *already-extracted* narrow
  8x8 `mon-pic-bg.json` tile block, placed at 3 disjoint tile-column anchors
  (x=16/88/160) with 2 transparent 8px gaps (x80-88, x152-160) — not a
  continuous 64px-period tiling as the prior slice's `bg3ColorTiled`
  approximated (which was also mis-anchored, wrapping relative to the
  narrow window's own x88 origin instead of the wide window's x16). **Part
  2 (tick boundaries):** RAM-verified `confirmReveal.ts`'s phase boundaries
  via direct `REG_DISPCNT`/`REG_WIN0V` reads plus `gSprites[]` located by
  known screen position (robust against `FactorySelectScreen` struct-offset
  guessing, which a first attempt got wrong by 2-6 bytes). Flash phase (13
  ticks incl. 1-tick creation lag) confirmed exact, no change. Window phase:
  found `Select_Task_OpenChosenMonPics`' case0 (WIN0 on) and case1 (`ShowBg
  (3)`) are 2 separate ticks with NO window movement between them, not 1 as
  implemented — real hardware holds the degenerate (64,65) window for 2
  ticks before the 8-tick growth to (32,96) starts. Fixed: `WINDOW_STEPS`
  gained an extra `{64,65}` hold entry (11 entries total, same as before —
  only the content of indices 1/8/9/10 shifted, so the overall
  flash→window→shown tick budget is unchanged). Also independently
  confirmed the BG3 wash stays visible **permanently** through the settled
  YES/NO idle (pixel-sampled several frames), not just during window
  growth — `confirmReveal.ts`'s existing "shown"-phase window field already
  modeled this correctly, no change needed. **Extractor + render (both
  committed):** `extract-factory-screen.ts` now emits a `wideTilemap`
  (26x8) field in `mon-pic-bg.json`; `monPicRender.ts`'s `bg3ColorTiled` is
  replaced with `bg3ColorWide` (reads the real geometry, no more tiling
  approximation). Narrow single-popup path (`bg3Color`, `mon-pic-bg.json`'s
  original `tilemap` field) untouched. **Part 3 (trace, not committed):**
  rebuilt `confirm-flow.json` (rent-3picks.json's exact button prefix +
  idle to frame 279) and ran `npm run compare`: diffs dropped sharply (was
  1000-5000px/2-14% starting ~confirm+34; now mostly 30-950px/0.1-2.5%,
  frames 185-188 clean) but two frames (191: 2922px, 233: 4058px) are still
  in the old magnitude range, and none of the remaining diffs match ISSUES
  #5's own x88-151-confinement signature (different bboxes, solid-wrong-color
  failure shape rather than partial-window jitter) — not attributable to
  that policy. Bboxed and sampled 5 representative frames (189/190/191/233/
  249); found what looks like 3 *different* gaps (a yellow-pixel mismatch
  early in the flash phase, likely in the 3rd pick's own un-exercised
  post-frame-189 `monPic` close rendering; a probable contributor at the
  "shown" transition tied to a newly-found 1-tick sprite-creation stagger
  between chosen-mon slot0 and slots1-2 that this engine's single
  `monsAndYesNoVisible` boolean doesn't model; and an unrelated red-vs-white
  mismatch near the YES/NO box in the steady dwell). Per the brief's stop
  condition, did not commit the trace; ISSUES #8 rewritten with the full
  bbox/sample evidence and a renumbered lead list for whichever of the 3 a
  future session tackles first.
- **Next:** ISSUES #8's 3 remaining leads (frame 190/191's yellow mismatch,
  the slot0 sprite-creation stagger, frame 249's red-vs-white mismatch) —
  tackle independently, since evidence suggests 3 unrelated bugs, not one.
  Once clean, commit `confirm-flow.json` and delete ISSUES #8. After that:
  the decline path (stretch goal, still open), then the YES-press exit fade
  + pre-battle room (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM/VRAM probing was scratch (`/tmp/confirm_probe*.py`,
  deleted before finishing); the trial `confirm-flow.json` was written then
  removed (not committed) once compare showed remaining diffs — nothing
  uncommitted left in the tree beyond the intended engine/extractor/test
  changes. PAPERCUT: ~15 min lost chasing `FactorySelectScreen`'s struct
  offsets by hand (computed `monPics[]`/`monPicAnimating` byte positions
  from the C struct definition directly, got them wrong by 2-6 bytes twice)
  before switching to a struct-offset-independent approach (scan `gSprites[]`
  for sprites at known screen positions instead) — worth reaching for the
  position-scan method first next time a sprite/task needs locating, rather
  than hand-deriving struct byte offsets from source.

---

## 32 — S5 slice 3 (confirm flow): state machine + RNG landed and Tier-1-pinned; render/trace STOPPED short of commit per the brief's own stop condition (wide-window pixel content not verified) — new ISSUES #8

- **State:** `npm test` **290/290** (276→290, +14 in new
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 committed
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks **157/190**, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** Implemented the 3rd-RENT-confirm → reveal → settled YES/NO idle
  state machine (`src/engine/confirmReveal.ts`, wired into `core.ts`/
  `factoryDraftScreen.ts`): cursor/menu input permanently locks out once
  `isMonsConfirmed` (`selectingMonsState > FRONTIER_PARTY_SIZE`, same tick as
  every other confirm — no new logic needed there); the 3rd pick's own
  popup close reuses `monPic.ts`'s existing `CLOSE_TABLE_B` unchanged; once
  `monPic.phase === "closed"`, a new `ConfirmRevealState` machine runs the
  border-sprite flash-zoom at 3 positions (x=44/120/196, reusing the exact
  same 1/1/4/4/8/8/16/16/32/32/64/64 affine-anim widths `monPic.ts`'s own
  flash already pins — verified via source read,
  `sSpriteTemplate_Select_MonPicBgAnim` is literally the same sprite
  template/anim table used by both), then a full-width WIN0 window
  (x16-224, vs the single popup's x88-152) growing (64,65)→(32,96), then
  the 3 chosen-mon front sprites (ordered by `selectedId`, not slot) +
  YES/NO box appear together, cursor highlight 1 tick later (same
  window-copy-vs-OAM lag pattern as everywhere else in this screen).
  Exact tick counts (13 flash incl. 1-tick creation lag, 8 window-growth +
  3 hold, cursor +1) were oracle-probed this slice (dense capture diffing,
  scratch, not committed) against `rent-3picks.json`'s own button prefix
  extended with idle — close settles at confirm+~20 (unchanged), reveal
  settles around confirm+45, matching `docs/confirm-flow-notes.md`'s
  tick+43/44/45 pinning closely. **RNG (mission-critical per the brief):
  zero new logic** — the ball-anim loop in `core.ts` was already
  unconditional (runs regardless of cursor/menu/confirmed state) and this
  slice's confirmed-gate deliberately wraps only the cursor/menu *input*
  branch, not the ball-roll loop, so the existing RAM-verified RNG stream
  (`ballAnim.ts`, untouched) continues exactly through the whole window by
  construction — pinned with a Tier-1 regression test asserting the stream
  never merely advances 1/tick (proving ball-roll draws keep firing) and
  stays fully deterministic. 14 new Tier-1 tests in
  `tests/confirmReveal.test.ts` pin: `isMonsConfirmed`'s threshold, input
  lockout, the `confirmReveal` trigger tick, the full phase-boundary
  sequence (flash widths, window steps, shown/cursor timing), pick-order
  species, and the two RNG properties above.
  **Render/trace (not committed):** built a candidate `confirm-flow.json`
  (rent-3picks.json's exact button prefix + idle to ~280) and ran `npm run
  compare` — diverges hard (1000-5000px, 2-14%) starting at the wide
  window's opening (~frame 223) through the settled YES/NO idle, **well
  outside ISSUES #5's x88-151-confinement pattern** — not attributable to
  that policy. Root cause: `mon-pic-bg.json`'s extracted tilemap is only
  8x8 tiles (scoped for the single-popup window before this slice); the
  reveal's 208px window is approximated by tiling that same pattern every
  64px (`monPicRender.ts`'s new `bg3ColorTiled`), which doesn't match the
  real wide-window BG3 content. Per the brief's stop condition, did not
  commit the trace; filed **ISSUES #8** with the specifics. Decline path
  (B/NO) is unimplemented — explicitly a stretch goal per the brief, and
  time ran out before reaching it.
- **Next:** ISSUES #8: RAM/VRAM-dump the wide-window BG3 content directly
  (not tiled-approximated) and independently RAM-verify `confirmReveal.ts`'s
  tick boundaries (byte-level, like `monPic.ts`'s tables), then rebuild
  `confirm-flow.json` and commit once clean. After that: the decline path
  (stretch goal, still open), then the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`, explicitly next slice per the brief), S6.
- **Notes:** all oracle probing this session was scratch (`/tmp/confirm_probe*`,
  deleted before finishing) — nothing uncommitted left in the tree beyond
  the intended `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts`
  + small exports added to `monPicRender.ts`/`factoryDraftScreen.ts`.
  PAPERCUT: spent a long time re-deriving the reveal's exact source
  mechanics (two chained tasks, shared `MonPicBgAnim` sprite template
  between the single-popup and 3-mon-reveal paths) from
  `battle_factory_screen.c` directly before writing any code — worth doing
  again for future slices (the dossier's own prose was occasionally
  ambiguous about which task owns which window/sprite), but it ate most of
  the session's budget and left too little time to also nail the wide
  window's exact pixel content; a future session should budget oracle
  RAM-probing time for the render layer *before* implementation, not after.

---

## 31 — ISSUES #7 remainder CLOSED: frames 152/153 root-caused and fixed (cursor-redraw catch-up accelerates with 2+ rented balls), plus a second bug found+fixed along the way (frame 92/168: `OPEN_TABLE_B`'s "extra hold" tick was a wrong flash frame, should be a degenerate 1px window); `rent-3picks.json` committed at 157/190, every remaining diff frame individually attributed to ISSUES #5

- **State:** `npm test` **276/276** (273→276, +3), `npm run build` green.
  All 8 previously-committed traces re-verified UNCHANGED at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, rent-slot1 **125/139**,
  summary-info-magby 132/132, summary-info-onix 122/122).
  `tools/compare/traces/rent-3picks.json` **committed** at **157/190**.
- **Did:** Rebuilt the exact 3-pick shape from ISSUES #7 (confirms@37/113/
  189, 36-idle+2RIGHT between rents, dense captures 0-189) and reproduced
  the prior session's diff set exactly, confirming it was stable. Tested
  the assigned hypotheses in order: (1) "perpetual species-name breathe" for
  frame 152 - FALSE, ruled out immediately (frames 154-189 are clean, a
  perpetual breathe would keep diffing them). (2) Cross-checked the FIRST
  RIGHT (1 ball rented): its own +1/+2 frames (76/77) are clean, confirming
  the single/zero-ball 3-tick-staggered redraw timing
  (`CursorRedrawState`'s existing doc) is untouched. (3) Overlaid
  oracle-vs-app crops at frames 152/153: **frame 152** - oracle already
  shows "BAYLEEF" (species text) where the app still shows "MAGBY"; **frame
  153** - oracle's cursor arrow is already under slot 2 where the app's is
  still under slot 1. Both are the SAME mechanism: with 2+ balls already
  rented at the move tick, the whole redraw pipeline lands 1 tick sooner -
  species text catches up alongside category (`elapsed>=1`, not staggered
  to `elapsed>=2`) and the arrow settles at `elapsed>=2` instead of
  `elapsed>=3`. **Root-caused as a clean, state-derivable rule** (not a
  chaotic race): confirmed absent with exactly 1 rented ball (frames 76/77
  clean), present with exactly 2 (frames 152/153, both fixed). Fixed by
  adding a `fast: boolean` field to `CursorRedrawState`, set from
  `activeSlotsBeforeAction.length >= 2` at move time (`core.ts`), consulted
  by `advanceCursorRedraw`'s settle threshold and the species-catch-up
  condition (`factoryDraftScreen.ts`). Pinned with 4 new Tier-1 tests
  (`tests/draftScreen.test.ts`) against both the isolated `advanceCursorRedraw`
  transition and a full `tick()` integration (rent slot0, RIGHT with 1
  ball -> `fast:false`; rent slot0+slot1, RIGHT with 2 balls -> `fast:true`).
  **Along the way, found frame 92 was a diff too** (not mentioned in the
  brief's "already decomposed" list - a gap in the prior sessions' own
  accounting, not a new regression) - **byte-identical bbox/pixel-values to
  frame 168** (both `x92-146/y64`, oracle showing ball-art gradient colors,
  app showing a flat `FLASH_BLENDED_COLOR` (194,233,226) fill). RAM-probed
  (`REG_DISPCNT`/`WIN0V` direct reads) around ticks 88-96: real hardware's
  `DISPCNT` WIN0 bit sets at tick 91, its BG3 bit at tick 92 - i.e.
  `Task_OpenMonPic`'s case0/case1 have already fired by frame 92, but the
  window hasn't started growing yet (still the initial `top=64,bottom=65`
  degenerate 1px window from case0). `monPic.ts`'s `OPEN_TABLE_B` modeled
  this "extra hold" tick (idx15, oracle-measured but never explained) as a
  3rd flat `flash(64,true)` frame; it's actually `win(64,65)` - a real,
  blended 1px window, not the flash sprite. Fixed by replacing that table
  entry; pinned by updating `tests/monPic.test.ts`'s variant-B open test to
  assert the window shape at idx15 instead of a 3rd flash tick. This fix
  incidentally cleared frame 168 too (the exact same table index, hit again
  by the 3rd ball's own open) - **frames 37-57/113-133 (rent-close jitter,
  unaffected, byte-identical to before), 92/152/153/168 (all now CLEAN)**.
  Only **169/170/189** remain, matching the brief's own pre-classification
  ("#5-attributable") exactly: `169` (x88-151/y56-72, 512px) and `170`
  (x88-151/y52-76, 512px) are the same magnitude/location as every other
  accepted ISSUES #5 window-growth frame (e.g. rent1's own 117/118/119/120,
  each 512px in the same x88-151 window); `189` (x93-110/y55-68, 107px)
  matches the brief's own predicted bbox verbatim. Committed
  `rent-3picks.json` (0-189 dense) with all 33 remaining diff frames
  individually attributed in the commit message.
- **Next:** confirm-flow implementation (`docs/confirm-flow-notes.md`),
  exit sequence (`docs/prebattle-room-notes.md`), and S6 remain queued
  behind S5's completion per entry 26 - S5's own acceptance criterion (a
  committed 3-pick trace) is now met modulo the ISSUES #5 window-jitter gap
  (root-caused as an unfixable-at-this-engine's-level hardware cycle race,
  policy settled).
- **Notes:** all RAM probing was scratch (`/tmp/probe_regs.py`,
  `/tmp/probe_ballstate.ts`, `/tmp/probe_monpic.ts`, deleted before
  finishing; trace JSON under `/tmp`) - nothing uncommitted left in the
  tree beyond the final `tools/compare/traces/rent-3picks.json`. Also
  deduplicated an accidental exact-duplicate "## 28" entry in this file
  during the archive rotation (both copies were byte-identical; kept one).
  PAPERCUT: manually decoding PNG filters in pure Python to bbox a diff
  cost ~10 min before switching to PIL (already a dev dependency via the
  system Python, not this project's own toolchain) - worth reaching for
  PIL/Pillow first next time instead of hand-rolling a PNG decoder for
  quick bbox/pixel-dump scripts.

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

## 24 — S5 slice 2 (worker, capped): STOPPED before implementing a fix — ISSUES #7's tick-204 mystery fully root-caused (RAM-DISPROVEN: `ballAnimStall`'s LEFT/RIGHT branch over-stalls once 2+ balls are active), but the exact replacement rule needs one more RAM data point before it's safe to code

- **State:** unchanged from entry 23 — `npm test` **264/264**, `npm run
  build` green, all traces untouched. **No `src/`/`tests/` changes this
  session, no commits** — per the brief's own fallback ("if the rule
  resists within the cap, commit nothing half-wired, update ISSUES #7,
  stop"), since the corrected rule isn't yet pinned down to more than 2
  data points (see ISSUES #7).
- **Did:** Found a bug in every prior session's own RAM-probe methodology:
  the `struct Sprite` offsets cited for `animNum`/`animCmdIndex`/`data[0]`
  (this entry's own history, `ISSUES.md` #7) don't match
  `reference/pokeemerald/include/sprite.h:194-242` — `animNum`/
  `animCmdIndex` were swapped and `data[0]` was read as a `u8` instead of a
  2-byte `s16`. Rebuilt the RAM probe (`EmeraldOracle`, corrected offsets)
  against entry 21/23's own exact original repro (confirms at press-ticks
  37/113/189) and cross-referenced every `MOVING_CMDS`-cadence transition
  against its zero-stall-expected tick, per ball, per trigger. Result: the
  tick-204 divergence is fully explained — ball 0's 2nd roll (a FAILURE,
  same shape as the single-ball baseline's own frame-201 FAILURE,
  `tests/ballAnim.test.ts`) lands at exactly 201 + (3 real stalls) = 204,
  bit-exact with RAM. But only **3** of ball 0's 4 previously-assumed
  triggers actually cost it a tick: `RIGHT`#1 (1 ball active) and both
  RENT-confirms (#2, #3) do; `RIGHT`#2 — pressed once 2 balls (0 and 1) are
  already active — costs **neither** ball a tick, independently confirmed
  via `cursorPos` genuinely moving (not gate-dropped). The current code
  still stalls both on `RIGHT`#2 (a spurious 4th stall), landing its
  predicted roll one tick late — exactly matching entry 23's own
  observation. This directly overturns entry 23's "RAM-CONFIRMED CORRECT"
  verdict for the 2-simultaneous-stall LEFT/RIGHT case; that verdict was
  built on the same wrong offsets and/or too narrow a sample window to
  reach the ~30-tick-later transition where the missing stall becomes
  visible.
- **Next:** one more RAM data point before coding a fix (only 2 RIGHT
  presses were probed, at 1-active and 2-active — not enough to distinguish
  "stalls only when exactly 1 ball active" from "only the first-ever RIGHT
  ever costs a tick" from a directional LEFT/RIGHT asymmetry): probe a 3rd
  RIGHT press (3 balls active) and/or a LEFT press with 2 active. Then a
  likely-small `core.ts` change narrowing the LEFT/RIGHT branch's
  `ballAnimStall` assignment, re-verify `ballAnim.test.ts`/
  `ballAnimMultiBall.test.ts` stay green unchanged (confirmed this session
  they don't already cover — and so can't already contradict — a
  RIGHT/LEFT-with-2+-active-balls scenario), pin a new Tier-1 test
  (including the tick-204 checkpoint), RAM-verify pixels at frames
  124/155/163, then build `rent-3picks.json` per the brief.
- **Notes:** Full evidence table (per-trigger, per-ball shift/no-shift) is
  in ISSUES #7. All probing was scratch Python under `/tmp` (mGBA/
  `EmeraldOracle` recipe, not committed, per instructions) — no `src/`
  edits were at risk of being lost. PAPERCUT: none beyond the usual
  oracle-round-trip overhead; the offset-mislabeling bug cost real time
  this session (~15 min chasing a nonsensical decrementing "animCmdIndex"
  before checking `sprite.h` directly instead of trusting inherited
  offsets) — worth flagging for future RAM-probe work: verify struct
  offsets against the actual header before reusing offsets cited in prior
  session notes.

---

## 23 — S5 slice 2 (worker, capped): Priority 1 (post-confirm cursor-input gate) FIXED and Tier-1-pinned; Priority 2's two/three-simultaneous-stall question RAM-CONFIRMED CORRECT with no fix needed, but a narrower, different bug found and left open — ISSUES #7 updated, not deleted

- **State:** `npm test` **264/264** (261→264: +2 `cursorInputGate.test.ts`,
  +1 `monPic.test.ts`), `npm run build` green. All 7 existing traces
  untouched (`rent-slot1.json` still 125/139). One commit landed
  (`isCursorInputReady` fix + tests); no `ballAnimStall` code change this
  session (root cause of the narrower remaining bug not yet found - see
  ISSUES #7).
- **Did (Priority 1 - DONE):** Found the exact gate:
  `Select_Task_HandleChooseMons` (`battle_factory_screen.c:1671-1673`)
  early-returns - dropping LEFT/RIGHT/A-open alike, not just cursor moves -
  for as long as `sFactorySelectScreen->monPicAnimating` is TRUE (set the
  instant `CloseMonPic` fires, cleared only once the flash-shrink sprite's
  affine anim ends). RAM-verified the exact tick boundary (direct
  `monPicAnimating` reads, empirically-found struct offset 672): replaying
  `RENT_SLOT1` (confirm press-tick 37), a `RIGHT` at tick 56 is dropped,
  tick 57 (where `monPicAnimating` first reads FALSE) is accepted - exactly
  matches `MonPicState.phase` flipping `"closing"`→`"closed"`. Added
  `isCursorInputReady` (`monPic.ts`, mirrors `isMonPicInputReady`'s open-side
  gate) and gated `core.ts`'s cursor-mode branch on it. Pinned with
  `tests/cursorInputGate.test.ts` + a `monPic.test.ts` unit case.
- **Did (Priority 2 - partially resolved, real remaining bug found):** Built
  a fresh 3-ball RAM probe (`≥40`-tick dwell before every cursor move, per
  the brief) covering rent slot0 → `RIGHT` → rent slot1 (2 balls active) →
  `RIGHT` (the critical 2-simultaneously-active-ball trigger) → rent slot2
  (3 balls active). **Result: `gRngValue` matches bit-exact between RAM and
  engine on all 37 sampled ticks around that trigger** - `ballAnimStall`'s
  existing `activeSlotsBeforeAction` formula (stall *every* active ball, not
  just one) was already correct; no model change needed. A further probe
  step (pressing `RIGHT` a 4th time, past the 3rd/final rent) showed a real
  divergence, but that's `Select_OptionRentDeselect` handing off to the
  YES/NO reveal screen once all 3 picks are made - out of scope per the
  brief, not a `ballAnimStall` bug. Then reproduced ISSUES #7's *original*
  pixel symptom directly (entry 21's own repro shape, `npm run compare` on a
  scratch trace): frames 124/155/163 **still mismatch** - so the fix above
  doesn't resolve this issue. Cross-referencing the same script's RAM vs
  engine `gRngValue`: the two streams match bit-exact through tick 203
  (spanning every frame the pixel mismatches land on) and diverge for the
  first time at **tick 204** - ball 0 (which has accumulated 4 cumulative
  stall events by then, more than any existing pinned test reaches) misses a
  resting→moving reroll transition that RAM shows firing on schedule. Ran
  out of session time before isolating which `ballAnim.ts` internal counter
  is off. Full evidence and next steps: ISSUES #7 (updated, not deleted -
  per the brief's own instruction not to guess a stall model without RAM
  proof).
- **Next:** dump `gSprites[0]` densely from tick ~195-210 (RAM + engine) to
  find the exact `ballAnim.ts` counter desync, fix, re-verify
  `ballAnim.test.ts`/`ballAnimMultiBall.test.ts` stay green unchanged, pin a
  new Tier-1 test, then delete ISSUES #7 and build `rent-3picks.json`.
- **Notes:** Stretch (`rent-3picks.json`) not attempted - Priority 2 took
  the full remaining budget. PAPERCUT: none beyond the usual oracle
  round-trip overhead (~6 oracle/RAM-probe round-trips this session, plus 2
  `npm run compare` runs on scratch traces, none committed).

---
---

## 22 — S5 slice 2 (worker, capped): STOPPED before resolving ISSUES #7 — RAM probe hit a SEPARATE, previously-unknown bug (dropped cursor input after a RENT-confirm close) that contaminated the discriminating scenario before it was reached; #7's own two-simultaneous-stall question is still unresolved

- **State:** unchanged from entry 21 — `npm test` **261/261**, `npm run
  build` green, all 7 traces untouched at prior counts. **No `src/`/`tests/`
  changes this session, no `rent-3picks.json` committed.** ISSUES #7 was
  NOT deleted — its root cause is still not proven.
- **Did:** Built a 3-ball RAM probe (`tools/extract/inspect-anchor.py`
  pattern, dumping `gSprites[ballSpriteId].data[0]`/`animNum`/`animCmdIndex`/
  `animEnded` + `gRngValue` tick-by-tick; cross-checked instrumentation via a
  single-ball control probe that reproduces the already-pinned model
  bit-exact through frame 300 — offsets are correct, not a probe artifact).
  First attempt used a 10-tick dwell before the second cursor `RIGHT`
  (shorter than `ballAnimMultiBall.test.ts`'s proven 40-tick
  `DWELL_TO_SLOT2`) and RAM-confirmed (direct reads of
  `sFactorySelectScreen->cursorPos` and `mons[i].selectedId`) that **real
  hardware silently dropped that `RIGHT`** — cursor never left slot 0, and
  the next `A` press deselected slot 0 instead of selecting slot 1. This
  engine's own replay does NOT reproduce the drop: `core.ts`'s "cursor" mode
  branch has no gate analogous to `isMonPicInputReady()` for input arriving
  too soon after a RENT confirm's popup-close. The resulting "mismatch" I
  was chasing (ball 0's sprite fields resetting at tick 99) was just this
  deselect's palette swap, not a `ballAnimStall` effect — a contaminated
  repro, not new evidence about ISSUES #7's real question. Full writeup +
  exact evidence in ISSUES #7's "Worker update" section.
- **Next:** Rebuild the ISSUES #7 repro with a ≥40-tick dwell before **every**
  cursor move (not just the first), then rerun the same dump-and-diff method
  to actually reach the two-simultaneous-active-balls trigger. The probe
  infrastructure is fast (~2 min end-to-end for the control probe) and the
  method is proven — this should be quick for the next session. Separately
  worth a look: whether "cursor" mode needs its own `isMonPicInputReady`-style
  gate on popup-close completion (currently ungated), since any repro script
  with too-short a post-confirm dwell will silently desync the same way mine
  did.
- **Notes:** No `src/` edits made (probe-only, scratch scripts under `/tmp`,
  not committed). PAPERCUT: none beyond the usual oracle round-trip overhead;
  the wasted probe cycle here was a scripting judgment call (dwell too
  short), not tooling friction.

---

## 21 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a SECOND, distinct multi-ball model gap (ISSUES #7): ball-tile pixel mismatches once a trigger stalls TWO already-active balls at once, a scenario ISSUES #6's fix never RAM-verified

- **State:** unchanged from entry 20 — `npm test` **261/261**, `npm run
  build` green, all 7 existing traces untouched at prior counts
  (`rent-slot1.json` still **125/139**, file byte-identical). **No
  `src/`/`tests/` changes this session** and **no `rent-3picks.json`
  committed** — the investigation below found a real, unattributable model
  gap that blocks building that trace correctly (same "stop and report
  precisely" outcome as entry 19).
- **Did:** Built a candidate 3-pick dense trace (rent slot1 → `RIGHT` → rent
  slot2 → `RIGHT` → rent slot3, each rent = `A`(2f)/idle28f/`DOWN`(2f)/
  idle4f/`A`(2f) confirm, matching `rent-slot1.json`'s own shape; confirms
  land at press-ticks 37/113/189) and ran it through `npm run compare`
  (scratch, not committed). Found `DIFF`s at **ball OBJ positions** during
  plain idle dwell — outside ISSUES #5's popup-close window (`x88-151`)
  entirely. Root-caused *which tile* is objectively correct per mismatched
  frame via a RAM-free method: overlay each of a ball's 3 candidate anim
  tiles directly onto a clone of the **oracle's own PNG** (same `drawSprite`
  call the renderer uses) — the correct tile is the one whose overlay is a
  pixel-exact no-op against the untouched oracle frame. Confirmed 3
  mismatches this way (frame 124 ball-index-1 true=32/engine=0; frame 155
  ball-index-0 true=32/engine=0; frame 163 same ball true=0/engine=32 — not
  a constant offset, oscillates ahead/behind). Traced the likely mechanism:
  by frame ~145 the trace's *second* `RIGHT` (slot1→slot2) stalls **two**
  simultaneously-active balls (index 0 and 1) from one trigger —
  `tests/ballAnimMultiBall.test.ts`'s only multi-ball RAM-pinned case never
  reaches this shape (its trigger always stalls exactly **one** already-
  active ball, never two at once). Ball 0 by frame 163 has accumulated
  three stall-worthy triggers total (the first `RIGHT`, the slot-2 confirm,
  and the second `RIGHT` shared with ball 1) — full details, evidence, and
  the exact repro script are in **ISSUES #7** (new).
- **Next:** ISSUES #7 needs a dev-time RAM probe of the same caliber as
  ISSUES #6's own (`gSprites[ballSpriteId].data[0]`/`animNum`/`animEnded` per
  ball, tick-by-tick) but for a 3-ball scenario with **two sequential**
  cursor moves, to determine whether real hardware stalls both
  simultaneously-active balls per trigger, only one, or something else —
  do not guess/patch `ballAnimStall` without that data (a wrong guess would
  silently re-break the already-verified two-ball case). Once resolved,
  `rent-3picks.json` (dense captures through all 3 picks, ending at "Are
  these three POKéMON OK?" — the exact endpoint tick before ANY reveal-chain
  change was worked out this session: the 3rd confirm's own resulting frame,
  since even the popup-preview close counts as part of the reveal chain per
  `docs/confirm-flow-notes.md` §0) and the accompanying 3-ball `gRngValue`
  Tier-1 RAM-pin are both unblocked and ready to build.
- **Notes:** No `src/` edits were made (the investigation stayed read-only:
  scratch TS probes comparing oracle/app PNGs directly, deleted before
  finishing per instructions; the candidate trace file was likewise deleted
  rather than committed broken, matching entry 19's own precedent of not
  writing the trace when blocked). PAPERCUT: none beyond the usual
  oracle-round-trip overhead (~6 `npm run compare`/probe round-trips this
  session).

---

## 20 — ISSUES #6 root-caused and fixed: multi-ball `SpriteCB_Pokeball` stall was never about mon-pic open/close — it's `Select_Print*` text-printer calls (cursor move + RENT/DESELECT confirm) stealing a tick from every OTHER rented ball; two-ball RNG stream now exact, ISSUES #6 DELETED

- **Supervisor addendum (same day):** verified (208/208 → then merged the
  three parked worktree branches: battle-1 assets, confirm-flow dossier,
  battle-transition assets) — `npm test` now **261/261**, build green,
  worktrees cleaned. S6 static-asset groundwork is complete
  (mon/trainer pics, bg, healthbox, window/font, all 12 transition
  variants) and S5's confirm flow is fully scouted
  (`docs/confirm-flow-notes.md`). ISSUES #5 policy question still awaiting
  the user (asked ~12:35; headless fallback active). Next: rent-3picks
  trace worker (multi-ball model now exact), then confirm-flow
  implementation.
- **State:** `npm test` **208/208** (203→208, +5 new in
  `tests/ballAnimMultiBall.test.ts`), `npm run build` green. All 7 traces
  re-verified at their prior counts, files unchanged (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132,
  `rent-slot1.json` still **125/139**, gap still 100% attributable to
  ISSUES #5 per entry 18, untouched here).
- **Did:** Overturned the prior session's own working theory (entry 19
  suspected `OpenMonPic`/`CloseMonPic`). RAM-probed (dev-time
  `EmeraldOracle` harness, scratch scripts under `/tmp`, not committed)
  four isolated variants against the pinned single-ball baseline
  (animEnded-equivalent flip at frame 168): a plain cursor **RIGHT move
  with NO popup at all** costs ball 0 a tick (flip→169) — proving the
  effect has nothing to do with mon-pic mechanics; opening a ball's **own**
  popup costs nothing (flip stays 168, answers the brief's self-stall
  question: no); opening a second ball's popup and closing it via **B**
  costs the same single tick as leaving it open (flip→169 either way —
  closing via B/OTHERS adds nothing); only closing via **RENT/DESELECT
  confirm** adds a second, independent tick (flip→170, matching ISSUES #6's
  own cited number exactly). Traced both triggers to source:
  `Select_Task_HandleChooseMons`'s LEFT/RIGHT branch
  (`battle_factory_screen.c` STATE_CHOOSE_MONS_HANDLE_INPUT) calls
  `Select_PrintMonCategory`/`Select_PrintMonSpecies`, and
  `Select_OptionRentDeselect` (:1949-1970) calls `Select_PrintSelectMonString`
  (:1893-1909) — both call `AddTextPrinterParameterized[3]` +
  `CopyWindowToVram(..., COPYWIN_GFX)`; B/OTHERS-close and self-open call
  neither. The stall lands the tick *after* the trigger, matching
  `CB2_SelectScreen`'s `AnimateSprites()`-before-`RunTasks()` ordering
  (:1092-1099) — a same-tick `RunTasks()` text-print can only affect the
  *next* tick's `AnimateSprites()` pass. Modeled as `DraftScreenState.
  ballAnimStall` (`factoryDraftScreen.ts`): a snapshot of which ball slots
  were active *before* this tick's action, consumed to skip exactly those
  slots' `advanceBallAnim` call next tick — LEFT/RIGHT stalls everyone
  active; RENT/DESELECT stalls everyone active *except* the acted-on slot
  (RAM-confirmed via a second ball's own settle timer landing unstalled by
  its own trigger). Along the way, an exhaustive per-frame `gRngValue` diff
  (RAM vs engine, all 260 frames of the two-ball repro, not just
  checkpoints) surfaced two more latent, pre-existing `ballAnim.ts` bugs
  invisible to the single-ball suite (which never sampled a frame in the
  affected gap): the "resting→moving" reroll after a SUCCESS actually lands
  2 ticks later than the naive `REST_TICKS` countdown implied (now
  `REST_INTERNAL_OFFSET`), and a moving cycle ending on a FAILURE (no
  queued rest, immediate reroll) actually rerolls 1 tick later than
  same-tick (now `FAILURE_REROLL_DELAY`) — the latter caught via ball 1's
  own first-ever full cycle (a FAILURE, previously never RAM-tested this
  deep). Both fixes are single-ball-invisible (re-verified 0 mismatches
  across a fresh 400-frame single-ball RAM diff) but required for
  multi-ball interleaving exactness.
- **Next:** S5 slice 2's `rent-3picks.json` is now unblocked (stretch item
  from this session's brief, not attempted — see Notes). ISSUES #6 deleted
  per the fix; ISSUES #5 (real hardware jitter, entry 18) remains the only
  open item blocking `rent-slot1.json`'s last 14 frames — do not re-attempt
  without new information per that entry's own conclusion.
- **Notes:** Only the primary goal was attempted this session (mechanism
  root-cause + engine fix + tests); the stretch goal (RENT-confirm-timing
  jitter probing + committing `rent-3picks.json`) was not reached — ran out
  of session time after the RAM-probe-heavy primary investigation (~15
  oracle round-trips total: 4 discriminating-variant probes, several dense
  per-tick dumps, and one 260-frame exhaustive diff). Whoever picks up
  `rent-3picks.json` next inherits a RNG-exact 2-ball model to build on;
  the two-ball scenario's exhaustive 260-frame diff (0 mismatches) is
  stronger evidence than the checkpoint-only pinning in
  `tests/ballAnimMultiBall.test.ts`, but that full diff isn't itself
  committed (per instructions) — re-run it if extending to 3 balls turns up
  anything suspicious.

---

## 19 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a real, RAM-confirmed multi-ball throttling effect that breaks the "fully independent per-ball RNG" assumption; species-name-breathe rule fully pinned instead (no code changes this session)

- **State:** unchanged from entry 18 — `npm test` **203/203**, `npm run
  build` green, all 7 traces at their prior counts (`rent-slot1.json` still
  125/139, untouched). **No `src/`/`tests/` changes**: the investigation
  below found a real modeling gap that blocks building `rent-3picks.json`
  correctly, so nothing was written that would need reverting. This is a
  "stop and report precisely" session per the brief's own contingency.
- **Did (species-name breathe — fully resolved, no code needed):** Read
  `Select_Task_FadeSpeciesName`/`fadeSpeciesNameActive` (`battle_factory_screen.c:2277-2330`,
  set at :1611/:1636/:1682/:1689/:1714/:1556/:1567) and confirmed with 3
  oracle probes: the fade coefficient only advances while
  `fadeSpeciesNameActive` is true, which is **exactly `mode === "cursor"`
  (no popup open)** — opening a ball's popup (A-press tick) freezes it
  instantly, closing it (B/OTHERS/RENT-continue tick) resumes it, and
  **the underlying counters are never reset, only paused** (probe: idle 95
  active ticks → open popup → sit 100+ ticks inside it, zero pixel diffs the
  entire time → close popup → breathe resumes and trips within ~10 ticks,
  not a fresh ~105-tick cycle). Pure-idle-from-anchor threshold measured
  exactly: **first visible pixel diff at tick 105**, repeating every 7
  ticks thereafter. Rule for future trace-building: sum only the
  cursor-mode (no-popup) ticks since screen init; keep that cumulative sum
  under 105 and the breathe never becomes visible — no engine model needed.
- **Did (multi-ball RNG — blocked, real finding):** `core.ts`'s tick() loop
  already iterates all 6 `ballAnims` slots unconditionally in slot order
  every tick (written in slice 1) — structurally already "N-ball capable"
  and was assumed independent per dossier Risk 2. RAM-verified this
  assumption directly: dumped `gSprites[ballSpriteId]`'s `data[0]`/`animNum`/
  `animEnded` + `gRngValue` tick-by-tick for (a) a single rented ball idling
  220 ticks, vs (b) the same ball PLUS a second ball rented via a RIGHT +
  open-popup + DOWN + RENT-confirm sequence inserted while the first ball's
  128-tick "moving" cycle is in flight. **Result: ball 0's own moving-cycle
  completion (the `animEnded` flip) lands at tick 168 in scenario (a) but
  tick 170 in scenario (b) — a reproducible 2-tick delay**, which cascades
  into its resting countdown and next roll (tick 201 vs tick 203). This
  directly contradicts `SpriteCB_Pokeball`'s own source reading (`data[0]`
  is plainly per-sprite with no shared state) and the module comment in
  `ballAnim.ts` — yet the RAM shows a real divergence correlated with the
  second ball's own popup open/close (2 mon-pic transitions ≈ 2 stalled
  ticks for the *other* ball; not yet proven to be exactly 1 tick/transition,
  only observed as a net +2 over that window). Cross-checked the JS engine
  against the single-ball probe (exact match) and the two-ball probe
  (5 tick-level RNG-value mismatches, all clustered exactly at the two
  delayed transitions) via a throwaway node harness — confirms this is a
  gap in the model, not a probe artifact.
- **Next:** Do **not** attempt `rent-3picks.json` (or extend `ballAnim.ts`
  to N balls) until this throttling mechanism is identified precisely —
  building the trace now would either desync RNG-dependent state silently
  or require guessing at the mechanism, which risks landing something that
  merely *looks* pixel-clean at sparse sample points. Concrete next step for
  whoever picks this up: read `OpenMonPic`/`CloseMonPic` (battle_factory_screen.c,
  the mon-pic-bg palette/tile setup they do) for anything that could cost
  *other* sprites' `AnimateSprites()` a frame — e.g. a blocking VRAM/tile
  allocation call — then RAM-confirm with a probe that inserts exactly ONE
  mon-pic open (no close) vs one open+close to see if the delay is
  per-transition (1 tick each) or a flat per-popup-session cost. ISSUES.md
  #6 has the full data (probe scripts summarized, not committed per
  instructions — recipe is `tools/extract/inspect-anchor.py`'s pattern
  adapted to read `gSprites[]`/`gRngValue` on a custom button script; scratch
  files lived under `/tmp`, not committed).
- **Notes:** Work items 3-4 from the brief (jitter-clean close-window
  probing, the committed `rent-3picks.json` trace) were not reached — they
  depend on item 1 (multi-ball RNG) being solid first, since the trace's
  own churn windows would otherwise assert against an unverified RNG
  stream. PAPERCUT: none beyond the usual RAM-probe/oracle round-trip
  overhead (~3-5s/probe × ~6 probes this session, not a blocker).

---

## 18 — ISSUES #5 root-caused via direct RAM/IO inspection: confirmed genuine GBA cycle-timing jitter, NOT fixable at this engine's tick/state level — no code change, rent-slot1.json stays 125/139

- **State:** unchanged from entry 17 — `npm test` **203/203**, `npm run
  build` green, all 6 pre-existing traces still 0 diff. `rent-slot1.json`
  still **125/139** (not re-timed, not touched — trace file has zero diff
  from what entry 17 committed). No `src/` changes this session: the
  investigation conclusively found there is nothing at this engine's
  modeling granularity left to fix (see below), so no code was written.
- **Did:** Followed the assigned method exactly — read
  `battle_factory_screen.c`'s mon-pic construction (`Task_CloseMonPic`,
  `SpriteCB_*MonPic`, the `sSpriteTemplate_*_MonPicBgAnim` affine sprite),
  then did dense dev-time RAM/IO inspection (scratch scripts using
  `EmeraldOracle.core.memory.u16[...]`, not committed) of `WIN0V`,
  `BLDCNT`/`BLDALPHA`/`BLDY`, `BG3HOFS/VOFS`, the mon-pic-bg palette, and
  `gTasks[]`'s raw state (`0x03005E00`, struct layout from `task.h`) across
  a clean close (press-tick 30) and a bad one (press-tick 36), then swept
  press-tick 20-60 to map the WIN0V sequence exactly. Traced the divergence
  all the way to its true source: `Task_CloseMonPic`'s internal
  `tWinTop`/`tWinBottom` state is **provably clean** (identical, purely
  time-shifted, between the clean and bad runs) — the bug is entirely in
  *when the already-correct value becomes visible*, via GBA's real
  `SetGpuReg` double-buffer (`gpu_regs.c:66-98`): writes queue for the next
  vblank flush unless `REG_VCOUNT` has already crossed into vblank at the
  exact moment `SetGpuReg` executes, which depends on the total CPU cycle
  cost of everything else that ran earlier that frame. Proved this isn't
  reducible to any state this engine tracks: replaying `rent-slot1.json`
  with 0/3/7/10/17 idle frames prepended (preserving every *relative*
  timing this engine models, shifting only absolute session tick) produces
  a **different** catch-up pattern each time — conclusive evidence the
  jitter depends on absolute emulated-cycle count, not on open-variant,
  dwell time, or RENT-flow-local state. Full writeup with file:line
  references, the ruled-out leads (monPicBg static palette confirmed
  unchanged — the earlier "shimmer" suspicion was wrong; task-list
  insertion order confirmed identical between clean/bad — not a
  scheduling-order bug either), and the remaining options is in ISSUES #5
  (kept open, not deleted, per the brief's stop condition).
- **Next:** This exact acceptance criterion (`rent-slot1.json` 0/139
  *without* re-timing) cannot be met without cycle-accurate CPU emulation,
  which is out of scope for this engine's architecture. A future
  supervisor decision is needed on ISSUES #5's two remaining options
  (re-time the RENT-confirm press to a trace-specific clean tick, or accept
  125/139 permanently with the gap documented as attributable to this
  issue) — do not re-attempt a "general fix" without new information (e.g.
  a way to cheaply approximate per-frame cycle cost) that changes the
  tractability conclusion above.
- **Supervisor addendum (same day):** S6 scout dossier merged
  (`docs/battle-bringup-notes.md`, 595 lines; ROADMAP S6 corrections
  folded in: RNG advances per-VBlank until battle proper, transition is a
  random 12-way pick, opponent personalities rolled at battle start;
  battle-1 identities RAM-pinned: trainer 50 DESTIN, Grovyle/Murkrow/
  Pidgeotto vs Onix/Magby/Bayleef). 203/203 + build green post-merge.
  **ISSUES #5 policy question escalated to the user** (0-diff bar vs
  cycle-jitter windows — see the ISSUES entry for the two options);
  battle-1 asset extraction in flight on the worktree lane.
- **Notes:** No commit was needed for `src/`/`tests/` (nothing changed);
  this commit is docs-only (`ISSUES.md` rewritten with the confirmed root
  cause, this entry). Time was spent entirely on RAM-inspection
  investigation per the brief's explicit method — the conclusion is a
  negative result (root cause found, fix infeasible at this level), which
  the brief anticipated as an acceptable outcome ("stop and report
  precisely").

---

## 17 — S5 slice 1 (worker, capped): RENT/DESELECT + ball-rock RNG stream implemented and RAM-verified; pixel trace 125/139 — blocked short of 0 diff by a newly-found pre-existing rendering bug (ISSUES #5), not by anything in this slice's own code

- **State:** `npm test` **173/173** (159→173, +14 new), `npm run build`
  green. All 6 pre-existing traces re-verified 0 diff (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132) — **no
  regressions**. New `tools/compare/traces/rent-slot1.json` (dense,
  every-frame, popup-open → RENT confirm → 100-tick dwell) → **125/139
  matched, NOT 0 diff** (see Notes — acceptance criterion not met this
  session). New Tier-1 tests **are** fully green and RAM-verified:
  `tests/rentSelect.test.ts` (9 tests, state machine + renumbering) and
  `tests/ballAnim.test.ts` (5 tests, engine `rngValue` pinned against
  RAM-dumped `gRngValue` at frames 0/36/37/39/201 — includes both a
  SUCCESS and a FAILURE roll).
- **Did:** Implemented `src/engine/ballAnim.ts` (new — the
  `SpriteCB_Pokeball` idle/rock state machine + RNG roll, RAM-verified
  timings: first roll-eligibility lands 2 ticks after selection, a 17-step
  Moving cmd table matching `sAnim_Select_Pokeball_Moving` exactly, a
  32-tick rest after a successful roll, immediate reroll after a failed
  one; a `displayTile`/`pendingDisplayTile` 2-stage shift register
  reproduces an oracle-verified 2-tick render lag between the internal
  state transition and the visible tile, kept structurally separate from
  the RNG-critical internal timing). Wired RNG into `EngineState`
  (`rngValue`, seeded `ANCHOR_RNG_VALUE`, advances once/tick unconditionally
  per `main.c:366`, ball rolls consume a *second* step the same tick,
  RAM-confirmed ordering: standard tick first, roll second). Implemented
  RENT/DESELECT in `factoryDraftScreen.ts` (`applySelect`/`applyDeselect`
  pure reducers, the renumbering special case, `selectMonMessage`,
  context-sensitive row-1 label) and wired the confirm path into
  `core.ts`'s `tick()`. Found and fixed two real render bugs along the way:
  (1) the info-window message and popup label lag the palette swap by 2
  ticks (`RentConfirmRedrawState`, same redraw-scheduling pattern as
  `CursorRedrawState`); (2) `monPicRender.ts`'s `ballColor()` helper (used
  for the mon-pic window's blend target2 source) was hardcoded to the gray
  palette/tile 0 for *every* ball regardless of selection state — fixed via
  a shared `ballVisuals()`/`BallVisual` threaded into both `drawMonPic` and
  the OBJ ball loop so they can't drift apart again.
- **Next:** ISSUES #5 (a pre-existing, RENT-independent mon-pic-close
  rendering bug, confirmed via a bare `A`+`B` reproduction with zero RENT
  code involved) is what's between this trace and 0 diff — see that entry
  for the full probe log and a lead (likely an un-modeled palette-cycle/
  shimmer in `monPicBg`). A future slice should either root-cause it
  directly, or re-time `rent-slot1.json`'s RENT-confirm press to land in a
  confirmed-clean window once the periodic pattern is pinned precisely
  enough to predict one reliably (trial-and-error this session found good
  windows at ~31 and ~47+ ticks after open, but shifting into the second one
  just moved a *different* set of diffs into frames outside this trace's
  species-name-breathe budget — see Notes).
- **Supervisor addendum (same day):** verified independently (tests,
  build, 125/139 + no regressions reproduced). Both parallel-lane
  extraction branches merged on top: moves/exp/items data (19 tests) and
  the pre-battle-room scene incl. `docs/prebattle-room-notes.md`
  (11 tests, composite-verified 0/38400 px vs oracle) — `npm test` now
  **203/203**, build green, worktrees cleaned up. ROADMAP S5 marked [~]
  with slice-1 note. Next: root-cause ISSUES #5 (main lane); S6 scout
  dossier in flight on the worktree lane.
- **Notes:** **This is the "STOP and report precisely" case the brief
  anticipated**, just triggered by a different collision than the one it
  named (species-name breathe) — ISSUES #5 instead. Confirmed root-cause
  separation carefully before stopping: (1) reverted the RENT-specific
  trace to a bare `A`-open+`B`-close with no selection/RNG code touched at
  all, and it reproduces the identical diff at the identical relative
  offset — proves this is not a bug in this slice's new code; (2) all of
  this slice's *own* new behavior — palette swap, message/label redraw
  timing, the ball's idle/rock tile sequence, and the RNG stream through
  both a SUCCESS and a FAILURE roll — is independently confirmed exact via
  RAM-dumped `gRngValue` checkpoints (hermetic, unaffected by any pixel
  bug) plus the trace's own frames 58-138, which sit entirely outside every
  close-animation window and are 100% clean. The RAM-inspection recipe
  (`tools/extract/inspect-anchor.py`'s pattern, scratch script not
  committed) was essential here: a per-frame dump of `gSprites[ballId]`'s
  `data[0]`/`animEnded`/`animNum`/`animCmdIndex` alongside `gRngValue`
  turned a confusing pixel-only investigation into an exact tick-by-tick
  state trace, which is what let SETTLE_TICKS/the Moving cmd table/the
  2-stage display lag all get pinned correctly on the first real attempt.

---

## 16 — S4 slice 1 (worker, capped): summary-info-magby.json lands 0 diff — "≥2 different slots" acceptance met, no app changes needed

- **State:** `npm test` **159/159** unchanged, `npm run build` green.
  `tools/compare/traces/summary-info-magby.json` (new, 132 every-frame
  captures 45-176, menu-open through entry fade + a settled-window slice +
  full B-exit fade-out/black-hold/fade-in to the resettled draft-with-menu
  state) → **0 diff, 132/132**. `anchor` (1/1), `summary-info-onix`
  (122/122), `draft-cursor` (13/13), `draft-menu` (38/38),
  `draft-menu-slot6` (66/66) all re-verified 0 diff. **No `src/` changes
  were needed** — the existing generic renderer/state machine already
  handled MAGBY's data (name/types/gender-none/hFlip'd sprite) correctly.
- **Did:** Per the brief's method, probed MAGBY's own timing with `bin/
  oracle run` before writing the trace (did not reuse ONIX's offsets
  blind). Found the RIGHT-cursor-move (+4 settle) and menu-open (+40
  settle) timings are generic/species-independent as expected. The Info
  page's fade-settle timing is **also** generic: MAGBY's Info page goes
  sha-stable at SUMMARY-press-tick **+59**, and `B` first registers at
  **+63** — pixel-identical offsets to ONIX's already-documented ones, now
  empirically confirmed rather than assumed. The real MAGBY-specific find:
  its sha-stable window is only **6 ticks wide (+59..+64)**, not ONIX's
  ~100+, because `PokemonSummaryDoMonAnimation`'s per-species
  `sMonAnimationDelayTable`/front-sprite-bounce-and-cry (`pokemon.c:6858`)
  fires almost immediately for MAGBY (starts at +65) — this is "the mon
  idle animation" PROGRESS #15 already flagged as unscoped/undone. Built
  the trace to press `B` at exactly +63 (relative to the SUMMARY press),
  the last tick inside the stable window before that animation would
  intrude — so the committed trace never exercises those not-yet-modeled
  frames at all, by construction, not by luck.
- **Next:** S4's "≥2 different slots" acceptance criterion is now met.
  **Supervisor decision (this session): S4 slice 1 closed; the remainder
  (page nav + scroll-wipe, UP/DOWN switching, move-select, mon idle
  animation) is explicitly deferred behind S5 — recorded in ROADMAP.md's
  S4 section. Main lane proceeds to S5 (docs/rent-flow-notes.md);
  worktree lane is extracting moves/exp/items data in parallel.**
- **Notes:** Debugging template from #14 worked well again: isolated dense
  oracle probe of the new interaction first, sanity-checked pixels
  actually changed after the "trigger" input rather than trusting a
  stable-looking window. `sMonAnimationDelayTable`/`PokemonSummaryDoMonAnimation`
  (`pokemon.c:6858`, `pokemon_summary_screen.c:3994`) is the concrete
  source location for whoever picks up the idle-animation item — it's a
  per-species (`species - 1` indexed) delay-then-bounce-and-cry, gated on
  `!gPaletteFade.active`, same guard family as the input-ready-lag quirk.

---

## 15 — Supervisor wind-down: session end 2026-07-17 ~05:50

- **State (verified this minute):** `npm test` **159/159**, `npm run build`
  green, all five compare traces 0 diff (`anchor` 1/1, `draft-cursor`
  13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66 every-frame,
  `summary-info-onix` **122/122** every-frame incl. full B-exit).
  `ISSUES.md` empty. Working tree clean. ROADMAP: **S1 [x] S2 [x] S3 [x]
  S4 [~] S5-S9 [ ]** — S4's remainder: MAGBY Info-page trace (probe its
  own stable window), the 3 other pages + scroll-wipe, UP/DOWN
  mon-switching, move-select, the mon idle animation.
- **Session summary (supervised, ~01:00-05:50):** 9 worker steps + 1 merge
  lane. Landed: staged roadmap (iteration 0); S1 pixel-exact anchor +
  compare loop + extraction pipeline; S2 draft interactions frame-exact
  incl. every-frame transients; S3 RNG core + 882 rentals extracted +
  anchor RAM dump (six mons pinned to recomputed stats); S4 fade math,
  Info-page data + renderer, entry+exit fades pixel-exact; scout dossiers
  for S4 (summary-screen-notes.md) and S5 (rent-flow-notes.md). Key
  domain finds in ROADMAP notes: anchor RNG seed, ball-sprite RNG
  consumption, battle-1 opponent is an anchor constant, statics-via-nm
  recipe, fade elapsed+1 + black-hold quirks.
- **Next:** S4 remainder (start with summary-info-magby.json), then S5
  implementation off docs/rent-flow-notes.md. All prerequisites committed.
- **Notes:** Every worker ended at a green commit; no usage-limit events;
  two PAPERCUTS entries total (see file).

---

## 14 — S4 slice 1 (worker, capped): B-exit fade fixed, ISSUES #4 closed; summary-info-onix.json now 0 diff through settle — S4 stays [~] (MAGBY trace still open)

- **State:** `npm test` **159/159** (152→159, +7 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` re-verified
  0 diff. `tools/compare/traces/summary-info-onix.json` extended from 64
  captures (entry+settle only) to **122 dense captures, every frame,
  covering SUMMARY-press through the full B-exit (fade-out/black-hold/
  fade-in) back to the resettled draft screen** → **0 diff, all 122
  frames**. `ISSUES.md` #4 deleted (fixed, not worked around).
- **Did:** Per the brief's method: ran a fresh, isolated dense oracle probe
  of the B-exit only (not layered on the entry trace). First probe attempt
  (B pressed at the settled Info page's own press-tick+62, well inside the
  documented pixel-stable window) found B silently did nothing for ~50
  frames — a real gotcha, now in `ROADMAP.md`'s Domain notes: input-ready
  lags visual-stable by a few ticks here (`Task_HandleInput`'s
  `!gPaletteFade.active` guard isn't true yet even though the screen looks
  settled); B first reliably registers at absolute press-tick+63 (a
  parameter sweep confirmed +62 fails, +63 works). With a probe that
  actually triggered the fade, derived the true curve pixel-for-pixel
  (component 90 and 255 samples, matching `paletteFade.test.ts`'s existing
  oracle-pinned values exactly) — the exit fade-out/fade-in curves and
  their `elapsed+1` offset were **already correct** in `core.ts`'s
  `render()`; the actual bug was the black-hold phase: the entry direction
  had a special "hold's own last tick already shows fade-in's first step"
  branch, but the exit direction fell through to always-pure-black instead
  of getting the same treatment — the exit's black hold has the identical
  quirk (oracle-confirmed: the true last hold tick, not pure black, matches
  `bgFadeY(0, FADE_IN)`/`objFadeY(0, FADE_IN)` composited on the *draft*
  screen, symmetric with the entry composing onto the *Info* page).
  Rewrote `render()`'s black-hold branch to apply the peek uniformly by
  direction instead of hardcoding it entry-only. New
  `tests/summaryScreenRender.test.ts` hermetically pins the render()
  *dispatch* itself (which curve/offset/black-hold-quirk applies to which
  phase × direction) — the layer this bug actually lived in, distinct from
  `paletteFade.test.ts`'s already-correct low-level curve math.
- **Next:** `summary-info-magby.json` (stretch, not reached this session —
  probe MAGBY's own stable window first, don't assume ONIX's press-tick+59
  transfers) is the last piece of S4 slice 1's brief before S4's "≥2
  different slots" acceptance criterion is met. After that: S4's remaining
  scope (page navigation RIGHT/LEFT, mon-switching UP/DOWN, move-select) or
  move on to S5 per supervisor call.
- **Notes:** The debugging path here is a good template for future
  fade/dispatch bugs on this screen: (1) isolated dense probe of *only*
  the interaction in question, (2) sanity-check the probe actually
  triggered the intended state transition (don't assume a "stable-looking"
  press registered — verify pixels actually start changing where expected
  before trusting the rest of the derivation), (3) compare the app's
  actual rendered pixels against the oracle's directly (not against a
  hand-derived formula) to localize which specific composited region
  disagrees, since that pinpoints the dispatch bug far faster than
  re-deriving curve math that was already right.

---

## 13 — S4 slice 1 (worker, capped): Info-page renderer built and wired; entry+settle trace 0 diff; B-exit gap found — S4 stays [~]

- **State:** `npm test` **152/152** (146→152, +6 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` all
  re-verified 0 diff this session (untouched code paths, but re-ran given
  how much of `src/engine/` this slice touched). **New:**
  `tools/compare/traces/summary-info-onix.json` (dense, every frame from
  the SUMMARY press through the settled Info page's stable window, 64
  captures) → **0 diff**. `ROADMAP.md` still `[~]` — see gap below.
- **Did:** Built `src/engine/summaryInfoPage.ts` (the static Info-page
  compositor: BG3 tilemap, type/markings/ball/mon sprites, all text
  windows, per `docs/summary-screen-notes.md` §7) and wired
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts` (`EngineState` gains
  `summaryScreen`; `tick()` routes A-on-SUMMARY/B-on-Info-page; `render()`
  dispatches flat/faded draft or Info-page rendering by transition phase).
  Then debugged the render pixel-exact against dense oracle captures
  (iterating `npm run compare`'s diff PNGs, per the brief) until the ONIX
  settled Info page and the full entry-fade sequence hit 0 diff. Real bugs
  found and fixed along the way (all still applicable, see commit
  `ec234e9` for the settled-frame set and `5729950` for the fade-timing
  set): `sTextColors` colorId0/1 were transposed (hid/blackened most text);
  the A-button icon is colored by its **window's** palette, not its source
  PNG's; `PositionStatusSlidingWindow`'s on-load reset lands on a flat
  fill, not a redraw of `page_info.bin`'s stale default; `{NO}`/`{LV}` are
  single-glyph control codes with ligature bitmaps already sitting in
  `font-normal.json` at raw codes 264/52 (bypass the charmap, which only
  covers quoted single-char entries); and — the big one — `render()`'s fade
  curves need `bgFadeY(t.elapsed + 1, timing)`/`objFadeY(t.elapsed + 1,
  timing)`, not `t.elapsed` directly (`BeginNormalPaletteFade`'s first
  blend step lands within its own trigger tick), plus the black-hold
  phase's own **last** tick already shows the fade-in's first step (BG
  only — OBJ is a further tick behind even there), which needed its own
  branch instead of always rendering solid black. Extraction: new
  `src/engine/fadeRender.ts` (fading variants of the `drawTileBg`/
  `drawSprite`/`drawText` primitives, `y<=0` reproduces the originals
  exactly — used for both the summary Info page and a new
  `renderFactoryDraftScreenFaded`), `drawSprite` gained an `hFlip` param
  (all 6 anchor species render hFlip'd on this screen, confirmed from
  `species_info.h`'s `noFlip` field — opposite of the draft-screen pic),
  and `src/assets/gen/summary-ball.json` (the summary screen's caught-ball
  icon is a **different** asset than the draft screen's rental-ball
  sprite, `graphics/balls/poke.png` not `factory_screen/pokeball.png` —
  confirmed every rental defaults to `ITEM_POKE_BALL` via
  `pokemon.c:2261`).
- **Next:** **The B-exit (Info page → draft screen) path is unresolved.**
  The state machine's phase/tick bookkeeping looks structurally right
  (settles at the expected tick, `onInfoPage` flips back correctly), but
  the *rendered pixels* diverge severely starting ~2 ticks into the exit
  fade-out and get progressively more wrong (SSIM trending toward 0, not a
  small residual) — this does **not** fit the same "+1" pattern that fixed
  entry, so applying it blindly would likely be wrong. Exact repro: trace
  `2×A, wait 40, 2×A, wait 60, 2×B, wait N`, dense-capture frames 104-165;
  104-106 match, first divergence at 107 (2 ticks after the B press
  registers). Needs a **fresh dense oracle probe of the exit fade
  specifically** (isolated, not layered on the entry trace) before
  guessing further — do not reuse the entry "+1" fix without re-deriving
  it from oracle pixels for this direction. Once that's resolved: extend
  `summary-info-onix.json` to cover the B-exit back to the settled draft
  screen (per the original brief), then `summary-info-magby.json` (stretch
  — probe MAGBY's own stable window first, don't assume ONIX's +59..+64
  transfers).
- **Notes:** `docs/summary-screen-notes.md` §7's spec was excellent — the
  BG-layering/composition-order/window-geometry reasoning all held up
  against oracle pixels with zero corrections needed. Every bug found this
  session was in territory the spec explicitly flagged as unresolved (text
  colors, ball asset, hFlip) or genuinely out of scope for a static-page
  spec (the fade-timing "+1", the black-hold boundary tick, the
  `{NO}`/`{LV}` control codes) — a good sign the extraction-then-implement
  split this run's been using is working. `PAPERCUT`: the `bin/oracle
  run`-vs-`npm run compare` frame-numbering question (are "press-tick N"
  labels from a direct oracle probe always directly comparable to
  `appTrace.ts`'s frame counter?) came up twice this session and cost real
  time both times — worth a `bin/oracle info`/`ROADMAP.md` Domain-notes
  clarification for the next worker who dense-probes a fresh interaction.

---

## 11 — Supervisor: S5 scout merged (rent-flow dossier)

- **State:** `docs/rent-flow-notes.md` merged; main tree `npm test`
  **138/138**, build green, all traces 0 diff. ROADMAP updated: S6 scope
  note + rented-ball RNG domain note (committed).
- **Did:** Verified + merged the S5 scout. Corrections vs prior
  assumptions: RENT is instant (no per-pick confirm; only yes/no is the
  final "Are these three POKeMON OK?"); OTHERS = cancel; DESELECT is
  RENT's relabel on a rented ball. Load-bearing finds: battle 1's opponent
  generated BEFORE frame 0 (anchor constant); rented ball sprites roll
  `Random()%5` per ~32f cooldown per ball (must be modeled from S5 on).
  S5→S6 boundary pinned: the "Right this way, please!" hold.
- **Next:** S4 slice-1 finisher (see entry 10's blocker list): extract
  Info-page data (type/dex/ability text/gender), render the static Info
  page, commit summary-info traces captured inside the stable +59..+64
  window, 0 diff. Then S5 implementation.
- **Notes:** Ledger hygiene: entry 8 was pre-archived by a worker while
  still live here; dropped it from the ledger without re-appending.

---

## 10 — S4 slice 1 (worker, capped): fade math + state machine landed; Info-page rendering NOT reached — S4 stays [~]

- **State:** `npm test` **138/138** (115→138), `npm run build` green.
  Existing 4 compare traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) still all 0 diff (untouched this slice). **No new
  compare traces committed** — `summary-info-onix.json`/`-magby.json` from
  the step brief were NOT produced; the Info page has no renderer yet, so
  there was nothing to capture against. `ROADMAP.md` S4 stays `[ ]`
  (unstarted rendering-wise; foundation only).
- **Did:** Landed the hard, reusable half of S4 first: dense oracle
  probing (fresh, this session — not just reading the scout's dossier) of
  all 4 `BeginNormalPaletteFade(PALETTES_ALL, 0, ..., RGB_BLACK)` calls
  (entry fade-out/in, exit fade-out/in) fully pinned the per-frame 5-bit
  blend curve and the BG/OBJ 1-tick stagger (`objPaletteToggle`) —
  `src/engine/paletteFade.ts`, self-consistent with the dossier's
  press-tick+59/+53 settle points (20+24+15=59, 18+20+15=53 ticks exactly).
  Wired those tick counts into a summary-screen entry/exit state machine
  (`src/engine/summaryScreen.ts`: transition direction/phase/elapsed,
  selectedSlot, page id) mirroring `Select_Task_OpenSummaryScreen`'s
  3-state machine. 23 new hermetic Tier-1 tests, all pinned against literal
  oracle pixel values (no oracle/pixels at test time). Also confirmed the
  brief's requested number: **first mon idle-animation churn frame is
  press-tick+65** (slot 1/ONIX; settled Info page is stable from +59
  through +64, every frame differs from +65 onward through +151 with no
  further stable window found) — MAGBY (slot 2) not independently probed.
  Addendum written to `docs/summary-screen-notes.md` §6 with full detail.
  Neither module is wired into `core.ts`/render yet.
- **Next:** The Info page renderer itself, blocked on missing extraction
  (found while scoping, not yet done): `species-stats.json` has no
  type/dex-number fields; no ability name/description text table; no
  gender-ratio table. Next slice: (1) extract those (types + dex numbers
  likely cheap additions to `extract-species-header.ts`'s source files;
  ability names/descriptions from `gAbilityNames`/
  `gAbilityDescriptionPointers` need a small new extractor); (2) build the
  Info-page renderer (BG3 tilemap from already-extracted
  `summary-bg.json`, the window/text fields per the dossier's §2/§3, type
  icons from `summary-type-icons.json`) for a **static** frame (mon
  idle-anim can stay a documented remainder, captures must stay ≤
  press-tick+64 per the churn frame above); (3) wire
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts`'s tick/render,
  blending the draft-screen framebuffer during entry-out/exit-in and the
  new Info-page framebuffer during entry-in/exit-out; (4) only then are
  `summary-info-onix.json`/`-magby.json` (dense through the fades, ≤4-frame
  elsewhere) achievable — build and commit those to actually close S4
  slice 1's acceptance criteria, which this session did not reach.
- **Notes:** This slice hit its 50-minute cap on research + the (large,
  now-done-once) fade-curve derivation before rendering could start —
  flagging per `AGENTS.md`'s "stop at a green commit, report exact
  frames/pixels" guidance rather than shipping a rushed/unverified
  renderer. The fade math is the part most likely to have been gotten
  subtly wrong by guessing (5-bit space, BG/OBJ stagger, per-transition
  dead-frame delays all differ from naive assumptions) — glad it's now
  oracle-pinned and covered, since every future summary-screen fade (S4
  paging is a redraw not a fade, but S5's draft-exit fade and S6's battle
  transition likely reuse this exact mechanism).

---

## 9 — Supervisor: S4 scout merged; S2 verified complete

- **State:** Scout branch `worker/wt-20260717-032349` merged: summary-screen
  art extracted (`src/assets/gen/summary-*.json`) + implementation dossier
  `docs/summary-screen-notes.md` (entry `SUMMARY_MODE_LOCK_MOVES`, all 4
  pages + UP/DOWN mon-switching reachable, OT suppressed for rentals,
  ranked frame-exactness risks). Merged tree: `npm test` **115/115**,
  build green, all four compare traces 0 diff. Worktree cleaned up.
- **Did:** Verified the #3 fix (66/66) and the scout deliverables myself;
  merged; re-ran the full battery on the merged tree.
- **Next:** S4 implementation slice 1 — entry fade → static Info page →
  B-exit restore, dense-capture traces 0-diff (dossier §1/§2 is the map;
  keep traces clear of the looping mon idle anim per dossier risk #1).
- **Notes:** Dossier flags the return path re-entering the draft via
  `CB2_InitSelectScreen` (fresh init, `fromSummaryScreen=TRUE`,
  `gLastViewedMonIndex` can move the cursor) — treat exit traces as
  first-class acceptance, not an afterthought.

---

## 8 — ISSUES #3 closed: slot6 every-frame trace 58/66 → 66/66; S2 COMPLETE

- **State:** `npm test` **115/115**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38,
  `draft-menu-slot6.json` **66/66** — all 0 diff, no regressions. `ISSUES.md`
  #3 deleted (fixed). S2 ticked `[x]` in `ROADMAP.md`.
- **Did:** Root-caused and fixed the 3 remaining redraw-scheduling clusters
  via single-purpose dense oracle probes (LEFT-only, DOWN-only, and B-only
  from a settled state), all traced to `CB2_SelectScreen`'s
  `AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/`UpdatePaletteFade`/
  `RunTasks` ordering (RunTasks runs last, so any OAM change it makes isn't
  picked up until the *next* frame's `BuildOamBuffer`, while window/text
  copies land same-tick): (1) LEFT/RIGHT cursor moves reveal category text,
  species text, then the arrow sprite on 3 successive ticks, not atomically
  — new `CursorRedrawState` in `factoryDraftScreen.ts`; (2) UP/DOWN menu nav
  keeps the highlight bar on the old row for 2 full ticks before jumping to
  the new one (no piecemeal reveal, single OAM move) — new
  `MenuHighlightRedrawState`; (3) `monPic.ts`'s close tables were missing
  the same front-sprite/highlight-bar 1-tick OAM lag the open tables already
  modeled, and (surprise, oracle-verified against both draft-menu.json's own
  first close and draft-menu-slot6.json's) the close's window-shrink shape
  does NOT mirror hasActed-at-close or the open variant letter — only an
  open that was variant C gets the skip+duplicate shape; A and B both close
  clean. Added Tier-1 tests for all three (monPic.test.ts 15→20,
  draftScreen.test.ts 12→16).
- **Next:** S4 — summary screen parity (draft's SUMMARY view, page
  navigation, return to draft). See `ROADMAP.md` S4 acceptance criteria.
- **Notes:** The "mirror the open variant" hypothesis for the close table
  seemed elegant but was empirically wrong — always re-verify against a
  fresh dense probe of the *specific* trace in question rather than
  generalizing from one data point, even when the generalization is
  structurally tempting.

---

## 7 — ISSUES #3 partial: slot6 every-frame trace 40/66 → 58/66

- **State:** `npm test` **110/110**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38 —
  still all 0 diff (no regressions). `draft-menu-slot6.json` (every-frame
  0-65) **58/66** (was 40/66). S2 stays `[~]` — 8 frames still differ, all
  redraw-scheduling transients (see `ISSUES.md` #3, trimmed to just these).
- **Did:** Root-caused and fixed the two clusters inside the mon-pic
  sub-state machine (`src/engine/monPic.ts`): (1) the ball-open flash bar's
  flat-vs-blended color was wrongly tied to the hasActed timing variant —
  it actually tracks a separate, session-persistent "has BLDCNT ever been
  configured" flag, now `MonPicState.blended`; (2) that same
  first-ever-open-after-a-cursor-move case needs its own window-growth
  timing table ("variant C"), pinned from dense oracle probing of
  draft-menu-slot6.json. Added 4 new hermetic Tier-1 tests (15→19) pinning
  variant C and the blend/variant decoupling.
- **Next:** Fix the remaining 3 clusters (all `Select_Task_Handle*`'s
  redraw scheduling, not mon-pic): f1-f3 cursor-move header/arrow redraw,
  f37-f38 menu-highlight redraw (likely same mechanism as f1-f3), f44/47-48
  close-phase transients. `ISSUES.md` #3 has a dedicated probing plan for
  each (isolate with single-purpose dense traces before fixing against the
  combined slot6 trace). Then tick S2 `[x]`, then S4.
- **Notes:** The end-states are already exact — only 8/66 frames differ,
  all transient (settle within 2-4 ticks); this is scheduling/timing, not
  missing mechanisms.

---

## 1 — Iteration 0: staged plan authored (supervisor)

- **State:** Baseline green (`npm test` 3/3, `npm run build` OK, oracle
  answering). `ROADMAP.md` now carries the staged plan S1–S9; no engine code
  yet. `tools/compare/traces/anchor.json` committed.
- **Did:** Verified skeleton baseline; probed the oracle (anchor = Lv-50
  single draft screen, ONIX slot 1; RIGHT/A semantics + timings observed);
  pinned the color expansion `(c<<3)|(c>>2)` against all 22 anchor colors;
  verified the dev-time RAM-inspection recipe (replay matches canonical sha
  byte-exactly; anchor `gRngValue = 0xd2ddeec8`); confirmed the per-frame
  VBlank `Random()` rule (`main.c:366`); authored ROADMAP.md stages S1–S9
  with command-backed acceptance criteria.
- **Next:** S1 via worker briefs — extraction pipeline + engine skeleton +
  `appTrace.ts` wiring, driving `npm run compare -- tools/compare/traces/
  anchor.json` to 0 diff.
- **Notes:** RAM-inspection quirks (mGBA log spam on stdout, benign exit-139
  teardown segfault) are documented in ROADMAP.md Domain notes.

---

## 0 — Run initialized

- **State:** Fresh run from the harness template. `npm test` and
  `npm run build` green on the skeleton; engine not started.
- **Did:** Template stamped by `initialize-run.sh` (see `.run.json` for the
  pinned reference revision, ROM SHA-1, and oracle bootstrap version).
- **Next:** Supervisor iteration 0 — bootstrap the plan: probe the oracle,
  survey the reference, replace `ROADMAP.md`'s PLAN PENDING section with
  staged, command-backed acceptance criteria (`SUPERVISOR.md` § "Fresh
  run"), and commit it before any implementation brief.
- **Notes:** The oracle contract and canonical-state description are in
  `bin/oracle info`. Read `AGENTS.md` before anything else.
## 2 — S1 worker: extraction + engine skeleton, anchor frame 94% pixel-exact

- **State:** `npm test` 22/22 green, `npm run build` green, `npm run dev`
  serves without errors. `npm run compare -- tools/compare/traces/
  anchor.json` → **DIFF 2161/38400px (5.63%), ssimMean=0.8171** — NOT yet
  0 diff. All 2161 diff pixels are inside the four text windows (title/
  category/species/message); BG1 chrome tilemap and the OBJ ball+arrow
  sprites are pixel-exact (verified 0 diff outside text regions).
- **Did:** Built `tools/extract/` (indexed-PNG decoder preserving raw
  palette indices — pngjs alone loses them on duplicate colors; JASC .pal
  parser; tile/tilemap decoders; charmap.txt parser) writing committed
  `src/assets/gen/*.json` + `src/data/gen/*.json` from
  `reference/pokeemerald`. Pinned the GBA color round-trip precisely:
  reference art's 8-bit RGB must go 8-bit → 5-bit (`round(v*31/255)`) → the
  oracle's real expansion (`(c<<3)|(c>>2)`), not used as-is (verified
  against real anchor-screenshot colors, e.g. interface.pal's `164,115,246`
  → oracle's actual `165,115,247`). Discovered `sPokeball_Gfx` (factory_
  screen/pokeball.png) is dead code — the real ball art is `graphics/
  starter_choose/pokeball_selection.png` (`gPokeballSelection_Gfx`); menu.png
  supplies BG1's own palette directly (not interface.pal, which is OBJ-only
  for the arrow/highlights). Built `src/engine/` (pure `tick`/`render`,
  240x160 RGBA, no DOM/timers/Math.random): `bg.ts`/`sprites.ts` tile
  compositors, `font.ts` text layout, `factoryDraftScreen.ts` assembling the
  anchor from `sSelect_WindowTemplates` + `CreateSprite` coordinates
  transcribed from `battle_factory_screen.c` (not eyeballed). Wired
  `main.ts` and `tools/compare/appTrace.ts` to the same core. Added 19 new
  Tier-1 tests (tile/tilemap decode, color round-trip, text measurement, an
  anchor-render regression pinning the current output).
- **Next:** Close the remaining 5.63% — see `ISSUES.md` #1: the font
  renderer needs `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable`
  (`reference/pokeemerald/src/text.c:41-51,363-420,526-560`) replicated
  exactly; our current `drawText` treats source glyph pixels as directly
  selecting bg/fg/shadow, but the real renderer blends pairs of source
  nibbles through that lookup table first. Fix either in the extractor
  (bake correct bitmaps into `font-normal.json`) or in `src/engine/font.ts`
  at render time, then re-run `npm run compare` to confirm 0 diff and update
  the pinned hash in `tests/anchorRender.test.ts`.
- **Notes:** `npm run dev` checked via `curl` against the Vite dev server
  (200 on `/` and `/src/main.ts`), not a real browser — no headless browser
  was available in this session; worth a real visual check next session.
## 4 — S2 worker: cursor sweep 0-diff; menu state machine done, ball-open art not yet — S2 PARTIAL

- **State:** `npm test` 39/39 green, `npm run build` green.
  `tools/compare/traces/anchor.json` still **1/1, 0 diff** (no regression).
  `tools/compare/traces/draft-cursor.json` (new, committed) → **13/13
  frames matched, 0 diff** — full RIGHT sweep across all 6 slots with wrap,
  full LEFT sweep back with wrap. `tools/compare/traces/draft-menu.json`
  (new, committed) → **10/38 matched** — every frame outside the ball-open
  "mon pic" window is exact; diff is confined to a ~64x64px region (see
  `ISSUES.md` #2 for the full diagnosis). S2 is therefore only partially
  done; see `ROADMAP.md`'s `[~]` status line for the precise breakdown.
- **Did:** Ported `reference/pokeemerald/src/main.c`'s `ReadKeys()` JOY_NEW/
  JOY_REPEAT model exactly (`src/engine/keyRepeat.ts`: one shared repeat
  counter, 40-tick start delay, 5-tick continue delay, reset on any change
  to the held combination) - pinned against a hand-derived tick sequence in
  `tests/keyRepeat.test.ts` (fires at ticks 1, 41, 46, 51...). Wired the
  draft screen's cursor mode (`LEFT`/`RIGHT` with wrap,
  `Select_UpdateBallCursorPosition`) and menu mode (`A` opens SUMMARY/RENT/
  OTHERS with `menuCursorPos=0`, `UP`/`DOWN` navigate with wrap, `B` OR `A`
  on OTHERS closes back to cursor mode - `Select_OptionOthers` is a no-op
  cancel, confirmed from source) into `src/engine/core.ts`'s `tick()`, all
  pinned by 12 new hermetic tests in `tests/draftScreen.test.ts`. Extracted
  the 6 anchor rental-pool species' header text (species name + Pokedex
  category) via a new `tools/extract/extract-species-header.ts` reading
  `species_names.h` + `pokedex_entries.h`, replacing S1's placeholder empty
  slots 2-6 (`src/data/gen/draft-pool-header.json`). Extracted the menu
  highlight sprite pair (`menu_highlight_left/right.png`) and render the
  SUMMARY/RENT/OTHERS popup text + highlight bar when the menu is open.
  Reverse-engineered (and probed against the oracle) the exact settle
  timing for cursor moves, key-repeat, menu nav, and menu open/close - see
  `ROADMAP.md` Domain notes; also discovered idle screens only stay
  pixel-stable for ~104 frames before a previously-unknown species-name
  color pulse (`Select_Task_FadeSpeciesName`) kicks in, and kept both new
  traces safely under that.
- **Next:** The ball-open reveal (`Task_OpenMonPic`/`Task_CloseMonPic`'s
  WIN0 growth + `BG3`/`BG1`/`OBJ` alpha blend, plus the front-sprite
  extraction for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA) is the one
  remaining piece for S2 - `ISSUES.md` #2 has the full mechanism, register
  values, and timing already reverse-engineered; re-run
  `draft-menu.json` (already committed with dense captures over both
  transitions, on 2 different slots) to check progress once implemented.
  After that: S3 is proceeding in a parallel worktree (rental data/RNG) -
  don't touch `src/engine/rng.ts` or `src/data/gen/rental*`/`anchor-state.json`.
- **Notes:** PAPERCUT: none this session - the oracle's dense-capture probing
  loop (`bin/oracle run <trace> -o <dir>` + comparing manifest sha256s) was
  fast and effective for reverse-engineering exact frame timing; no friction.

---

## 3 — S1 worker: font glyph fix closes the anchor compare — S1 COMPLETE

- **State:** S1 acceptance fully met. `npm run compare -- tools/compare/
  traces/anchor.json` → **1/1 frames matched, 0 diff, ssimMean=1.0000, exit
  0** (was 2161/38400px, 5.63%). `npm test` 22/22 green, `npm run build`
  green, `npm run dev` serves (curl 200 on `/` and `/src/main.ts`; still no
  real-browser check — no headless browser available in this session
  either).
- **Did:** Fixed `ISSUES.md` #1 (now deleted). Two distinct bugs in
  `src/engine/font.ts`, both pinned against `reference/pokeemerald/src/
  text.c`: (1) the raw-glyph-pixel → color role mapping was wrong — traced
  `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable` (text.c:41-51,
  363-511) by hand and confirmed it is **not** a blend of adjacent source
  pixels (contra the ISSUES.md lead) but a per-pixel remap table (raw 0-3 →
  role bg/fg/shadow, raw 3 folds back onto role 0/bg) vectorized 4-at-a-time
  for GBA speed; also ported `GLYPH_COPY`'s "skip writing when the resolved
  color index is literal 0" transparency rule (text.c:585), replacing the
  old "raw===0 is always transparent" logic. Verified empirically against
  oracle pixel colors (text.pal index1=black=bgColor, index2=white=fgColor
  matches the observed title-text look) before committing. (2)
  `DecompressGlyph_Normal` (text.c:1883) hardcodes `gCurGlyph.height = 15`
  for Latin glyphs regardless of the 16px cell size — our render loop used
  the full `cellSize` and leaked stray bgColor pixels into the row directly
  below the title text. Added `glyphHeight` to `font-normal.json`/`FontData`
  and capped the row loop to it; re-ran the extractor (only `font-normal.
  json` changed). Updated the pinned hash in `tests/anchorRender.test.ts`
  and the `FontData` test fixture in `tests/font.test.ts`. Ticked S1 `[x]`
  in `ROADMAP.md`.
- **Next:** S2 — draft-screen interaction parity (cursor movement, header
  text, A → ball-open + SUMMARY/RENT/OTHERS menu, B/close, message-box
  updates). See `ROADMAP.md` S2 acceptance criteria. S3 (rental data/RNG)
  is running in a parallel worktree per the supervisor's scoping — don't
  touch `src/engine/rng.ts` or `src/data/gen/rental*`.
- **Notes:** No headless browser tooling (playwright/puppeteer) is
  installed in this run; `npm run dev` has only ever been curl-smoke-tested,
  not visually verified. Worth adding if a future stage needs real DOM/
  canvas verification.

---

## 5 — Supervisor: S3 merged from worktree lane — S3 COMPLETE

- **State:** Merged `worker/wt-20260717-012856` (S3: RNG core, rental data,
  anchor RAM dump) into master; on the merged tree `npm test` **91/91**
  green, `npm run build` green, `anchor.json` 1/1 and `draft-cursor.json`
  13/13 still 0 diff. Worktree + branch cleaned up. S3 ticked `[x]` in
  ROADMAP; S2 remains `[~]` with `ISSUES.md` #2 (ball-open reveal) open.
- **Did:** Verified S3 in the worktree (74/74 there; LCG constants checked
  against `random.c`; dump spot-checked: `gRngValue 0xd2ddeec8`, six
  species in pinned order with RAM-read Lv50 stats). Added the
  `sFactorySelectScreen` finding to ROADMAP Domain notes.
- **Next:** Finish S2 via `ISSUES.md` #2 (mon-pic window growth + GBA
  5-bit-space alpha blend + 6 front-sprite extraction), then S4.
- **Notes:** Statics aren't in the linker map — `nm` on the pinned ELF
  resolves them (recipe in `tools/extract/inspect-anchor.py`).

---

## 6 — Ball-open reveal landed (38/38); every-frame capture exposes transients

- **State:** `npm test` **106/106**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` **38/38**
  — all 0 diff. NEW `draft-menu-slot6.json` (every-frame captures 0-65)
  → **40/66**: the ≤4-frame-spaced traces skip transient frames that are
  not yet exact. S2 stays `[~]`; remainder is `ISSUES.md` #3 (clusters +
  diff forensics there). ISSUES #2 deleted (fixed: reveal + blend + 6 front
  sprites, monPic sub-state Tier-1-pinned).
- **Did:** Worker landed the mon-pic reveal (WIN0 growth, 5-bit-space
  blend, front-sprite extraction for all 6 species) + 15 hermetic tests;
  hit its 50-min cap while building the slot-6 trace. Supervisor verified
  all compares/tests, ran the unfinished trace, inspected diff PNGs,
  filed #3 with per-cluster diagnosis, committed the trace.
- **Next:** Fix `ISSUES.md` #3 → `draft-menu-slot6.json` 66/66, then tick
  S2 `[x]`. Then S4 (summary screen).
- **Notes:** Transient mechanisms are all in battle_factory_screen.c
  (affine open anim, redraw scheduling, close-phase sprite visibility).

---
## 12 — S4 slice 1 (worker, capped): Info-page extraction landed; renderer/traces still NOT reached — S4 stays [~]

- **State:** `npm test` **146/146** (138→146, +8 new), `npm run build`
  green. Existing traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) untouched, still 0 diff (not re-run this session but
  no shared code was touched). **`summary-info-onix.json`/`-magby.json`
  were NOT produced** — no Info-page renderer exists yet, so there is
  nothing to capture against. `ROADMAP.md` S4 stays `[~]`.
- **Did:** Closed the slice-1 blocker the brief asked for first:
  `tools/extract/extract-summary-info.ts` extracts, for the 6 anchor
  species, National Dex number (RAM-probed `FLAG_SYS_NATIONAL_DEX` at the
  anchor to confirm National — not Hoenn — numbering applies, bit read
  back `1`/TRUE), types, and `genderRatio` from `species_info.h`, plus
  ability name+description text for every ability the pool uses, into
  `src/data/gen/summary-info.json`. Added `src/engine/monGender.ts`
  (pure port of `GetGenderFromSpeciesAndPersonality`). Both pinned in
  `tests/summaryInfo.test.ts` (8 new tests) against the anchor's real
  personality values (e.g. confirms ONIX shows male, MAGBY female).
  Then spent the remainder of the session's budget researching the
  renderer itself (window pixel geometry, text-color tables, sprite
  positions/priorities/anchoring, BG-layer reasoning, a nature-memo
  two-tone-color-code gap in `font.ts`, a few unresolved assumptions) and
  wrote it all up as `docs/summary-screen-notes.md` §7 rather than ship
  unverified rendering code with no oracle pixels behind it — building the
  actual `summaryInfoPage.ts` renderer, wiring `summaryScreen.ts`+
  `paletteFade.ts` into `core.ts` (confirmed **zero existing call sites**
  for either), and capturing/debugging the two dense traces against the
  oracle is real multi-hour work that didn't fit in what was left of this
  session's cap after the research above.
- **Next:** Follow `docs/summary-screen-notes.md` §7 directly — it's a
  resolved implementation spec, not a scouting task: (1) build
  `src/engine/summaryInfoPage.ts` (BG3 tilemap via `drawTileBg` + all
  text windows via `drawText` + type icon/markings/ball/mon-front sprites
  via `drawSprite`); (2) resolve the 4 flagged open items before trusting
  pixels — nature-memo two-tone color codes (§7's caveat), mon-sprite
  `hFlip` table membership for the 6 species, rental-mon caught-ball item
  (assumed but unverified `ITEM_POKE_BALL`), and markings anim-frame-0
  appearance; (3) wire `summaryScreen.ts`+`paletteFade.ts` into
  `core.ts`'s `EngineState`/`tick()`/`render()` per §7's exact branch
  points; (4) only then capture `summary-info-onix.json`/`-magby.json`
  (dense through both fades + the settled +59..+64 window; probe MAGBY's
  own stable window independently, don't assume ONIX's) and iterate to 0
  diff.
- **Notes:** This is the same "stop rather than ship a guessed renderer"
  call the prior slice made for the fade math — the difference this time
  is the blocker (extraction) is actually closed, and the open unknowns
  left for next time are few, named, and cheap to resolve (each is one
  more source grep), not a wide-open scouting problem. `PAPERCUT`: none
  new this session — the RAM-inspection recipe for a single save flag
  (national dex) was fast once `inspect-anchor.py`'s pattern was reused.

---
