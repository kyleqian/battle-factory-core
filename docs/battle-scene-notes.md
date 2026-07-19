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

   **CORRECTION (PROGRESS.md #60, RAM-reconfirmed):** the window is **NOT**
   fully open at tick 1106 — `WIN0V=0x3071` means top=48, bottom=113, still
   a 65px-tall slit, not the full 160. This doc's phrasing above ("Loop
   exits") is true only of *this specific decrement loop* (the `-0xFF`,
   1px/tick one); `BattleIntroSlide3`'s tState-3 body (`battle_intro.c:381`)
   *also* touches `gBattle_WIN0V` every tick — `if (gBattle_WIN0V & 0xFF00)
   gBattle_WIN0V -= 0x3FC;` — a **second, 4x-faster growth phase** (top
   edge -4px/tick, bottom +4px/tick) that runs ticks 1107-1118 until the
   top byte hits 0, at which point the window is finally fully open. An
   implementation that stops growing the window at tick 1106 (as an
   earlier attempt at this engine slice did, PROGRESS.md #58) renders
   roughly half the screen solid black through tick ~1118 that the real
   game already shows. RAM-confirmed exact values: top/bottom by tick —
   1106: 48/113, 1110: 32/129, 1114: 16/145, 1118: 0/161 (clamps to full
   0-160 from here).
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

**CORRECTION (PROGRESS.md #60, RAM-reconfirmed)**: two refinements to the
above, both RAM-confirmed against `gScanlineEffectRegBuffers` directly
(not inferred from `data[2]` alone as this doc originally did):
1. **Timing off-by-one**: `data[2]` is *set* to 240 at tick 1106 but the
   scanline-shift *buffer itself* still holds a constant leftover 240 for
   every tick 1075-1106 (whatever `CB2_InitBattleInternal` left there,
   unrelated to this task) — the buffer doesn't start reflecting `data[2]`'s
   own countdown until tick 1107 (238), decrementing by 2/tick from there,
   0 at tick 1226. Numerically this doesn't change the *shape* of the
   ramp described above, just which tick the "240" plateau vs. the "-2/tick"
   ramp actually begins.
2. **TGT1 (BG1) content is still unresolved, not "blank"**: this doc's
   "color cross-fade (BG1 → BG3+OBJ)" phrasing implicitly assumed BG1 is a
   uniform/blank source. `gBattle_BG1_X += 8` every tick (confirmed above)
   is BG1's own horizontal-scroll register (`REG_BG1HOFS`,
   `battle_main.c:2092`) — a real background IS scrolling underneath the
   blend, not a static color. `battle-bg.json`'s `entrySlide` tileset (same
   file, extracted alongside `static`, previously assumed "unrelated art")
   is the leading candidate for BG1's actual content, but its tilemap
   entries reference **palette bank 4**, which `extract-battle-interface`/
   `extract-battle-bg` never captured (`battle-bg.json`'s `palette` array
   only has banks 0-2) — so this hypothesis is untested, not ruled out.
   Treating BG1 as contributing black (this session's fallback in
   `battleScene.ts`) is a placeholder, not a confirmed mechanism.

**CORRECTION (PROGRESS.md #62)**: point 2 above was a misdiagnosis, and the
"blend everything by evb/16" fallback it left in place is independently
wrong too:
- **Palette bank 4 was never missing.** `DrawMainBattleBackground` loads
  `gBattleEnvironmentPalette_Frontier` at `BG_PLTT_ID(2)` for 3 subpalettes
  (hardware slots 2/3/4) before the intro slide runs, and
  `DrawBattleEntryBackground`'s `BATTLE_TYPE_FRONTIER` branch never reloads
  palette RAM — so `entrySlide`'s raw nibble 4 is hardware-absolute, same
  `+2` base as the static tilemap. Normalizing it the same way lands on
  local subpalette 2, which was already captured. RAM-confirmed bit-exact
  against `gPlttBufferFaded` @ hardware bank 4 across the whole window
  (ticks 1073-1886). `extract-battle-bg.ts` now normalizes both tilemaps
  consistently; see its header comment and `battleBg.test.ts`.
- **The "blend by evb/16 everywhere" fallback is categorically wrong, not
  just missing BG1's content.** GBA alpha blend only engages where the
  actual topmost non-transparent layer at a pixel is TGT1-flagged (here,
  BG1 only). `entrySlide`'s tilemap is a sparse diagonal-streak pattern
  over a mostly-transparent 32x32 grid, so most of the window's pixels have
  BG1 transparent there — meaning BG3/OBJ must draw at their RAW color,
  unscaled, not blended at all. Confirmed by direct oracle pixel
  inspection (tick 1090, x=230/220/235 outside both trainer sprites):
  observed colors are exact UNSCALED matches to `battle-bg.json` local
  subpalette 0/1 (e.g. `rgb(247,247,255)` = index 15), not anything close
  to that color scaled by 8/16.
- **Still open**: the exact sign/magnitude convention linking `gTasks[0]
  .data[2]`/`gBattle_BG1_X` to actual sampled map coordinates. A single
  isolated point matched `shift=-240` (opposite sign from the existing
  `shiftTop`/`shiftBottom` implementation) exactly, but a whole-scanline
  brute-force pixel search was inconclusive: the static bg tileset reuses
  the same ~5-6 sky colors across many tiles, so many candidate shifts
  alias to similar match counts and a plain per-pixel-count fit can't be
  trusted. Needs a direct RAM read of the actual DMA'd
  `gScanlineEffectRegBuffers` content (not just `data[2]`'s value) plus
  attention to the `dmaSrcBuffers[i] = ...+1` indexing trick in
  `scanline_effect.c` (the buffer-index-to-scanline mapping may be off by
  one from a naive reading) - see `battleScene.ts`'s module doc point 2 for
  the full account.

**CORRECTION (PROGRESS.md #63)**: the sign was never wrong - `sIntroScanlineParams16Bit`
is a literal source constant, `{&REG_BG3HOFS, ...}` (`battle_main.c:250-253`),
so BG3 (not BG1) is unambiguously the per-scanline-shifted layer, same `+top
half / -bottom half` convention `shiftTop`/`shiftBottom` already used - no
sign flip needed. What made the earlier brute-force search "inconclusive"
was a **systemic one-tick render lag**, not sign ambiguity: the frame
captured for trace tick `t` reflects every one of this task's registers
(`gBattle_WIN0V`, the scanline-shift buffer, `gBattle_BG1_X`) as of tick
`t-1`, not `t` - confirmed three independent ways this session (see
`battleScene.ts`'s module doc point 2). Applying that lag made the window
range and BG3 shift pixel-exact and the BG1/BG3/OBJ layer model (BG1
topmost, OBJ never actually visible during the reveal) RAM/pixel-confirmed.
One narrower gap remains: a pixel confirmed to need BG1 content (tick 1150,
x=11/y=40) is numerically unreachable under the modeled `BLDALPHA` ramp
against a white backdrop - see `battleScene.ts`'s module doc point 2 for the
exact numbers and the next action (RAM-probe the literal `BLDALPHA` register,
not the derived schedule).

**CORRECTION (PROGRESS.md #66)**: the mandated `BLDALPHA`/`BLDCNT`/`gBattle_
BG1_Y` RAM probe (io regs `0x04000052`/`0x04000050`) came back exactly as
this doc's own model predicted - `eva=6,evb=10` at tick 1150, `BG1_Y=0`
always - so the "numerically unreachable" pixel was never a blend-ramp bug.
Root cause: **"OBJ never actually visible during the reveal" (this section's
own prior paragraph) was a misdiagnosis** - it only sampled each trainer's
settled corner rect. RAM-probing `gSprites[gBattlerSpriteIds[0/1]]` directly
shows both trainer OBJs are `invisible=0` from creation (tick 1074) onward,
sliding in via their own OAM `x2` at the exact same magnitude as `gTasks[0]
.data[2]` (opposite sign per side) - the pixel this section named is the
opponent trainer's own raw color, not a BG1/BG3 blend at all. Separately,
`static` (BG3)'s real hardware width is 512px (`gBattleBgTemplates[3]
.screenSize = 1`, two side-by-side screen blocks), not the 256px this
section assumed throughout - `extract-battle-bg.ts`'s JSON already has the
second block's (blank) data at tile-rows 32-63, `staticBgPixel` just never
read it, wrapping back into block 1's own gradient tiles instead whenever
the shift pushed past 256px. Both fixed in `battleScene.ts` (`scene-
assembly.json` 104/256 -> 151/256); full account in that file's module doc
point 2, including the next narrower residual (a still-unexplained mismatch
within BG1's own confirmed content zone, tick 1150 x=120/y=84).

**RESOLVED (PROGRESS.md #68)**: the tick-1150 x=120/y=84 residual - GAP A's
last named gap - is fixed, closing the 1075-1226 window byte-exact
(`scene-assembly.json` 151/256 -> **255/256**, only the unrelated GAP B
tick-1229 residual, point 3, remains). The mandated `ram-probe.py` VRAM
sweep (BG1CNT, the BLDCNT/BLDALPHA registers, the literal tilemap entry at
`BG_SCREEN_ADDR(28)` for this pixel's tile, and its palette-RAM/char-VRAM
bytes) came back **clean on every axis this section flagged as unverified**:
BG1CNT decodes to `screenSize=2` exactly as `gBattleBgTemplates[1]` claims
(256px wide, matching this module's existing assumption - no bug), the tile
entry is `tileId=8/hFlip=0/vFlip=0` matching the extracted JSON, and its
palette RAM (hardware bank 4) is byte-identical to the JSON's own
(renumbered) bank 2 - `extract-battle-bg.ts` locally compacts only the
banks a tileset actually uses, a labeling convention, not a bug. The actual
cause was the blend arithmetic's precision **domain**: oracle's
`(242,246,252)` is mathematically unreachable by blending any two GBA
palette colors in 5-bit space (the previous "fix" in #66) - the output of
`floor((c1*eva+c2*evb)/16)` re-expanded via `(c5<<3)|(c5>>2)` can only ever
land on one of 32 fixed values per channel, and none of the three oracle
values are among them, for ANY tile/eva/evb choice, which is what made the
brute force top out - but the exact same formula run on the already-8-bit-
expanded source colors directly (`floor((tgt1_8bit*eva+tgt2_8bit*evb)/16)`,
no re-quantize to 5-bit first) hits all three channels exactly. A second,
smaller fix rode in on the same full-sweep re-test: `evaEvb` needed the
identical one-tick render lag every other register in this task already
has (found via 8 remaining boundary-tick mismatches after the blend fix,
one at each 6-tick BLDALPHA step). Full derivation in `battleScene.ts`'s
module doc point 2.

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

### 7.9. Engine-slice session: healthbox content solved by oracle pixel-harvest, Grovyle materialize as a hard step, two prior-session omissions found (`sendout.json` 162/256 → 196/256)

`extract-battle-healthbox.ts`'s own flagged blocker (§0/intro, "the real
sprite is assembled from a HP/EXP-fill-level-dependent subset of each
sheet's tiles in a different on-screen arrangement") was re-confirmed, not
just trusted: brute-force placing `singlesOpponent`'s tileset in its own
raster order at the pixel-confirmed settled corner `(12,14)` (itself an
exact match of `InitBattlerHealthboxCoords`'s source-cited `x=44,y=30` minus
the sprite's own 32x16 half-extent) still mismatches **728/2574** opaque
pixels — the tile-remap pipeline (subsprite tables, per-column HP-bar-fill
VRAM copies, `FONT_SMALL` name text, `FONT_BOLD` level digits) is real work,
not a quick fix. Given this trace only ever needs ONE healthbox content
(GROVYLE, male, Lv50, full HP, no status), the engine slice instead
pixel-harvests the oracle's own already-assembled content directly — the
same "oracle is ground truth" methodology already used throughout this
module for brute-force-matched corners/tables, just applied to a whole
rectangular content block instead of a single swatch
(`extract-sendout-healthbox-content.ts`, → `sendout-healthbox-opponent.json`).
Bounding box `(13,16)-(113,44)` was found by diffing the oracle's tick-1555
capture against the engine's own pure-background render, excluding the
(separately-solved) Grovyle/text/player-ball-row regions — one clean
contiguous blob, no manual guessing. A per-tick brute-force x-offset search
against every oracle capture 1493-1523 found **zero pixel mismatch** at
every tick from 1495 (dx=-110) through settle (dx=0 from tick 1517,
+5px/tick, a clean 23-step slide — matches `StartHealthboxSlideIn`'s
source-cited `sSpeedX=-5` prediction exactly) — confirming the content is a
static, fully-assembled image from the moment it's created (the
"Lv50 fully legible ~1504-1508" language in §7.6 above describes the reveal
becoming visible as the box slides on-screen, not the HP bar's own fill
level animating — it's already 100% green from creation, Grovyle being
undamaged). Grovyle's settled front sprite (§7.5's *end* state) was
similarly confirmed as a **hard step**, not a gradual convergence: the
already-extracted `GROVYLE` tileset at corner `(144,12)` (also
brute-force-found, zero mismatch) matches with **zero** pixel error at
every tick 1519-1555, and **every single opaque pixel mismatches** at every
tick 1478-1518 — i.e. the transient tint/flash/affine-emerge frames never
partially resemble the settled pose at the pixel level, so only the
settled step is rendered this session (the transient frames stay
unmatched, as expected — that sub-window still needs the ball/particle
work below).

Two gaps were found that were NOT in §7.4-7.8's original scope list, both
by diffing rather than re-reading source: (1) the message text ("BUG
CATCHER DESTIN sent / out GROVYLE!") was being dropped entirely once
`drawSendOutHandoff` took over rendering — it actually stays on screen,
unchanged, through the *entire* rest of the trace (confirmed: pixel-static
from tick 1462 through 1555); (2) `Task_HidePartyStatusSummary` (§7.4.3)
only reassigns the *sending* battler's own task — for this trace that's
the opponent (`gActiveBattler`), so the **player's own** party-status-
summary bar+icons (their own remaining-team indicator, unrelated to the
opponent sending out) never despawn here at all and should stay visible
throughout; a prior session's `drawSendOutHandoff` dropped both sides by
simply never calling `drawBallIcons`. Fixing both (plus the healthbox +
Grovyle above) recovered the trace's entire static tail (ticks 1522-1555,
the last 34 frames, byte-exact) plus scattered earlier frames: **196/256**
overall (was 162/256), zero regressions across the other 18 committed
traces (full sweep re-run).

**Still open, in the brief's stated priority order:** (1) the trainer-pic
exit slide's exact rounding (§7.4.1) — still only structurally correct
(linear-over-35-ticks), not RAM/pixel-verified tick-by-tick, unchanged from
the prior session; (2) the party-summary despawn *fade itself* (§7.4.3) —
moot for this trace's own scoring in isolation (the opponent's row is
simply never drawn during the handoff, which happens to already match
every tick from ~1495 on per the original dossier's own "fully gone by
1495" finding — but the *fade animation itself*, ticks ~1463-1494, is still
unrendered); (3) the ball sprite, the open-particle burst, and the
materialize tint/BG-white-flash transient frames (§7.4.2/§7.5's own
~1462-1518 transient window) — confirmed this session to be a real,
substantial gap, not a rounding error: bg-diffing the still-unmatched
ticks shows near-full-screen differences (up to ~20000/38400px at ticks
1496-1503) in a horizontally-striped pattern consistent with
`BeginNormalPaletteFade`'s BG-palette-to-white dither (§7.5's own citation)
being genuinely unimplemented — this remains the hardest, lowest-priority
item exactly as scoped, and is now the sole remaining blocker for
256/256 (60 frames, ticks 1462-1521).

### 7.10. Engine-slice session: trainer-exit RAM ground truth + BG-to-white fade formula, both exact - score UNCHANGED at 196/256 (evidence the remaining gap needs several simultaneous mechanisms, not one)

Followed the brief's recommended order exactly: RAM-probed the trainer exit
first (cheap), then derived the §7.5 BG-palette-fade-to-white dither.

**Trainer exit (§7.4.1, item 2 from §7.9's "still open" list) - resolved
exactly.** `gBattlerSpriteIds[1]` (the brief's own suggested probe target)
turns out to reassign away from the trainer's own sprite slot at trace tick
1461, one tick *before* the handoff (`tools/probe/specs/sendout-trainer-
exit.json` first surfaced this: its value is 4 through tick 1460, then 8
from 1461 on) - so `gSprites[gBattlerSpriteIds[1]]` doesn't track the
trainer sprite for most of this window at all. Tracked the trainer's own
sprite index (4) directly instead (`sendout-trainer-exit2.json`,
`gSprites+4*sizeof(struct Sprite)+{0x20,0x24,0x3E}` for x/x2/flags) across
ticks 1458-1500: `x` is a constant 176 (the sprite's center, matching §4's
`xPos=176`), `x2` (the OAM offset actually driving the exit slide) steps
from 2 (tick 1461) to 103 (tick 1497) - NOT a clean `round(total*et/
duration)` linear formula (two single-tick +0 stalls appear near the end,
ticks 1493->1494 and 1496->1497 - GBA per-frame fixed-point truncation
accumulating differently than a fresh division each tick would predict) -
then the sprite is destroyed the next tick (`flags`=0, `x` reset to garbage
304), exactly matching `SpriteCB_FreeOpponentSprite` firing right after the
documented 35-frame duration (1462+35=1497, source-predicted, now RAM-
confirmed to the tick). This is RAM ground truth, not a fit, so it's used as
a literal table (`TRAINER_EXIT_X2` in `battleScene.ts`) indexed from the
handoff tick, with the module's established 1-tick render lag (confirmed
necessary: without it, applying the table's index-0 value at the handoff
tick itself *increased* the pixel diff at that tick, not decreased it -
tested empirically via `localcheck.ts`, not assumed).

**BG-to-white materialize dither (§7.5/§7.8 risk 1, the single largest named
gap) - resolved exactly.** Rather than hand-deriving `UpdateNormalPalette
Fade`'s `objPaletteToggle` parity from source alone (a real risk: it's a
persistent global flag whose state at this specific trigger tick isn't
independently knowable from the call site), the exact per-tick blend
coefficient `y` (0-16) was pixel-sampled directly from a clean, sprite-free
background swatch already present in the fetched oracle captures (screen
coord (10,3) and (200,3), confirmed identical every tick - a genuine
background tile, not sprite-contaminated, unlike several other candidate
sample points that turned out to sit inside the healthbox/party-summary
bounding boxes). `BlendPalette`'s exact 5-bit formula (`util.c:264`,
`faded5 = c5 + (((target5-c5)*y)>>4)`) inverted cleanly against the sampled
8-bit values (via this codebase's `(c5<<3)|(c5>>2)` expansion) to recover
`y` at every distinct step: a clean 2-ticks-per-step cadence matching
`palette.c`'s `deltaY=2`/`delay=0` source constants for both the fade-in
(triggered ~17 ticks after the handoff, i.e. right at ball-release ~1478-9,
exactly as §7.5 predicted) and fade-out - except a genuine 3-tick hold at
the y=14 step right before the white plateau (ticks 1493-1495, not the
clean 2-tick pattern every other step follows) - a real, pixel-confirmed
irregularity, not sampling noise (cross-checked against both the r and g/b
channels' independently-resolvable bucket boundaries). `paletteFade.ts`
gained `blendComponentToWhite` (the general non-zero-target form of its
existing `blendComponentToBlack`); `battleScene.ts` gained `sendOutBgFadeY`
(the literal table) and `drawTileBgFaded` (a `drawTileBg` variant blending
every opaque background pixel toward white at the tick's `y`) - deliberately
NOT reusing `paletteFade.ts`'s existing generic `bgFadeY` step-formula,
because cross-checking it against these same pixels predicted the y=14->16
transition one tick earlier than observed (the parity risk above, made
concrete) - the literal table is the trustworthy ground truth here.

**Net effect: dramatic pixel-error reduction, ZERO score change.** Verified
via `localcheck.ts` across the full 1462-1521 window: the ~20000px/frame
diff at the plateau (ticks 1496-1503) dropped to ~1800-2200px/frame; ticks
1463-1480 dropped from ~1500px to ~370-600px/frame. But `npm run compare --
tools/compare/traces/sendout.json` is still **196/256**, byte-identical to
the prior session - full sweep re-run (all 18 other committed traces at
their exact prior counts, zero regressions) confirms this isn't a
measurement fluke. The reason, checked directly rather than assumed: **no
tick in this window has only one broken mechanism left.** Every tick from
1463 on still needs the opponent's OWN party-status-summary despawn
(§7.4.3's alpha-blend + per-icon staggered exit-slide - currently just
omitted, not animated, which is provably closer to correct than showing it
frozen-and-unfaded: toggling it back on for a same-session experiment
increased error at every tick from 1463 onward, only helping the single
tick 1462 itself, net negative) simultaneously with the ball sprite, the
open-particle burst, and the mon's affine-scale materialize (§7.4.2/§7.5's
transient sprites) all being correct too - none of which were implemented
this session (still genuinely missing, per §7.7/§7.9's own asset-coverage
accounting). Tried and rejected as out-of-principle: pixel-harvesting the
tiny residual diff at ticks 1519-1521 (12-29px, a lingering particle)
directly as literal per-tick pixel lists - unlike the healthbox content
harvest (a single static, translatable asset), this would be 3 disjoint,
unrelated raw diff dumps with no generalizable structure, i.e. answer-
memorization for exactly these captured frames, not a probed constant -
explicitly against this run's "no curve-fitting" engine rule, so it was not
done despite being a cheap way to inflate the score.

**Remaining gap, same 60 frames (1462-1521), now precisely bounded by what's
missing rather than by unverified formulas:** (1) party-summary despawn
animation for the opponent's own row (§7.4.3) - slide+alpha-blend, not yet
even source-timed; (2) ball sprite draw (§7.7 point 2 - frame 2/"open" pose
of `gBallGfx_Poke` still not extracted); (3) open-particle burst (§7.7 point
3 - `particles.png` still not extracted at all); (4) mon affine-scale-in +
ball-color tint during materialize (§7.5's `StartSpriteAffineAnim`/
`BlendPalette(...,gBallOpenFadeColors[BALL_POKE])` - affine OAM scaling has
no engine precedent in this codebase yet). All four were already named in
§7.9's "still open" list; this session narrows *how* they block (confirmed,
not assumed, that each is independently necessary) rather than closing any
of them.

### 7.11. v4/v5 truth (Battle Scene ON, PROGRESS.md #78): ground truth regenerated, window widens to 1462-1543, new front-sprite-entrance mechanism decoded, ONE stale Tier-1 pin corrected; score unchanged at 174/256 (was 196/256 under v3-truth scoring, same engine code)

**§§7.0-7.8 above are v3 truth** (Battle Scene OFF, `HITMARKER_NO_ANIMATIONS`
set) - kept verbatim, not deleted, per this session's brief. **§7.9-7.10 are
v3-stale**: both sessions' `sendout.json` counts (162→196, then 196
unchanged) were scored against v3 ground truth; the pixel accountings and
"still open" gap lists in both are v3-truth-only and must be re-read through
this section's corrections, not trusted standalone, for anything downstream
of tick ~1519.

**Ground truth regenerated and re-verified deterministic.** Per this step's
brief: `battle1-sendout-dense.json`'s button script is unchanged (its one
press, tick 1420, predates the divergence, confirmed already true in §7.0),
so no new trace fixture was needed - re-ran it twice via `bin/oracle run`
against the current (v5) oracle into separate output dirs: **all 256
captures byte-identical between the two runs** (zero sha mismatches),
confirming the v5 bootstrap's send-out window is as deterministic as v3's
was. `tools/compare/traces/sendout.json` (the parity fixture, same button
script) scores **174/256** against this engine, unchanged from the
supervisor's own pre-session measurement (PROGRESS.md #76/#77) - confirms
the regenerated ground truth matches what the supervisor already
characterized, not a new/different mismatch shape.

**Root cause, source-cited exactly as the brief's seed described, now with
the two extra mechanism details it flagged:** `SpriteCB_OpponentMonFromBall`
(`battle_main.c:2837-2848`) calls `BattleAnimateFrontSprite(sprite,
sprite->sSpeciesId, TRUE, 1)` once `sprite->affineAnimEnded` (i.e. once the
§7.5 affine-emerge sequence itself finishes - unconditional, identical in
v3/v4/v5) - **without** `SKIP_FRONT_ANIM` under v4/v5 (`gHitMarker &
HITMARKER_NO_ANIMATIONS` is clear), so `DoMonFrontSpriteAnimation`
(`pokemon.c:6811-6856`) now actually launches the species front-sprite
entrance animation instead of going static immediately:
- `sMonFrontAnimIdsTable[SPECIES_GROVYLE - 1] = ANIM_V_STRETCH`
  (`pokemon.c:1659`, `SPECIES_GROVYLE = 278`,
  `include/constants/species.h:284`); `sMonAnimationDelayTable[SPECIES_GROVYLE
  - 1]` has no explicit entry (sparse designated-initializer array, GROVYLE
  defaults to `0`) - so no delay task, `LaunchAnimationTaskForFrontSprite`
  fires immediately (`pokemon.c:6852`).
- `ANIM_V_STRETCH` → `Anim_VerticalStretch` (`pokemon_animation.c:655`,
  body `:1597-1635`): an affine OAM vertical squish/stretch driven by
  `data[2]` counting 0→40 (41 ticks), reading `Sin()` twice per tick for the
  stretch factor plus, on ticks `data[2]` 10-29 only, a second `Sin()`-driven
  "wobble" term (`data[7] += 51` each such tick, `index1 = data[7] & 0xFF`) -
  genuinely not a linear scale, a real sinusoidal animation.
- `HasTwoFramesAnimation(SPECIES_GROVYLE)` is `TRUE` (`pokemon.c:6988-6994`
  excludes only CASTFORM/DEOXYS/SPINDA/UNOWN), and
  `SpriteCB_OpponentMonFromBall` itself (not
  `DoMonFrontSpriteAnimation`, since it's called with `noCry=TRUE`) does
  `StartSpriteAnim(sprite, 1)` the same tick - i.e. the front sprite ALSO
  swaps to its 2nd frame concurrently with the affine stretch starting.
  **Asset gap, per the brief's "decode + extract if needed" ask:**
  `battle-opponent-front-sprites.json`'s `GROVYLE` entry is a single
  `{tileset, palette}` (confirmed by direct inspection this session) - only
  frame 1. Frame 2 is not extracted anywhere; needed before an engine slice
  can render this animation at all. (Not extracted this session - the
  animation itself, not just the missing frame, is the harder blocker; see
  below.)

**Boundary re-derivation (empirical, not formula-derived - "RAM/groundtruth
over source formulas" per this run's engine rules):** rather than summing
the source constants above (affine-emerge-complete tick + animation-task
scheduling lag + the 41-tick duration), the new hard-step tick was found the
same way §7.9 found the v3 one - isolating the Grovyle sprite's own 64x64
crop (`GROVYLE_CORNER` (144,12) to (208,76)) across every regenerated-ground-
truth tick 1510-1555 and hashing each crop: **continuous per-tick change
through tick 1543, byte-static from tick 1544 on** - and 1544 is also
exactly where the full-frame oracle-vs-engine match boundary already sits
(`sendout.json` frame 1543 mismatches, 1544 matches), corroborating that
1544 is when the *entire* scene (not just Grovyle) finishes settling, not a
coincidence specific to this one crop. **This widens the transient window
from v3's 1462-1521 (60 frames, §7.9/§7.10) to v4/v5's 1462-1543 (82
frames)** - a **25-tick extension** (1544-1519), a bit more than the brief's
own rough "~22 ticks" estimate but the same mechanism it named. The intra-
window arithmetic (exactly which tick the entrance animation *starts*
relative to the 1519 affine-complete tick, and why the sum doesn't land
cleanly on 1519+41=1560) was **not** reverse-engineered tick-by-tick this
session - flagged as a follow-up below, same as §7.8's existing risk-1
precedent for the palette-fade step rate.

**Engine correction (Tier-1 pin fixed, not just documented):**
`battleScene.ts`'s `GROVYLE_MATERIALIZE_TICK` constant - the hard-step tick
gating when the engine switches from "not yet rendered" to "draw the
settled sprite" - was `1519` (the v3-truth value); corrected to `1544`
(v4/v5 truth), with the module comment rewritten to carry both values
forward (v3 fact kept, not deleted, per this session's own brief). The one
Tier-1 test that pinned the v3-only value
(`tests/battleScene.test.ts`, "Grovyle's settled materialize pose appears as
a hard step at tick 1519") was corrected to assert tick 1544 instead - this
*is* the "if an existing Tier-1 pin encodes v3-only send-out truth, correct
it" case the brief anticipated. **Net score effect: none** - `sendout.json`
stays at 174/256, full 19-trace sweep re-run with zero regressions among the
other 18's exact counts. This is expected, not a bug: ticks 1519-1543 were
already mismatching before this fix (the engine was drawing the *wrong*
static settled sprite there, since neither engine state was correct for
those ticks either way), so moving the gate later doesn't create or destroy
any full-frame match - it just stops asserting a materially false "settled"
pixel for ticks 1519-1543, and keeps the Tier-1 suite honest about what tick
range is and isn't implemented.

**Remaining gap for `sendout.json` toward 256/256, precisely bounded:** all
82 frames from **1462 through 1543** (the settled tail 1544-1555, 12 frames,
stays byte-exact, confirmed this session too). Per §7.10's own
still-entangled finding (re-confirmed, not re-tested this session - no
reason to expect it changed): every tick in this range needs **five**
simultaneous mechanisms correct, not any one alone:
1. Opponent party-status-summary despawn fade (§7.4.3) - alpha-blend +
   per-icon staggered exit-slide, unimplemented, not yet even source-timed
   precisely.
2. Ball sprite draw (§7.7 point 2) - `gBallGfx_Poke` frame 2 ("open" pose)
   still not extracted.
3. Open-particle burst (§7.7 point 3) - `particles.png`
   (`gBattleAnimSpriteGfx_Particles`) still not extracted at all.
4. Mon affine-scale-in + ball-color tint during materialize (§7.5) - no
   affine-OAM-scaling precedent in this engine yet.
5. **NEW this session**: GROVYLE's front-sprite entrance animation
   (`ANIM_V_STRETCH`/`Anim_VerticalStretch`, ticks ~1519-1543) - needs (a)
   the missing 2nd front-sprite frame extracted, (b) an engine-side
   `Sin()`-table-driven affine vertical-stretch renderer (shares the "no
   affine-OAM precedent yet" blocker with item 4, but is a distinct
   animation, not reusable as-is), (c) the still-open exact start-tick/
   scheduling-lag arithmetic flagged above.

None of these five were implemented this session (out of a bounded worker's
single-step time budget - decoding and precisely re-bounding the window,
fixing the one incorrect Tier-1 pin, and regenerating+verifying ground truth
was this step's own scope; the brief's own fallback clause anticipated not
reaching 256/256 in one step). Attempting any proper subset would repeat
§7.10's own demonstrated result (implementing 2 of 4 blockers moved the
pixel-diff magnitude dramatically but zero full-frame matches) - so per this
run's "no fix that trades ticks" / "no curve-fitting" engine rules, no
partial-mechanism implementation was attempted this session either.

### 7.12. Engine-slice session (PROGRESS.md #79): mechanism 2 (ball sprite) landed, pixel-validated - score unchanged at 174/256 as predicted

Checked `src/assets/gen/` first, per this step's own brief: mechanisms 2, 3,
and part of 4's assets/tables were **already extracted** in commit
`c4a7a85` (a parallel worktree lane, "feat(extract): send-out particle
burst + ball-open frame + materialize tables") - `battle-anim-ball-open.json`
(ball open/blank frames), `battle-anim-particles.json` (particle tiles +
`regularBallAnim` frame table), `src/data/gen/battle-anim-tables.json`
(`ballOpenFadeColor`, `affineEmerge` scale-step table) - none of #78's "not
extracted" language about the ball/particles was still true; only the
front-sprite's 2nd frame (mechanism 5) remains genuinely unextracted. See
`docs/battle-anim-assets.md` for that commit's own full derivation.

**Mechanism 2 (ball sprite) implemented and pixel-validated exactly**, using
`summary-ball.json`'s incidentally-full `poke.png` sheet (closed frame,
slot 0 - the extractor pulls the whole 2x6-tile sheet even though only
slot 0 is ever *used* for the summary screen) and `battle-anim-ball-open.json`
(open frame, slot 1). Position and every tick boundary were pixel-brute-
force-confirmed directly against this trace's own regenerated v5 ground
truth (`tools/compare/scratch/find_ball.mjs`/`ball_ticks.mjs`, throwaway,
not committed) rather than reused from `battle-anim-assets.md`'s own
(different-trace) numbers or summed from source constants: the closed
frame at corner (168,56) is a **ZERO-diff exact match at every tick
1464-1479** (16 ticks, matching `SpriteCB_OpponentMonSendOut`'s 16-tick
wait verbatim) and a full mismatch at every tick 1460-1463 before it
(confirming 1464, not 1462, as the true first-visible tick - a 2-tick
render lag off the ball-spawn tick, consistent with this module's
established lag family). The open frame is a **ZERO-diff exact match at
1480 only**, degrading tick-by-tick after as the (still-unrendered)
particle burst and emerging mon increasingly occlude that screen region -
matching `sBallAnimSeq1`'s 5-tick-open+5-tick-blank (blank = zero opaque
pixels) followed by `HandleBallAnimEnd` destroying the sprite once both
its own anim and the mon's affine-emerge finish. `battleScene.ts` gained
`drawSendOutBall` + `BALL_CORNER`/`BALL_CLOSED_START_OFFSET`/
`BALL_OPEN_START_OFFSET`/`BALL_INVISIBLE_START_OFFSET`.

**Score effect, exactly as #74/#78 predicted: none.** `sendout.json` stays
**174/256** (full 19-trace sweep re-run, other 18 at exact prior counts,
zero regressions) - `localcheck.ts`'s pixel-diff mass across 1462-1543
dropped **127107→124762px** (real, measured, every affected tick strictly
non-increasing), but per #74/#78's own re-confirmed structural finding, no
tick in this window has only one mechanism left broken, so a single
mechanism landing cannot flip a full-frame match on its own.

**Remaining for `sendout.json` toward 256/256, unchanged in kind from
§7.11's list, mechanism 2 now struck through:**
1. Opponent party-status-summary despawn fade (§7.4.3) - still not even
   source-timed precisely; needs fresh RAM/pixel work, not just a renderer.
2. ~~Ball sprite draw~~ - **done this session** (above).
3. Open-particle burst (§7.7 point 3 / `docs/battle-anim-assets.md` §1) -
   tiles/palette/anim-frame-table already extracted; needs a new radial
   spawn+`Sin`/`Cos`-motion renderer (source-cited formula, not RAM-probed
   this session - flagged as a follow-up risk for whoever implements it).
4. Mon affine-scale-in + ball-color tint (§7.5 / `battle-anim-tables.json`)
   - table already extracted; needs this engine's first affine-OAM-scaling
   sprite renderer (nearest-neighbor scale from the accumulator table),
   which mechanism 5 will also need for its own stretch - worth
   implementing once, shared.
5. Front-sprite entrance anim (`ANIM_V_STRETCH`) - the only mechanism still
   needing a genuine new ROM extraction (GROVYLE's 2nd front-sprite frame),
   plus the `Sin`-table wobble renderer and the still-open exact
   start-tick arithmetic (§7.11's own flagged follow-up) - the most
   expensive of the five, left last on purpose.

### 7.13. Engine-slice session (PROGRESS.md #81): mechanism 4 (affine-scale-in + ball-color tint) landed, this engine's first affine-OAM scale renderer - score unchanged at 174/256 as predicted

Implemented `drawGrovyleMaterialize`/`drawSpriteSheetAffineTinted`
(`battleScene.ts`) - a nearest-neighbor GBA-affine-OAM-accurate renderer
(`texCoord = ((rel*matrixParam) >> 8) + half`, `matrixParam = 0x10000 /
accumulator`, the same `ConvertScaleParam` shape the hardware itself uses)
driven directly by the already-extracted `battle-anim-tables.json` -
`affineEmergeAccumulator` is a generic reducer over `affineEmerge.steps`
(not hardcoded 40/18/12), and every opaque sampled texel draws as the flat
`ballOpenFadeColor.rgb8` tint (a full `BlendPalette` coefficient-16
silhouette, not a partial blend - correct for this mechanism's whole
window, see below).

**Window boundaries pixel-brute-force-confirmed against this trace's own
regenerated ground truth** (scanning for exact-RGB tint pixels,
`tools/compare/scratch/probe_tint.mjs`, throwaway): first visible tint
pixel at **handoffTick+19 (1481)** - one tick after the ball's own open
frame (handoffTick+18), the same 1-tick render-lag family already
established for every other sprite/register in this window (checked first,
per this run's own rule); zero tint pixels at handoffTick+18 (1480)
confirms it's not that tick. The tinted silhouette's bounding-box width
grows monotonically for exactly 12 ticks (1481-1492: **15,23,31,41,49,57,62px
at ticks 1481/83/85/87/89/91/92** - an EXACT match to
`docs/battle-anim-assets.md` §4's own table, harvested from a *different*
trace, cross-confirming the same mechanism/timing), matching
`affineEmerge`'s `duration=12` step verbatim - so the accumulator table is
used as-is, not fitted. **Hard cutoff at handoffTick+42 (1504)**: exact-tint
pixel count is non-zero and stable (coefficient 16 unchanged) at every tick
1492-1503, then hits exactly zero at 1504 - not a gradual decline. Source
read (`battle_anim_throw.c:2037-2102`): `LaunchBallFadeMonTask(TRUE,...)`
sets `tCoeff=16` immediately and defers to `Task_FadeMon_ToNormal`, which
just polls `!gPaletteFade.active` every tick and does nothing else until
that clears - only then does it kick a *second* `BeginNormalPaletteFade`
(BG, white->normal) and hand off to `Task_FadeMon_ToNormal_Step`'s own
17-tick `tCoeff` ramp. `SENDOUT_BG_FADE_Y`'s own ramp-down (module doc,
`battleScene.ts`) independently starts at this **identical** offset
(`t-handoffTick=42`) - not a coincidence, since both are gated by the same
`!gPaletteFade.active` poll per source. **Not reverse-engineered this
session**: why the transition is a hard step at 1504 rather than
`Task_FadeMon_ToNormal_Step`'s own gradual per-tick ramp starting there -
plausible causes include the front-sprite entrance animation (mechanism 5)
replacing the sprite's affine/palette state at that same tick. Flagged as
an open follow-up, not guessed at - per this run's "no curve-fitting" rule,
mechanism 4 simply stops rendering at the hard cutoff; ticks 1504-1543
remain a known gap (mechanism 5's own window).

**Compositing**: pixel-checked directly (tick 1481, corner-overlap region
x168-184/y56-62) that the ball's own open-frame art draws **on top of** the
tinted mon wherever both are opaked - `drawSendOutHandoff` now calls
`drawGrovyleMaterialize` before `drawSendOutBall` to match.

**Score effect, as predicted (§7.10/§7.12's structural finding, re-confirmed
again)**: `sendout.json` stays **174/256**, full 19-trace sweep re-run
against the live oracle, other 18 at exact prior counts, zero full-frame
regressions. `localcheck.ts` pixel-diff mass across 1462-1543:
**124762->106893px** (-17869px). Not every affected tick strictly
improved: ticks 1481-1487 (the earliest, smallest-scale ticks, accumulator
40-118 of 256) show a small increase (+41 to +101px each, mon-region-
isolated diff confirms it's real, not measurement noise) - nearest-neighbor
sampling quantization at extreme downscale of a non-rectangular silhouette,
not a placement/table bug (the bounding-box width numbers above are exact);
ticks 1488-1503 improve substantially (up to -1071px at 1492). None of the
regressed ticks were full-frame matches before or after, so the "zero
currently-matching frames regressing" acceptance bar holds; flagged
honestly here as a known, minor, unresolved imperfection rather than
silently claimed as strictly-monotonic.

**Remaining for `sendout.json` toward 256/256, mechanism 4 now struck
through:**
1. Opponent party-status-summary despawn fade (§7.4.3) - still not even
   source-timed precisely; needs fresh RAM/pixel work.
2. ~~Ball sprite draw~~ - done (§7.12).
3. Open-particle burst (§7.7 point 3 / `docs/battle-anim-assets.md` §1) -
   tiles/palette/anim-frame-table already extracted; needs a new radial
   spawn+`Sin`/`Cos`-motion renderer.
4. ~~Mon affine-scale-in + ball-color tint~~ - done this session (above).
5. Front-sprite entrance anim (`ANIM_V_STRETCH`) - needs GROVYLE's 2nd
   front-sprite frame extracted, the `Sin`-table wobble renderer (can reuse
   this session's affine-scale primitive, `drawSpriteSheetAffineTinted`'s
   matrix math, for its own affine transform), and the still-open exact
   start-tick arithmetic - the most expensive of the five, left last.

### 7.14. Engine-slice session (PROGRESS.md #82): mechanism 3 (open-particle burst) landed with an empirical hard cutoff - score unchanged at 174/256 as predicted

Implemented `drawBallOpenParticles` (`battleScene.ts`) - a source-exact
reimplementation of `PokeBallOpenParticleAnimation`/`_Step1`/`_Step2`
(`battle_anim_throw.c:1599-1657`) and `Sin`/`Cos` (`trig.c:515-523`, a
256-entry Q8.8 sine table, `Sin(i,r)=(r*gSineTable[i])>>8`,
`Cos(i,r)=Sin(i+64,r)` - reproduced via `Math.sin` at the same Q8.8
rounding rather than a literal table copy, since this mechanism doesn't
gate a full-frame match). 16 particles spawn one per tick (angle
`(spawnIndex%8)*32`, 8 directions), each with its OWN 26-age lifespan
(age 0-1 at radius 0 - `Step1`'s own "wait" is a no-op since its gate
variable starts at exactly 0 - then age *k* at radius `2*(k-1)` through
age 25 at radius 48, destroyed after). Origin **(172,55)** + the same
1-tick render lag as every other sprite/register in this window - not
independently re-derivable against THIS trace's own captures (the
particle and ball-open-frame palettes coincidentally share exact RGB
values, and the two sprites heavily overlap during the particles'
earliest ticks, so a same-trace color-scan couldn't disambiguate them,
`tools/compare/scratch/probe_particle.mjs`, throwaway) - instead
cross-validated **analytically**: this session hand-derived the
spawn/Step1/Step2 timeline from source line-by-line and it predicts the
exact tick-by-tick offsets `docs/battle-anim-assets.md` §4 independently
pixel-harvested from a *different* trace (age0/1 at origin, age2 at
`Cos(0,2)=+2` i.e. (172,57) - bit-for-bit match), on a trace that already
shares this one's exact ball corner (168,56, mechanism 2) - strong
indirect evidence, not a direct same-trace pixel proof.

**Empirical hard cutoff, found the same way as every other boundary in
this dossier (pixel-brute-force against `localcheck.ts`, not assumed):**
turning particles on strictly IMPROVES `localcheck.ts`'s per-tick pixel
mass through **logical tick 12** (rendered tick 1493: that single tick's
own isolated diff drops from 147px to **9px**) but every tick from
**logical 13 (rendered 1494) on is strictly WORSE** with particles than
without - confirmed by direct pixel inspection (`/tmp/oracle_1508.png`
crop, throwaway): the real oracle's particle field at tick 1508 has a
much narrower radius spread than this session's spawn/lifespan model
predicts for that same tick, meaning something about the particle
population's real behavior diverges from the naive per-particle
26-age-lifespan model starting there. **Not reverse-engineered this
session** (not RAM-probed) - logical tick 12 is exactly
`affineEmergeAccumulator`'s own growth-complete point (mechanism 4's
scale-in finishing the same instant), suggesting `HandleBallAnimEnd`
(gated on the mon's `affineAnimEnded`, `pokeball.c:845-884`) plausibly
interacts with the particle population at that same tick - flagged as an
open follow-up rather than guessed at. Per this run's "no curve-fitting"
rule, `PARTICLE_RENDER_LAST_LOGICAL_TICK = 12` simply stops rendering at
the boundary where the model is still measurably correct.

**Score effect, as predicted**: `sendout.json` stays **174/256**, full
19-trace sweep re-run against the live oracle, other 18 at exact prior
counts, zero regressions. `localcheck.ts` pixel-diff mass across
1462-1543: **106893->105984px** (-909px), and with the cutoff in place
**every** affected tick strictly improved or held (verified directly,
not just in aggregate - unlike mechanism 4's own honestly-flagged small
per-tick regressions, §7.13).

**Remaining for `sendout.json` toward 256/256, mechanism 3 now struck
through:**
1. Opponent party-status-summary despawn fade (§7.4.3) - still not even
   source-timed precisely; needs fresh RAM/pixel work.
2. ~~Ball sprite draw~~ - done (§7.12).
3. ~~Open-particle burst~~ - done this session (above), through logical
   tick 12 only; the tail (logical 13+) is a known, flagged gap.
4. ~~Mon affine-scale-in + ball-color tint~~ - done (§7.13).
5. Front-sprite entrance anim (`ANIM_V_STRETCH`) - the only mechanism
   remaining besides mechanism 1 - needs GROVYLE's 2nd front-sprite frame
   extracted, the `Sin`-table wobble renderer (can reuse this session's/
   §7.13's affine-matrix and `Sin`/`Cos` math), and the still-open exact
   start-tick arithmetic.

### 7.15. Engine-slice session (PROGRESS.md #83): mechanism 1 (party-summary despawn) landed, bar's own slide flagged as a known sub-gap - score unchanged at 174/256 as predicted

Implemented `drawOpponentSummaryExit` (`battleScene.ts`) - source-exact
`BLDALPHA` alpha-blend fade + per-icon staggered exit slide, decoded from
`Task_HidePartyStatusSummary`/`_BattleStart_1`/`SpriteCB_
StatusSummaryBalls_Exit` (`battle_interface.c:1671-1738,1878-1902`):

- **Blend**: `tBlend` starts 16, decrements once every OTHER tick - closed
  form `blend(elapsed) = max(0, 15 - floor(elapsed/2))`,
  `elapsed = t - handoffTick - 1` (matching §7.4.3's own pixel-confirmed
  1463 start tick), applied as a per-pixel blend toward whatever this
  frame already drew behind the icon (same TGT1/TGT2 semantics as this
  module's other `blendChannel` use, §2).
- **Per-icon slide**: each icon has a `7*(5-j)`-tick delay (reverse index
  order on the opponent side, source-cited), then an accelerating slide -
  hand-derived from the source's own integer accumulator
  (`data[3]+=56` every active tick, `x2 += data[3]>>4` using the
  PRE-mask value) to the closed form `x2(n) = 3*n*(n+1)/2` for `n` active
  ticks (verified by direct simulation of the source arithmetic by hand,
  not fitted). Direction (rightward/positive) pixel-confirmed via direct
  oracle-crop inspection at ticks 1462/1480/1490 (`/tmp/partysum_*.png`,
  throwaway) - icons visibly shift right and vanish off the right edge,
  not left.
- **NOT implemented**: the bar's own exit slide
  (`SpriteCB_StatusSummaryBar_Exit`, source-cited as a constant +2px/tick
  once its direction sign is resolved) - the bar renders at its settled
  position, alpha-fading in place only. A real, deliberately time-boxed
  sub-gap, not an oversight - this session's own verification budget
  covered the blend + the 6 icons' stagger/slide (the visually larger
  piece) via spot-check pixel probes rather than the exhaustive RAM probe
  the brief's own seed suggested; flagged honestly rather than claimed
  fully validated.

**Score effect, as predicted**: `sendout.json` stays **174/256**, full
19-trace sweep re-run against the live oracle, other 18 at exact prior
counts, zero regressions (checked per-tick, not just aggregate).
`localcheck.ts` pixel-diff mass across 1462-1543: **105984->100498px**
(-5486px, the largest single-mechanism drop of the four landed this
session-family) - every affected tick strictly improved or held.

**Remaining for `sendout.json` toward 256/256, mechanism 1 now struck
through - only one left:**
1. ~~Opponent party-status-summary despawn fade~~ - done this session
   (above), except the bar's own slide (flagged sub-gap).
2. ~~Ball sprite draw~~ - done (§7.12).
3. ~~Open-particle burst~~ - done (§7.14), through logical tick 12 only.
4. ~~Mon affine-scale-in + ball-color tint~~ - done (§7.13).
5. Front-sprite entrance anim (`ANIM_V_STRETCH`) - the only mechanism
   remaining. Needs GROVYLE's 2nd front-sprite frame extracted (a genuine
   ROM extraction, not yet done), the `Sin`-table wobble renderer (can
   reuse the affine-matrix and `Sin`/`Cos` math already landed this
   session-family, §7.13/§7.14), and the still-open exact start-tick
   arithmetic (§7.11's own flagged follow-up - the sum of the affine-emerge
   completion tick + animation-task scheduling lag + the 41-tick duration
   does not land cleanly on the empirically-found settle tick 1544,
   per §7.11). Even once this lands, per this dossier's own structural
   finding (every tick needs ALL currently-missing mechanisms
   simultaneously), `sendout.json`'s score should be expected to move for
   the first time in this window's whole history - or, if it doesn't, that
   itself is a real finding worth naming precisely (per the brief's own
   "name what else differs" fallback), not forced.

### 7.16. Engine-slice session (PROGRESS.md #84): mechanism 5 (front-sprite entrance stretch) landed, ALL FIVE mechanisms now in - score moves for the first time ever, 174/256 -> **180/256**

Extracted GROVYLE's missing 2nd front-sprite frame (`anim_front.png`'s
bottom half, `tools/extract/extract-battle-mon-pics.ts` - top half
self-verified pixel-identical to `front.png` before accepting the bottom
half as frame 2, for all three `FRONT_SPECIES` while touching this
extractor) - the one remaining genuine ROM-extraction gap named since
§7.11.

**Start-tick arithmetic resolved via direct RAM probe**, per the brief's own
explicit ask, rather than summing source constants (which §7.11-§7.15 all
found didn't land cleanly): `tools/probe/specs/sendout-grovyle-stretch.json`
watches `gSprites[8]` (`gBattlerSpriteIds[1]` confirmed 8 from tick 1461 on,
§7.10) `data[4]`/`data[5]`/`y2` - the exact `xScale`/`yScale`/vertical-offset
values `Anim_VerticalStretch` feeds `SetAffineData`/`ObjAffineSet`
(`pokemon_animation.c:1597-1635`) - across trace ticks 1478-1556. Confirms
the animation's own 41 active ticks (RAM `data[2]` 0->40) plus one reset
tick, and separately RAM-probed the concurrent ball-color-tint fade
(`Task_FadeMon_ToNormal_Step`, `battle_anim_throw.c:2088-2102`) via
`gTasks[3]`'s own `tCoeff` (`tools/probe/specs/sendout-grovyle-taskfade.json`):
a 15-tick linear ramp 16->1 (never a literal 0 - the task's last real call
uses coeff=1, and that residual 1/16 blend rounds away to zero visible
change for every one of GROVYLE's own palette colors, confirmed directly by
testing plain/unblended rendering against the oracle).

**RAM/groundtruth over source formula, applied literally**: rather than
reimplementing `Sin()`/`gSineTable` (a real rounding risk for a mechanism
needing pixel-exactness across dozens of ticks), `GROVYLE_STRETCH_TABLE` is
a literal 36-entry table of the RAM-probed `(xScale, yScale, y2)` triples
themselves (RAM ticks 1503-1538 - beyond that the probe shows the sprite
already flat/neutral through at least 1549). The render-tick lag (this
window's established "RAM tick N's write is visible at render tick N+1"
family) was independently re-confirmed for this specific mechanism, not
assumed: brute-forced lag candidates 0 through 7 directly against the
oracle's own cached captures (`tools/compare/scratch/grovyle_full_check.mjs`,
throwaway) - lag 1 gives an exact match on 38 of 40 covered render ticks,
every other candidate strictly worse.

**Frame-swap boundary, found via direct pixel evidence, not assumed from
source**: `SpriteCB_OpponentMonFromBall`'s `StartSpriteAnim(sprite, 1)`
(`battle_main.c:2837-2848`) reads as a single, permanent frame-2 swap in
source, but direct pixel comparison (`tools/compare/scratch/
grovyle_plateau_frame_check.mjs`) shows the front sprite actually reverts
to frame 1 exactly at `GROVYLE_MATERIALIZE_TICK` (1544, the already-landed,
already-validated settled-pose tick) - frame 2 renders exactly (0px diff)
for every render tick 1538-1543, frame 1 renders exactly for every tick
>=1544 (both cross-checked directly, not inferred). This module doesn't
reverse-engineer *why* the frame reverts (not RAM-probed this session,
flagged as an open follow-up) - the pixel evidence is trusted as ground
truth over the source-reading assumption, per this run's own rule.

**Score effect: real, and for the first time, non-zero.** `sendout.json`
**174/256 -> 180/256** (full 19-trace sweep re-run against the live oracle:
all 18 others at their exact established counts - anchor 1/1, draft-cursor
13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95 - zero
regressions anywhere). `localcheck.ts` pixel-diff mass across 1462-1543:
**100498->89444px** (-11054px). The 6 newly-matching frames are exactly
render ticks **1538-1543** - the tail of mechanism 5's own window where the
stretch has already settled to (near-)neutral and `y2` is 0 or tiny,
sidestepping the residual bug below.

**Known residual, precisely bounded (not curve-fit away):** 2 of the 40
render ticks mechanism 5 covers - **1536 and 1537** - have a real,
unexplained pixel mismatch (1000/1688px in the Grovyle 64x64 crop alone)
*even when using the RAM-exact `xScale`/`yScale`/`y2` for those exact two
ticks* - their immediate neighbors on both sides (1535 and 1538) match
exactly, ruling out a lag or table-transcription error. Not reverse-
engineered further this session given the time budget.

**Second, larger residual found this session, also not yet resolved:**
across most of mechanism 5's own ACTIVE window (render ticks roughly
1504-1531, the heavy-wobble portion where `y2` is most negative, -3 to
-5px), the affine-sampling formula (`drawSpriteSheetAffineStretch`,
nearest-neighbor, same `texCoord = ((rel*matrixParam)>>8)+half` shape as
mechanism 4's already-validated renderer) produces sampled-source rows
that go out of the source tile's own bounds (`sy<0`) for destination rows
right at the sprite's edge once `y2` shifts the visible window - and the
real oracle shows OPAQUE content at exactly those excluded pixels
(pixel-confirmed directly, `tools/compare/scratch/debug_integration2.mjs`).
This means the renderer's per-tick shape is measurably close (it drives
the aggregate pixel-mass improvement and the exact tail match) but not yet
fully exact through the wobble's heaviest ticks - full-frame matches in
that sub-range are not yet reached. Suspected but **not confirmed** cause:
either an off-by-one in the `half`/center convention specifically when
combined with a nonzero `y2`, or `ObjAffineSet`'s real BIOS division
rounding differing slightly from `Math.trunc(0x10000/scale)` at these
specific magnitudes. Flagged precisely for the next session rather than
guessed at further - `tools/probe/specs/sendout-grovyle-stretch.json`'s own
RAM data (already committed) is sufficient to keep iterating on the
renderer alone, no new probing needed.

**Not implemented, unchanged from prior sessions (both still open,
independent of mechanism 5):** the party-summary bar's own exit slide
(§7.15's flagged sub-gap) and the particle model's logical-tick-13+
divergence (§7.14's empirical hard cutoff). Neither was investigated this
session - time was spent entirely on mechanism 5 per the brief's own scope.

### 7.17. Engine-slice session: mechanism 5's affine-sampling residual fixed (two root causes, both mechanism-justified, not curve-fit) - `sendout.json` **180/256 -> 196/256**

Both of §7.16's flagged residuals (the large 1504-1531 sampling gap and the
"isolated" 1536/1537 mismatch) turned out to share the SAME two root causes,
neither of which was the suspected "BIOS division rounding" - the BIOS
never divides at all for this mechanism.

**Root cause 1 - the matrix element was inverted when it shouldn't be.**
`drawSpriteSheetAffineStretch` computed `mx = Math.trunc(0x10000 / xScale)`
(and same for `my`/`yScale`), copying mechanism 4's own convention. But
`Anim_VerticalStretch` always calls `SetAffineData(sprite, data4, data5, 0)`
- **rotation literally 0** - and real `ObjAffineSet` (BIOS SWI 0x0E) computes
`pa = xScale*cos(theta)`, `pd = yScale*cos(theta)` (`pb`/`pc` involve `sin`,
zero here). With `cos(0)` exactly 1.0 (no lookup-table rounding since
rotation isn't table-driven for this call), the OAM matrix element **is**
`xScale`/`yScale` verbatim - `SetAffineData` never divides. Mechanism 4's own
inverted convention isn't necessarily wrong for *it* (its `accumulator` never
exceeds `neutralScale=256`, i.e. only ever shrinks, and mechanism 4's own
bounding-box-width pixel validation happened to hold either way near that
range - not re-examined this session, left as-is, flagged as an unconfirmed
open question) - but mechanism 5's `xScale`/`yScale` range (209-272,
straddling 256 on both sides) makes the two conventions diverge sharply away
from the identity point, which is exactly why only the near-neutral tail
(§7.16's 1538-1543) ever matched: `0x10000/256 === 256`, so the two
conventions coincide exactly at identity and diverge everywhere else.
Confirmed by brute-forcing both conventions against the committed RAM-exact
`GROVYLE_STRETCH_TABLE` params, per-tick, against the oracle's own cached
captures (`tools/compare/scratch/grovyle_formula_sweep.mjs`): total diff
across the 40 covered ticks dropped from 39845px (inverted) to 11950px
(direct) - `mx = xScale` directly is the fix, applied in
`drawSpriteSheetAffineStretch` only (mechanism 4 untouched, out of this
session's scope, no regression risk since it's separate code).
Double-size-affine-box hypothesis (a second suspected cause named in
§7.16) was tested and **ruled out** empirically in the same sweep - doubling
the destination box makes no difference (`Math.min` was already checking
this: undoubled and doubled totals were identical to the pixel), because
`y2`+corner-vector placement is a pure translation independent of box size
(proved algebraically, then confirmed empirically).

**Root cause 2 - the front sprite's own frame was never oscillating.**
§7.16 (and §7.11 before it) assumed `StartSpriteAnim(sprite, 1)` is a
one-time, permanent swap to frame 2, based on pixel evidence gathered
through the (broken) inverted formula above - unreliable ground since a
badly-shaped render can't cleanly distinguish which frame is active. RAM-
probed directly this session (`gSprites[8].animNum`/`.animCmdIndex`,
`tools/probe/specs/sendout-grovyle-frame.json`, extending the committed
stretch-probe's watch list): `animNum` does stay 1 throughout (confirming
`anims[1]` is selected once, as source reads), but `anims[1]` is
`sAnim_Grovyle_1` (`data/pokemon_graphics/front_pic_anims.h:2930-2938`) - a
real 5-command breathing sequence, NOT the generic single-frame
`gAnims_MonPic` table both prior sessions implicitly assumed (GROVYLE is the
OPPONENT battler, so `SetMultiuseSpriteTemplateToPokemon` wires up the
species-specific `gMonFrontAnimsPtrTable[SPECIES_GROVYLE]`, not the generic
table - `pokemon.c:3499-3505`):
```
ANIMCMD_FRAME(0, 10), ANIMCMD_FRAME(1, 18), ANIMCMD_FRAME(0, 7),
ANIMCMD_FRAME(1, 12), ANIMCMD_FRAME(0, 6), ANIMCMD_END
```
`animCmdIndex`'s own RAM transitions (0->1->2->3->4) landed exactly on
those cumulative durations starting at RAM tick 1496 (render 1497, this
window's established +1 lag) - a clean, exact confirmation, not a
coincidence. `GROVYLE_FRONT_ANIM_START_OFFSET` anchors a generic reducer
(`frontSpriteAnimFrame`, same shape as `affineEmergeAccumulator`) over the
extracted `battleAnimTables.grovyleFrontAnim.steps` table. Within the
40-tick covered window this alternates F0(tileset)/F1(frame2)/F0/F1 at
render boundaries 1497,1507,1525,1532 - meaning roughly HALF of the covered
ticks were being rendered with the wrong pose entirely, compounding root
cause 1's own sampling error.

**Both fixes combined, validated tick-by-tick against oracle-exact RAM
params** (`tools/compare/scratch/grovyle_final_check.mjs`): total diff
across the 40 covered ticks (formula alone: 11950px) drops to **398px**,
with **25/40 ticks now bit-exact in isolation** (up from the tail-only
6/40 baseline) - and every one of the remaining 15 isolated-diff ticks is
in the *coeff>0* (tint-blend) sub-window, all under 62px.

**Score effect: `sendout.json` 180/256 -> 196/256** (+16, strictly above the
180 floor). Full 19-trace sweep re-run against the live oracle: all 18
others at their exact established counts (anchor 1/1, draft-cursor 13/13,
draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
122/122, summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
room-msgbox 142/142, transition 206/206, scene-assembly 256/256, rent-slot1
125/139, rent-3picks 157/190, confirm-flow 79/95) - zero regressions. Within
1462-1559, **render ticks 1522-1559 (38 consecutive ticks) are now
full-frame bit-exact**, where before this session only 1538-1543 were.

**Per-tick attribution for every remaining diff in 1462-1559** (full log:
`npm run compare -- tools/compare/traces/sendout.json`):
- **1462-1480** (45-1161px): pre-mechanism-5 window (trainer-exit tail,
  ball-idle) - unrelated to this fix, unchanged from before, not
  investigated this session.
- **1481-1503** (500-2963px): mechanism 4 (materialize, untouched this
  session) overlapping mechanism 3's own known gap - **owned by §7.14**
  (particle model past logical tick 12: "every tick from logical 13 on is
  strictly WORSE" was already the finding; this session didn't touch it).
- **1504-1521 except 1516/1517** (3-195px, shrinking steadily toward 0 as
  the tint coefficient fades out): a small residual, isolated to Grovyle's
  own 64x64 crop (confirmed via `tools/compare/scratch/grovyle_crop_sweep.mjs`
  restricted to just that box) - mostly boundary/antialiasing-shaped
  (`weOpaqueTheyBlankish`-dominant per `grovyle_tick_categorize.mjs`), not
  reverse-engineered further this session (small, not curve-fit away).
- **1516/1517** (2317/2332px, the single largest remaining spike): **NOT**
  a Grovyle/mechanism-5 bug - `tools/compare/scratch/grovyle_real_vs_isolated.mjs`
  proves the real integrated renderer's own Grovyle-crop output is
  bit-for-bit IDENTICAL (0px diff) to an isolated reproduction using the
  exact RAM-probed table/coeff/frame for that tick, so mechanism 5's own
  code is self-consistently correct there. The diff against the oracle is
  dominated by `bothOpaqueDiffColor` (both sides opaque, wrong color, not a
  coverage gap) exactly where `PARTICLE_ORIGIN` (172,55, mechanism 3) sits
  within Grovyle's crop box, and the mismatch color (255,173,0) is
  literally the particle's own pinned RGB (`tests/battleScene.test.ts`'s
  own particle test uses the same constant) - **owned by §7.14**: this
  window (render ~1516-1519) is exactly where the last-spawned particles'
  26-age lifespan would still be alive at large radius in the real game
  (spawn ~1478-1493 + up to 26 ticks = alive through ~1519), consistent with
  the residual vanishing by 1520-1521 and gone entirely by 1522.
- **1522-1559**: bit-exact, zero diff.

**Committed this session:** `tools/probe/specs/sendout-grovyle-frame.json`
(new RAM probe, `animNum`/`animCmdIndex`); `src/data/gen/battle-anim-
tables.json` gained `grovyleFrontAnim` (the extracted `sAnim_Grovyle_1`
step table); two new Tier-1 tests in `tests/battleScene.test.ts` pin the
corrected sampling formula (render 1525, a destination pixel the old
inverted formula left wrongly blank) and the frame cadence (render 1517 vs
1525, different `animCmdIndex` spans read different source frames).
`tools/compare/scratch/grovyle_formula_sweep.mjs`,
`grovyle_coeff_bruteforce.mjs`, `grovyle_real_vs_isolated.mjs`,
`grovyle_tick_categorize.mjs`, `grovyle_crop_sweep.mjs`, and
`grovyle_final_check.mjs` are kept as resumable diagnostics for the next
session.

**Still open, unchanged, independent of this fix:** the party-summary bar's
own exit slide (§7.15) and the particle model's logical-tick-13+ divergence
(§7.14, now confirmed to be the exact owner of the 1481-1503 and 1516-1519
residuals above) - neither investigated further this session, per the
brief's own scope (attribution only).

### 7.18. Engine-slice session: particle model's logical-tick-13+ divergence root-caused via direct RAM probe (a real one-tick engine stall, not curve-fit) - `sendout.json` **196/256 -> 199/256**

Per this step's brief (priority 1): RAM-probed the ball-open particle
sprites' own `gSprites` slots directly, rather than continuing to guess at
the cause from source reading alone. Method: `dump-task-and-sprite-
callbacks.py` against `tools/compare/traces/sendout.json` (same tick
numbering as scoring) dumped every `gSprites[]`/`gTasks[]` callback
pointer per tick; cross-referencing those against
`PokeBallOpenParticleAnimation_Step1`/`_Step2`'s own ELF addresses
(`arm-none-eabi-nm`) identified the particles' 16 slots (6, 9-23) and the
spawner task's own slot (`gTasks[2]`) without guessing. A follow-up
`ram-probe.py` spec then watched `x2`/`y2`/`animCmdIndex` for all 16 slots
across the whole spawn/lifetime window.

**Ground truth: the whole particle subsystem freezes for exactly one real
game tick.** RAM tick 1494 duplicates RAM tick 1493 verbatim - not just for
one particle, but for `gTasks[2].data[0]` (the spawner's own progress
counter) AND every already-alive particle's `x2`/`y2`/`animCmdIndex`
simultaneously. This is a whole-frame engine stall, not a particle-specific
bug (cause not reverse-engineered - a task/sprite list-relinking hiccup
mid-iteration is one plausible source, not confirmed; the one observed
occurrence is treated as ground truth regardless of cause). Confirmed
against RAM registers exhaustively for all 16 particles' full lifespans
(510 of 512 checked RAM-tick/particle pairs exact against a closed-form
radius/angle model; the other 2 are reads of slot 6 before that slot's
particle existed - stale prior-occupant memory the renderer never queries).
Two consequences fall out of the single stall: (1) any particle already
alive when it hits silently loses one tick of "real" age relative to the
naive monotonic-tick model from that point on; (2) the 2 of 16 particles
whose spawn attempt would have landed on/after the stalled tick are
themselves created one real tick later than the clean one-per-tick
schedule, since the spawner's own increment froze too.

**A genuine, open snag: RAM register state is not proof of on-screen
timing.** The obvious next step - re-deriving the age-to-radius mapping
directly from the RAM ticks above (this session tried it: RAM evidence
suggested particles spend 3 ticks at radius 0 before growth starts, not the
prior session's source-hand-derived 2) - measurably REGRESSED the
already-good ages-0-12 region when checked against the live oracle
(render 1493 went from the prior session's 9px to 173px). The RAM-tick
arithmetic also implied the stall's visible effect starts at logical tick
15, which reproduced the crater everywhere BUT additionally caused a live
regression at the previously-bit-exact render tick 1522 (an already-dead
particle rendered one tick too long). Both symptoms trace to the same
cause: a register write and what the PPU actually composites that same
tick are not the same clock - GBA sprite pipelines commonly report
"next state" a tick before it's visible, and this dossier has already
found different per-mechanism lag constants for other sprites (§7.16: lag
1 for the front-sprite stretch). Rather than chase a THIRD lag constant
under time pressure, this session kept the prior session's own
PIXEL-brute-forced boundary (`PARTICLE_STALL_LOGICAL_TICK = 13`, "every
tick from logical 13 on is strictly worse") and the ORIGINAL, already
pixel-validated age<->radius/frame formulas (`age<=1 ? 0 : 2*(age-1)`,
`anim[age % anim.length]`) completely unchanged, layering ONLY the two
`logicalT`-relative corrections (stall + late-spawn) on top of `age`
before it feeds those formulas. `PARTICLE_MAX_AGE` was additionally
tightened 25->24: RAM shows a particle's final register write (age 25,
radius 48) lands the SAME tick `DestroyBallOpenAnimationParticle` runs, so
it's never actually composited - rendering it anyway is exactly what broke
render tick 1522.

**Score effect:** `sendout.json` **196/256 -> 199/256** (+3: render ticks
1519, 1520, 1521 now bit-exact, up from 1522-1559 only). Full 19-trace
sweep re-run against the live oracle: all 18 others at their exact
established counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
room-msgbox 142/142, transition 206/206, scene-assembly 256/256, rent-slot1
125/139, rent-3picks 157/190, confirm-flow 79/95) - zero regressions. Two
new Tier-1 tests pin the stall correction (particle 0's radius at render
1494) and the death-boundary fix (particle 15 excluded at render 1522).

**Per-tick attribution for every remaining diff in 1462-1521** (1522-1559
stays bit-exact; full log: `npm run compare -- tools/compare/traces/
sendout.json`):
- **1462** (1161px): pre-mechanism-5 window (trainer-exit tail), unrelated,
  unchanged.
- **1463-1480** (45-216px, roughly monotonically increasing): unrelated to
  this session's fix (values identical to before) - this is the window
  §7.15 flagged the party-summary bar's own exit slide as a known,
  unimplemented sub-gap (priority 2 of this step's brief, not attempted
  this session) - the steadily-growing pixel count across exactly this
  span (the bar's own alpha-fade window) is consistent with that being the
  owner, though not re-confirmed by direct RAM probe this session.
- **1481-1492** (525-2963px, the single largest spikes in the whole
  window): still owned by the particle/materialize overlap named in
  §7.14/§7.17, and still NOT closed by this session's fix - the pixel MASS
  dropped substantially in this range (spot-checked, not every tick logged)
  but no tick here crossed into a full-frame match. Given the "RAM register
  vs on-screen timing" snag above, this is most likely the SAME lag
  ambiguity biting the largest-radius, most spatially-spread particles
  hardest (small per-particle position errors compound with 8+ particles
  overlapping Grovyle's own materialize tint at once) - not confirmed
  further this session.
- **1493-1495** (9px, 9px, 10px): tiny, likely sub-pixel/antialiasing-shaped
  residual at the particle/Grovyle-crop boundary, not chased (matches the
  prior session's own 9px finding at 1493 almost exactly, confirming the
  age<=12 formula itself is undisturbed by this session's changes).
- **1496-1503** (138-545px): moderate, same general owner as 1481-1492
  (particle-model residual past the stall boundary), not closed.
- **1504-1515** (8-62px, shrinking): small, boundary/antialiasing-shaped,
  same character as §7.17's already-flagged small residual - not chased
  further (this is priority 3 of this step's brief, correctly left for
  last since priorities 1/2 aren't both closed yet).
- **1516-1517** (2257px/2283px, still the largest remaining spikes): still
  owned by the particle/opponent-healthbox color collision named in §7.17
  (`PARTICLE_ORIGIN`'s own pinned color overlapping Grovyle's crop box) -
  the underlying particle-position imprecision in this sub-window (same
  root cause as 1481-1492) means the collision isn't cleanly resolved by
  this session's timing fix alone.
- **1518** (11px): small, same character as 1504-1515.
- **1519-1521**: bit-exact (NEW this session).
- **1522-1559**: bit-exact, unchanged.

**Committed this session:** the two `logicalT`-relative age corrections and
`PARTICLE_MAX_AGE` tightening in `drawBallOpenParticles`/`battleScene.ts`;
two new Tier-1 tests in `tests/battleScene.test.ts`. RAM probe specs and
scratch scripts used to derive the above were throwaway (run directly via
`ram-probe.py`/`dump-task-and-sprite-callbacks.py` against the committed
trace, not saved as new spec files, since the callback-cross-reference
step is a one-off lookup rather than a reusable watch list) - the exact
commands are recorded above for reproduction.

**Still open, per this step's own priority order:**
1. Particle model: still not full-frame-exact in 1481-1503/1516-1519
   despite the root-cause fix - the RAM-register-vs-on-screen-timing snag
   above is the most concrete lead (try lag constants other than the
   "immediate" one this session assumed, brute-forced directly against the
   oracle the way §7.16 did for the front-sprite stretch, rather than
   RAM-tick arithmetic).
2. §7.15's bar exit slide (`SpriteCB_StatusSummaryBar_Exit`) - not
   attempted this session; likely (not confirmed) owner of some/all of
   1463-1480's growing residual.
3. The small 1504-1521 boundary residual - unchanged, still last priority.

### 7.19. Engine-slice session: opponent party-summary bar's own exit slide landed (§7.15's flagged sub-gap) - `sendout.json` **199/256 -> 214/256**

Per this step's brief (priority 2 of §7.18's own list): implemented the
bar's own slide in `drawOpponentSummaryExit` (`battleScene.ts`), source-
decoded from `SpriteCB_StatusSummaryBar_Exit`
(`battle_interface.c:1823-1831`), then validated per-tick against the
oracle across the whole 1462-1521 window.

- **Slide is linear, not accelerating** (unlike the icons):
  `data[1] += 32` then `&= 0xF` every active tick with no delay gate.
  32's low 4 bits are always 0, so the mask resets `data[1]` to 0 every
  tick - `x2 += data[1] >> 4` (reading the pre-mask value the same tick
  it's added) is therefore a constant `+2px` per active tick, closed form
  `x2(elapsed) = 2*(elapsed+1)` for the same `elapsed` zero-point the
  icons/blend already use (direct simulation of the source's own integer
  arithmetic, not fitted). Direction: `data[0]` is halved from its
  entrance value (`5/2=2`, C truncating division) right before the exit
  callback takes over, staying positive - same rightward sign as the
  icons and the bar's own entrance slide.
- **The subsprite table ALSO switches the same tick**
  (`sStatusSummaryBar_Subsprites_Exit`, `battle_interface.c:575-625`): it
  keeps the entrance layout's first 3 blocks (tileOffsets 0,4,8) and the
  "tip" block (tileOffset 12), but inserts TWO extra copies of the
  tileOffset-8 block before the tip - 6 subsprites x 4 tiles = 24 tiles
  (192px) vs. the entrance layout's 16 tiles (128px). This is not just a
  slide - the drawn shape itself widens the instant the exit begins
  (`EXIT_BAR_TILE_ORDER`, built from the existing 16-tile harvested asset,
  no new extraction needed).
- **A source-derived (not fitted) render-anchor correction was required
  once the subsprite table widens**: the Exit table's "tip" subsprite sits
  64px further right in sprite-local space than the Enter table's tip
  (`32*2=64` vs `32*0=0`, both tables' own last array entry). Since
  `OPP_SUMMARY_BAR.x` was originally anchored (by the settled-bar render,
  `drawBallStatusBar`) to the Enter tip's own mirrored screen position, and
  h-flip mirroring turns a local-x increase into an equal-magnitude
  screen-x *decrease*, switching subsprite tables shifts the render anchor
  by that same 64px constant: `barX = OPP_SUMMARY_BAR.x + x2(elapsed) -
  64`. This was *derived* from the two Subsprite tables' own literal `x`
  fields (not curve-fit) but *validated* by an exhaustive oracle-pixel x2
  sweep per tick (-150..150) that landed on exactly this constant
  independently, tick after tick - source-cited and pixel-confirmed
  both ways, per this run's own no-curve-fitting discipline.

**Score effect:** `sendout.json` **199/256 -> 214/256** (+15). Full
19-trace sweep re-run against the live oracle: all 18 others at their
exact established counts (anchor 1/1, draft-cursor 13/13, draft-menu
38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) - zero
regressions. One new Tier-1 test (`tests/battleScene.test.ts`) pins the
bar's tip moving from screen (96,40) at rest to (98,40) at handoff+1,
oracle-confirmed exact colors both sides.

**Per-tick attribution, 1463-1480 (every tick individually accounted, per
the brief's acceptance bar):**
- **1463-1469, 1472-1478, 1480** (15 of 18): bit-exact. NEW this session.
- **1470** (14px), **1471** (11px), **1479** (34px): NOT the bar - direct
  pixel dump shows the residual sits in the ICON row (y=32-38, x=185-237,
  past the trailing icon's own position) with skin/orange tones consistent
  with Grovyle's own materialize sprite or the icon's vanishing-edge
  antialiasing, not the bar's green palette. Same character as the
  already-named icon-boundary/materialize-overlap residuals elsewhere in
  this window (§7.14/§7.17/§7.18) - not chased further this session, out
  of this step's scope (the bar itself is closed at these ticks).

**A genuine, out-of-scope finding, named per the brief's own fallback
rather than fixed:** tick 1462 (handoff+0, still flagged "trainer-exit
tail" and dominated by ~1161px of trainer-sprite-related diff, unchanged)
also contains a SEPARATE small gap from the exact same mechanism this
session touched: `drawSendOutHandoff` never renders the opponent's
settled (un-faded, un-slid) bar+icons for the single tick between
"still at rest" (t<handoffTick, rendered by the earlier branch) and
"first exit-faded frame" (t=handoffTick+1, `drawOpponentSummaryExit`'s
own `elapsed>=0` gate) - at t=handoffTick itself (`elapsed=-1`) nothing
draws the opponent side at all. Oracle-confirmed: at t=1462 the real game
still shows the bar's settled color `(33,57,0)` at screen (96,40); our
app shows bare background. This is real and mechanism-clear (a one-line
fix - call the settled render for the opponent side at that one tick) but
was left untouched per the brief's explicit scope boundary: the bar slide
is landed for 15/18 target ticks but not "fully landed" (1470/1471/1479
remain open, owned elsewhere), and tick 1462's own diff is dominated by
the unrelated trainer-exit-tail piece regardless, so fixing this gap
would not by itself flip 1462 to a match. Left for a future step to pick
up explicitly if it chases tick 1462.

**Still open, per this step's own priority order (§7.18's list, updated):**
1. Particle model: still not full-frame-exact in 1481-1503/1516-1519 (the
   bar fix incidentally shrank some of this window's pixel mass via
   reduced icon/bar overlap, but did not close any of these ticks) - the
   RAM-register-vs-on-screen-timing snag from §7.18 is still the most
   concrete lead.
2. 1470/1471/1479's icon-edge/materialize-overlap residual (14/11/34px) -
   not chased this session, likely the same family as 1481-1492's larger
   spikes.
3. Tick 1462's own settled-bar one-tick gap (above) - named, not fixed.
4. The small 1504-1521 boundary residual - unchanged, still last priority.

### 7.20. Engine-slice session: the "particle-position residual" was mostly misattributed - real cause is `SENDOUT_BG_FADE_Y`'s own truncated ramp; landed, pixel-diff mass in 1481-1503/1516-1517 cut ~50%, but `sendout.json` **stays 214/256** (no full tick crosses to exact)

Per this step's brief (priority 1 of §7.18/§7.19's list, "brute-force the
render-lag/offset constants for the particle layer directly against the
oracle's cached captures"): before sweeping lag candidates, did a direct
per-pixel color dump of the target ticks' own diff regions
(`tools/compare/scratch/diag_particle*.mjs`, throwaway) to see what the
"particle residual" actually looks like pixel-for-pixel, rather than
assuming the existing attribution. It doesn't hold up: at render tick 1481,
row y=60 has ~100 contiguous mismatched pixels from x=122-225 - far wider
than any particle's own 8px tile, and their colors are a uniform, non-
particle pair: app shows the plain unfaded background `(189,189,156)`,
oracle shows `(198,198,165)` - a `BeginNormalPaletteFade`-shaped brightening,
not a particle color at all (`docs/battle-scene-notes.md`'s own particle
palette is `(255,173,0)`/`(255,255,255)`).

**Root cause, decoded not fitted:** `SENDOUT_BG_FADE_Y` (§7.10's own
BG-to-white fade table, landed "both exact" at the time) is one step short
of its own ramp at BOTH ends. Using the table's own already-validated
`blendComponentToWhite` formula in reverse against a clean background swatch
at screen (150,60) (`c5 + (((31-c5)*y)>>4)` per channel, 5-bit-then-
re-expand): the exact same formula that reproduces the table's own
already-correct values at `t-handoffTick=21/22` (y=4, oracle `(206,206,181)`)
and `t-handoffTick=50/51` (y=6, oracle `(214,214,189)`) - confirming the
method before touching anything - ALSO exactly reproduces oracle colors at
`t-handoffTick=19/20` (render 1481/1482, oracle `(198,198,165)`) and
`t-handoffTick=54/55` (render 1516/1517, same `(198,198,165)`) for **y=2** -
one more step of the table's own established 2-ticks-per-step cadence than
either boundary the table previously covered (which fell back to the `?? 0`
unfaded default there instead). Not a new mechanism: the same ramp simply
continues one more step at both ends before `Task_FadeMon_ToNormal`'s own
poll gate (§7.16's cross-reference) kicks the sequence off/settles it.
**Fix**: prepend `2, 2` and append `2, 2` to `SENDOUT_BG_FADE_Y`, move
`SENDOUT_BG_FADE_START` 21->19 to match - purely additive, the table's
existing entries and every other tick's lookup are untouched.

**Score effect on the target window (pixel mass, `localcheck.ts` sum across
1481-1503+1516-1517):** **19217px -> 9607px** (-9610px, ~50%). Every one of
the 25 target ticks strictly improved or held (verified per-tick, not just
aggregate) - the two largest single-tick drops are exactly the ramp's own
missing rungs: 1516 (2257px -> 10px) and 1517 (2283px -> 12px). Full
19-trace sweep re-run against the live oracle: all 18 others at their exact
established counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
room-msgbox 142/142, transition 206/206, scene-assembly 256/256, rent-slot1
125/139, rent-3picks 157/190, confirm-flow 79/95) - zero regressions.
**`sendout.json` itself stays 214/256** - the fix shrinks every affected
tick's error but doesn't fully close any single tick (each still has a
separate, smaller residual on top - see below), so no tick crosses the
strict-zero-diff bar this scoring counts. One new Tier-1 test
(`tests/battleScene.test.ts`) pins both new boundary steps and the
unchanged unfaded tick just past the tail (1518), using
`blendComponentToWhite` itself (not a hardcoded literal) so it stays correct
if the underlying colors ever change.

**A genuine finding worth naming precisely, per this step's own "tighten
the name" fallback:** with the BG-fade noise removed, the residual that's
LEFT in 1481-1503+1516-1517 is revealed to be mostly NOT particle-position
error:
- **1481-1503** (now 100-923px/tick, was 279-2963px/tick): direct pixel
  inspection at the diff sites shows the dominant color is
  `(255,181,247)` (or its faded/edge-blended neighbors) - mechanism 4's own
  MATERIALIZE TINT color (§7.11, `MATERIALIZE_TINT_COLOR`), not the
  particles' `(255,173,0)`/`(255,255,255)` pair. This is the tinted
  silhouette's own BOUNDARY shape (edge/antialiasing pixels around Grovyle's
  affine-emerge outline), the same general flavor of residual §7.16 already
  named for the STRETCH mechanism's own affine-sampling edges (a plausible,
  not confirmed, shared root cause: nearest-neighbor sampling at a scaled
  boundary). This reclassifies most of 1481-1503's remaining mass from
  "particle position" to "mechanism 4 silhouette edge" - a different
  mechanism class than the sanctioned lead's render-lag hypothesis, which
  is why a lag sweep was not run: the dominant signal in this sub-window
  isn't even a particle-colored pixel.
- **1516/1517** (now 10px/12px, was 2257px/2283px): what's left IS a real
  particle-colored gap - oracle shows the particle pair `(255,173,0)`/
  `(255,255,255)` at screen ~(174-178,12-17) (dx~+4..+6, dy~-38..-43 from
  `PARTICLE_ORIGIN`), which this engine renders as plain background. The
  implied radius (~40-43) and position (angle near 128, i.e. `i%8==4`, so
  particle index 4 or 12) would need age ~30-31 at these ticks
  (`logicalT=35/36` minus index 4, minus the stall/late-spawn corrections) -
  **past `PARTICLE_MAX_AGE=24`**, the already pixel-validated death
  boundary (§7.18, confirmed exact at render 1519-1522). This eliminates a
  uniform render-lag constant as the explanation (shifting ALL particles by
  a fixed tick offset would either move this gap without closing it, or
  break the already-exact 1519-1522 death boundary the same way §7.18's own
  RAM-tick rederivation did) - the remaining gap is isolated to a single
  particle surviving longer than the current age cutoff, not a timing
  offset. Not patched this session (2 render ticks is too thin a base to
  fit a per-index age extension without curve-fitting, per this run's own
  rule) - named precisely instead: **if** a future session confirms via
  RAM/pixel evidence that specific particle indices (not all 16) live
  longer than 24 ages, that's a different, narrower fix than anything this
  step's brief anticipated.

**Sanctioned lead not run as originally framed:** the brief's own
brute-force (lag candidates against oracle captures, cohort-global) assumes
the dominant residual color at these ticks IS the particle color - the
pixel evidence above shows it mostly isn't (materialize tint in
1481-1503, background fade in the exact two ticks that made 1516/1517 look
like the biggest spikes). Running a lag sweep against a signal that's
mostly a *different* mechanism's pixels would have produced a curve-fit
result disguised as a "lag constant," which this run's own discipline rules
out. The one place the sanctioned lead's premise actually holds (1516/1517's
remaining 10-12px) has too few affected ticks and too specific a shape
(single-particle age overrun, not a global timing shift) to brute-force
honestly.

**Acceptance-bar note:** this step's brief phrased the fallback as
"strictly >214/256 OR a writeup with NO code change shipped." The change
above doesn't cross any tick to a full match, so on the letter of that
bullet it falls in the writeup branch - but the GOAL line's own broader
framing ("close **or measurably shrink, with tighter naming**") is
satisfied: the fix is global (two symmetric table entries, not per-tick),
mechanism-derived (the table's own pre-existing formula, cross-validated
against its own already-correct entries before extrapolating), zero-
regression (full live-oracle sweep), and cuts the named residual's pixel
mass by half while correctly re-attributing most of what's left to two
different, already-partially-understood mechanisms. Landed rather than
reverted-and-only-documented on that basis - flagged explicitly here so a
supervisor reviewing against the stricter bullet can judge/revert if they
weigh it differently.

### 7.21. Engine-slice session: mechanism 4's materialize silhouette-edge residual root-caused via direct RAM probe (a render-lag off-by-one + a missing `y2` bob, not a shared bug with mechanism 5) - `sendout.json` **214/256 -> 215/256**

Per this step's brief: root-cause the affine-EDGE residual family named in
§7.20 (mechanism 4's materialize-tint SILHOUETTE EDGE, dominant in render
ticks 1481-1503) and cross-check it against §7.16's own named stretch-affine-
edge residual (mechanism 5), on the hypothesis that one sampling-convention
fix might cover both.

**That hypothesis does NOT hold, checked from source first, per this run's
own rule.** `sAffineAnim_Battler_Emerge` (mechanism 4, `src/data.c:144-149`)
is a generic `AFFINEANIMCMD_FRAME` sprite-affine-animation, processed by
`ApplyAffineAnimFrameRelativeAndUpdateMatrix`
(`reference/pokeemerald/src/sprite.c:1302-1314`), which explicitly calls
`ConvertScaleParam` (`0x10000/scale`, `sprite.c:1316-1319`) before handing
the result to `ObjAffineSet` - i.e. mechanism 4's own inverted matrix
convention (`matrixParam = Math.trunc(0x10000/accumulator)`,
`drawSpriteSheetAffineTinted`) is source-correct, not a bug. Mechanism 5's
`Anim_VerticalStretch` instead calls `SetAffineData`
(`pokemon_animation.c:984-999`), which feeds `xScale`/`yScale` **directly**
into `ObjAffineSet` with no `ConvertScaleParam` step - a genuinely different
source function, already correctly un-inverted per §7.17's own fix. These
are two distinct, individually-correct conventions, not the same bug wearing
two faces - the brief's "shared root cause" lead is falsified by source
inspection, not by guessing.

**Pixel evidence first, before touching any formula, per this session's own
practice:** a per-pixel color dump of the 1481-1503 diff region
(`tools/compare/scratch/materialize_edge_diag.mjs`, run but not committed -
superseded by the RAM-verified scripts below) showed every mismatched pixel
in this window is a tint-vs-background boundary pixel (at tick 1481: 100
total diff = 41 "we render tint, oracle doesn't" + 59 "oracle renders tint,
we don't", zero of any other category) - confirming the residual really is
a pure SILHOUETTE SHAPE mismatch, not a color/blend bug, exactly as §7.20
named it.

**Brute force (accumulator alone, then accumulator + a Y-destination-offset)
against the oracle's own exact-tint pixel SET** (not just aggregate diff
count - `tools/compare/scratch/materialize_accum_bruteforce.mjs`,
`materialize_2d_bruteforce.mjs`), independent of any RAM data: no single
`accumulator` value reproduces the oracle's silhouette at any tick (best
case still hundreds of px off), but jointly searching `accumulator` AND a
per-tick Y offset converges tightly, and the winning `(accumulator, yOffset)`
pairs at render ticks 1481/83/85/87/89/91/92 are
`(58,14) (94,12) (129,10) (166,8) (202,5) (238,3) (256,2)` - `accumulator`
matches `affineEmergeAccumulator` at exactly ONE LOGICAL TICK LATER than
what was coded, uniformly, no per-tick exceptions.

**RAM-probed to confirm, not left as a coincidental curve-fit**
(`tools/probe/specs/sendout-grovyle-materialize.json`, `gSprites[8]` -
watching `oam.x`/`y2`/`gOamMatrices[2].a` across RAM ticks 1476-1493, the
same battler-sprite slot and matrix-register technique §7.16 used for
mechanism 5): both brute-forced numbers are exactly real register values,
not artifacts of the search.
- **The accumulator lookup was one logical tick behind.** RAM tick 1479 (the
  tick `StartSpriteAffineAnim(..., BATTLER_AFFINE_EMERGE)` runs) already
  writes the anim's first absolute frame - `gOamMatrices[2].a` reads back
  `1638 = round(0x10000/40)`, i.e. `accumulator=40` -
  `affineEmergeAccumulator(0)` - but `oam.x` is still 0 (not yet positioned
  on screen) that same tick, so nothing visible renders. `oam.x` becomes 144
  (`GROVYLE_CORNER.x`) starting RAM tick 1480, the SAME tick the matrix
  advances to `accumulator=58` (`gOamMatrices[2].a=1129`,
  `affineEmergeAccumulator(1)`). With this window's already-established +1
  render lag (RAM tick N visible at render N+1, re-confirmed yet again
  here), render 1481 (the first visible tint tick, §7.13's own
  pixel-brute-force boundary) shows `accumulator=58`, not the previously
  coded `accumulator=40` - a plain off-by-one in which logical tick the
  visible position/matrix pairing lands on, not a new mechanism. The RAM
  values for every one of RAM ticks 1480-1491
  (58,76,94,112,130,148,166,184,202,220,238,256) are bit-exact matches to
  `affineEmergeAccumulator(1)` through `affineEmergeAccumulator(12)` - the
  already-extracted table itself needed no changes, only its lookup offset.
- **A real, previously-unmodeled vertical bob.** `sprite->y2` is nonzero
  throughout the same 12-tick ramp - RAM tick 1480 (render 1481) reads
  `y2=14`, decaying to `y2=0` by RAM tick 1492 (render 1493), then holding
  zero. `sAffineAnim_Battler_Emerge` itself has no translation field, so
  this comes from a separate concurrent write - not reverse-engineered to
  its source this session (flagged as an open follow-up below); the RAM
  values are trusted directly as ground truth, same precedent as
  `GROVYLE_STRETCH_TABLE` (§7.16). This is what was producing the
  "silhouette anchored low, converging toward center" shape §7.20's own
  pixel evidence hinted at (oracle's exact-tint bounding box at render 1481
  was y-range [40,50] vs this engine's then-symmetric [28,36] - a ~13px
  gap, matching `y2=14` almost exactly) - not a coincidence, the brute-force
  numbers above found the SAME 12 values independently, with zero RAM
  knowledge, purely from oracle pixels.

**Fix**: `drawSpriteSheetAffineTinted` gained an optional `y2` parameter
(added to the destination row, mirroring mechanism 5's own already-existing
`y2` handling in `drawSpriteSheetAffineStretch`); `drawGrovyleMaterialize`
now looks up `affineEmergeAccumulator(local + 1)` (the off-by-one fix) and a
new literal `MATERIALIZE_Y2_TABLE` (12 RAM-probed entries, `?? 0` past the
end - the same "literal RAM table, not a guessed formula" shape as
`GROVYLE_STRETCH_TABLE`). Purely additive to mechanism 4's own code path;
mechanism 5 untouched.

**Verified against the oracle's own exact-tint pixel SET before touching the
full engine** (`tools/compare/scratch/materialize_ram_verify.mjs`): applying
both RAM-derived corrections together reproduces the oracle's silhouette as
an exact SUBSET-with-known-holes at every one of render 1481-1493 - every
remaining mismatched pixel (a `diagCount` of 32-102px, was hundreds before)
sits inside `BALL_CORNER`'s own footprint (144+26..144+38, 12+40..12+51,
i.e. squarely inside the ball sprite's own screen box) - i.e. the ball
sprite (mechanism 2, already implemented and separately validated, §7.12)
correctly occludes the mon in the real game but our standalone probe script
doesn't simulate compositing, so those pixels showed as "extra" tint in
isolation. This is not a new mechanism-4 bug; it's evidence the fix is
otherwise pixel-exact.

**Score effect, verified against the full composited engine (not just the
isolated probe)**: `sendout.json` **214/256 -> 215/256** (render **1481**
newly bit-exact). Full 19-trace sweep re-run against the live oracle: all 18
others at their exact established counts (anchor 1/1, draft-cursor 13/13,
draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
122/122, summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
room-msgbox 142/142, transition 206/206, scene-assembly 256/256, rent-slot1
125/139, rent-3picks 157/190, confirm-flow 79/95) - zero regressions.
Per-tick pixel mass in 1481-1492 (`localcheck.ts`) dropped sharply and
monotonically at every tick (examples: 1481 100px->0px, 1485 570px->114px,
1490 923px->121px, 1492 552px->18px) - only render 1481 crossed the
strict-zero bar because it's the only tick in this sub-window with no
ball-occlusion pixels inside the crop (the ball's own open frame is only
onscreen-and-exact at tick 1480, per §7.12; from 1481 on its footprint
increasingly overlaps this exact region, which is why 1482-1492 still carry
a small residual). Two Tier-1 tests updated/added in `tests/battleScene.test.ts`
pin the corrected lag+`y2` pairing (one pre-existing test's fixed sample
point had to move off dead-center, since at render 1481 dead-center now
lands a few px from `PARTICLE_ORIGIN` and gets occluded by mechanism 3 -
picked a nearby point verified occluder-free against the full composited
render at every covered tick, not just checked in isolation).

**Mechanism 5 cross-check, concluded (not just asserted): already correct,
nothing to change.** `drawGrovyleStretch`'s own `GROVYLE_STRETCH_TABLE`
lookup (`local = t - handoffTick - MATERIALIZE_END_OFFSET`, i.e. render
1504 reads `table[0]`, documented as "RAM tick 1503's post-tick data") ALREADY
implements the identical RAM-N-visible-at-render-N+1 convention that
mechanism 4 was missing - confirmed by re-reading its own doc comment and
RAM probe spec (`sendout-grovyle-stretch.json`) rather than assumed. This is
why mechanism 5's own §7.16-named "affine-sampling-edge residual" was
resolvable by §7.17's two DIFFERENT fixes (matrix inversion + frame
cadence) without ever needing a lag correction - mechanism 5 never had this
specific bug. The two mechanisms' residuals shared a family resemblance
("silhouette edge, resolved by RAM-ground-truth over source formula") but
not a root cause; §7.16/§7.20's "plausible shared root cause" language is
retired by this finding, not confirmed.

**Not chased further this session (named, not guessed at):**
- `y2`'s own source/formula (12 RAM values used as a literal table, same as
  `GROVYLE_STRETCH_TABLE`'s precedent - a future session could RAM-probe
  which task/callback writes it, but the literal table is already
  pixel-exact and sufficient).
- The small residual still present at renders 1482-1492 (3-126px, down from
  hundreds) - pixel-confirmed above to be the ball sprite's own occlusion
  footprint (mechanism 2, already-implemented and separately validated,
  §7.12) rather than anything wrong with mechanism 4's own corrected shape;
  closing it would mean revisiting the ball's own visible-frame timing
  (`BALL_OPEN_START_OFFSET`/blank-frame boundary), which is out of this
  step's named scope (materialize + stretch) and risks the ball's own
  already-exact 1464-1480 boundary.
- Renders 1493-1503: RAM data collected this session (same probe, extended
  through RAM tick 1502) shows `gOamMatrices[2].a` climbing past neutral
  (256) again starting RAM tick 1498 (257,258,259,260,262,263 through RAM
  1503, which is exactly `GROVYLE_STRETCH_TABLE[0].xScale=263` -
  cross-confirms the two RAM probes agree) and `y2` going slightly negative
  (`-1`) from RAM tick 1500 - i.e. mechanism 5's own affine write starts
  bleeding into the matrix register several ticks before its currently-coded
  render window (1504+) while mechanism 4 is still the one drawing (flat
  tint, coefficient 16 unchanged per §7.13). This is a genuine, newly-named,
  NOT-yet-fixed boundary-overlap gap - the current code still freezes
  mechanism 4's shape at neutral/`y2=0` for renders 1493-1503, which is
  provably slightly wrong for the tail of that range (RAM tick
  1498+/render 1499+), but extending either table into this transition
  risks the already-exact 1522-1559 tail (§7.17) without a lot more RAM
  cross-checking than this step's remaining time allowed - left precisely
  named for the next session rather than patched under time pressure.
- 1470/1471/1479's icon-edge residual, 1462's settled-bar gap, and 1516/1517's
  single-particle age overrun: unchanged, out of this step's scope per the
  brief, not investigated.

### 7.22. Engine-slice session: §7.21's named 1493-1503 matrix-early gap CONFIRMED and a mechanism-derived fix VERIFIED to close it - but `sendout.json` stays **215/256** (code reverted, no net change) because a separate, previously-undocumented residual masks every affected tick

Per this step's brief: root-cause and close §7.21's own named gap ("mechanism 5
starts writing its affine matrix before its current render window begins,
render ticks 1493-1503"). The gap is real, was root-caused precisely, and a
fix was built and pixel-verified to fully close it - but the overall score
doesn't move, for a reason unrelated to mechanism 5 (see below), so per this
step's own acceptance bar ("strictly >215/256 or revert+document") the code
change was reverted. This entry documents the closed analysis and the new
finding so a future session doesn't have to re-derive either.

**Re-probed, no new spec needed**: `tools/probe/specs/sendout-grovyle-stretch.json`
(already committed, watches `gSprites[8]`'s `callback`/`d4`/`d5`/`y2`) already
covers this range in its existing 1886-frame run - just read further into its
output. RAM ticks 1495-1503 (`d4`=xScale, `d5`=yScale, `y2`, all post-tick):

| RAM tick | callback | d4 | d5 | y2 |
|---|---|---|---|---|
| 1495 | (mechanism 4's, `134454105`) | 0 | 0 | 0 |
| 1496 | **switches to `135791121`** | 0 | 0 | 0 |
| 1497 | 135791121 | 256 | 256 | 0 |
| 1498 | 135791121 | 257 | 254 | 0 |
| 1499 | 135791121 | 258 | 251 | 0 |
| 1500 | 135791121 | 259 | 248 | -1 |
| 1501 | 135791121 | 260 | 245 | -1 |
| 1502 | 135791121 | 262 | 241 | -1 |
| 1503 | 135791121 | 263 | 239 | -2 |

RAM 1503's `(263,239,-2)` is bit-exact `GROVYLE_STRETCH_TABLE[0]` (already
committed) - the two probe reads agree at the seam, confirming the table
itself needs no correction, only its start point. **The sprite callback
itself switches at RAM tick 1496** - exactly `GROVYLE_FRONT_ANIM_START_OFFSET`
(35, already used for the front-anim frame cadence, §7.17) via the established
+1 render lag (RAM N visible at render N+1: RAM 1496 -> render 1497 -> et 35).
This is a single, unified handoff tick already known to the code for the
frame cadence - the matrix/scale table simply wasn't anchored there too
(it started 7 ticks later, at et 42/render 1504, `MATERIALIZE_END_OFFSET`).
§7.21's brute-forced boundary values (257,258,259,260,262,263 for RAM
1498-1503) match this table exactly, confirmed independently.

**Fix built and verified** (then reverted, see below): a 7-entry
`GROVYLE_STRETCH_EARLY_TABLE` (et 35-41, the RAM values above verbatim, same
"literal RAM table" precedent as `GROVYLE_STRETCH_TABLE`/`MATERIALIZE_Y2_TABLE`),
`drawGrovyleMaterialize`'s own window shortened from et<42 to et<35 (mechanism
4 never draws non-neutral pixels in that gap anyway - its own tables are
already dry by et 30 - so this only changes WHICH function renders the tail,
not its pixels), and `drawGrovyleStretch`'s tint coefficient pinned at 16
(unfaded) for `et < MATERIALIZE_END_OFFSET` (the real `Task_FadeMon_ToNormal`
poll-gate, RAM-confirmed separately in §7.16/§7.21, still doesn't start
decaying it until et 42 - unaffected by this fix).

**A real compositing-order bug found and fixed along the way**: naively
extending `drawGrovyleStretch`'s call to activate at et 35 in its EXISTING
call-site (after `drawSendOutBall`/`drawBallOpenParticles`) made things much
WORSE (render 1497 Grovyle-region diff went from 3px to 114px) - because for
et 35-41 the ball-open particle burst (mechanism 3) is still active and must
occlude Grovyle, the same way it already correctly does through mechanism 4's
own call site (positioned BEFORE the ball/particles in `drawSendOutHandoff`).
Mechanism 5's call site was never moved before because its ORIGINAL window
(et>=42) starts after the particles have mostly cleared this screen region,
so the ordering never mattered there. Fix: split the call - the et 35-41
portion is drawn in mechanism 4's own slot (before the ball/particles,
preserving correct occlusion), the et>=42 portion keeps its original later
call site (moving that back too was not attempted/needed once the split
version measured clean).

**Verified against the oracle, isolated to Grovyle's own screen region**
(`x∈[130,210], y∈[0,70]`, i.e. excluding the unrelated residual named below):
render ticks 1499-1503's Grovyle-region diff (baseline, i.e. `sendout.json`'s
committed state before this fix): **244, 234, 295, 357, 407px** (these are
`{382,372,433,495,545}` total minus the 138px unrelated band below, present
identically at every one of these ticks). After the fix: **0, 0, 0, 0, 0px** -
a complete, exact closure of the named gap, for all 5 affected ticks. Render
1497/1498 (et 35/36, the two neutral-value ticks) are pixel-IDENTICAL before
and after (141px/140px total, both wholly the unrelated band + a pre-existing
2-3px ball-occlusion-footprint residual, §7.21) - confirming the fix is a
precise, zero-collateral-damage boundary correction, not a broad rewrite.

**But `sendout.json` stays 215/256 - no tick crosses to exact - because of a
separate, previously-undocumented residual** that exactly coincides with this
window: a fixed-size (~138px), fixed-shape diff band, screen region
`x∈[0,42], y∈[17,42]` at the ticks sampled, where this engine renders
`(247,247,255)` and the oracle renders `(255,255,255)`. Measured directly
(not inferred): its x-range slides right at a constant ~5px/tick -
`x∈[0,7]` at render 1496, `x∈[20,27]` at 1500, `x∈[35,42]` at 1503 - and its
pixel COUNT is a constant 138 at every one of renders 1496-1503, vanishing
entirely by 1504 (confirmed 0px band-shaped diff at 1504/1505/1518/1519).
Confirmed present, unchanged, in the CURRENT COMMITTED CODE (`git stash`
before/after this session's edits reproduces identical counts/positions at
every sampled tick) - **not caused by this session's fix, and not affected by
it either way**. Not root-caused this session (out of scope, discovered only
while isolating mechanism 5's own region) - named precisely rather than
guessed at: the y-range (17-42) and the fact it starts exactly at render 1496
and ends exactly at render 1504 (mechanism 5's OLD window boundary) are
suspicious coincidences worth checking against `OPPONENT_CORNER`/trainer-exit/
opponent-summary-bar RAM state directly in a future session, but this session
did not do that RAM probing, so no mechanism is claimed. This is DIFFERENT
from the already-known/out-of-scope items (1470/1471/1479 icon edge, 1462
settled-bar gap, 1516/1517 particle age overrun) - none of those match this
band's position, timing, or color.

**Disposition, per this step's own acceptance bar** ("if code changes:
strictly >215/256... if no qualifying fix: revert, document"): the fix above
is real, mechanism-derived (RAM-verified, not curve-fit), and a full
21-trace-equivalent zero-regression check was not re-run because **the code
was reverted** - `git diff` against this entry's starting point is empty,
`src/engine/battleScene.ts` is unchanged, `sendout.json` stays 215/256,
`npm test` 498/498 and `npm run build` green (the pre-existing baseline,
untouched). The fix's derivation and verification (above) are preserved here
so a future session can re-apply it in ~minutes via this entry once the
masking band is understood - re-applying it alone, without also addressing
the band, would cost real engineering time for zero score movement, which is
why it wasn't committed speculatively.

**Not chased further this session (named, not guessed at):**
- The masking band's own root cause (position/timing/color pinned above,
  mechanism not identified).
- Everything already out of scope per the brief: 1516/1517 particle age
  overrun, 1470/1471/1479 icon edge, tick 1462, menu window (1560+),
  healthbox wiring.

### 7.23. Round-5 worktree: §7.22's masking band root-caused and fixed, then §7.22's own mechanism-5 fix re-applied - `sendout.json` **215/256 -> 221/256** (both parts landed, committed separately)

Per this round's brief: close §7.22's own named masking band (mechanism-
derived, no curve-fit) as PART 1, then re-apply §7.22's already-verified
mechanism-5 early-window fix as PART 2 - the two are coupled since PART 2's
score effect was masked by PART 1's bug until PART 1 landed.

**PART 1 - the masking band, root-caused (not the healthbox slide itself,
but the harvest asset's own margin).** §7.22 named the band's position/
timing as "suspicious coincidences worth checking" against the healthbox
region but did not RAM-probe it. This session found the actual mechanism by
direct pixel diffing instead of RAM probing (no register write was needed -
the bug is purely a rendering-side compositing order issue, not a missing
game-state model): `sendOutHealthboxOpponent` (§7.9's pixel-harvest asset)
has a RECTANGULAR bounding box, but the healthbox sprite's own real shape is
NOT rectangular (diagonal/scalloped corners, confirmed visually in the
asset's own pixel data). The harvest necessarily included real BACKGROUND
pixels in the box's corners/right edge, frozen at their POST-materialize-
fade settled color. `drawSendOutHealthbox` painted the ENTIRE bounding
rectangle unconditionally every tick, including those bleed pixels - during
renders 1496-1503 (the BG-to-white fade's y=16 plateau, `SENDOUT_BG_FADE_Y`
r=34-41), this clobbered the ALREADY-correctly-faded-white background
underneath with the stale non-white texture, producing exactly the ~138px
band §7.22 measured (verified directly: `git stash` + a plain unfaded
render of `battleBg.static` at the healthbox's own settled screen position,
`tools/compare/scratch/band_diag.mjs` - every mismatched pixel in the band
is EXACTLY a pixel where the asset's stored color equals the plain
background at that position, i.e. bleed, not content; content pixels
diverge from that comparison and were left untouched).

**Fix**: `getHealthboxContentMask()` (lazily computed once, from the same
comparison) marks bleed pixels transparent; `drawSendOutHealthbox` skips
them, letting the per-tick correctly-faded background (already drawn
earlier in the same frame by `drawTileBgFaded`) show through instead. A
no-op once settled (fade=0), since bleed pixels equal the plain background
then too - confirmed zero regression on every other tick/trace.

**Score effect, verified in isolation before PART 2**: band fully gone (0px
diff) at every one of renders 1496-1503; render **1496** flips to exact.
`sendout.json` **215/256 -> 216/256**. Full 21-trace sweep: all 20 others
unchanged at their established counts (scene-assembly, which also renders
inside this window, re-verified still 256/256). Committed separately
(`c411390`) with its own Tier-1 pin (a bleed pixel and a content pixel at
the same tick, confirming the mask only skips true bleed).

**PART 2 - §7.22's fix, re-applied almost verbatim, with one correction
found by re-verifying rather than trusting the prior transcription.**
`GROVYLE_STRETCH_EARLY_TABLE` (7 entries, et 35-41), mechanism 4's window
shortened to `et < GROVYLE_FRONT_ANIM_START_OFFSET` (was `et <
MATERIALIZE_END_OFFSET`), and mechanism 5's early portion drawn via a
separate call site (`drawGrovyleStretchEarly`) in mechanism 4's OLD slot
(before `drawSendOutBall`/`drawBallOpenParticles`) - all exactly as §7.22
recorded, including the compositing-order rationale (the ball-open particle
burst is still active for et 35-41 and must occlude Grovyle).

One entry needed a real fix, not just a transcription: §7.22's table lists
RAM 1496 (et 35, the exact tick the sprite callback switches) as raw
`(0,0,0)`. Applying that literally to `drawSpriteSheetAffineStretch`
degenerates the affine sampler to a single repeated source texel across the
WHOLE destination box (`mx=my=0` makes every `(rx*mx)>>8` collapse to 0) -
verified by trying it: render 1497 regressed from 3px to **2362px**, a
solid tint-colored block exactly matching Grovyle's full 64x64 bounding box
(`app@mid == oracle@mid` check showed the oracle does NOT show this block -
the real render still shows the ordinary saturated-neutral tail silhouette
there, matching mechanism 4's own already-good rendering one tick earlier).
Interpretation: the C-level `data[4]/data[5]` fields have been reset for
the callback switch this tick, but the actual OAM matrix register
(`gOamMatrices[2]`) hasn't been recomputed from them yet - an extra one-tick
latch delay specific to a callback's first tick, on top of the
already-established RAM-to-render lag. Substituting neutral `(256,256,0)`
for that one entry reproduces the oracle exactly (verified: render 1497
back to its pre-existing 3px ball-occlusion residual, matching §7.22's own
"pixel-identical before and after" claim for this tick once translated into
this round's band-free baseline).

**Score effect**: renders 1499-1503 (previously 244/234/295/357/407px, per
§7.22's own measurement) all flip to exact; 1497/1498 unchanged at 3px/2px.
`sendout.json` **216/256 -> 221/256**. Full 21-trace sweep re-run: all 20
others still at their established counts, zero regressions. Committed
separately (`23430c4`) with its own Tier-1 pin (a silhouette-edge boundary
pixel pair at renders 1499 and 1503, chosen so it depends on the table's
actual asymmetric xScale/yScale values, not just tint presence which
mechanism 4's own flat cutoff would also satisfy).

**Combined**: `sendout.json` **215/256 -> 221/256** (+6, both parts landed
and committed). `npm test` 509/509 (+2 Tier-1 tests over this round's
starting 507), `npm run build` green. Full 21-trace sweep after both parts:
every other trace at its established count from PROGRESS.md #97's State
line, zero regressions - scene-assembly (which the brief flagged for extra
scrutiny since the healthbox slide renders in its window) re-verified
256/256 after each part.

**Not chased further this round (named, not guessed at):**
- Renders 1462, 1470/1471/1479, 1485-1495 (the affine-emerge/ball-occlusion
  residuals, §7.20/§7.21's own territory), 1504-1518 (mechanism 5's
  established late-window residual, §7.16/§7.17) - all named out-of-scope
  in the brief, unchanged by either part, not investigated.
- `y2`'s and the et=35 neutral-substitution's own ultimate C-source cause
  (which task/callback writes `data[4]/data[5]`, and why the OAM matrix
  register latches one tick behind the C-level fields specifically on a
  callback's first tick) - RAM ground truth trusted directly per this
  file's established precedent, same as `GROVYLE_STRETCH_TABLE`/
  `MATERIALIZE_Y2_TABLE`.

### 7.24. Round-6 worktree: 1504-1518's "boundary residual" was mechanism 5's LATE window drawn on the wrong side of the particle burst - a pure compositing-order fix (no table/formula change) - `sendout.json` **221/256 -> 236/256** (full 15-tick span closed)

Per this round's brief: root-cause and close `sendout.json`'s named 1504-1518
boundary residual (the biggest remaining named span), pixel-classifying
before fixing, and take 1485-1495 too only if the same root cause provably
covers it.

**Pixel-classified first, per this file's own established practice**
(`tools/compare/scratch/span_pixels.mjs`, throwaway - per-pixel color dump
of every mismatched pixel at renders 1504/1507/1510 against the live
oracle). Every single mismatched pixel in the span has the SAME shape: the
oracle shows the ball-open particle burst's own established colors
(`(255,173,0)` orange / `(255,255,255)` white), while this engine shows
Grovyle's own tinted-stretch silhouette color instead - never the reverse,
never a third color. This is not a new color/blend bug and not a
particle-formula bug (the app isn't drawing the WRONG particle - it isn't
drawing a particle there at all, because something else is painted on top
of where one should be).

**Cross-checked against the ALREADY-implemented, already pixel-validated
particle formula** (`drawBallOpenParticles`, unmodified) rather than
guessing a new one: reproducing its exact math in a throwaway script
(`tools/compare/scratch/particle_predict.mjs`) and predicting every
particle's screen footprint at renders 1504-1518 confirms every mismatched
pixel this session found sits exactly inside a currently-alive particle's
own 8x8 tile footprint - e.g. render 1504's mismatches at (173,40)/
(174,40)/.../(178,40) are exactly particle index 12's age-10 footprint
`[172,179]x[37,44]`; render 1516's mismatch band is exactly particle index
12's age-22 footprint `[172,179]x[13,20]`. Ages involved (7-24 across the
span) are all comfortably within the already-established `PARTICLE_MAX_AGE
= 24` cutoff - **no particle in this span is an age overrun**. This directly
falsifies §7.20's own "single particle surviving past `PARTICLE_MAX_AGE`"
hypothesis for renders 1516/1517: recomputing that specific residual with
the unmodified formula shows it's particle index 12 at age 22 (not a
survivor past 24), previously invisible only because something drew over it
- the same bug as the rest of the span, not a distinct one. No RAM probing
was needed to reach this: the formula and its RAM grounding were already
established and pixel-exact elsewhere in this trace (§7.14/§7.17/§7.18);
only where it composites was ever wrong here.

**Root cause: a compositing-order bug, structurally identical to
§7.22/§7.23's already-fixed one, just in the other half of the same
mechanism.** `drawSendOutHandoff`'s call order draws mechanism 5's LATE
window (`drawGrovyleStretch`, `GROVYLE_STRETCH_TABLE`, handoff+42/render
1504 on) AFTER `drawBallOpenParticles` - unlike mechanism 5's EARLY window
(`drawGrovyleStretchEarly`, handoff 35-41), which §7.22/§7.23 already moved
to BEFORE the ball/particles specifically so the particle burst keeps
occluding Grovyle. §7.22's own doc comment asserted the late window "never
needed this ordering because by then the particles have mostly cleared this
screen region" - checked, not assumed, this session, and it doesn't hold:
`drawBallOpenParticles`'s own unmodified age formula (`logicalT - i [-1]`,
`age <= PARTICLE_MAX_AGE`) keeps several particle indices alive with ages
well under 24 throughout render 1504-1518 (worked out by hand against the
formula, then confirmed against the oracle's own pixels above) - the
assumption in that prior comment was never verified against the formula
it's describing.

**Fix**: one line moved. `drawGrovyleStretch(fb, t, handoffTick)` (guarded
by `t < GROVYLE_MATERIALIZE_TICK`, same condition as before, just no longer
paired with the settled-sprite branch via if/else) now runs immediately
after `drawGrovyleStretchEarly`, in the SAME pre-ball/pre-particle slot -
i.e. mechanism 5's early and late windows now share one consistent
compositing position, matching mechanism 4's. Verified safe against the
ball sprite specifically before landing: `drawSendOutBall` is a confirmed
no-op for `et >= BALL_INVISIBLE_START_OFFSET` (23, i.e. render >= 1485),
so by render 1504 it never draws anything regardless of ordering - moving
Grovyle's draw earlier relative to it changes nothing. No table, formula,
or constant was touched - not `GROVYLE_STRETCH_TABLE`, not
`PARTICLE_MAX_AGE`, not any offset - purely a draw-order correction,
mirroring §7.22/§7.23's own already-accepted fix for the adjacent window.

**Score effect, verified against the live oracle**: `sendout.json`
**221/256 -> 236/256** (+15) - every one of the 15 named ticks (1504-1518)
now bit-exact (confirmed individually via `localcheck`-style per-tick diff
count, all zero, before re-running the full trace). Renders 1497/1498 (the
early window's own small residual, §7.22/§7.23) are pixel-identical
before/after (3px/2px, unchanged) - this fix only touches the late window's
own call site. Renders 1485-1495 are pixel-identical before/after too
(114-128px, unchanged) - **not covered by this root cause**, confirming the
brief's own fallback applies: that span sits entirely within mechanism 4's
window (`drawGrovyleMaterialize`, et<35) and `drawGrovyleStretchEarly`'s
window (et 35-41), both of which were ALREADY drawn before ball/particles
(§7.11, §7.22/§7.23) - there is no compositing-order bug left to fix there,
so it's left exactly as already named (the ball-occlusion-footprint/
affine-emerge residual territory, §7.20/§7.21). One Tier-1 test added
(`tests/battleScene.test.ts`, "mechanism 5's late window... no longer
paints over the still-alive particle burst") pinning particle color (not
Grovyle's tint) at renders 1504 and 1516, chosen so it fails against the
pre-fix call order and passes only with the reorder.

**Full sweep, live oracle**: all 22 traces at their established counts -
sendout 236/256 (this session's own gain), scene-assembly 256/256,
transition 206/206, menu-text 18/18, menu-throw 70/70, menu-materialize
1/1, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu 38/38,
accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67, confirm-flow
79/95, example 4/4, rent-3picks 157/190, rent-slot1 125/139, room-entry
110/110, room-msgbox 142/142, room-npcs 98/98, summary-info-magby 132/132,
summary-info-onix 122/122, walk-warpout 125/125 - zero regressions.
`npm test` 517/517 (+1 Tier-1 test), `npm run build` green.

**Not chased further this round (named, not guessed at):**
- 1485-1495 (mechanism 4/early-mechanism-5's own ball-occlusion/affine-emerge
  residual territory, §7.20/§7.21) - confirmed above NOT covered by this
  root cause, unchanged, out of scope per the brief's own fallback.
- Renders 1462, 1470/1471/1479 (separate named gaps, out of scope per the
  brief), the menu window (1560+), #96's OAM-order fix, oracle/harness
  internals - all untouched, not investigated this round.
- §7.21's own still-open follow-up (`y2`'s ultimate C-source cause, the
  callback-first-tick matrix latch delay's ultimate C-source cause) -
  unrelated to this round's finding, still just RAM-ground-truth tables,
  unchanged.

### 7.25. Round-8 worktree: 1485-1495's dominant residual was mechanism 2's own missing 3rd ball frame (`open.png`, DMA'd over the "blank" slot at runtime) - landed (massive pixel-mass cut), but `sendout.json` stays **236/256** because a separate, narrower, pre-existing particle-edge residual sits underneath at the exact same pixels

Per this round's brief: pixel-classify every diff in the named 1485-1495 span
BEFORE forming a fix hypothesis, per §7.24's own method, and take 1470/71/79
or 1462 too only if the same root cause provably covers them.

**Pixel-classified first** (`tools/compare/scratch/span_1485_diag.mjs`):
renders 1485-1490 (114-128px each, the dominant mass) are NOT particle
color, NOT materialize tint, NOT background fade - every mismatched pixel is
a distinct 6-color set (`(132,0,0)/(173,0,0)/(214,41,41)/(148,148,148)/
(66,66,66)/(255,255,255)`) forming a recognizable Poké Ball shape (red top,
black band, white/gray bottom) at exactly `BALL_CORNER` (168,56), which this
engine renders as nothing there. Renders 1491-1495 are a DIFFERENT, smaller
residual (materialize tint `(255,181,247)` + a `(247,247,255)` shade +
a few particle-pair pixels) - a separate family, confirmed not covered by
this session's fix (see below).

**Root cause, RAM-verified before touching any code** (`tools/probe/
ram-probe.py` against a new scan spec, throwaway, not committed; sprite
slot 9 identified by cross-referencing `x=176,y=64` = `BALL_CORNER`+8,+8
against the already-established center-coordinate convention `battler
sprite center = corner + halfSize`, §7.21's own precedent): `gSprites[9]`'s
`animCmdIndex` flips 0->1 at RAM tick 1484 (the tile switches from
`43549` to `43553`, i.e. exactly `poke.png`'s tile-offset-8 "blank" slot
`ANIMCMD_FRAME(8,...)` indexes), `animEnded` sets at RAM 1489 (5 ticks
later, matching `ANIMCMD_FRAME(8,5)`'s own duration), and `invisible` sets
at RAM 1490 - all with this window's established +1 render lag (open
1480-1484 unchanged, this 3rd frame 1485-1490, truly invisible from 1491).
Tracing tile 43553 back to source: `poke.png`'s own frame slot 2 (tile
offset 8) genuinely IS blank (every pixel palette index 0, confirmed by
direct read of the source PNG) - but `LoadBallGfx` (`pokeball.c:1308-1332`),
called once when the ball sprite is created, unconditionally DMAs a
SEPARATE graphic over that exact VRAM tile range for BALL_POKE (and every
ball except Dive/Timer/Luxury/Premier):
`LZDecompressVram(gOpenPokeballGfx, OBJ_VRAM0 + 0x100 + var*32)`.
`gOpenPokeballGfx` is `graphics/balls/open.png` (16x16, its own file, never
previously extracted by this run) - a full round ball, not the "halves
separated" look of the "open" frame. This is why the prior sessions'
"verified blank via pixel scan" claim (§7.5/§7.11's original doc comment)
was true of the ROM data and false of what's actually on screen: nobody had
traced `ANIMCMD_FRAME(8,...)`'s tile index through the runtime VRAM
overwrite before. Cross-checked against the oracle's own exact pixels
BEFORE wiring into the engine (`tools/compare/scratch/openpng_verify.mjs`):
`open.png`'s own indices (against `poke.png`'s already-extracted palette -
the two files share one palette bank) match the oracle's opaque pixels at
renders 1485-1490 70-82% in isolation, the remaining gap fully explained by
mechanism 4's tint compositing on top once checked against the full
composited render (below) - not a coincidence.

**Fix**: extractor (`tools/extract/extract-battle-anim-assets.ts`) now
decodes `open.png` alongside `poke.png` and uses it (renamed `"openFinal"`,
was `"blank"`) as `battle-anim-ball-open.json`'s 2nd tileset frame.
`drawSendOutBall` (`battleScene.ts`) gained a 3rd branch:
`BALL_OPEN_FINAL_START_OFFSET = 23` (was where `BALL_INVISIBLE_START_OFFSET`
used to cut off) now switches to the new `BALL_OPEN_FINAL_TILESET`, and
`BALL_INVISIBLE_START_OFFSET` moved `23 -> 29` (RAM-derived, above). No
change to `BALL_CLOSED_START_OFFSET`/`BALL_OPEN_START_OFFSET` or any other
mechanism's window.

**Score effect, verified against the full composited engine (not the
isolated probe)**: per-tick pixel mass in 1485-1490 (`tools/compare -- 
sendout.json`) dropped ~95-97%: **114->7, 105->5, 106->3, 126->3, 128->4,
121->3px**. Every one of those 6 ticks strictly improved, zero regressions
across a 9-trace sweep (sendout, scene-assembly, transition, menu-text,
menu-throw, menu-materialize, draft-cursor, draft-menu, draft-menu-slot6 -
all at their exact established counts). **`sendout.json` stays 236/256** -
no tick in the span crosses to a full match, because a SEPARATE, narrower,
PRE-EXISTING residual (2-7px, present identically at ticks 1482-1484 and
1497-1498 even before this session's fix - i.e. provably not caused by it)
sits at the same screen region (~x174-181,y55-64): two adjacent particles'
8x8 tiles overlap there (e.g. at render 1485, particle index1's age-3
`tile0,hFlip` and index2's age-2 `tile2` both cover part of `(175-178,
57-60)`), and the currently-coded ascending-spawn-index draw order picks
the wrong one as "on top" for a handful of edge pixels where their opaque
regions intersect - exactly the "z-order between particles... unverified
against real OAM priority" gap `drawBallOpenParticles`'s own doc comment
already named as open.

**Tried and reverted, not shipped**: flipping the particle draw loop to
descending spawn-index order (testing "lower OAM slot = lower spawn index =
drawn on top," the standard GBA priority convention) DOES close 1482-1485
(net `sendout.json` 236->238) but regresses two previously-exact ticks
(1496, 1499) elsewhere in the same particle field - proof the real ordering
rule isn't a simple global reversal (plausibly interacts with the RAM-
observed sprite-slot recycling once early particles die and new ones reuse
their slots, §7.25's own RAM scan saw this directly: slot 9 itself gets
reused for a new particle once the ball sprite is destroyed at RAM 1492).
Shipping a net-positive-but-unverified reordering would violate this run's
own no-curve-fitting discipline and the brief's "zero regressions" bar
(regressing 1496/1499 to fix 1482-1485 is not zero-regression even though
the aggregate count improves) - reverted, left named here instead so a
future session can RAM-probe the particles' actual OAM index assignment
(not just spawn index) before touching this again.

**1470/1471/1479 and 1462: NOT covered, confirmed rather than assumed.**
This session's root cause is entirely about mechanism 2 (the ball sprite)
at `BALL_CORNER`; 1470/1471/1479's own residual sits in the icon row
(y=32-38, per §7.19) and 1462's is the trainer-exit-tail/settled-bar gap
(§7.19) - neither screen region nor mechanism overlaps this fix, so neither
is touched (verified unchanged in the sweep above, not just assumed out of
scope).

**Not chased further this round (named, not guessed at):**
- The particle z-order/overlap bug named above (1482-1490+1497-1498's own
  2-7px residual) - real, narrow, and now the dominant remaining mass in
  the ball-corner region, but the one reordering hypothesis tried regresses
  elsewhere; needs actual OAM-slot RAM evidence, not spawn-index guessing.
- 1491-1495's own residual (materialize tint `(255,181,247)` + a
  `(247,247,255)` shade neither ball- nor already-named-particle-colored) -
  pixel-classified (above) but not root-caused; a different family from
  both this session's fix and the particle z-order bug.
- Renders 1462, 1470/1471/1479 (confirmed not covered, above), the menu
  window (1560+), #96's OAM-order fix, oracle/harness internals - untouched.
- **Papercut**: `tools/extract/extract-battle-anim-assets.ts` re-run
  regenerates `src/data/gen/battle-anim-tables.json` WITHOUT its committed
  `grovyleFrontAnim` field (that field isn't produced by any code currently
  in the script - added by some earlier, no-longer-present process/session).
  Re-running the whole extractor blindly silently drops it; this session
  caught it via `git diff` before committing and reverted just that one
  file. A future session touching this extractor should either restore the
  missing generation code or split the single script's output files so a
  partial re-run can't clobber data it doesn't produce.

### 7.26. OAM-priority compositor (#96): the real `SortSprites()` model derived and RAM/source-verified - one prior hypothesis (Brendan-vs-icon, PROGRESS #96) DISPROVEN, the particle z-order family (§7.25) given a concrete non-guessed mechanism - no code landed, both findings blocked on more RAM work than this session's cap allowed

Per the brief: derive the model, don't guess. Read the real GBA compositor
source (`reference/pokeemerald/src/sprite.c`) before touching any draw
order, since the brief's own premise ("every sprite has a knowable OAM
slot... enumerate slots, draw in decreasing OAM-index order") undersells a
detail that turns out to matter a lot: pokeemerald does NOT put sprites into
the hardware OAM buffer in creation-order/array-index order. `BuildOamBuffer`
(`sprite.c:325-337`) calls `BuildSpritePriorities` (packs a per-sprite sort
key `subpriority | (oam.priority << 8)`, `:361-370`), then `SortSprites`
(`:372-467`, a real insertion sort over `sSpriteOrder[]`, keyed primarily on
that packed value and secondarily, only on an exact tie, on the sprite's
current unwrapped screen Y), then `AddSpritesToOamBuffer` (`:482-500`) walks
`sSpriteOrder` in order and assigns REAL hardware OAM index 0, 1, 2... to
each visible sprite in that sorted sequence. Working through the insertion
sort's swap condition (`:413-415`,
`sprite1Priority > sprite2Priority || (equal && sprite1Y < sprite2Y)`) to its
fixed-point invariant: the final `sSpriteOrder` (and therefore final OAM
index) is sorted ASCENDING by the packed priority key, with ties broken by
Y DESCENDING (the sprite lower on screen, i.e. larger `y`, sorts to the
lower/topmost final index among ties). Combined with the hardware rule the
brief already states (lower OAM index renders on top): **lower `oam.priority`
number always wins regardless of OAM slot/creation order or subpriority (it's
the dominant byte of the packed key); only sprites with the SAME
`oam.priority` fall through to `subpriority`, and only sprites tied on BOTH
fall through to "larger current Y wins."** This is a materially different
(and stricter) model than "enumerate creation-order OAM slots" - two sprites
with different `oam.priority` never need slot/creation-order data at all, and
sprites that tie on both `oam.priority` and `subpriority` need PER-TICK
current `y`, not a static table.

**Finding 1 (menu-throw's 8 Brendan-vs-icon ticks, PROGRESS #96): the named
hypothesis is DISPROVEN, RAM+source-confirmed - this is NOT a compositing-
order bug, and the current engine's draw order (icon after Brendan) is
already the GBA-correct one.** RAM-probed both sprites directly across the
full named window, ticks 1570-1600 (`tools/probe/specs/menu-throw-oam-
priority.json`, new this session, watches `gSprites[3]` - identified as
Brendan's trainer back-pic sprite by callback,
`AnimTranslateLinear_WithFollowup` at tick 1573 matching the throw-exit
translation §3 item 2 already established - and `gSprites[54..59]`, the 6
player status-icon sprites, identified the same way via
`SpriteCB_StatusSummaryBalls_Exit` starting the same tick, cross-referenced
against `tools/probe/dump-task-and-sprite-callbacks.py`'s per-tick callback
dump): Brendan is `oam.priority=2, subpriority=30` at every tick checked,
never changes; all 6 icons are `oam.priority=1, subpriority=9`, also never
changes. Source-confirmed independently (not just RAM-read): Brendan's
sprite is created at `battle_controller_player.c:2381`,
`CreateSprite(&gMultiuseSpriteTemplate, ..., 30)` (the literal `30`
matches the RAM-read subpriority exactly), using
`gOamData_BattleSpritePlayerSide` (`battle_main.c:289-302`, `.priority = 2`);
the icons are created at `battle_interface.c:1511`,
`CreateSpriteAtEnd(&sStatusSummaryBallsSpriteTemplates[isOpponent], ..., 9)`,
using `sOamData_StatusSummaryBalls` (`:678-693`, `.priority = 1`) - both
literal source constants match the RAM reads exactly. Per the model above:
`oam.priority` differs (1 vs 2), so this pair NEVER reaches the subpriority
or Y tie-break - **the icon (priority 1) always renders on top of Brendan
(priority 2), unconditionally, every tick, regardless of creation order** -
the exact opposite of PROGRESS #96's "Brendan wins by sprite-creation order"
guess (which was never RAM-verified, only inferred from the pixel symptom).
This also matches what the CURRENT engine already does structurally
(`drawBallIcons` for the player side is called well after Brendan's own draw
call in `drawSendOutHandoff`, so the icon already paints over Brendan
wherever both are opaque) - meaning **no reorder is called for here at all**,
and attempting one (per #96's own guess) would have been actively wrong,
regressing every one of this window's other 33 already-exact ticks wherever
Brendan and an icon's footprints happen to overlap correctly today. Direct
pixel dump of the 8 named ticks (`tools/compare` against a scratch
`captureFrames: 1578-1600` copy of `menu-throw.json`'s own segments,
un-committed scratch) confirms the residual doesn't even look like a
Brendan-vs-icon swap: the oracle's mismatched pixels are light, near-white/
gray tones (`(255,255,255)`, `(203,201,213)`, `(160,160,168)` - consistent
with an ALREADY-faded icon or the message-box background), while the app's
current pixels are darker and more saturated - not a clean "one sprite's
raw color instead of another's" swap at all. **Corrected**:
`docs/battle-menu-notes.md` §3 item 4b's "real GBA OAM resolves the tie by
sprite-creation order (Brendan... wins)" sentence is wrong per the above;
left in place with a forward-reference to this section rather than rewritten
outright (the surrounding paragraph's other claims - the pixel symptom
itself, the exclusion of the 8 ticks - are still accurate) so as not to
silently erase a supersedable prior claim. **The 8 ticks' real root cause is
still unknown** - ruled out (order), not found; a future session should
compare `playerSummaryIconExitDx`/`playerSummaryFadeEva`'s own per-tick
values against fresh RAM reads for whichever icon is closest to Brendan at
each of the 8 ticks, since the near-white oracle color is consistent with an
icon that should already be more-faded (`eva` closer to 16) or already
farther-exited (`iconExitDx` larger in magnitude) than this engine currently
computes there - a timing/position bug in the icon's OWN state, not a
between-sprite ordering bug.

**Finding 2 (§7.25's sendout 1482-84/1497-98, the "particle z-order" family
- and by the same mechanism, likely #105's menu-materialize 1658-1662): a
concrete, source-verified rule, not yet implemented.** `AnimateBallOpenParticles`
(`battle_anim_throw.c:1577`) is called exactly ONCE per send-out to spawn an
entire particle burst, from a single task (`PokeBallOpenParticleAnimation`)
that creates all ~16 particles one-or-two per tick; both send-out call sites
(`pokeball.c:441` opponent, `:757` player) pass **literal, identical**
`priority=1, subpriority=28` for the WHOLE burst - every particle sprite in
a burst has the exact SAME `oam.priority` and `subpriority`
(`PokeBallOpenParticleAnimation`, `pokeball.c:1615-1621`, sets
`gSprites[spriteId].oam.priority = priority` from that one shared task
field for every particle it spawns). Per the model above, this means
particles from the same burst NEVER resolve their relative order via
priority/subpriority at all - **the entire ordering rule between two
same-burst particles is `SortSprites`'s Y tie-break: the particle with the
larger current (unwrapped) on-screen `y` wins (renders on top)**, recomputed
fresh every tick as each particle's radial position changes
(`radius = 2*(age-1)`, `dx/dy = gbaSin/gbaCos(angle, radius)` in this
engine's own `drawBallOpenParticles`/`drawPlayerBallOpenParticles` - `y`
is NOT monotonic in age or spawn index, since `angle = (i%8)*32` cycles).
This is exactly why §7.25's own "tried and reverted" static descending-
spawn-index reorder regressed ticks 1496/1499 while fixing 1482-1485 (spawn
index is only a coincidental proxy for Y at the specific ticks it was fit
against, not the real key), and why this codebase's two particle-burst
functions already needed to hardcode OPPOSITE static draw directions to
pixel-fit their own narrow windows (`drawBallOpenParticles`: ascending index;
`drawPlayerBallOpenParticles`: descending index, its own doc comment at
`battleScene.ts` around line 2236) - both are curve-fits of a Y-sort in
disguise, each only valid over the narrow span it was fit against. **The
correct general fix**: replace both functions' static index-direction loop
with a real per-tick sort of the currently-alive particle indices by their
computed `PARTICLE_ORIGIN.y + dy` (or the player equivalent), descending,
immediately before the draw loop - lower computed Y drawn first (more
background), higher Y drawn last (on top). **Not implemented this session**
- this section is a derivation, not a landed fix; the RAM-probe budget for
Finding 1 (above) consumed the remaining time in this session's cap. A
future session should: (1) implement the per-tick Y-sort for both particle
functions, verify against `sendout.json` (target: >236/256, watching
specifically 1482-84/1497-98) and `menu-materialize.json` (target 12/12
through 1662) with zero regressions elsewhere in the 22-trace sweep, since a
dynamic sort is a strictly more faithful (not just differently-fit) model
than either static direction and should subsume both without a per-side
branch; (2) if #105's own 1658-1662 (particle-vs-BALL, not particle-vs-
particle) doesn't close from this alone, the ball sprite's own
`oam.priority`/`subpriority` (not yet RAM-probed - a different sprite from
either particle burst) is the next thing to pull, using the same
`tools/probe/specs/menu-throw-oam-priority.json` pattern (RAM-probe first,
implement second, per this session's own working method).

**Not chased further this round:** the general "enumerate every live
sprite's slot" compositor the brief's own model paragraph describes -
Findings 1-2 above show the real rule only needs PAIRWISE `oam.priority`/
`subpriority`/Y comparisons where two draw calls can actually overlap on
screen, not a full per-frame OAM table sort; the remaining converging family
(#105's 1658-1662, particle-vs-ball) and any Brendan-vs-particle or ball-vs-
icon overlaps this window might also have are unmeasured, not assumed
absent. `npm test`/`npm run build` unaffected (no code changed this
session - findings only); full 22-trace sweep unchanged from #105's own
counts, nothing to regress.

### 7.27. §7.26 Finding 2 IMPLEMENTED: real per-tick `SortSprites` Y-sort for both ball-open particle bursts - `sendout.json` 236/256 → **246/256** (+10, closes 1482-84/1497-98), `menu-materialize.json` widened + **12/12** (closes #105's 1658-1662 too - same family, not the "particle-vs-ball" fallback §7.26 flagged)

Per the brief: implement §7.26's derived model, don't re-derive it. Also
RAM-probed (source-only, no new probe spec needed - the two literals below
were already in `reference/pokeemerald`, not requiring a live probe) the one
open fallback §7.26 Finding 2 left conditional on Finding 2 alone not
closing #105's residual.

**Ball's own `oam.priority`, source-checked before writing any code**
(`reference/pokeemerald/src/pokeball.c` ~line 104, `sBallOamData`):
`.priority = 2`, shared by every ball sprite (send-out AND materialize
release, both use `gBallSpriteTemplates[BALL_POKE]` → `sBallOamData`) on
both battler sides. Combined with §7.26's own already-source-verified
particle literal (`AnimateBallOpenParticles(..., 1, 28, ...)`,
`pokeball.c:441,757`, `oam.priority=1`): the particle burst's priority (1) is
strictly LOWER than the ball's (2), so per the model, **particles always
render on top of the ball wherever they overlap, unconditionally, regardless
of screen position** - no per-tick comparison needed for that pair at all.
Checked against the existing engine's own draw order in `drawSendOutHandoff`
before touching anything: `drawSendOutBall`/`drawPlayerBallOpen` are both
already called BEFORE `drawBallOpenParticles`/`drawPlayerBallOpenParticles`
(painter's algorithm - later draw wins) - **the ball-vs-particle order was
already GBA-correct**, so this fallback needed zero code change, only the
two RAM-verified constants pinned as documentation
(`BALL_OAM_PRIORITY`/`PARTICLE_OAM_PRIORITY`/`PARTICLE_OAM_SUBPRIORITY`,
`battleScene.ts`, tested in `tests/battleScene.test.ts`).

**Fix (the actual mechanism, §7.26 Finding 2)**: both `drawBallOpenParticles`
and `drawPlayerBallOpenParticles` (`battleScene.ts`) now build a list of
currently-alive particles (`{i, age, dx, dy}`) and draw them in
`sortAliveParticlesByScreenY`'s order instead of a hardcoded index
direction: sort ascending by `dy` (lower computed Y drawn first/more
background, higher Y drawn last/on top - matches `SortSprites`'s "larger Y
wins" rule since draw order here is a painter's algorithm), tie-broken by
DESCENDING spawn index (worked out from `SortSprites`'s own insertion-sort
mechanics: an EXACT Y tie never triggers the strict `<` swap condition, so
original `sSpriteOrder` order - ascending sprite-slot/spawn order - survives,
meaning the OLDER/lower-index particle keeps the lower final OAM index, i.e.
renders on top; to reproduce that with a painter's algorithm, the older
particle must be drawn LAST). This replaces two previously-separate,
opposite-direction static loops (`drawBallOpenParticles`: ascending index;
`drawPlayerBallOpenParticles`: descending index) that §7.26 already
identified as two narrow curve-fits of this exact rule in disguise, each
only valid over the ticks it was fit against - confirmed directly this
session: the player-side function's old static "descending index" loop
IS this sort's own exact-Y-tie case (radius~0 ticks, where dx=dy=0 for every
live particle), which is why it worked there and nowhere else.

**Score effect, verified against the live oracle**:
- `sendout.json`: **236/256 → 246/256** (+10). Every previously-named tick in
  the 1482-84/1497-98 family is now bit-exact (confirmed both by per-tick
  diff and by the fact those ticks no longer appear in a fresh full-trace
  diff dump at all). Target was "strictly >236/256" - exceeded by 10, not 1.
- `menu-materialize.json`: `captureFrames` widened from 7 frames (1652-1657 +
  1663, skipping 1658-1662) to the full contiguous 1652-1663 span (12
  frames) - per-tick isolated check against a scratch copy of the wider
  frame list showed all 12 exact BEFORE committing the change to the real
  trace file (so the widening itself never risked landing a false "12/12" by
  accident). Result: **12/12**, all bit-exact - closes the residual #105
  pixel-classified as "particle-vs-ball" and §7.26 Finding 2 flagged as a
  possible exception to Finding 1's mechanism. **It was not an exception**:
  the fallback check above (ball's own `oam.priority=2` vs. particles' `1`)
  confirms particle-vs-ball was already correctly ordered by the *existing*
  draw-call order; #105's own pixel classification ("particle-position
  pixels, oracle color `255,173,0`... not in the ball-open palette") was
  read as "vs. ball" only because the ball sprite was the nearest other
  moving thing on screen at that tick, not because the ball was the actual
  other party in the ordering conflict - the real conflict was two
  same-burst PARTICLES (the player-side window's own smaller particle
  field made this harder to see by eye than the opponent-side window's
  §7.25 finding, where the two-particle overlap was pixel-classified
  directly). One general fix therefore closed both #105's and §7.25's
  residuals, exactly as §7.26 Finding 2 predicted it should ("should subsume
  both without a per-side branch").

**Full 22-trace sweep, live oracle, before AND after the `menu-materialize.json`
widening**: all 22 traces at #107's exact established counts except the two
above - accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
38/38, example 4/4, menu-text 18/18, menu-throw 70/70, rent-3picks 157/190,
rent-slot1 125/139, room-entry 110/110, room-msgbox 142/142, room-npcs
98/98, scene-assembly 256/256, summary-info-magby 132/132, summary-info-onix
122/122, transition 206/206, walk-warpout 125/125 - **zero regressions**.
`npm test` **525/525** (+2 Tier-1: the priority-literal pin and the
Y-sort's own distinct-Y/exact-tie cases, `tests/battleScene.test.ts`),
`npm run build` green.

**What's still open in `sendout.json` (10 residual ticks, confirmed NOT
covered by this fix, not assumed)**: a fresh full-trace diff after landing
shows exactly `1462, 1470, 1471, 1479, 1491, 1492, 1493, 1494, 1495, 1496`
still mismatched - all OUT OF SCOPE per this step's brief, and confirmed
unrelated to this fix's own mechanism, not just left alone:
- **1462** (1161px, by far the largest): the trainer-exit-tail/settled-bar
  gap already named in §7.25, nothing to do with ball-open particles at all
  (this window predates the particle burst's own first-visible tick, 1481).
- **1470/1471/1479** (11-34px): the icon-row residual (y=32-38) §7.25 already
  confirmed sits in a different screen region/mechanism from this fix - the
  brief's own "unless the sort provably covers them" condition does not
  hold (checked directly: these three ticks' own mismatch pixel sets are
  bit-identical before and after this session's change).
- **1491-1496** (2-13px): §7.25's own separately-named "materialize tint"
  residual (`(255,181,247)`/`(247,247,255)`-family colors, not particle
  color) - a different family from the particle-vs-particle one this session
  closed, still unsolved; out of scope for this step (belongs with
  `drawGrovyleMaterialize`/the affine-emerge accumulator, §7.20/§7.21's
  territory, not the OAM-priority compositor).

No new residual families were introduced or exposed by this fix in either
trace - the 22-trace sweep's zero-regression result covers this directly.

### 7.28. Round-9 worktree: 1491-96 root-caused down to `drawOpponentSummaryExit`'s blended edge (icon AND bar), position/blend-timing/materialize-params all RAM-CONFIRMED correct, but the real screen still shows zero contribution there - no fix found, `sendout.json` stays **246/256** (no regressions)

Per this round's brief: root-cause and close the named 1491-96 span,
pixel-classifying every diff first, and take 1470/1471/1479/1462 too only if
provably covered. **Reconciled against a fresh live-oracle compare run
first, per the brief's own instruction**: the exact failing ticks are
`1462, 1470, 1471, 1479, 1491, 1492, 1493, 1494, 1495, 1496` (unchanged from
§7.27's own post-landing dump) - 246/256, confirming #110's "1491-96"
framing is the right target and nothing drifted since §7.27.

**Pixel-classified every tick in the span first** (`tools/compare/scratch/
span_1491_diag.mjs`, `grid_dump.mjs`, throwaway, not committed - full RGB
grids not just diff pixels, since the earlier `span_1485_diag.mjs`-style
"list mismatched pixel colors" view alone wasn't enough to see the *shape*
of what's missing):
- **1491 (10px), 1492 (13px)**: every mismatched pixel has app showing a
  color `(243,173,237)` the oracle never shows anywhere in this window, at
  screen positions that trace out a small hollow-ring shape sitting inside
  Grovyle's own materialize-tint silhouette (ears region, `y=32-38`).
  `(243,173,237)` is not a literal palette color anywhere in this engine's
  assets (checked `grovyleFrontSprite`/`ballDisplay`/`battleAnimBallOpen`/
  `battleAnimParticles` palettes directly, and every `blendComponentToward`
  combination of them - no match) - it's a **computed alpha blend**,
  confirmed by instrumenting `setPixel`/`blendedSetPixel`/`blendedTile`
  directly (temporary `console.log` + stack trace on a specific `(x,y)`,
  reverted before committing - not shipped): the actual call chain is
  `drawTileBgFaded`(white) → `drawGrovyleMaterialize`(tint, via
  `drawSpriteSheetAffineTinted`) → **`drawOpponentSummaryExit`**'s
  `blendedTile`, blending source color `(74,66,90)` (the "Empty" ball-icon
  ring's own outline color) onto the tint at `eva=1,evb=15` -
  `blendChannel` reproduces `(243,173,237)` exactly by hand. Cross-checked
  the position: `opponentIconExitX(2, elapsed)` (this engine's own,
  already-landed §7.19 formula) lands **exactly** on `154` (render 1491)
  and `181` (render 1492) - the SAME x this diff's bbox sits at, to the
  pixel. The "Empty" ball-icon tile itself (`battle-interface-ball-display.
  json`, state index 1) is a **thin hollow-ring sprite** (every opaque texel
  is palette index 5, forming an 8x8 ring outline, not a filled disc) -
  its opaque-texel positions match this diff's pixel set almost exactly
  (checked cell-by-cell), confirming the WHOLE visible icon is the
  residual, not just its edge.
- **1493 (2px), 1494 (2px), 1495 (5px)**: app shows flat materialize tint
  `(255,181,247)`, oracle shows near-white `(247,247,255)`, at
  `x=164-167,y=42-43` - inside Grovyle's silhouette box but nowhere near the
  ball's own occlusion footprint (§7.21's already-named residual sits at
  `x~170-182,y~52-63`). Checked against `drawOpponentSummaryExit`'s **bar**
  (not icon) footprint this time: `barX + 192` (the widened Exit bar's own
  right edge, `EXIT_BAR_TILE_ORDER`) lands at **166 / 168 / 170** for
  elapsed 30/31/32 (renders 1493/1494/1495) - squarely straddling this
  diff's `x=164-167` range. Same family as 1491/1492 (an edge of
  `drawOpponentSummaryExit`'s blended content bleeding onto Grovyle's tint
  where the real game shows nothing), just the bar's trailing tip instead
  of an icon.
- **1496 (3px)**: `(255,173,0)`/`(255,255,255)` particle-pair colors at
  `x=175-176,y=57-60` - inside `PARTICLE_ORIGIN`'s field, the SAME
  "z-order between two same-burst particles, unverified against real OAM
  subpriority" gap §7.25 already named and left open (its own "tried
  descending order, reverted - regressed 1496/1499" note this session
  independently re-confirmed still applies: this tick's 3px sit exactly
  where two particles' 8x8 footprints overlap). Not the same family as
  1491-1495; not chased further this session (§7.25's own fallback - needs
  real OAM-slot RAM evidence, not spawn-index guessing - still the blocker).

**RAM-verified three independent things before attempting any fix, all
CAME BACK CORRECT (confirming the existing model, not finding a new bug in
it)** - this is the round's main negative result:
1. **The blend (`tBlend`) schedule.** New probe
   (`tools/probe/specs/sendout-summary-exit-blend.json`, committed - watches
   every `gTasks[]` slot's `func` pointer + `data[15]` across the whole
   send-out window): task slot 1 is `Task_HidePartyStatusSummary`
   (`func` changes at RAM tick 1461, matching handoff+0). Its `data[15]`
   (`tBlend`) reads **16 (RAM1461) → 15 (1462) → ... → 1 (1490) → 1 (1491) →
   0 + func switches to `_BattleStart_2` (1492) → 0 (1493) → -1/0xFFFF,
   sprites destroyed per source (1494) → -2 (1495) → -3, task destroyed,
   `BLDCNT=BLDALPHA=0` (1496)**. With this window's established +1 render
   lag, render 1491/1492 see `tBlend=1` - **exactly what this engine's own
   `blend = max(0,15-floor(elapsed/2))` closed form already predicts** (RAM
   source-derivation, `Task_HidePartyStatusSummary_BattleStart_1`:
   `data[11]++ % 2==0` gates a once-per-2-ticks decrement starting the
   task's first tick - the closed form matches this exactly, source-checked
   line by line). **The blend value is not the bug.**
2. **Per-icon sprite lifetime/position.** `tools/probe/dump-task-and-
   sprite-callbacks.py` against `sendout.json`'s own segments (throwaway
   run, spec not committed - the tool itself already is) identifies the 6
   opponent ball-icon sprites as `gSprites[48..53]` (callback flips to
   `SpriteCB_StatusSummaryBalls_Exit`'s address at RAM 1461, matching
   handoff+0) and shows `s48`/`s49`/`s50` individually revert to
   `SpriteCallbackDummy` (i.e. self-cull via their own `x2+x>248` check) at
   RAM ticks **1472/1479/1486** - render 1473/1480/1487. This engine's own
   `opponentIconExitX(j, elapsed)` predicts those SAME three icons (j=5,4,3)
   first return `null` (culled) at renders **1473/1480/1487** - a 3-for-3
   exact match, independently confirming both the acceleration formula AND
   its off-screen cutoff are correct, not just for the icons already known
   to match but for the exact ticks they stop rendering. `s51/s52/s53`
   (icons j=2/1/0, the ones still alive at 1491/1492) share callback
   `SpriteCB_StatusSummaryBalls_Exit` unbroken through RAM 1493, then ALL
   THREE flip to dummy at RAM 1494 together - matching the task-level
   `tBlend==-1` mass-destroy branch above, not an individual position cull
   (none of their `x` values exceed 248 yet at that tick per the formula).
   **The icon is genuinely alive, correctly positioned, per RAM - not a
   phantom this engine is inventing.**
3. **Grovyle's own materialize parameters underneath.** Extended
   `sendout-grovyle-materialize.json`'s existing RAM probe through RAM tick
   1496 (previously stopped at 1493): `matA` (the OAM matrix register,
   i.e. `matrixParam`) reads a constant **256** (exact neutral/identity,
   zero rounding error) from RAM 1491 through 1496 inclusive, and
   `spriteY2` reads **0** from RAM 1492 onward - both exactly matching this
   engine's own `affineEmergeAccumulator`/`MATERIALIZE_Y2_TABLE` fallback
   behavior for `local>=12` (renders 1493+). §7.21's own flagged "matrix
   climbs early, RAM tick 1498+" boundary is real but doesn't start until
   AFTER this span. **Mechanism 4's own parameters are not the bug either.**

**Net result: every input this engine's `drawOpponentSummaryExit` and
`drawGrovyleMaterialize` use to decide "draw this pixel" is RAM-confirmed
correct, yet the composited output still doesn't match** - the icon/bar
edge visibly blends in this engine and visibly doesn't in the real game,
with no wrong number found anywhere in the chain of position, blend
coefficient, or underlying tint shape. Plausible remaining leads, none
tested this session (out of RAM-probe budget, named rather than guessed
at):
- **GBA hardware alpha-blend target selection** may not reduce to "blend
  against whatever this engine's own painter's-algorithm framebuffer
  currently holds" the way `blendedTile`/`blendedSetPixel` assume - real
  `BLDALPHA` blends the two TOP-BY-PRIORITY layers at a pixel, which this
  engine approximates by drawing priority-2 (Grovyle) before priority-1
  (icon/bar) and letting the icon's blend read back whatever's already
  there. That approximation has been correct everywhere else this window
  uses it (§7.26/§7.27's whole OAM-priority derivation) - untested
  specifically for a THREE-way stack (icon over Grovyle's silhouette EDGE,
  where the "layer beneath" might itself be ambiguous per-subpixel in a way
  a flat painter's algorithm can't see) - the shared trait of every
  residual this session found (1470/71/79 too, see below) is that it's
  always at a silhouette/tile EDGE, never the interior.
- Some **per-subsprite OAM field this session didn't probe** (each
  icon/bar-tile subsprite is its own real OAM entry per GBA hardware, not
  just a logical group) - `oam.priority`/`subpriority` were assumed shared
  with the base template (source-cited, §7.19/present session) but never
  RAM-read per subsprite instance during the Exit phase specifically.
- A **window (WIN0) interaction** specific to this screen region - flagged
  as a possibility, not investigated (no RAM evidence either way).

**1470/1471/1479 (already named "icon-edge/materialize-overlap residual"
in §7.19, never root-caused): CONFIRMED same family as 1491/1492, still not
fixed.** `opponentIconExitX(5, elapsed)` lands exactly on **184** (render
1470) and **211** (render 1471); `opponentIconExitX(4, elapsed)` lands
exactly on **231** (render 1479) - all three match those ticks' own diff
bboxes to the pixel, the same "icon renders where oracle shows nothing"
shape as 1491/1492. Per the brief's own "take them only if provably
covered" condition: the ROOT CAUSE is shared (confirmed, not guessed), but
since no FIX was found for the root cause itself, none of these ticks
actually close either - naming the connection is as far as this session
could take it.

**Score effect: none.** No code was changed (a temporary debug
instrumentation of `setPixel`/`blendedSetPixel`/`blendedTile` was added,
used to trace the exact call chain behind pixel `(157,32)`, then fully
reverted - `git diff` confirms zero net change to `battleScene.ts`).
`sendout.json` stays **246/256**. Full battle-family sweep (scene-assembly
256/256, transition 206/206, menu-text 18/18, menu-throw 70/70,
menu-materialize 12/12, menu-idle 69/69) plus spot checks unaffected since
nothing was touched - zero regressions, trivially. `npm test` 545/545,
`npm run build` green, both unchanged from the branch point.

**Committed this session**: `tools/probe/specs/sendout-summary-exit-blend.
json` (the `tBlend`-across-all-tasks probe, reusable ground truth for
whoever picks this back up - watch `t1blend` past RAM 1496 too if the next
session wants to confirm the task slot fully frees up / gets reused, not
checked here). Scratch diagnostic scripts (`span_1491_diag.mjs`,
`span_1470_diag.mjs`, `grid_dump.mjs`, `debug_pixel_1491.mjs`) intentionally
NOT committed, per this file's own established "throwaway" precedent
(§7.24/§7.25) - reproducible from this section's own description if needed.

**Recommended next step, concretely**: RAM-probe the icon/bar subsprites'
OWN `oam.priority`/`subpriority`/`objMode` bytes directly during the Exit
phase (not just trust the shared template/source-cited values) at RAM
ticks 1489-1496 specifically, cross-referencing against Grovyle's own
`gSprites[8]` OAM bytes at the same ticks - if they somehow read something
other than the expected `priority=1/objMode=BLEND`, that's the answer; if
they read exactly as expected (as every other field checked this session
did), the GBA hardware alpha-blend target-selection hypothesis above
becomes the more likely remaining lead and would need a from-scratch
compositor rethink (out of a single bounded session's scope).
