# Battle room scene notes (S6 groundwork, extraction-only)

Implementation dossier for `BattleFrontier_BattleFactoryBattleRoom` as it
appears from the warp landing (tick ~520 of the committed ground truth)
through the opponent's overworld speech settling (tick ~838) -
`docs/battle-bringup-notes.md`'s SS1 choreography and the "Slice-0 ground
truth" frame boundaries. Extraction-only session, following
`docs/prebattle-room-notes.md`'s method for the analogous pre-battle room:
no engine code (`src/engine/` untouched), no `tools/compare/traces/` parity
fixtures. Extractor: `tools/extract/extract-battle-room.ts`, writing
`src/assets/gen/battle-room-{tileset,npcs}.json` and
`src/data/gen/battle-room-layout.json`.

## 0. Ground truth

Two scratch dense-capture probes built on `tools/compare/traces-groundtruth/
battle1-intro.json`'s own committed segments (same button script, just denser
`captureFrames`; not committed, per convention): `/tmp/s6room/probeA.json`
(ticks 495-660, every frame) and `probeB.json` (ticks 660-850, every frame).
Both re-verified byte-identical to `battle1-intro.json`'s own sparse captures
at the frames they share.

## 1. Map: tileset + layout

`LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM` (`data/layouts/
layouts.json`) is **13x12 blocks** (208x192px), the same tileset pair as the
pre-battle room - primary `gTileset_Building` + secondary
`gTileset_BattleFactory` - but this map references a different block subset
(the battle ring, side alcoves, top banners), so its own tile/palette/
metatile extraction is self-contained (some source tiles/palettes legitimately
overlap between `prebattle-room-tileset.json` and `battle-room-tileset.json`,
same convention as that extractor). `extract-battle-room.ts` pulled **88
tiles / 5 palette slots (0, 5 primary; 6, 9, 11 secondary) / 153 metatiles**
actually referenced by the 156 blocks (152 map blocks + the 4-block
`border.bin`, all `layerType: 0 NORMAL`, same "no SPLIT/COVERED blocks in
view" simplification as the pre-battle room). Screen is 240px wide vs. the
map's 208px, so the camera reveals a **16px static void margin on both
sides** whenever the map doesn't cover the full width - rendered from
`border.bin`'s single repeating metatile (id 1, a near-fully-transparent
primary-tileset tile that composites to flat black - confirmed by
oracle-diffing the margin columns, see SS3).

## 2. Object inventory

`map.json`'s `object_events` (8 entries, no warp/coord/bg events):

| local id | gfx (as authored) | spawn tile | role |
|---|---|---|---|
| `LOCALID_FACTORY_BATTLE_SCIENTIST_1` | `OBJ_EVENT_GFX_SCIENTIST_1` | (0,6) | background NPC, turns east |
| `LOCALID_FACTORY_BATTLE_OPPONENT` | `OBJ_EVENT_GFX_VAR_0` (resolved dynamically) | (7,4) template / (7,1) at walk-in | opponent walk-in |
| `LOCALID_FACTORY_BATTLE_SCIENTIST_2` | `OBJ_EVENT_GFX_SCIENTIST_1` | (0,4) | background NPC, turns east |
| `LOCALID_FACTORY_BATTLE_SCIENTIST_3` | `OBJ_EVENT_GFX_SCIENTIST_1` | (0,8) | background NPC, turns east |
| `LOCALID_FACTORY_BATTLE_SCIENTIST_4` | `OBJ_EVENT_GFX_SCIENTIST_1` | (12,4) | background NPC, turns west |
| `LOCALID_FACTORY_BATTLE_SCIENTIST_5` | `OBJ_EVENT_GFX_SCIENTIST_1` | (12,6) | background NPC, turns west |
| `LOCALID_FACTORY_BATTLE_SCIENTIST_6` | `OBJ_EVENT_GFX_SCIENTIST_1` | (12,8) | background NPC, turns west |
| `LOCALID_FACTORY_BATTLE_PLAYER` | `OBJ_EVENT_GFX_VAR_F` (resolved dynamically) | (5,11) | fake player decoy |

**No attendant object exists in this map** - the pre-battle room's attendant
vanishes (`set_invisible`) at the end of `Movement_GuideWalkToBattleRoomLv50`
*before* the warp fires (`docs/battle-bringup-notes.md` SS1), so it never
follows the player in here. Not a gap in this extraction; confirmed by
reading `map.json`'s full `object_events` list (8 entries, no attendant/
`SCIENTIST_1`-as-attendant duplicate).

### Fake-player / real-player split (the source comment is misleading)

`scripts.inc`'s own header comment claims "the camera is supposed to remain
still" while a fake decoy walks so the screen doesn't need to track the real
player object. **Oracle evidence contradicts a literal reading of that
comment: the camera actively pans** (SS3) - both `LOCALID_FACTORY_BATTLE_PLAYER`
(visible decoy, spawn (5,11)) and the real, hidden `LOCALID_PLAYER` (warped to
**(6,11)**, one column *east* of the decoy - `BattleFrontier_
BattleFactoryPreBattleRoom/scripts.inc`'s `warp ..., 6, 11`) receive the
*same* `applymovement ..., Movement_PlayerEnterRoom` (`walk_up`x5,
`face_right`) simultaneously (`scripts.inc:104-106`). The camera tracks the
real (invisible) object's coordinate via the standard field-camera formula,
while the fake decoy is what's actually drawn - one tile column further west
than the camera-anchor the whole time. (The likely intent of "remain still":
prevent the camera from re-snapping/glitching across the room-to-room warp
boundary, not "never move again" - not independently confirmed against
source this session, flagged as a documentation-accuracy note only.)

### Settle tiles (post `EventScript_EnterRoom`, `scripts.inc:104-116`)

- **Real player** (camera anchor): (6,11) -> walk_up x5 -> **(6,6)**.
- **Fake player decoy** (visible): (5,11) -> walk_up x5, face_right -> **(5,6),
  facing east**.
- **Opponent**: removed from its (7,4) template position and re-added at
  (7,1) *after* the player settles and scientists turn
  (`factory_setopponentgfx` -> `removeobject`/`setobjectxyperm ..., 7,
  1`/`addobject`, `scripts.inc:108-113`), then `walk_down`x5, face_left ->
  **(7,6), facing west**. Player-decoy and opponent end up on adjacent
  columns of the same row, facing each other across the ring - clearly
  intentional blocking, and a strong independent sanity check that the
  coordinate reading above is right.
- **Scientists**: stay on their spawn tiles, only turn in place
  (`EventScript_ScientistsFaceBattle`, `scripts.inc:234-242`):
  scientists 1-3 (west wall, x=0) turn **east**
  (`Common_Movement_WalkInPlaceFasterRight`); scientists 4-6 (east wall,
  x=12) turn **west** (`...FasterLeft`) - i.e. all six end up facing the
  ring, not a left/right split by identity.

## 3. Camera path (oracle-observed, ticks 520-838)

The camera follows the **standard field-camera formula** confirmed
throughout this codebase (`prebattle-room-notes.md` SS1's "Camera origin"):
`originX = realPlayerTileX*16 + 8 - 120`, `originY = realPlayerTileY*16 + 8 -
80`. Applied to the real player's tiles above:
- **Initial** (real player at (6,11)): `originPx = (-16, 104)`. Not
  independently pixel-verified this session (see risk 1 below) - inferred
  from the formula + the observation that nothing moves before tick ~536
  (next point), not brute-forced against a capture.
- **Settled** (real player at (6,6)): `originPx = (-16, 24)`. **Oracle-
  verified pixel-exact**, SS5.

Horizontal origin never changes (the whole walk is vertical). Tick-by-tick
behavior, from a dense per-frame capture diff (`/tmp/s6room/probeA.json`
ticks 520-660):
- **Ticks 520-535**: large alternating frame-to-frame pixel deltas
  (thousands of px) coincide with the whole screen's **mean brightness
  ramping from ~10 to ~97** (measured directly on the RGB capture, not
  inferred) - a screen brightness fade-in from the warp, not camera motion or
  sprite movement. Not modeled or pixel-verified this session (SS6 risk 2).
- **Ticks 536-542**: zero frame-to-frame diff (brief static pause, fade
  complete, walk not yet started).
- **Ticks 543-~622**: continuous per-frame change, magnitude growing from
  ~2300 to ~4800 differing px/tick - consistent with the real player's
  walk_up x5 driving the camera pan (more of the detailed ring/floor pattern
  scrolls into view each tick) superimposed with the decoy's own walk-cycle
  leg animation. Exact sub-tile pan timing (which tick the camera is at which
  fractional pixel offset) was **not** derived this session - out of scope
  for extraction, flagged for the engine slice (SS6 risk 1).
- **~Tick 623 onward**: pan-related deltas stop; small residual oscillations
  (~60-220 px/tick) through at least tick 660 match the *documented* script
  order running next - `EventScript_ScientistsFaceBattle` (6 NPCs' turn
  animation, ~4 ticks each) then the opponent's `removeobject`/`addobject`/
  `walk_down`x5. **Tick 624 is already a pixel-exact composite match** at the
  settled origin with scientists still pre-turn (SS5) - i.e. the pan
  completes at or before 624, before the scientists start turning.
- **Ticks 740-838**: fully settled, confirmed pixel-stable
  (`docs/battle-bringup-notes.md`'s own finding, re-confirmed here via
  composite match at 6 sampled ticks, SS5).

## 4. Sprite sheets

All three character types share the standard 16x32, 9-frame
`overworld_frame(*, 2, 4, N)` layout (144x32px = 18x4 8x8-tiles;
`sAnimTable_Standard`, `object_event_anims.h:178-233,825-833`) - frame index
meaning (source-read, cross-verified against SS5's pixel-exact matches for
indices 0 and 2):

| index | meaning | index | meaning |
|---|---|---|---|
| 0 | face south | 5,6 | walk north (alt. w/ 1) |
| 1 | face north | 7,8 | walk west (alt. w/ 2) |
| 2 | face west (raw); face east = 2 w/ hFlip | - | walk east = 7,8 w/ hFlip (alt. w/ 2 w/ hFlip) |
| 3,4 | walk south (alt. w/ 0) | | |

`extract-battle-room.ts` pulls the **full 9-frame sheet** for each of the
three characters (cheap, avoids a second extraction pass for whichever
mid-walk frames the engine slice ends up needing) into
`battle-room-npcs.json`:

- **`player`** (fake decoy): `OBJ_EVENT_GFX_RIVAL_BRENDAN_NORMAL` (male save,
  confirmed - `prebattle-room-notes.md`) resolves to
  `gObjectEventGraphicsInfo_RivalBrendanNormal`
  (`object_event_graphics_info.h:1920-1937`), which uses the **same**
  `sPicTable_BrendanNormal` / `OBJ_EVENT_PAL_TAG_BRENDAN` as the plain
  `BrendanNormal` gfx already extracted for the pre-battle room - literally
  the same source PNG (`graphics/object_events/pics/people/brendan/
  walking.png`) and palette (`brendan.pal`), just a different
  `ObjectEventGraphicsInfo` entry (different palette *slot*,
  `PALSLOT_NPC_SPECIAL` vs `PALSLOT_PLAYER` - irrelevant to the extracted
  pixel/palette data itself).
- **`scientist`**: `OBJ_EVENT_GFX_SCIENTIST_1` ->
  `graphics/object_events/pics/people/scientist_1.png` +
  `palettes/npc_3.pal` - same sheet as the pre-battle room's attendant.
- **`opponent`**: resolved per the brief's pointer -
  `SetBattleFacilityTrainerGfxId(gTrainerBattleOpponent_A, 0)`
  (`src/battle_factory.c:379-382`) looks up trainer 50 DESTIN's
  `facilityClass = FACILITY_CLASS_BUG_CATCHER` in
  `gTowerMaleFacilityClasses[28]` (`src/battle_tower.c:153-181`, 0-indexed
  position confirmed by direct enumeration) and reads the **parallel**
  `gTowerMaleTrainerGfxIds[28]` (`:211-240`) = `OBJ_EVENT_GFX_BUG_CATCHER` ->
  `gObjectEventGraphicsInfo_BugCatcher` (`object_event_graphics_info.h:704-
  720`): `sPicTable_BugCatcher` / `OBJ_EVENT_PAL_TAG_NPC_1` ->
  `graphics/object_events/pics/people/bug_catcher.png` +
  `palettes/npc_1.pal`. Also the standard 9-frame sheet
  (`.anims = sAnimTable_Standard`).

Frames this specific choreography window actually needs (a subset of the 9
extracted per sheet): player - 1 (face north, mid-walk), 5/6 (walk north),
2+hFlip (face east, settled); opponent - 0 (face south, spawn), 3/4 (walk
south), 2 (face west, settled); scientist - 0 (face south, spawn/pre-turn),
2+hFlip (turned east, scientists 1-3), 2 (turned west, scientists 4-6). The
walk-in-place-faster turn animation's transient frames (7/8, `ANIM_STD_
GO_FASTER_EAST/WEST`, `duration=4` ticks per `MovementAction_
WalkInPlaceFasterRight/Left_Step0`, `event_object_movement.c:5822-5828`) are
extracted but **not** individually pixel-verified - the turn completes in ~4
ticks, well before any of this session's dense-capture windows landed on it
(SS6 risk 3).

Sprite screen anchor: same rule as the pre-battle room (16px wide = tile-
width-aligned, 32px tall = bottom-aligned to the tile: `top = tileY*16 - 16`,
`left = tileX*16`, then subtract the camera origin) - re-confirmed by SS5's
exact matches, not re-derived.

## 5. Composite-check evidence

Scratch renderer (`/tmp/s6room/render.py`, Python/numpy/PIL, not committed)
decodes `battle-room-{tileset,npcs}.json` + `battle-room-layout.json`
exactly as committed and composites background + sprites at the documented
tile positions/frames. Diffed against oracle captures
(`/tmp/s6room/probeA.json` -> `outA/`, ticks 495-660;
`probeB.json` -> `outB/`, ticks 660-850):

1. **Tick 624** (settled camera, decoy settled facing east, scientists still
   pre-turn facing south, opponent not yet added): **full-frame 0/38400
   pixels differ.** No message box in play at this tick, so this is a
   genuinely complete match, not a partial-region one.
2. **Ticks 740, 745, 760, 780, 800, 820, 838** (settled camera, decoy east,
   opponent west, all 6 scientists turned): **0/21600 pixels differ** on the
   region **y<90** (the full 240px width, rows 0-89). This deliberately
   excludes the message box, which occupies **y>=115** at this tick (`"IT'S
   WAY TOO / HOT HERE"` box top border measured directly at y=115, teal
   `(0,255,156)`, interior white from y=118 - oracle-measured this session,
   not assumed from the pre-battle room's own 96px-top box, which turns out
   to be a *different*, shorter box here). Rows 90-114 were **not** checked
   (mixed floor/lower-sprite content right above the box, not needed to
   clear the acceptance bar and not worth the extra time this session).
   For reference, the **full-frame** diff at tick 800 (message box included,
   since its text/frame art is out of this step's scope) is **8324/38400**,
   entirely confined to y=115-156 - i.e. exactly and only the un-rendered
   message box, confirming the gap is fully understood and bounded, not a
   silent residual.

Both checks used the literal committed JSON (re-verified after fixing the
camera-origin constant mid-session - re-ran `extract-battle-room.ts` and
re-confirmed determinism: identical md5 across two consecutive runs, and the
composite checks above are against the final, regenerated files).

## 6. Risks / follow-ups for the engine step

1. **Camera pan sub-tile timing (520/536-623) is not derived** - only the
   two endpoints (initial origin (-16,104), settled origin (-16,24)) and a
   coarse tick range are pinned; the settled endpoint is oracle-verified
   pixel-exact, the initial one is formula-inferred only (next point). A
   future dense pass correlating `gObjectEvents`/sprite pixel coordinates
   tick-by-tick (RAM read, not pixel-diffing alone - the fade-in confounds
   pixel diffing early on) would pin the exact interpolation.
2. **The ticks-520-535 brightness fade-in is observed but not modeled** -
   mean framebuffer brightness measured directly (~10 -> ~97, RGB average),
   not pixel-matched against any rendered composite (a full-brightness
   composite cannot match a still-fading capture without an explicit
   brightness-ramp model). This also means `initialCameraOriginPx` in
   `battle-room-layout.json` is **not** independently oracle-confirmed the
   way `settledCameraOriginPx` is - it follows directly from the same
   camera formula and the real player's known warp-landing tile (6,11), and
   is very likely correct, but flagged honestly as unverified.
3. **Walk-in-place-faster turn transient (scientists) and the walk-cycle
   alternation (player/opponent mid-stride) are extracted but pixel-
   unverified** - SS4. Only the settled end-poses (frame 2, raw/hFlip) and
   the pre-turn spawn pose (frame 0) are oracle-confirmed (SS5).
4. **Rows y=90-114 of the settled scene are unchecked** - almost certainly
   fine (it's the same floor/scientist-leg content the y<90 check already
   validates elsewhere), but not literally diffed this session.
5. **The message box art/geometry for the opponent-speech box is out of
   scope** - it differs from the pre-battle room's box (shorter, top edge at
   y=115 not y=96) and was not extracted; the S6 engine slice needs its own
   pass for this (plus possibly a second message-box variant asset,
   distinct from `prebattle-room-msgbox.json`).
6. **`initialCameraOriginPx`'s underlying claim** ("nothing moves before
   tick ~536") rests on the zero-frame-to-frame-diff observation at ticks
   536-542, which is consistent but not itself proof the walk hasn't
   started - a RAM read of the real player's coordinate would close this
   gap definitively; not done this session (time budget).

## 7. Extraction outputs

- `src/data/gen/battle-room-layout.json` - 13x12 block grid + border,
  `initialCameraOriginPx`/`settledCameraOriginPx`, and the object inventory
  (real/fake player spawn+settle tiles, opponent spawn+settle tile, all 6
  scientists' fixed tiles + turn direction).
- `src/assets/gen/battle-room-tileset.json` - the 88 tiles / 5 palette slots
  / 153 metatiles this map's blocks (+ border) reference.
- `src/assets/gen/battle-room-npcs.json` - full 9-frame sheets + 16-color
  palettes for `player` (fake decoy), `scientist` (x6, one shared sheet),
  `opponent` (bug catcher gfx).

All three verified byte-identical (md5) across two consecutive extractor
runs.
