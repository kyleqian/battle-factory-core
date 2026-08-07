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
