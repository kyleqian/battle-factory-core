# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

