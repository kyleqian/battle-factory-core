# Battle scene notes (S6 groundwork: BATTLE-SCENE ASSEMBLY window, ticks 1031-1300)

Worktree-lane groundwork dossier for the window between the transition's
black outro and the settled first-action-menu idle: solid black (from
tick 1031, already pinned) → the "streak" scene-assembly frames → trainer
slide settles → "BUG CATCHER DESTIN would like to battle!♥" prints → the
settled 4-phase idle. **Ground-truth pinning + source/RAM decode only — no
engine code, no `tools/compare/traces/` fixtures.** Cross-references
`docs/battle-bringup-notes.md`'s "Slice-0 ground truth" section (frame
boundaries at coarser stride, this doc's task) and `docs/battle-room-notes.md`
(structure template). All frame numbers are `battle1-intro.json`'s own
absolute tick indices (same script, same RNG stream — see that file's
"Slice-0 ground truth" §0 for why). sha256 = first 8 hex chars unless
spot-cited in full.

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
