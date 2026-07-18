# Battle scene notes (S6 groundwork: BATTLE-SCENE ASSEMBLY + SEND-OUT windows, ticks 1031-1560)

Worktree-lane groundwork dossier for the window between the transition's
black outro and the settled first-action-menu idle: solid black (from
tick 1031, already pinned) → the "streak" scene-assembly frames → trainer
slide settles → "BUG CATCHER DESTIN would like to battle!♥" prints → the
settled 4-phase idle → (§7, a later session) A-press #3 → "...sent out
GROVYLE!" → opponent healthbox settle. **Ground-truth pinning + source/RAM
decode only — no engine code, no `tools/compare/traces/` fixtures.**
Cross-references `docs/battle-bringup-notes.md`'s "Slice-0 ground truth"
section (frame boundaries at coarser stride, this doc's task) and
`docs/battle-room-notes.md` (structure template). All frame numbers are
`battle1-intro.json`'s own absolute tick indices (same script, same RNG
stream — see that file's "Slice-0 ground truth" §0 for why). sha256 = first
8 hex chars unless spot-cited in full.

**§§0-6 below (ticks 1031-1300) are a prior session's work** (PROGRESS.md
#55); **§7 (ticks 1300-1560) is this session's addition.**

## 0. Ground truth: the dense trace

Committed: `tools/compare/traces-groundtruth/battle1-scene-dense.json` —
**identical 40-segment button script** to `battle1-intro.json` (so tick
numbering and the RNG/personality/transition stream are unchanged), with
`captureFrames` = every tick **1040-1295 inclusive** (256 captures, the
oracle's `maxCaptures` limit; 1031-1039 is the already-pinned flat black
lead-in, skipped per the brief). Verified green via `bin/oracle run`.

## 1. Frame-boundary milestones (every-single-frame, not sampled)

The prior dossier's boundaries were pinned at stride-4 (transition
streaks) or stride-1-but-separately-run windows; this session's single
continuous every-frame pass both confirms and **sharpens** them:

| tick | sha256 (8-char) | what |
|---|---|---|
| 1040-1074 | `d8b44303` | flat black (identical to tick 501's warp-fade black and tick 1031's transition-black — same byte pattern, confirmed) |
| **1075** | `5f65e0b3` | **first non-black frame** — corrects the prior "1077" figure |
| 1076 | `3b198a4f` | still-thin partial reveal |
| 1077 | `b6f921fd` | the frame the prior stride-4 pass first sampled (already non-black by 2 ticks at this point) |
| 1078-1226 | (continuous, no repeats) | streak/slide-converge assembly, decoded in §2 |
| **1227-1229** | `b2bcc9d0` | scene settles (3-tick plateau) |
| 1230 | `c0dc0eb2` | **not text** — see §3, this is the player-side party-summary bar's leading edge entering at the screen's right column |
| **1234** | `bcf69ee9` | first text glyph ("B") — see §3 |
| 1272-1273 | `fb70157c` | "would like to battle!" fully printed, no heart |
| **1274** | `81f5fbbc` | down-arrow prompt cursor's first draw (mis-described as "♥" — see §3.3) |
| 1291 | `d45a9a36` | transient (arrow phase 3, `sDownArrowYCoords[2]`) |
| **1292-1295** (trace end) | `19ccf0c6` (phase 0) | steady state — first phase of the repeating cycle, see §3.3 |

**Correction to the prior dossier**: the true first non-black frame is
**1075**, not 1077 (§2 explains why: the vertical reveal-window opens from
a 1-2px slit, invisible at stride-4 sampling until it's already ~3px tall).

## 2. Mechanism decode: `BattleIntroSlide3` (source + RAM, fully cross-validated)

**Source**: `HandleIntroSlide` (`src/battle_intro.c:105-138`) branches on
`gBattleTypeFlags` *before* looking at `environment` — `BATTLE_TYPE_FRONTIER`
(set for the Factory) short-circuits straight to `BattleIntroSlide3`
(:117-120), the same function `BATTLE_ENVIRONMENT_BUILDING`/`_PLAIN` would
pick anyway via `sBattleIntroSlideFuncs[]` (:35-36) — worth noting because
it means the Frontier flag, not the environment table, is what actually
selects this path (relevant if a future battle ever mismatches environment
vs. type flags).

**RAM** (`tools/probe/ram-probe.py`, watching `gTasks[0].data[0..6]`,
`gBattle_BG1_X` (`0x2022e18`), `gBattle_WIN0V` (`0x2022e26`) every tick
1040-1230; struct `Task` layout confirmed via `include/task.h` — `data[]`
at `+8`, `s16` stride): the task is created in **slot 0**, first observed
alive at tick **1073** (2 ticks before the first visible non-black pixel —
the vertical window is still a hairline at that point) and destroyed
between **1227→1228** (matching the pixel plateau start exactly — see
below). `gTasks[0].tEnvironment` (`data[1]`) reads **8** = `BATTLE_ENVIRONMENT_BUILDING`
throughout, confirming §0's flag-vs-environment point didn't actually
matter for this battle (both routes agree).

Per-tick mechanism, entirely deterministic (no RNG in this task — every
value below is a plain tick-count formula, not sampled-and-guessed):

1. **tick 1073** (tState 0→1): `SetGpuReg(BLDCNT, TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ)`,
   `BLDALPHA = BLEND(8,8)` (`data[4] = 0x0808`, RAM-confirmed
   `2056 = 0x0808` exactly). `gBattle_BG1_X += 8` starts this tick and
   continues **every tick unconditionally** until the task ends (confirmed
   arithmetic: `8, 16, 24, ... +8/tick` for all 155 ticks the task is
   alive).
2. **tick 1074** (tState 1→2): 1-tick wait, then `WININ = WIN0_BG_ALL|WIN0_OBJ|WIN0_CLR`.
3. **ticks 1075-1105** (tState 2, 31 ticks, RAM-confirmed): `gBattle_WIN0V -= 0xFF`
   every tick. `gBattle_WIN0V` starts at `WIN_RANGE(80,81) = 0x5051`
   (set in `CB2_InitBattleInternal`, `battle_main.c:638`); subtracting
   `0xFF` repeatedly nets **top edge -1, bottom edge +1 per tick** (RAM
   trace: `0x5051→0x4f52→0x4e53→...`) — i.e. **this is the actual pixel
   mechanism for "first non-black at 1075"**: window0 opens as a
   thin-to-wide vertical slit centered on the screen's horizontal midline,
   1px taller (both edges) each tick, so only a hairline is visible at
   first. Loop exits when the top byte hits `0x30` (tick 1106,
   `WIN0V=0x3071`) — exactly 32 ticks, `(0x50-0x30)`.
4. **ticks 1106-1226** (tState 3, 121 ticks, the main assembly loop — every
   value below is the RAM-read `data[]` table, tick-exact):
   - `data[2]` (the horizontal scanline-shift magnitude) starts at
     `DISPLAY_WIDTH=240` (tick 1106) and decrements by exactly **2/tick**
     to 0 at tick **1226** (120 ticks) — this value is written every tick
     into `gScanlineEffectRegBuffers[][]`: **top half of the screen
     (scanlines 0-79) gets `+data[2]`, bottom half (80-159) gets
     `-data[2]`**, an HBlank-DMA'd per-scanline BG horizontal-offset table.
     This is the literal mechanism behind the "horizontal streak/line-wipe"
     pixels: the top and bottom halves of the (already-drawn) battle scene
     are shifted horizontally in opposite directions by a shrinking
     magnitude, converging to a perfectly aligned frame at tick 1226 —
     **not** a transition effect and **not** trainer-sprite movement, a
     pure per-scanline BG-scroll illusion over an already-static
     background+trainer composite.
   - `data[3]` (32→0, ticks 1106-1138) is a pure pre-delay gating the
     cross-fade (next point) — it does **not** gate the scanline shift,
     which starts immediately at tick 1106.
   - `data[4]` (`BLDALPHA`, packed `EVA | EVB<<8`) cross-fades from `8:8`
     to `0:16` in **8 steps of 6 ticks each**, starting the tick after
     `data[3]` hits 0 (tick 1139) and completing at tick **1181**
     (`data[4]=4096=0x1000`, i.e. `EVA=0`): `0808→0907→0a06→0b05→0c04→0d03→0e02→0f01→1000`
     (RAM-confirmed exactly, one step every 6 ticks). Once `EVA` hits 0 the
     `(data[4]&0xF)` guard goes false and the blend freezes — **the color
     cross-fade (BG1 → BG3+OBJ) finishes 45 ticks before the geometric
     slide does** (tick 1181 vs. 1226), i.e. by mid-assembly the "streak"
     is purely geometric, no longer a color blend.
   - tick **1226**: `data[2]` hits 0 → `gScanlineEffect.state=3` (HBlank
     effect stops), tState→4, BG screen buffers cleared, `BG1CNT`/`BG2CNT`
     rewritten. `gBattle_BG1_X` reads `1232` here (last `+8`).
   - tick **1227**: tState 4 body runs — `BattleIntroSlideEnd`:
     `DestroyTask`, **`gBattle_BG1_X/Y`, `BG2_X/Y` reset to 0** (RAM:
     `bg1x` drops `1232→0` exactly this tick), `BLDCNT`/`BLDALPHA`/`BLDY`
     cleared, `WININ`/`WINOUT` restored to show-everything — this is the
     literal cause of the pixel plateau starting at 1227 (task destroyed
     one tick later, 1228, confirmed via `gTasks[0].func` reverting to
     `TaskDummy`).

Net: an engine slice can bake this **exactly** as a lookup table
(tick-offset-from-task-start → `{bg1X, scanlineShift, blendEVA, blendEVB}`),
no RNG, no oracle-fitting — every number above is either a literal source
constant or a plain arithmetic sequence, cross-validated against the RAM
trace at every step and against the pixel shas at the phase boundaries
(1075 first reveal, 1106 window fully open, 1181 blend-complete — no
distinct pixel milestone since it's invisible once EVA=0 and EVB=16 is
already the "real scene", 1226/1227 settle).

## 3. Text print cadence, "BUG CATCHER DESTIN would like to battle!" + prompt cursor

### 3.1. Window/font identity (source-confirmed, not assumed same as the field msgbox)

The intro text prints to **`B_WIN_MSG`** (`sStandardBattleWindowTemplates[B_WIN_MSG]`,
`src/battle_bg.c:164-172`: `bg=0, tilemapLeft=2, tilemapTop=15, width=26,
height=4, paletteNum=0, baseBlock=0x0090`) via
`BattleIntroPrintTrainerWantsToBattle` (`battle_main.c:3564`) →
`PrepareStringBattle(STRINGID_INTROMSG, ...)` → `BattlePutTextOnWindow`.
This **looks** like the field msgbox (`docs/battle-room-notes.md` §8.1:
`sStandardTextBox_WindowTemplates[0]`, also `tilemapLeft=2, tilemapTop=15`)
but is a **genuinely different template** — width 26 vs. 27, `paletteNum=0`
vs. 15, different `baseBlock` — same screen position, different asset.
Font: `sTextOnWindowsInfo_Normal[B_WIN_MSG].fontId = FONT_NORMAL`
(`battle_message.c:1478-1488`), `fgColor=1, bgColor=15, shadowColor=6`.

String (`battle_message.c:385`): `sText_Trainer1WantsToBattle =
"{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\nwould like to battle!\p"`, resolved
via `BattleStringExpandPlaceholders` to **"BUG CATCHER DESTIN\nwould like
to battle!\p"** (18 + 21 = 39 printable characters across 2 lines, plus a
free `\n` and a `\p` = `CHAR_PROMPT_CLEAR`, `0xFB`).

### 3.2. Cadence: same 1-tick/char mechanism as the field msgbox, confirmed both by source and by exact arithmetic match

`BattlePutTextOnWindow` (`battle_message.c:3007-3015`): for `B_WIN_MSG`
(non-link, non-recorded), `speed = GetPlayerTextSpeedDelay()` →
`sTextSpeedFrameDelays[gSaveBlock2Ptr->optionsTextSpeed]` (`menu.c:77-81`,
`{SLOW:8, MID:4, FAST:1}`) — **the literal same function and option** the
field msgbox's slice-2c pinning used, confirming the canonical save has
`optionsTextSpeed = FAST` (delay 1) independent of context.

Pixel evidence (sub-region sha over the text box, ticks 1227-1295, every
frame): first glyph tick **1234** (not 1230 — tick 1230's change is
unrelated, §3.4), then a **change on every tick from 1234 through 1272**
except **5 holds**: 1237, 1245, 1257, 1262, 1265. That's exactly
**39 ticks (1234-1272 inclusive) for 39 printable characters**, with the 5
silent ticks landing **exactly** on the string's 5 space characters
(predicted indices 3, 11, 23, 28, 31 from tick-1234 → indices
`1237-1234=3`, `1245-1234=11`, `1257-1234=23`, `1262-1234=28`,
`1265-1234=31` — all 5 match). This confirms, by direct arithmetic (not
guessed): **cadence is 1 tick/char including space ticks**, spaces just
happen to be pixel-silent (`ClearTextSpan` over an already-blank
background is a no-op diff) — the identical rule slice-2c found for the
field msgbox. The `\n` control code is **free** (processed same-tick,
no delay charged) — confirmed by the count matching exactly with the
newline excluded (18+21=39 ticks, not 40).

### 3.3. The "♥" is not a charmap glyph — it's the down-arrow prompt cursor, and it drives the 4-phase/36-tick idle cycle

`\p` = `CHAR_PROMPT_CLEAR` (`0xFB`, `characters.h:176`) → `text.c:1101-1104`:
`textPrinter->state = RENDER_STATE_CLEAR; TextPrinterInitDownArrowCounters(...)`.
This is the standard "waiting for A/B" prompt cursor
(`TextPrinterDrawDownArrow`, `text.c:787-830`), **not** part of the string
and **not** `EMOJI_HEART` (`charmap.txt:1062`, bytes `F9 E7` — that glyph is
never referenced by this string or `BattleStringExpandPlaceholders`).
`BattlePutTextOnWindow` sets `gTextFlags.useAlternateDownArrow = TRUE` for
every battle window except the Arena judgment text
(`battle_message.c:2996`), selecting `sDarkDownArrowTiles` = the asset at
`graphics/fonts/down_arrow_alt.png` — **viewed directly, this file is
literally a 4-frame vertical strip of small red hearts** (not an arrow
shape despite the filename), which is exactly what the oracle pixels show
(cropped composite at tick 1274: a red heart-shaped icon appears at the
window's bottom-left text-cursor position). So the prior dossier's "♥" was
correctly *observed*, just not yet source-identified — it's confirmed here
as `down_arrow_alt.png`, drawn via `BlitBitmapRectToWindow`, not a font
character.

Timing, fully mechanical (`TextPrinterDrawDownArrow`, `downArrowDelay:5`/
`downArrowYPosIdx:2` are **bitfields** — the 2-bit index wraps 0→1→2→3→0
automatically, `text.h:58-59`): draws immediately when `downArrowDelay==0`
(first draw fires the very tick the CLEAR state is entered, i.e. **tick
1274**, one tick after `\p` is consumed at 1273), then resets
`downArrowDelay=8` and advances the index. Net period = 1 draw tick + 8
delay ticks = **9 ticks/phase × 4 phases (`sDownArrowYCoords={0,1,2,1}`,
`text.c:75`) = 36 ticks** — this is **exactly** the dossier's
independently pixel-observed "4-phase/36-tick idle cycle", now fully
source-explained: phases 1 and 3 render `sDownArrowYCoords[1]==sDownArrowYCoords[3]==1`,
the same source row, which is *why* the pixel cycle is `A→B→C→B→repeat`
(2 distinct middle phases sharing one sha) rather than 4 distinct shas —
confirmed both by the bitfield math and by the oracle's own sha sequence
(`81f5fbbc`(tick1274,idx0)→...→`d45a9a36`(tick1291,idx2)→`19ccf0c6`(tick1292,idx3)→...).
Ticks: draw #1 at 1274 (idx0), #2 at 1283 (idx1), #3 at 1292 (idx2), #4 at
1301 (idx3, outside this window) — matches the observed sha-change ticks
in §0's table exactly (1274, 1283, 1292).

### 3.4. Tick-1230 red herring: the player's party-status-summary bar, not text

The pixel change at 1230 (x=231-239, y=96-99 — screen's far right edge) is
the **player-side party-status-summary bar** beginning its slide-in (see
§4) — coincidentally starting the same tick range as text-printing but a
fully independent mechanism (`CreatePartyStatusSummarySprites`, called
from `BattleIntroDrawPartySummaryScreens`, which runs *before*
`BattleIntroPrintTrainerWantsToBattle` in the CB2 chain — both are already
in flight by the time text starts). Flagged so a future session doesn't
mistake it for an early/atomic text-box-appear tick — there isn't one
here; the box itself is already on-screen (empty) since the scene-settle
composite in §4.

## 4. Settled-scene asset cross-check (tick 1227) + party-summary/idle-cycle decode

**Screenshot at tick 1227** (post-slide-settle, pre-text): battle
background (indoor Factory building), player's back sprite (Brendan,
bottom-left, already partly covered by the empty `B_WIN_MSG` box), and
opponent's front trainer-class pic (Bug Catcher, top-right, mid-pose) —
no healthboxes, no HP bars, no party-summary bars yet (those settle at
tick 1522/1696 and ~1230-1292 respectively, per `battle-bringup-notes.md`
§2 — outside/at-the-edge of this window).

**Background palette spot-check** (not a full compositor — see below for
what that would need): sampled 8 background-only pixels from the tick-1227
oracle capture against `src/assets/gen/battle-bg.json`'s `palette[0/1]`
(the two are byte-identical, likely the static + first animated-tile
variant): 7/8 exact matches (`(255,255,255)`, `(231,231,239)`,
`(247,247,255)`, `(189,189,156)`, etc., all present verbatim in the
extracted palette); the 1 non-match (`(107,165,165)` at (180,140)) falls
inside the message-window's teal fill, a different asset
(`battle-window.json`), not a background pixel — expected, not a bug.
**Not reached this session**: a true byte-exact full-frame composite
(background tilemap decode + both trainer pics placed at their real
engine-derived screen coordinates) — that needs the trainer-pic placement
math (`OpponentHandleTrainerSlide`/player-side equivalent coordinate
tables) which wasn't derived this slice; flagging as open rather than
guessing coordinates.

**Party-status-summary widgets** (`BattleIntroDrawPartySummaryScreens`,
`battle_main.c:3491-3536` → `CreatePartyStatusSummarySprites`,
`battle_interface.c:1450-1520`): opponent's summary (`bar_X=104,bar_Y=40`)
is emitted first, player's (`bar_X=136,bar_Y=96`, sliding in from
`x2=+100`) second — oracle-confirmed by direct crop: the player's bar+ball
row is caught **mid-slide** at ticks 1230-1270 (leading edge at the
screen's right column at 1230, growing left; first ball icon visible by
~1250; 3 filled + 1 empty-slot circle settled by ~1270, matching the
player's 3-mon party), while the opponent's row is already fully settled
(3 filled + 1 empty, top-left-of-center) by tick 1292 — its own slide
happens earlier, inside tick 1227-1230, not individually re-timed this
session (flagged, not chased further — outside the priority-1/2/3 budget).

**Asset identification** (source-traced, both sprites/sheets used by this
widget):
- The diagonal bar background = `gBattleInterface_BallStatusBarGfx`
  (`graphics/battle_interface/ball_status_bar.png`,
  `sStatusSummaryBarSpriteSheet`, `battle_interface.c:639-642`) — **already
  extracted** as `battle-healthbox.json`'s `ballStatusBar` key
  (`tools/extract/extract-battle-healthbox.ts:90`).
- The per-mon ball icons = `gHealthboxElementsGfxTable[HEALTHBOX_GFX_STATUS_BALL]`
  (5 tiles: Full/Empty/Fainted/Statused/Caught,
  `graphics/battle_interface/ball_display.4bpp`/`.png`,
  `sStatusSummaryBallsSpriteSheet`, `battle_interface.c:655-658`;
  `HEALTHBOX_GFX_STATUS_BALL` enumerated `battle_interface.c:107-111`) —
  **NOT extracted anywhere** in `src/assets/gen/` (confirmed:
  `extract-battle-healthbox.ts` pulls `hpbar.png`, `expbar.png`,
  `status.png`, `misc.png`, and `ball_status_bar.png` only — `ball_display.png`
  and its dedicated palette `gBattleInterface_BallDisplayPal`
  (`graphics.c:356`, `TAG_STATUS_SUMMARY_BALLS_PAL`) are absent). **This is
  the concrete missing-asset item** — see §5.

## 5. Missing assets (engine-slice blocker list)

1. **`graphics/battle_interface/ball_display.png` + its palette
   (`gBattleInterface_BallDisplayPal`)** — the 5-tile pokeball-icon strip
   (Full/Empty/Fainted/Statused/Caught) used by the party-status-summary
   widget (§4) at both send-out and (per the healthbox family, not this
   window) in-battle fainting. Not present in any committed
   `src/assets/gen/*.json`. Needed before an engine slice can draw the
   ball-icon row seen from tick ~1230 onward.
2. Everything else referenced by this window (battle bg, both trainer
   pics, the message window frame/font, the down-arrow-alt cursor
   graphic) has **no committed extraction gap** — `battle-bg.json`,
   `trainer-pic-bug-catcher.json`, `trainer-pic-brendan-back.json`,
   `battle-window.json` already exist; the down-arrow cursor
   (`down_arrow_alt.png`) is a tiny (8×16×4 frames) font-adjacent asset
   not yet extracted either, but is cheap and not currently blocking (no
   existing asset file is a natural home for it — flagging, not
   extracting, per this slice's scope).

## 6. Risks / follow-ups for the engine slice

1. The full byte-exact composite at tick 1227 (§4) needs the trainer-pic
   placement coordinates (opponent slide-in target `x=176`→settle, player
   back-pic position) derived from `battle_controller_opponent.c`/
   `battle_controller_player.c` — not done this session (time-budget cut,
   priority order honored: tasks 1-3 first).
2. The opponent-side party-summary bar's own slide-in timing (before tick
   1230) is not individually re-timed — only its *settled* state (by 1292)
   and its *asset identity* (§4) are confirmed.
3. `down_arrow_alt.png` itself is not extracted into any asset file (§5.2)
   — low priority (tiny asset, only needed once dialogue-waiting UI is
   implemented, likely alongside S7's move-selection text).
4. The scanline-effect mechanism (§2) is fully decoded algebraically and
   RAM-cross-validated at every phase boundary, but never rendered by a
   test compositor this session (no engine code was in scope) — the
   engine slice implementing it should re-verify the derived table against
   `battle1-scene-dense.json`'s captures directly (0 diff expected if the
   table above is transcribed correctly).

## 7. Send-out window (1300-1560): A-press #3 → "...sent out GROVYLE!" → opponent healthbox settle

New session, continuing directly off §§0-6. Covers the A-PRESS-#3 +
OPPONENT SEND-OUT window per this step's brief: the idle "would like to
battle!♥" hold → A-press #3 (tick 1420, `battle1-intro.json` segment 35) →
message clears → "BUG CATCHER DESTIN sent out GROVYLE!" prints → trainer-pic
exit + party-status-summary despawn + ball-throw/materialization + opponent
healthbox slide-in → full settle. **No engine code, no `tools/compare/
traces/` fixtures** — ground-truth pinning + source/RAM-adjacent decode only
(this session used source + pixel cross-validation; no `ram-probe.py` run
was needed — every mechanism below was resolved from source constants and
independently cross-validated against the dense trace's pixels, tighter
confirmation than a RAM probe alone would give).

### 7.0. Ground truth: the dense trace

Committed: `tools/compare/traces-groundtruth/battle1-sendout-dense.json` —
**identical 40-segment button script** to `battle1-intro.json` (same tick
numbering, same RNG/personality stream), `captureFrames` = every tick
**1300-1555 inclusive** (256 captures, the oracle's `maxCaptures` limit).
Verified green via `bin/oracle run` (256 PNGs, manifest sha-checked). Segment
35 (`battle1-intro.json`'s own data) is the 2-frame `["A"]` pulse at ticks
1420-1421 — A-press #3; segments 36-39 (144+180+60+80 = 464 frames of no
input) cover the rest of this window and well beyond it, so nothing in
1300-1555 is input-gated except that one press.

### 7.1. Pre-press idle: the established 4-phase/36-tick cycle continues unbroken

Ticks 1300-1418 replay the same down-arrow-cursor idle cycle §3.3 already
decoded (`TextPrinterDrawDownArrow`, 9-tick-per-phase, `sDownArrowYCoords=
{0,1,2,1}`): sha transitions land at ticks 1301, 1310, 1319, 1328, 1337,
1346, 1355, ..., 1418 — **every single one exactly 9 ticks apart**, no
drift, confirmed by direct arithmetic over all 14 transitions in this
window (not sampled). The 3 distinct shas cycle `→446ea38f→cb0e9fd4→
446ea38f→19ccf0c6→` (idx1/idx3 sharing a sha, exactly as §3.3 predicted).
Screen is otherwise byte-identical tick-to-tick in this range — confirms
the "would like to battle!♥" hold is genuinely input-gated with no other
background animation, right up to the press.

### 7.2. A-press #3 registration: 5-tick lag, same pattern as press #2

Screen stays on the idle cycle's current phase (`cb0e9fd4...`) through tick
**1424**, unbroken by the press itself (ticks 1420-1421) — confirms input
registration lag, not press-frame-exact response. First visibly-changed
frame is tick **1425** (`c8645d83...`, message box cleared to blank). That's
a **5-tick lag from press start** (1420→1425), matching press **#2**'s own
lag exactly (838→843, `battle-bringup-notes.md` §2) rather than press #1's
3-tick lag (400→403) — both prior presses' lags are reproduced faithfully
by different presses in this same trace, i.e. **lag is not a fixed
constant** across all gated messages (open question already flagged
upstream; this session adds a 3rd data point, doesn't resolve it).

### 7.3. Text cadence: "BUG CATCHER DESTIN sent\nout GROVYLE!" — exact arithmetic match, same mechanism as §3.2

Source (`battle_message.c:388`): `sText_Trainer1SentOutPkmn =
"{B_TRAINER1_CLASS} {B_TRAINER1_NAME} sent\nout {B_OPPONENT_MON1_NAME}!"`,
dispatched by `BattleIntroPrintOpponentSendsOut` (`battle_main.c:3583-3607`,
`STRINGID_INTROSENDOUT`) once `BattleIntroPrintTrainerWantsToBattle`'s own
controller exec clears (i.e. the tick after the A-press registers). Resolves
to **"BUG CATCHER DESTIN sent\nout GROVYLE!"** — line 1 "BUG CATCHER DESTIN
sent" (23 chars, 3 spaces), line 2 "out GROVYLE!" (12 chars, 1 space), 35
printable chars total, `\n` free (same rule §3.2 already established).

Pixel evidence: the message-box region changes on **every tick from 1425
through 1459** except **4 holds**: ticks **1428, 1436, 1443, 1451** (found
by direct sha comparison, not assumed), then static (`3a8129cc...`) through
at least 1461. That's **35 ticks (1425-1459 inclusive) for 35 printable
characters** — i.e. **char index 0 ('B') prints the same tick as the
box-clear (tick 1425)**, one tick earlier in the cycle than §3.2's "wants to
battle" line (where the clear and char-0 were on separate ticks) — a small,
real difference between the two message transitions, not an inconsistency:
predicted hold ticks from the string's own space positions (indices 3, 11,
18, 26, accounting for the free `\n` at index 23) are `1425+3=1428`,
`1425+11=1436`, `1425+18=1443`, `1425+26=1451` — **all 4 match exactly**.
Same 1-tick/char-including-spaces mechanism as §3.2 and
`battle-room-notes.md`'s field msgbox, now confirmed on a 3rd independent
string.

### 7.4. Post-text handoff (tick ~1462): three things start the same tick

`BattleIntroOpponent1SendsOutMonAnimation` (`battle_main.c:3642-3683`) fires
once the text-print controller-exec clears, and unconditionally does two
things via `BtlController_EmitIntroTrainerBallThrow` →
`OpponentHandleIntroTrainerBallThrow` (`battle_controller_opponent.c:
1867-1888`) — pixel-confirmed first joint effect at tick **1462**
(`c146733e...`, 3-tick lag past the 1459-1461 static hold, consistent with
this codebase's general handoff-lag pattern):

1. **Trainer-pic slide-out**: `gSprites[...].data[0]=35` (duration),
   `data[2]=280` (target x — off the 240px-wide screen entirely), `data[4] =
   sprite->y` (no vertical move), `callback = StartAnimLinearTranslation`
   (`battle_anim_mons.c:1093-1100` → `AnimTranslateLinear_WithFollowup`,
   :1140-1143: decrements `data[0]` to 0 over exactly **35 frames**, linear
   in 8.8 fixed-point, then `SetCallbackToStoredInData6` invokes
   `SpriteCB_FreeOpponentSprite` — `FreeTrainerFrontPicPalette` +
   `DestroySprite`). Predicted destroy tick: 1462+35 = **1497**.
   Pixel-confirmed: isolating a trainer-only crop (x210-239,y20-60, clear of
   the ball/healthbox regions) shows continuous per-tick change starting
   **1463** (1-tick render lag) growing in magnitude as the sprite's trailing
   edge crosses the crop window, then fading to zero by **~1489-1493** as it
   exits the 240px screen — consistent with a constant ~2.97px/tick slide
   ((280-176)/35) reaching x=239 (off the visible screen) around tick
   1462+21≈1483 and being fully destroyed at the predicted 1497. (§4's
   settle-position xPos=176 for singles, already pinned, is the slide's
   start point.)
2. **Ball spawn**: `Task_StartSendOutAnim` (`:1897-1924`, created same tick,
   priority 5 — runs the same or next task-scheduler pass) → `StartSendOutAnim`
   (`:1168-1198`) → `gBattleControllerData[battler] =
   CreateInvisibleSpriteWithCallback(SpriteCB_WaitForBattlerBallReleaseAnim)`
   creates a poké-ball sprite immediately (not thrown — no arc; this is
   `POKEBALL_OPPONENT_SENDOUT`, which places the ball directly at
   `GetBattlerSpriteCoord(battler, BATTLER_COORD_X)`,
   `GetBattlerSpriteCoord(battler, BATTLER_COORD_Y)+24` per
   `pokeball.c:389-395` — the "unused throw arc" code path at :409-419 only
   runs for the `default` `kindOfThrow` case, **not** this one). Ball's own
   `callback = SpriteCB_OpponentMonSendOut` (`pokeball.c:991-1003`) idles for
   **16 ticks** (`data[0]++ > 15`) before releasing. Pixel-confirmed: first
   ball pixel at tick **1464** (2-tick lag).
3. **Party-status-summary widget despawn**: `if (...partyStatusSummaryShown)
   gTasks[gBattlerStatusSummaryTaskId[gActiveBattler]].func =
   Task_HidePartyStatusSummary` (`battle_interface.c:1671-1725`) — **not** a
   slide, a combined **alpha-blend fade + per-icon staggered exit-slide**:
   sets `BLDCNT`/`BLDALPHA=16:0` once, then (battle-start path)
   `Task_HidePartyStatusSummary_BattleStart_1` (:1727-1738) decrements
   `tBlend` from 16 **every other tick** (`data[11]++ % 2==0` gate — ~32
   ticks to reach 0) while each ball icon gets `SpriteCB_StatusSummaryBalls_Exit`
   with a **7-tick-per-index stagger** (`data[1] = 7*i`, reverse index order
   for the opponent side) and the bar sprite gets
   `SpriteCB_StatusSummaryBar_Exit`. Pixel-confirmed (isolated crop
   x40-150,y28-42, clear of ball/trainer/healthbox): **continuous per-tick
   change from 1463 through 1493** (alternating large/small diff magnitudes
   tick-to-tick — exactly the signature of a value that changes every-other-
   tick, i.e. `BLDALPHA`, superimposed on per-tick icon-position changes),
   fully gone (region byte-identical to background) by tick **1495** — the
   32-tick blend prediction (1463+32=1495) lands exactly on the
   observed vanish tick.

### 7.5. Ball release → materialization flash → Grovyle reveal (ticks ~1478-1518)

`SpriteCB_OpponentMonSendOut`'s 16-tick wait (from ball-spawn ~1462) ends
**~1478**, calling `SpriteCB_ReleaseMonFromBall` (`pokeball.c:750-824`),
which starts several concurrent effects:

- `AnimateBallOpenParticles(..., 1, 28, BALL_POKE)` (`battle_anim_throw.c:
  1577-1591` → `PokeBallOpenParticleAnimation`) spawns up to 16 small star/
  particle sprites from `gBattleAnimSpriteGfx_Particles`
  (`graphics/battle_anims/sprites/particles.png`, `graphics.c:467`) — the
  yellow "sparkle" specks visible around the ball from ~tick 1490 onward in
  the oracle captures (screenshot-confirmed, e.g. frame 1500/1508).
- `BlendPalette(OBJ_PLTT_ID(spritePalNum), 16, 16, gBallOpenFadeColors[BALL_POKE])`
  (`LaunchBallFadeMonTask(TRUE, battler, 14, ballId)`,
  `battle_anim_throw.c:2033-2058`) — **instantly** blends the mon sprite's
  OBJ palette 100% to `gBallOpenFadeColors[BALL_POKE] = RGB(31,22,30)`
  (:371-374, a pink) — this **is** the pink silhouette (not a generic
  "flash white", a ball-specific tint): pixel-sampled directly from the
  oracle capture at tick 1486, the dominant non-background color in the
  silhouette's bounding box is **`(255,181,247)`**, which is `RGB(31,22,30)`
  under this codebase's actual `component × 255 / 31` GBA-to-RGB888
  expansion (31×255/31=255, 22×255/31≈181, 30×255/31≈247 — **exact match**,
  a useful confirmed data point for the harness's own color-conversion
  convention, not just a per-doc note).
- Simultaneously, `BeginNormalPaletteFade(selectedPalettes=14, 0, 0, 16,
  RGB_WHITE)` fades **BG palette banks 1-3 only** (`PALETTES_BG=0x0000FFFF`,
  bit pattern `14 = 0b1110` → banks 1,2,3; bank 0 and all OBJ banks
  untouched) to white — this is the screen-wide "materialization flash",
  and it explains why it hits background pixels but not, e.g., black
  outlines (bank 0) or sprite colors (OBJ banks, separately controlled by
  the `BlendPalette` above). Pixel-confirmed: a background sample far from
  the mon/ball (x10-30,y90-100, near the player's back sprite) reads
  `(248.6,248.6,255)` through tick 1495, **pure `(255,255,255)` from 1496
  through 1503** (8-tick plateau), back to `(248.6,248.6,255)` by **1504**.
  16-step fade-in landing at 1496 (release-trigger 1478 + ~18) is roughly
  consistent with a 2-tick-per-step "normal" palette fade; the fade-out
  (1496→1504, 8 ticks) fits a faster per-step rate — the exact
  `gPaletteFade` step-rate arithmetic was **not** RAM-probed this session
  (flagged §7.7) since the source citations + this tick-level cross-check
  already pin every visually-relevant boundary.
- `StartSpriteAffineAnim(monSprite, BATTLER_AFFINE_EMERGE)`
  (`sAffineAnim_Battler_Emerge`, `data.c:144-149`: scale +0x28 instant, then
  +0x12/frame × 12 frames) grows the sprite's OAM affine matrix from
  near-zero to full size over ~12-13 frames from the release trigger
  (~1478) — i.e. affine-complete **~1490-1491**.
- `Task_FadeMon_ToBallColor` (`:2060-2076`) then runs a **17-tick loop**
  (`tTimer` 0..16) blending the OBJ palette back down from the ball-color
  tint (16) toward 0 (true colors), one step per tick, then — once
  `!gPaletteFade.active` — kicks off `Task_FadeMon_ToNormal`/`_Step`
  (`:2078-2089+`) which fades the white BG overlay back out. Pixel-confirmed
  net effect: Grovyle's silhouette is still visibly pink/off-color as late
  as tick 1508 (screenshot), reads as fully normal green/blue by **~1516-1518**.

`ballAnimActive` (gates the healthbox slide, §7.6) clears once **both** the
ball sprite's own open/close anim (`sprite->animEnded`) and the mon's affine
emerge (`affineAnimEnded`) finish (`HandleBallAnimEnd`, `pokeball.c:845-884`)
— consistent with the healthbox's own first pixel appearing at 1496-1497
(§7.6), a few ticks after the ~1490-1491 affine-complete estimate above.

### 7.6. Opponent healthbox slide-in + full settle (ticks ~1496-1522)

`Intro_TryShinyAnimShowHealthbox` (`battle_controller_opponent.c:292-333`)
polls every tick once installed (right after `Task_StartSendOutAnim`, §7.4);
once `ballAnimActive` clears for both this battler and (n/a here, singles)
its partner, and `healthboxSlideInStarted` is false, it calls
`UpdateHealthboxAttribute(..., HEALTHBOX_ALL)` (draws the name/level/HP-bar
content into the healthbox sprite, initially fully off-screen) then
`StartHealthboxSlideIn` (`pokeball.c:1241-1260`): for the opponent side,
`x2 = -0x73` (**-115px** initial offset) and `sSpeedX = -5`, stepped by
`SpriteCB_HealthboxSlideIn` (`:1272-1278`: `x2 -= sSpeedX`, i.e. **+5px/tick**
toward 0) — a clean **23-tick** linear slide (`ceil(115/5)`) to rest.

Pixel-confirmed: first healthbox sliver (bottom-left corner of the
nameplate box) at tick **1496-1497**; "Lv50" fully legible by **~1504-1508**;
green HP bar fully drawn by **~1512-1516**; last pixel change in the entire
256-frame capture is tick **1522**
(`6cb7ab1eb59438f1759e28779b0889c234bc9435edefcbe5ada43ed6e1e0b9f7` — an
**exact match** to the pre-existing coarse pin in `battle-bringup-notes.md`
§2, now confirmed byte-static through the rest of this trace, ticks
1523-1555, 33 further ticks with zero change). The 23-tick slide formula
predicts settle at ~1497+23=1520, 2 ticks before the observed final-change
tick 1522 — within the render-lag noise already characteristic of this
window (1-3 ticks throughout).

### 7.7. Asset coverage verdict for this window

Per-element, extracted-where or MISSING-what (no new extraction performed
this session — gaps are small and precisely scoped, listed rather than
extracted per this step's own scope note):

1. **Trainer-pic exit frames (Bug Catcher)**: **no gap** —
   `trainer-pic-bug-catcher.json` already has the full sprite; the slide-out
   is a pure linear translation of the existing static sprite (§7.4.1), no
   new art needed.
2. **Thrown/opening ball sprite**: **partial gap**. `graphics/balls/poke.png`
   (`gBallGfx_Poke`, a 16×48px, 3-frame-tall sheet per
   `extract-summary-screen.ts`'s own comment) is only **partially**
   extracted: `summary-ball.json` pulls **frame 1 only** (top 16×16, the
   static caught-ball icon used by the summary screen). This window's ball
   sprite uses **frame 2** (the "open" pose, `StartSpriteAnim(sprite,1)` in
   `SpriteCB_ReleaseMonFromBall`) which is **not** extracted anywhere.
   Small, clean gap — a future extractor pass just needs the sheet's other
   2 frames (or the whole 16×48 sheet, superseding `summary-ball.json`).
3. **Open-flash/particle art**: **MISSING entirely**.
   `graphics/battle_anims/sprites/particles.png` (`gBattleAnimSpriteGfx_Particles`,
   `graphics.c:467`, the shared star/sparkle sheet used by
   `AnimateBallOpenParticles` for every ball type) has **no committed
   extraction** in any `src/assets/gen/*.json` (confirmed: no extractor
   references `particles.png` or `battle_anims/sprites`). Needed before an
   engine slice can draw the sparkle particles visible ~1490+.
4. **Grovyle front sprite + palette flash**: **no gap for the sprite** —
   `battle-opponent-front-sprites.json` already has a `GROVYLE` entry (this
   session confirmed the key exists). The **palette-flash tint itself**
   is not asset data at all — it's the source constant
   `gBallOpenFadeColors[BALL_POKE] = RGB(31,22,30)` (§7.5), a single 15-bit
   color to transcribe, not an extraction gap — flagging its existence and
   exact value here so an engine slice doesn't need to re-derive it.
5. **Healthbox parts, Lv text, HP bar fill**: **no gap** —
   `battle-healthbox.json`'s existing `singlesOpponent`/`hpbar`/`status`/
   `misc` keys already cover the frame + bar-fill art (confirmed against
   `extract-battle-healthbox.ts`'s own header comment); level/HP numerals
   use `FONT_BOLD` at render time (same comment, :46-49), not separate digit
   art — nothing to extract.
6. **Party-status-summary ball icons**: unchanged from §4/§5's existing
   finding — `ball_display.png` + its palette are still not extracted
   (flagged by the prior session, not re-flagged as new here; this
   session's own finding is about the widget's *exit mechanism* (§7.4.3),
   not its asset, which was already known-missing).

**Net new gap count this session: 2** (particle sheet, fully missing; the
send-out ball sprite's frames 2-3, partially missing) — both small, clean,
single-PNG extractor additions whenever an engine slice needs them; neither
was extracted this session per the step brief's "list, don't extract unless
small and clean" allowance (both *are* small and clean, but extraction was
out of scope for a groundwork-only step — flagging precisely rather than
guessing which future slice should own them).

### 7.8. Risks / follow-ups for the engine slice

1. The exact `gPaletteFade` step-rate/coefficient schedule (§7.5) was cross-
   validated against pixels at its start/plateau/end ticks only, not
   RAM-probed tick-by-tick — an engine slice should either re-derive the
   standard "normal palette fade" speed constant from `palette.c` directly
   or RAM-probe `gPaletteFade.y`/`.delayCounter` (bitfields, `0x2037fd4`,
   `include/palette.h:35-51`) across ticks 1478-1504 before hand-writing a
   per-tick table.
2. The A-press lag inconsistency (3 vs. 5 ticks across the trace's 3 presses,
   §7.2) remains unresolved — now 2 of 3 presses agree on 5, but the
   mechanism (why press #1 differs) is still open, flagged upstream in
   `battle-bringup-notes.md` too.
3. §7.4.2's 16-tick ball-sit wait and §7.5's 12-13 tick affine-emerge and
   17-tick fade-to-ballcolor loop are all **source-exact constants**
   (not fitted), but their *sum* against the observed tick offsets carries
   1-4 ticks of accumulated render/task-scheduler lag at each handoff —
   consistent with every other multi-stage handoff already documented in
   this file (§2, §3), not a new kind of uncertainty, but worth a literal
   RAM-probed cross-check (`gTasks[]`/`gSprites[].data[]` per §7.7 risk 1)
   before an engine slice trusts the exact tick sums over the pixel-pinned
   milestones above.
4. Player send-out (`Go! ONIX!`, ticks ~1566-1750 per
   `battle-bringup-notes.md` §2's coarse pin) is structurally the same
   mechanism (`battle_controller_player.c`'s equivalent functions) but was
   **not** re-derived this session — out of this step's assigned window
   (1300-1560) — flagging as the natural next groundwork slice rather than
   assuming it's identical (the player-side ball position/coords and
   `POKEBALL_PLAYER_SENDOUT`'s arc-vs-no-arc behavior differ from the
   opponent's, per `pokeball.c:383-388` — worth its own pass, not a copy-paste).
