# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

