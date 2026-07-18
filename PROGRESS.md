# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

