# Factory Lobby free-roam + postwin REST — ground truth (Battle Scene OFF)

SIDE-LANE ground-truth scout, continuing `docs/postwin-record-retire-ground-truth.md`
(the postwin 4-choice menu's RECORD/RETIRE branches, its §3a YES/NO window
correction) and `docs/post-terminal-return-to-lobby-ground-truth.md` +
`docs/post-terminal-beyond-boundary-ground-truth.md` (the LOSS lobby timeline
and the decline-branch-to-free-roam span). This packet pins two things the
prior docs flagged as never-probed:

1. **The postwin REST branch** (`EventScript_AskPauseChallenge`, the
   "save and quit" path) — the brief's rung A. The user decision makes REST
   **unselectable** in the app; this doc records exactly what the real game
   shows so the divergence can be precise.
2. **The free-roam Lobby after a LOSS decline** — the walk boundary, walk
   cadence, camera behavior, and collision (attendant NPC, counter, potted
   plants, exit door mat warp) — rungs B and C. The app deliberately renders
   the lobby walkable with **no exit warp, no PC interaction, and silent NPCs**;
   this doc names each real-game behavior the app diverges from.

Docs + committed battle-lab fixtures + `tools/probe/` RAM probes only — no
`src/`/`tests/`/`tools/compare/` edits.

## 0. Method and fixtures

Every fixture below is a `mechanicLab` scenario (Battle Scene OFF) built on
committed prefixes:

- **REST fixture** `tools/battle-lab/scratch-postwin-rest-probe.json`:
  verbatim prefix of the committed `scratch-postwin-record-probe.json` (the
  held GO ON/RECORD/REST/RETIRE menu, byte-identical sha `e83628935b…` at
  frames 6133-6635) + `DOWN`×2 (cursor→REST, `scripts.inc:96` case 2) + `A`
  (select) + hold + `A` (select YES, the default cursor) + long hold through
  the save and the fade-out. 35 segments / 7248 frames / 209 captures.
  **Twice-run byte-identical** (209/209 manifest shas, manifests byte-equal).
- **Lobby walk fixture** `tools/battle-lab/scratch-loss-lobby-walk-probe.json`:
  verbatim prefix of the committed `scratch-loss-beyond-boundary-probe.json`
  through free-roam (its own 52 segments, i.e. the loss fixture's recorded
  input + the decline-A + the "We look forward" dismiss-A) + a `DOWN`-hold
  (3 tiles), `UP`-hold (2 tiles), `LEFT`-hold (4 tiles), `UP`-hold (2 tiles).
  58 segments / 5472 frames / 198 captures. **Twice-run byte-identical.**
- **Lobby collision fixture** `tools/battle-lab/scratch-loss-lobby-collision-probe.json`:
  same free-roam prefix + `UP`-hold (attendant-NPC block), `RIGHT`-hold (7
  tiles east), `UP`-hold (counter metatile block), `DOWN`-hold (south walk).
  58 segments / 5562 frames / 192 captures. Oracle-run (manifest) once.
- **Lobby door-mat fixture** `tools/battle-lab/scratch-loss-lobby-door-mat-probe.json`:
  same free-roam prefix + `RIGHT`-hold to (10,8) + `DOWN`-hold onto the exit
  door mat warp + hold through the warp. 58 segments / 5482 frames / 212
  captures. **Twice-run byte-identical.**

Player coordinates below come from `tools/probe/dump-lobby-*-player-coords.py`
RAM probes run through `tools/run-mgba-probe.py` (read `gObjectEvents[id]`
currentCoords + facingDirection + `gPlayerAvatar` runningState/tileTransition
+ `gCamera` every tick in the window; the map-grid origin is offset by
`MAP_OFFSET = 7` per `include/fieldmap.h:18`, so map `(x,y) = (gridX-7, gridY-7)`;
facing enum is DIR_SOUTH=1/NORTH=2/WEST=3/EAST=4). All three probes validated
JSON before the known teardown SIGSEGV. Pixel facts (shas, glyph counts,
window geometry, fade) are from `bin/oracle lab` manifests + framebuffer
diffing (this session's model cannot view PNGs; text is source-matched + glyph-
count verified, and every visual claim below is tied to a sha or a pixel-region
diff).

## 1. RUNG A — postwin REST branch (save-and-quit)

### 1a. Source path

Menu order is `MULTI_GO_ON_RECORD_REST_RETIRE` (`scripts.inc:92`, cursor order
GO ON→RECORD→REST→RETIRE already pixel-confirmed by the retire doc). REST is
`case 2` → `EventScript_AskPauseChallenge`
(`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:121-126`):

```
msgbox Text_SaveAndQuitGame, MSGBOX_YESNO          ; scripts.inc:122
case NO  -> AskReadyForOpponent                    ; :124 (re-ask)
case YES -> EventScript_PauseChallenge             ; :125
```

`Text_SaveAndQuitGame` (`scripts.inc:484-486`): **"Would you like to save and
quit\n"** **"the game?"** — 40 glyphs, one `\n` wrap. This is a **`MSGBOX_YESNO`
window, not the `multichoicedefault 20, 8` window** the RECORD/RETIRE prompts
use — and unlike RECORD/RETIRE (whose `Task_HandleMultichoiceInput` skip made
the window appear only during the hold, see the record/retire doc §3/§3a), here
the YES/NO window is the message box's own child drawn with it.

### 1b. Boundary ledger (canonical ticks, `scratch-postwin-rest-probe.json`)

| canonical tick | span | sha256 (prefix) | what's on screen / mechanism |
|---:|---|---|---|
| 6133-6635 | held | `e83628935b` | held GO ON/RECORD/REST/RETIRE menu, cursor GO ON (the record doc's proven held boundary) |
| 6636-6640 | 5 | `92e6a424` | `DOWN` (6634-6635) → cursor on RECORD, visible 6636 |
| 6641-6645 | 5 | `fafe4c69` | `DOWN` (6639-6640) → cursor on REST, visible 6641 |
| 6646-6647 | 2 | `cf0ef676` | 4-choice window close visual |
| 6648 | 1 | `4bf39eb6` | box cleared to blank; `msgbox` re-draws |
| 6649-6689 | 41 | one sha per glyph | **"Would you like to save and quit\nthe game?"** types at 1 glyph/frame (40 glyphs), first glyph 6649, **final glyph 6689** |
| 6691 | 1 | `f018326d` | **YES/NO window + 3×3 wait-cursor (down arrow) draw fully-formed in one frame** |
| 6693-6749 | held | `f018326d` | input-ready hold; cursor ▶ on **YES** |
| 6748-6749 | 2 | — | `A` press — accepts the default **YES** (no cursor move needed) |
| 6750 | 1 | `4bf39eb6` | box cleared |
| 6751-6784 | 34 | one sha per glyph | **"I am saving your data.\nPlease wait."** types (`Text_SavingDataPleaseWait`, `scripts.inc:615-617`) |
| 6787-6954 | 168 | `c5df9665` | static hold — `factory_save CHALLENGE_STATUS_PAUSED` + `playse SE_SAVE` + `waitse` (`scripts.inc:193-195`), RAM-level, zero pixel change; `mainCallback2` stays `134766173` (lobby/prebattle overworld) |
| 6955-7007 | ~53 | `e150e2a2`→`6be461a2` | `fadescreen FADE_TO_BLACK` (`scripts.inc:196`) — one unique frame per tick |
| 6979 | 1 | `232b3c7c` | `mainCallback2` → `0` (transient callback clear = the `frontier_reset`/`DoSoftReset_` handoff, `frontier_util.c:897-900`) |
| 6991-7007 | | `135712429` | title/boot callback live, blacking out |
| 7007-7135 | 128 | `6be461a2` | solid black hold |
| 7135+ | fade-in | `7ef1264e`→… | **soft-reset boot fade-in (the game restarting)** — the `frontier_reset` (→ `DoSoftReset`) boot; intentionally not mapped further per the brief's stop rule |

Window geometry (held frame 6693): bbox **(161,65)-(214,110)** — the standard
4×4-tile `drawStandardWindowFrame` frame, but **8 px (1 tile) wider than the
RECORD/RETIRE `multichoicedefault` YESNO window** (161,65)-(206,110): a
`MSGBOX_YESNO` child window vs a `MULTI_YESNO` menu window are not the same
drawn frame. Text rows: **YES** at rows 76-85, **NO** at rows 92-101. Default
cursor: the ▶ triangle spans rows 76-85 at x 169-173 = **on YES**
(`MSGBOX_YESNO` defaults to the YES option — opposite of the
`multichoicedefault …, 1` NO-default the RECORD/RETIRE prompts use).

**Save-and-reset intent, pinned:** REST→YES reaches a real `factory_save` of
`CHALLENGE_STATUS_PAUSED`, an audio-only save SE, a fade-out, and a soft reset
to the game boot. The save itself is fully silent on-screen (168-tick static
hold of the "I am saving your data." message). The app's REST-guard divergence
should therefore rest on: (a) REST is **never selectable** (the user decision),
(b) the string and window that would have appeared, (c) the save-and-reset
consequence. No tier-1 app code changes in this lane.

## 2. RUNG B — the free-roam boundary after the LOSS record prompt

The committed `scratch-loss-beyond-boundary-probe.json` + its doc already map
the decline branch; this scout **re-verified it twice-run byte-identical**
(98/98 manifest shas, manifests byte-equal) and added the exact first-movement
tick via the walk fixture's RAM probe. Headline boundary:

**`tick 5093` the record prompt's dismiss chain is fully complete
(`releaseall`, `scripts.inc:93`) — the message box is gone and the player has
free-roam overworld control, still on `BattleFrontier_BattleFactoryLobby`
(`mainCallback2` unchanged, `134766173`).**

| canonical tick | span | what's on screen / mechanism |
|---:|---|---|
| 4988-4989 | 2 | `A` press — declines the record prompt (`multichoicedefault 20,8,MULTI_YESNO,1,FALSE` default NO, `scripts.inc:81`, `case 1` → `EndRecordBattle`) |
| 4990-~5027 | ~38 | **"We look forward to your next visit."** types (`scripts.inc:90`, `Text_LookForwardToNextVisit` :351-352) — the surprise second prompt |
| 5028-5092 | held | that message holds, **needs its own `A` dismiss** (`closemessage` at :91 not yet run) |
| 5090-5091 | 2 | second `A` → dismiss |
| **5093** | 1 | **message box gone — free-roam Lobby control begins** (`closemessage` :91 → `setvar VAR_TEMP_CHALLENGE_STATUS, 255` :92 → `releaseall` :93 → `end` :94); sha `1e7b081c…`, player standing at map **(4,8)** facing **NORTH** (the `OnWarp` turn, `scripts.inc:10-13`) |
| 5172-5173 | 2 | first directional input (a `DOWN` press) |
| 5174-5181 | 8 | first **pixel-visible** response: the turn-to-south animation (sha changes; `runningState` = TURN_DIRECTION) |
| **5181** | 1 | **first tick the press actually moves the player**: first tile-edge (tileTransition = T_TILE_CENTER, map (4,8)→(4,9)) — this is the load-bearing boundary tick |
| 5181-5196 | 16 | first tile traversal completes |
| ~5200-5201 | | one tap = one tile: player settles at map **(4,9)**, still facing south |

So the answer to "first tick a directional press moves the player": the
**turn-frame response is at press+2 (5174)**, and the **first tile-edge
transition is at 5181** (press+9, i.e. after the 8-frame turn). Content before
that boundary is the record-prompt decline → "We look forward" → dismiss chain,
all re-verified byte-identical.

## 3. RUNG C — walkability, cadence, camera, collision

### 3a. Walk cadence and camera (RAM probe, exact)

Free-roam spawn is map **(4,8)** facing NORTH. Each held direction press:
8-frame turn (TURN_DIRECTION) then 1 tile per **16 frames**
(tile-edge to tile-edge, all four directions measured: south 5181→5196→5212→5229
for 3 tiles, west 5341→5356→5372→5388 for 4 tiles, north and east the same).
16 frames/tile = the standard Emerald on-foot walking speed (1 px/frame, 16 px
tile). A **tap** (2-frame press) = exactly one tile; a **hold** walks
continuously.

Camera: `gCamera` stayed **(signed −56, 0)** across all 313 probed ticks
covering four walks in map x 0-11, y 7-11 — **the camera does not scroll** for
any movement in the walkable floor region. The lobby is 19 tiles (304 px) wide
vs the 240 px screen, and the view is clamped at its leftmost position for all
probed walks; the whole walkable interior is rendered on one fixed frame.

> **CORRECTION (2026-08-07, MAIN bind worker + supervisor fold):** the
> paragraph above is RAM-true but render-false as stated. `gCamera` is
> indeed fixed at (−56,0), but the RENDERED field still scrolls sub-tile
> during each step via `sFieldCameraOffset` (`field_camera.c`,
> `CameraUpdate`): ~1 px/frame over the 16-frame step, snapping back at
> tile boundaries. A renderer that draws the interior as one fixed frame
> matches only the tile-boundary ticks; every in-step tick differs by the
> sub-tile offset. This is the first named blocker for promoting the
> `loss-lobby-walk-off` spec (PROGRESS 976); the second is the 2-pose
> 8-frame in-place turn whose pose A (oracle ticks 5174-5177) has no
> source-sheet counterpart (~167 px). The tile-boundary facts, cadence,
> collision grid, and spawn/facing in this doc all still stand.

Player sprite: standard overworld walk-cycle (multiple unique shas per step,
the same walk-cycle family the beyond-boundary doc measured); no special
animation — the sprite faces the walk direction with the ordinary 4-phase
cycle.

### 3b. Collision grid (source-derived, `map.bin` + `map.json`)

The lobby layout is `LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY`,
19×12 tiles (`data/layouts/layouts.json:3456-3462`), `map.bin` = 456 bytes =
228 u16 map-grid blocks where **bits 10-11 are the collision field**
(`include/global.fieldmap.h:8`, `MapGridGetCollisionAt`, `fieldmap.c:327-335`;
nonzero collision ⇒ `COLLISION_IMPASSABLE`, `event_object_movement.c:4663`).
Grid (rows 0-11 top→bottom, cols 0-18 left→right; `.` walkable, `X` blocked):

```
row 0:  XXXXXXXXXXXXXXXXXXX
row 1:  XXXXXXXXXXXXXXXXXXX
row 2:  XXXXXXX.....XXXXXXX
row 3:  XXXXXXX.....XXXXXXX
row 4:  XXXX.XXXXXXXXX.XXXX
row 5:  XXX....X...X....XXX
row 6:  ..XX..XX...XX...X..
row 7:  ..XX.XXXX.XXXX.XX..
row 8:  ...................
row 9:  ...................
row 10: ...................
row 11: ...............X.X.
```

(The reader should re-derive the grid from `map.bin`; the compact rendering
above omits the metatile ids. Cell labels: `.` = collision 0 = walkable,
`X` = collision ≠ 0 = impassable.)

Object-event and interaction tiles (`data/maps/BattleFrontier_BattleFactoryLobby/map.json`):

| map coord | tile |
|---|---|
| (4,7) | singles attendant NPC (SCIENTIST_1, `LOCALID_FACTORY_ATTENDANT_SINGLES`) |
| (14,7) | doubles attendant NPC (SCIENTIST_1, `LOCALID_FACTORY_ATTENDANT_DOUBLES`) |
| (3,11) / (13,11) / (14,11) / (6,10) | woman (wanders), picnicker, camper, fat man (all on the walkable floor) |
| (9,11) + (10,11) | **exit door-mat warp** → `MAP_BATTLE_FRONTIER_OUTSIDE_WEST` (warp_events, map.json:98-113) |
| (9,4) | rules board (bg_event, player-facing-any) |
| (2,7) / (11,7) | singles / doubles results signs (bg_event, facing-north) |

### 3c. Oracle cross-checks (≥3 grid cells + the door mat)

Grid cells verified against oracle probes (RAM coords + manifest shas):

- **Walkable (south):** (4,9), (4,10), (4,11) — the DOWN-hold walked (4,8)→(4,11).
- **Walkable (east):** (5,8)…(10,8), (11,8) — the RIGHT-hold walked 7 tiles.
- **Walkable (west/north):** (3,8)…(1,8)/(0,9), (0,7) — LEFT/UP holds.
- **Blocked (map border):** the player pressed DOWN at (4,11) and LEFT at
  (0,9) — no movement (next tile out of the map; `GetMapBorderIdAt` invalid ⇒
  impassable).
- **Blocked (attendant NPC):** UP at (4,8) — the player is already facing north
  (the spawn facing), presses UP, and never leaves (4,8); (4,7)'s metatile is
  walkable (`.`), so the block is the attendant object event
  (`COLLISION_OBJECT_EVENT`). The real game would trigger
  `SinglesAttendant`'s welcome dialogue on A; the app's divergence = silent.
- **Blocked (counter metatile):** UP at (11,8) — the player turns north but
  never leaves (11,8); (11,7) is a blocked metatile (`X`) — the counter.
- **Door mat warp:** walking south from (10,8), the player steps onto (10,11)
  at **5324**; the warp fires (fade-out begins at **5356**, `mainCallback2` →
  `134766589` map-load at **5410**, fade-in revealing
  `MAP_BATTLE_FRONTIER_OUTSIDE_WEST` from **5420**). So in the **real game the
  lobby HAS a working exit** — the app's "no exit" is a deliberate divergence.

Potted plants: the layout's blocked cells in rows 4-7 at cols matching the
plant sprites (`factory-lobby-terminal-assets.md`'s object list) are all `X`
metatiles; the player cannot enter them (same metatile class as the (11,7)
counter block, which is directly probed).

## 4. RUNG D — bounded slice plan for the MAIN bind

User decisions to honor (ISSUES #73 closing + the 2026-08-05 standing
decisions): **REST unselectable**; **post-loss lobby walkable with no exit, no
PC interaction, silent NPCs**.

1. **REST guard.** In the held GO ON/RECORD/REST/RETIRE menu, REST is not
   reachable: `DOWN` from GO ON lands on RECORD, second `DOWN` is swallowed (or
   the cursor wraps/blocks per the chosen guard) — no REST prompt ever opens.
   If the plan wants visible feedback, the recommended guard is **cursor stays
   on RECORD** (a second DOWN has no effect; the cursor never reaches REST or
   RETIRE) — simplest, and matches the real menu's "no REST" variant only in
   spirit, so document the divergence: the real game lets you select REST and
   save-and-quit (this doc §1). The REST prompt/strings/save+reset must be
   modeled as **data only** (this doc's §1 ledger) so the guard is testable
   against the real window that never appears.
2. **Lobby free-roam.** On the LOSS decline chain's final dismiss (`A` at
   5090-5091 → free-roam at 5093, §2), bind the lobby as a walkable overworld:
   spawn (4,8) facing north, 16 frames/tile, 8-frame turn, fixed camera (§3a).
   Collision: interior floor walkable; counter cells (rows 4-7 `X`) blocked;
   NPC tiles blocked (attendant (4,7)/(14,7), woman/camper/picnicker/fat-man
   on the floor) — NPCs are **silent** (no dialogue on A) and the two
   results-sign bg_events and rules board are **inert** (divergence from the
   real game).
3. **No exit.** The door-mat warp (§3c) is **not** bound: (9,11)/(10,11) are
   walkable tiles with no warp (the real game warps out — deliberate
   divergence). Walking off the map edge (e.g. south of (4,11), west of (0,9))
   is blocked by the border, matching the real game's border behavior.
4. **No PC / no further prompts.** After free-roam there are no more
   LostChallenge-chain prompts; the record prompt's decline chain is exactly
   two prompts + dismiss (§2). REST's save path and the record-YES save path
   are out of scope for this slice (record-YES already ground-truthed in the
   record/retire doc §3a).
5. **Acceptance (once `tools/compare/appTrace.ts` wires these fixtures):**
   `npm run compare -- postwin-rest-off --summary`
   (`scratch-postwin-rest-probe.json` staged as a compare fixture),
   `npm run compare -- loss-lobby-walk-off --summary`,
   `-- loss-lobby-collision-off --summary`, `-- loss-lobby-door-mat-off --summary`,
   plus regression `postwin-record-off`/`postwin-retire-off`. Tier-1 pins for
   the pure-logic parts: cursor DOWN×2 lands on REST but is guarded; decline →
   "We look forward" → dismiss → free-roam timing; 16-frame walk cadence +
   border/NPC/counter collision predicates; door mat walkable-no-warp.

## Verification

- Four new scratch fixtures, three of them twice-run byte-identical via
  `bin/oracle lab` (REST 209/209, walk 198/198, door-mat 212/212; collision
  oracle-run once + RAM-probed). Prefix preservation is programmatic
  (segment-list equality against the committed record/beyond-boundary
  fixtures).
- All movement/collision facts RAM-probed to exact map coordinates
  (`tools/probe/dump-lobby-{walk,collision,door}-player-coords.py`, valid JSON
  before the known teardown SIGSEGV).
- Every pixel claim tied to a manifest sha or a framebuffer-region diff;
  text strings source-cited (`scripts.inc` line numbers) and glyph-count
  verified.
- `npm run test:smoke` run once before the final commit (sanity gate; this
  lane makes no `src/`/`tests/` edits).

## 5. CORRECTION ADDENDUM (2026-08-07 SIDE worker) — sub-tile scroll + turn pose A

Rung A/B/C re-probed with a dense RAM+framebuffer probe
(`tools/probe/dump-lobby-walk-subtile.py`; run via `tools/run-mgba-probe.py`,
walk fixture `scratch-loss-lobby-walk-probe.json`, windows 5172-5200 / 5272-5392,
collision fixture for east 5232-5290). All facts below measured, not assumed.

### 5a. BLOCKER 1 — the compositing model (per direction, one full step)

Player OAM stays **fixed at (112,56)** for every walk frame (`gSprites[i].oam`
x=112,y=56 constant through steps; the sprite's logical `x/y` advance 1px/frame
but `gSpriteCoordOffsetX/Y` decrement to cancel, `sprite.c:349-350`). The FIELD
scrolls instead: `sFieldCameraOffset`/`gFieldCamera` accumulate `movementSpeed`
1px/frame (`field_camera.c:408-423`), and the BG1/2/3 HOFS/VOFS registers I read
per tick confirm the field offset changes each in-step frame and snaps back at
the 16-frame tile boundary. The player does **not** slide; the field slides.

Whole-field per-frame shift vs the tile-boundary frame (measured by landmark
tracking + phase correlation; south first step 5181→5196, north 5281→5296,
west 5341→5356, east 5241→5256):

| step frame k (0=boundary, 15=next boundary) | south | north | west | east |
|---|---|---|---|---|
| 0 | (0,0) | (0,0) | (0,0) | (0,0) |
| 1 | (0,1) | (0,-1) | (1,0) | (-1,0) |
| 2 | (0,2) | (0,-2) | (2,0) | (-2,0) |
| … | … | … | … | … |
| 15 | (0,15) | (0,-15) | (15,0) | (-15,0) |

~~Field content at the next boundary frame equals the prior boundary frame's
content (same tiles, camera clamped at (-56,0)); the in-step offsets are
sub-tile scrolls that reset at each 16-frame boundary.~~ **CORRECTED
(2026-08-07 supervisor, pixel-proved):** the field advances a NET 16px per
tile step — consecutive boundary frames f05181 vs f05196 of the probe's own
PNG dump differ by 21385 px raw but only 6452 px after a 16px vertical
shift (player region + newly revealed rows). The camera FOLLOWS the player
(standard overworld follow-cam): the visible scroll = player world position
− (112,56), the HOFS/VOFS sub-tile phase wraps at each boundary while the
tilemap slice advances one tile, and `gCamera` is a non-updating symbol here
(§3a's "camera does not scroll" is void — `sFieldCameraOffset`/`gFieldCamera`
is the live camera). Consequence: rendering off-map BORDER BLOCKS is
required — with the camera anchored to the player, positions away from the
map center bring the area beyond the 19×12 layout on screen (source: the
layout's border blocks, repeated 2×2). The whole-field scroll
is the same for the wall, floor, potted plants, and NPCs (they all ride the
BG scroll).

**Compositing model for the fix worker:** the camera is anchored to the
player's interpolated world position; on step frame `k` of direction `d`
the field is drawn at scroll `spawnScroll + tilesWalked·16·d̂ + k·d̂` (the
per-frame `(ox_k, oy_k)` table above gives the sub-tile phase within the
step) and the player sprite is drawn at fixed screen `(112,56)` with
walk-cycle pose `n_k`. Pose `n_k` follows the source `sAnim_Go{South,North,West}` tables
(`object_event_anims.h:200-236`): 8 ticks per pose, cycle
[walk1, stand, walk2, stand], the same 4-phase cycle the app already uses; the
player sprite's OAM never moves.

### 5b. BLOCKER 2 — turn pose A identified

The in-place turn is `MOVEMENT_ACTION_WALK_IN_PLACE_FAST_*`
(`field_player_avatar.c:1027-1030` → `PlayerTurnInPlace`, 8 frames,
`event_object_movement.c:5780-5805`, animNum = `ANIM_STD_GO_FAST_SOUTH` etc).
Sprite state during the turn (RAM, south turn 5174-5181): `animNum=8`
(GO_FAST_SOUTH), pose sequence = sheet frame **4** for 5174-5177 and sheet
frame **0** for 5178-5181 — i.e. **pose A = the walk-2 pose, not a missing
frame**. Byte-exact pixel proof: bg-subtracted player box vs every candidate
(frame 0-8, each h-flipped) rendered over a byte-exact field
(`tools/probe/verify-lobby-turn-pose.py`): pose A (5174-5177) → frame 4 = **0px
diff**; pose B (5178-5181) → frame 0 = **0px diff**. West turn (5333-5340)
matches `ANIM_STD_GO_FAST_WEST` → frame 8 (walk-2 west) for 4 frames then
frame 2 (stand west), same pattern.

**Turn compositing:** on turn frame 1-4 of direction d draw walk-2 pose
(south=4, north=6, west=8, east=8 h-flipped), on turn frame 5-8 draw the
standing pose (south=0, north=1, west=2, east=2 h-flipped), all at fixed
(112,56). The extractor's 9-sheet-frame residual for pose A was a wrong
candidate assumption — pose A **is** a banked frame (frame 4 / 8).

## 6. BLOCKER 3 (2026-08-07 SIDE worker) — the wandering-woman NPC
`MOVEMENT_TYPE_WANDER_AROUND`

The last named residual of `loss-beyond-boundary-off` (183/183 promotion gate)
is the woman (`OBJ_EVENT_GFX_WOMAN_1`, map.json spawn **(3,11)**,
`MOVEMENT_TYPE_WANDER_AROUND`) leaving her spawn at **tick 5185** and settling
covered at **(3,10)** from **5200**. Measured by a dense RAM probe
(`tools/probe/dump-lobby-wander-npc.py`, run through
`tools/run-mgba-probe.py`) reading `gObjectEvents[16]` + `gSprites[]` + the
object-event's sprite every tick of the residual window (both committed lobby
fixtures), twice-run byte-identical.

### 6a. Per-tick schedule (loss-beyond-boundary fixture, canonical ticks)

Map coords = grid − 7 (`MAP_OFFSET`, `include/fieldmap.h:18`). Facing is the
real field-direction enum (`constants/global.h:138-141`: SOUTH=1/NORTH=2).
`movementActionId` 0x09 = `MOVEMENT_ACTION_WALK_NORMAL_UP`
(`constants/event_object_movement.h:96`), 0xFF = none. World box-top = the
sprite's logical `x/y` (`gSprites[i].x/y`, `sprite.h`), the follow-cam render
anchor; **OAM is camera-relative** and differs per fixture (the walk probe's
player walks, so the woman's OAM rides the camera), while **world box-top is
camera-independent and identical across both fixtures** (verified tick-by-tick:
loss 5170-5254 vs walk 5170-5254, 85/85 ticks identical).

| canonical tick | map tile | facing | actionId | world box-top (x,y) | OAM (loss fixture) | pose (animNum/idx) | meaning |
|---:|---|---:|---:|---:|---:|---:|---|
| 5170-5184 | (3,11) | SOUTH | 0xFF | (104,160) | (96,104) | 4/1 | idle at spawn (standing south) |
| **5185** | (3,10) | NORTH | 0x09 | (104,159) | (96,103) | 5/2 | step starts, 1px up |
| 5186 | (3,10) | NORTH | 0x09 | (104,158) | (96,102) | 5/2 | 2px up |
| 5187 | (3,10) | NORTH | 0x09 | (104,157) | (96,101) | 5/2 | |
| 5188 | (3,10) | NORTH | 0x09 | (104,156) | (96,100) | 5/2 | |
| 5189 | (3,10) | NORTH | 0x09 | (104,155) | (96,99) | 5/2 | |
| 5190 | (3,10) | NORTH | 0x09 | (104,154) | (96,98) | 5/2 | |
| 5191 | (3,10) | NORTH | 0x09 | (104,153) | (96,97) | 5/2 | |
| 5192 | (3,10) | NORTH | 0x09 | (104,152) | (96,96) | 5/2 | |
| 5193 | (3,10) | NORTH | 0x09 | (104,151) | (96,95) | 5/3 | |
| 5194 | (3,10) | NORTH | 0x09 | (104,150) | (96,94) | 5/3 | |
| 5195 | (3,10) | NORTH | 0x09 | (104,149) | (96,93) | 5/3 | |
| 5196 | (3,10) | NORTH | 0x09 | (104,148) | (96,92) | 5/3 | |
| 5197 | (3,10) | NORTH | 0x09 | (104,147) | (96,91) | 5/3 | |
| 5198 | (3,10) | NORTH | 0x09 | (104,146) | (96,90) | 5/3 | |
| 5199 | (3,10) | NORTH | 0x09 | (104,145) | (96,89) | 5/3 | |
| **5200** | (3,10) | NORTH | 0xFF | (104,144) | (96,88) | 5/3 | step completes, settles |
| 5200-5254 | (3,10) | NORTH | 0xFF | (104,144) | (96,88) | 5/3 | idle at new tile (frozen walk-2 pose) |

Compact rule (tick T, 5185 ≤ T ≤ 5199): **world box-top y = 160 − (T − 5184)**,
x = 104; facing NORTH; actionId 0x09. For T ≤ 5184: world (104,160), facing
SOUTH, standing. For T ≥ 5200: world (104,144), facing NORTH, frozen. The
woman's walk cycle is the ordinary overworld one — 1 px/frame, 16 frames per
tile, matching §3a — with no in-place turn before it (WanderAround picks a
direction and walks directly, `event_object_movement.c:2599-2612`).

**The 12 red frames** (5186, 5188, 5190, 5195, 5200, 5205, 5210, 5215, 5220,
5224, 5240, 5254) are all this NPC: the app draws her at her static map-json
tile (3,11) ⇒ world (104,160) ⇒ OAM (96,104) for every tick, while the oracle
moves her 1px/frame up through 5185-5199 and settles at OAM (96,88) from 5200.
A fix that moves the woman's drawn world box-top per the table above closes all
12.

### 6b. Determinism evidence

Both fixtures' full woman schedule + `gRngValue` were probed **twice** each and
are **byte-identical across reruns**:

- loss-beyond-boundary fixture 5170-5254: **85/85 ticks identical** (tile,
  facing, actionId, OAM, world, animNum), `gRngValue` equal every tick.
- walk probe fixture 5170-5472: **303/303 ticks identical**, `gRngValue` equal.

Cross-fixture: at every shared tick the woman's **world box-top is identical**
(85/85) even though OAM differs (the walk probe's player moves the camera) —
so the wander schedule is **tick-deterministic and player-independent**.

### 6c. Mechanism verdict — what RNG drives her steps, and the fix shape

**(a) RNG stream.** `MovementType_WanderAround` (`event_object_movement.c:2566-2630`)
consumes the ambient `gRngValue` stream (EWRAM, `random.c:8`) at two points per
cycle:
- **Step2** (`event_object_movement.c:2584`): after the in-place face-turn,
  `SetMovementDelay(sprite, sMovementDelaysMedium[Random() % 4])` — the
  idle delay is drawn from `{32, 64, 96, 128}` (`:709`).
- **Step4** (`:2605`): `chosenDirection = directions[Random() & 3]` — the next
  heading.

The stream itself is advanced **once per VBlank** by the ambient `Random()`
at `main.c:366` (`if (!gMain.inBattle …) Random();`). The probe's per-tick
`gRngValue` LCG deltas confirm this: **1 LCG step per frame** everywhere,
plus exactly one extra draw on the walk-start tick (5185: direction) and on
the settle ticks (5201: delay; 5218: direction re-roll after the delay, no
move because the next roll is the same heading/collision — 3 steps = 1 VBlank
+ 2 draws). So the woman's step schedule is a **pure function of `gRngValue`
at free-roam start**, which the trace replays deterministically from the
canonical snapshot.

**(b) Is a general wander model feasible without the ambient VBlank stream?**
No — and the reason is the trace's determinism itself. The oracle replays from
a fixed snapshot, so `gRngValue` at every tick is a deterministic function of
the snapshot + tick count. To reproduce the woman's exact schedule, the app
would have to advance the *same* `gRngValue` 1/frame from the same starting
cursor — i.e. model the ambient VBlank interleaving that ISSUES #55 says this
run does **not** model (the app's `constructionRngValue` contract consumes
construction draws back-to-back from one cursor; it has no per-frame ambient
advance). A general `WanderAround` reimplementation over the app's existing
stream would pick a *different* direction/delay than the ROM from the same
seed offset, so it cannot be byte-exact against the committed traces without
first fixing the stream contract (a main-lane stream-model change, out of this
lane's scope).

**(c) Recommended fix shape: bounded per-trace schedule table.** AGENTS.md
sanctions bounded evidence checkpoints. The measured table in §6a, keyed to
the committed traces' residual windows, is exactly that: a per-tick
`{tick → mapTile, worldBoxTop, facing, pose}` override consumed by the
free-roam renderer's NPC draw path, active only in the lobby free-roam window.
It is tick-keyed and deterministic (twice-run identical), needs no RNG model,
and closes the 12 red frames. A general mechanism is the future owner of
ISSUES #55's stream contract, not this residual.

### 6d. Fix plan for the MAIN bind worker (table-based)

Where to plug in: `factoryTerminalRender.ts`'s `renderFactoryTerminalField`
NPC loop draws each `layout.visibleObjects` entry at
`object.tile*16 − cameraOrigin` (box top y −16, `factoryTerminalRender.ts:250-251`).
The woman's entry is the `woman` asset at tile (3,11). The fix overrides that
entry's draw position **and** pose for the residual window of the
`loss-beyond-boundary` trace (and, if `loss-lobby-walk-off` is promoted, the
walk fixture's full window below).

Literal table (loss-beyond-boundary; map tile → world box-top / facing / pose):

| ticks | map tile | world box-top (x,y) | facing | pose (sheet frame) |
|---|---:|---:|---|---|
| ≤ 5184 | (3,11) | (104,160) | SOUTH | woman standing frame |
| 5185-5199 | (3,10) | (104, 160−(T−5184)) | NORTH | walk-cycle pose per `floor((T−5185)/8)%2` (walk-2 for the first 8, walk-1 for the last 8 — oracle anim5 idx2 then idx3; if the asset lacks separate walk poses, the standing north frame is the smallest acceptable delta) |
| ≥ 5200 | (3,10) | (104,144) | NORTH | standing north |

World box-top is the app's own anchor already (the terminal's camera-at-spawn
render is byte-identical, §5a), so converting world box-top to screen px is
`worldBoxTop − cameraOrigin` with the same −16 y convention the NPC loop
already uses. The walk fixture extends the same table (identical world
schedule, verified): the woman additionally walks SOUTH (3,10)→(3,11) 5296-5311
(world y 145→160) and EAST (3,11)→(4,11) 5407-5421 (world x 105→120), each
16 frames at 1px/frame, frozen poses 5/3, 4/0-4/1, 7/2-7/3 respectively.

Acceptance: `npm run compare -- loss-beyond-boundary-off --summary` reaches
**183/183** (the 12 red frames close). Keep-green: all other lobby specs +
`npm run test:smoke`. Pin the pure-logic part (a `womanAtTick(t)` helper) with
a Tier-1 test asserting the §6a table's boundary ticks (5184/5185/5199/5200).

### 6e. Rerunnable verify script

`tools/probe/verify-lobby-woman-schedule.py` re-probes the loss-beyond-boundary
fixture (5170-5254) and PASS/FAILs the woman's tile/facing/actionId/world
box-top at 17 pinned ticks against §6a. Run:

```sh
python3 tools/run-mgba-probe.py /tmp/wander-verify.json -- \
    python3 tools/probe/verify-lobby-woman-schedule.py /tmp/wander-verify.json
```

Verified PASS on a fresh probe run 2026-08-07 (17/17).
