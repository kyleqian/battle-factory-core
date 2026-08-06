# Fight-menu chrome ground truth (ISSUES #81 remainder / #78 residual (3))

Ground-truth receipt for the torment fixture's fight-menu residuals
(`tools/compare/traces-groundtruth/fight-menu-chrome-torment-off.json`, app stage
`mechanic-selection-reject-torment-off`). Measured against the Battle Scene OFF
oracle on `tools/battle-lab/mechanic-selection-reject-torment-off.json` (seed 1,
BUTTERFREE vs MURKROW, turn-2 action menu interactive at fixture frame 734).

**Summary verdict (per class):**
1. The "move-target arrow pink-vs-cyan" (ISSUES bbox y21-28 x55-59) is **not a
   move-target arrow and not baked-in-wrong**: it is the opponent healthbox's
   male gender glyph, and it is **already green** on this fixture (fixed by the
   `personality: 150` pin on MURKROW in the app stage). There is no arrow diff
   anywhere in the fight menu. The `fight-submenu-window.json` harvest's arrow
   (the `MoveSelectionCreateCursorAt` cursor) is byte-exact on every settled
   frame. **Nothing to fix.**
2. The "detail-box type cell" (y80-87 x184-199) is **not a type cell**: it is
   the **player-healthbox gender glyph** for BUTTERFREE, rendered at
   (190-194, 79-87) inside the player healthbox at (126,72). Oracle draws the
   **male** glyph (66,206,255); the app draws **female** (255,156,148) because
   the staged `BUTTERFREE_TORMENTED_LV50` omits `personality` (defaults 0 →
   female). Fix = appTrace.ts (off-limits this round): give BUTTERFREE a
   personality whose low byte ≥ genderRatio (127), e.g. `personality: 150`
   (same trick MURKROW already uses).
3. The "type-name text" (y120-135 x205-215) is **not the type text**: it is the
   **TACKLE PP digit** at (208-213, 124-133) in the fight submenu's
   `B_WIN_PP_REMAINING` window. The oracle shows **"34/35"** (TACKLE used once
   on turn 1 → currentPP 34); the app stages `pp: [35, 35, 0, 0]` and renders
   **"35/35"**. Fix = appTrace.ts (off-limits this round): stage currentPP 34.
   The type label + type name row (`TYPE/NORMAL`, row 2) is byte-exact already.
4. **Dynamic (ground truth only this round).** The "A-press highlight"
   (~1776px, y74-110 x127-229, frames 766-769/987-1000) and the "sprite-bounce
   phase" are **one phenomenon**: the real game runs `SpriteCB_BounceEffect`
   (`DoBounceEffect(BOUNCE_MON, 7, 1)`, `battle_main.c:2899`) which steps the
   battler sprites' `y2` between 0 and +1 on a **~36-frame period (18-frame
   phases)**. The app instead applies the battle-1-calibrated `menuIdleBounce`
   sine with the wrong phase/amplitude, and only to the player sprite/healthbox.
   Section 5 has the full per-frame schedule; section 6 the source citation.

Plus one out-of-scope pre-existing residual found along the way: the opponent
healthbox HP-bar end cap (12px at (94,33)-(99,34), every frame) — the app's
`composeOpponentHealthbox` fills the bar's last 6px (x94-99) with glossy green
while the oracle shows the frame's dark groove (74,66,90) there. Lives in
`src/engine/healthboxAssembly.ts`, not the fight menu.

---

## 1. Method

Compare trace `fight-menu-chrome-torment-off` mirrors
`mid-battle-switch-dense-a-off.json`'s structure (`appRoute`
`generated-orchestrator`, `oracleProfile` `battle-scene-off`, `appStage`
`mechanic-selection-reject-torment-off` at frame 734, `oracleBattleLab` on the
committed fixture, verbatim segments) and adds `captureFrames` over:

- settled fight-menu spans: 734, 736, 740, 750, 760-765, 977, 978-986,
  1010, 1020, 1040, 1042-1044, 1050, 1100, 1200;
- the rejection typing/hold: 770, 780, 800, 820, 831, 833, 850, 900, 950, 965;
- dynamic ground-truth windows: 766-769 and 987-1000.

Run: `npm run compare -- fight-menu-chrome-torment-off --summary`. Current
state (before the appTrace fixes, which are out of this round's ownership):

| Frame | Diff px | Attribution |
| ---: | ---: | --- |
| 734 | 36 | HP-bar cap 12 + gender 24 |
| 760-764 | 929 | BUTTERFREE bounce 857 + gender 24 + HP cap 12 + ~36 micro (see §5.3) |
| 765 | 72 | HP cap 12 + gender 24 + PP digit 36 |
| 766-769 | 1828 | = 765's 72 + MURKROW y2=+1 1776 (A-press phase) |
| 770-831 | 1792/893 | message box on; MURKROW y2 toggles (see §5.2) |
| 977 | 36 | frozen box: HP cap + gender only (PP digit gone, message up) |
| 978-986 | 929/72 | reopened menu, same as 760-765 window |
| 987-1000 | 1828/72/929 | second A-press highlight, same classes |
| 1010 | 1831 | MURKROW y2=+1 during RIGHT nav |
| 1042-1044 | 1795 | A-select GUST, MURKROW y2=+1 |
| 1050 | 36 | resolution: HP cap + gender only |
| 1100-1200 | 858/684 | resolution field, MURKROW y2=+1 + HP cap + gender |

No frame shows any diff inside the fight-submenu chrome (border, cursor arrow,
move names, PP label, `TYPE/`+type name) other than the class-3 PP digit.

## 2. Class 1 — "move-target arrow": no arrow, already green

ISSUES bbox (55,21)-(59,28) is the **opponent healthbox male gender glyph**
(the MURKROW healthbox is at (12,14)-(140,46); nickname "MURKROW" + male glyph
at (55,21)-(59,28)). The app's frame matches the oracle byte-for-byte at that
bbox on **every** frame 734-1344 (sampled 734/760/765/766/987/1000) — the
`personality: 150` pin already fixed it (male for MURKROW, genderRatio 127:
`127 > 150` is false → male, `pokemon.c:3471`).

There is **no** move-target arrow in a single battle. `HandleInputChooseMove`
(`battle_controller_player.c:471`) only computes a move target for the
`SpriteCB_ShowAsMoveTarget`/`SpriteCB_BlinkVisible` path in **double** battles
(line 503 `!gBattleBufferA[gActiveBattler][1] // not a double battle` gates it
to FALSE here). The fight menu's cursor arrow is `MoveSelectionCreateCursorAt`
(BG-tilemap mechanism, `battle_controller_player.c` + `battle_interface.c`),
and it is byte-exact (the compare's only submenu residual is class 3).

The harvest (`src/assets/gen/fight-submenu-window.json`) bakes one static patch
per cursor slot; its four slots share the border chrome and differ only in the
per-slot text and the cursor arrow. The arrow IS context-dependent in the
harvest (one baked position per slot) — and it is **correct**: oracle-verified
against `battle1-fight-submenu-nav.json` at the harvest's own `SLOT_TICKS`
(1900/1918/1940/2010), the arrow sits at row1-left (slot 0), row1-right (slot
1), **row2-right (slot 2)** and row2-left (slot 3) — the fight menu's second
row is reversed, matching `MoveSelectionCreateCursorAt`
(`battle_controller_player.c`). The app blits the harvest and its arrow
renders byte-exact at both cursor-0 and cursor-1 on the torment fixture (the
RIGHT-nav frame 1010 and the settled frame 1020 are submenu-byte-exact). So
there is no "context-dependent arrow baked by a bad harvest tick": the per-slot
harvest is the correct model.

## 3. Class 2 — "detail-box type cell": the player healthbox gender glyph

- Position: (190-194, 79-87), 24 px, inside the player healthbox at (126,72)
  (name "BUTTERFREE" at x140-190; glyph right after the name).
- Oracle: **male** glyph (66,206,255 fg / 222,214,181 shadow, healthbox
  `GENDER_SYMBOL_FG` male=11, `healthboxAssembly.ts:432`).
- App: **female** glyph (255,156,148) because the stage's
  `BUTTERFREE_TORMENTED_LV50` has no `personality` → defaults 0 →
  `getMonGender(127, 0)` = female (`monGender.ts:17`; ROM `pokemon.c:3471`
  agrees: `127 > 0` → MON_FEMALE).
- The oracle's BUTTERFREE is **male**: the fixture itself pins
  `"gender": "male"` on `overrides.parties.player[0]` (species 12, BUTTERFREE
  genderRatio 127). The appTrace comment claiming "female matches the oracle"
  is wrong.
- **Fix (appTrace.ts, out of this round's ownership):** add `personality: 150`
  (or any low byte ≥ 127, e.g. 150) to `BUTTERFREE_TORMENTED_LV50`, mirroring
  MURKROW's pin. Tier-1: `tests/fightMenuChromeGroundTruth.test.ts` pins
  `getMonGender(127, 0) === "female"` and `getMonGender(127, 150) === "male"`.

## 4. Class 3 — "type-name text": the TACKLE PP digit ("4" vs "5")

- Position: (208-213, 124-133), 36 px, in `B_WIN_PP_REMAINING`
  (`ROCK_SLIDE_PP_REMAINING_ORIGIN`, `battleMenu.ts:2622`). The row-1 right
  column of the fight menu is `[35/35]` at x202-231 in the app but
  `[34/35]` in the oracle — the **second glyph** is a "4" in the oracle, a "5"
  in the app (fg bitmap match: the oracle glyph at x208-213 is font "4").
- Root cause: turn 1 used TACKLE (BUTTERFREE's last move / banned slot), so the
  oracle's live `currentPP[0]` is 34. The app stage installs a checkpoint at
  frame 734 with `pp: [35, 35, 0, 0]` (full) and never models turn 1's PP
  consumption.
- The type display is **not** the residual: `TYPE/` + `NORMAL` (row 2,
  y140-149) is byte-exact on every frame; `TYPE_DISPLAY_NAMES`/the FONT_NORMAL
  splice are correct.
- **Fix (appTrace.ts, out of this round's ownership):** stage
  `pp: [34, 35, 0, 0]` on `BUTTERFREE_TORMENTED_LV50`. Tier-1:
  `ppRemainingGlyphCodes(34, 35)` produces the `['3','4','/','3','5']` code
  sequence (already the renderer the fix lands through).

## 5. Class 4 — the A-press highlight / sprite-bounce dynamic (ground truth)

### 5.1 What it really is

The "A-press highlight" (1776 px at frames 766-769/987-1000, bbox
y74-110 x127-229) and the "sprite-bounce phase" are the **same mechanism**:
the battler sprites' `y2` offset steps between 0 and +1 on a fixed cadence. The
1776 px = the whole MURKROW sprite shifting 1 px (its opaque pixels move up,
the bottom edge reveals the field). It is **not** a palette swap, a fill, or a
window highlight.

Per-frame sprite top row (dense oracle captures, MURKROW body top):

| Frames | y2 | Note |
| ---: | ---: | --- |
| 734-746 | +1 | action menu open (A-press at 734-735 opens the move menu) |
| 747-765 | 0 | move menu idle — **static** (760-765 byte-identical, §5.4) |
| 766-783 | +1 | A-press → rejection message begins |
| 784-801 | 0 | |
| 802-820 | +1 | |
| 821-838 | 0 | |
| … | … | continues through the 833-977 hold |
| 967-986 | 0 | reopened move menu (byte-identical to pre-rejection) |
| 987-1000 | +1 | second A-press highlight |
| 1010-1020 | 0 | move menu after RIGHT nav |
| 1030-1040 | +1 | |
| 1042-1043 | +1 | A-select GUST |
| 1045 | 0 | |
| 1050-1344 | +1 | turn-2 resolution and beyond |

BUTTERFREE (player, bottom-left) oscillates on the **same** cadence in sync
(~857 px = its smaller silhouette). The player healthbox at (126,72) stays
**static** (top border y76 the whole window).

### 5.2 Mechanism

`HandleInputChooseAction` (`battle_controller_player.c:238-239`) calls
`DoBounceEffect(gActiveBattler, BOUNCE_MON, 7, 1)` while the player is in a
waiting state. `DoBounceEffect` (`battle_main.c:2899`) spawns an invisible
sprite with `SpriteCB_BounceEffect` (`battle_main.c:2967`), which drives
`gSprites[bouncerSpriteId].y2 = Sin(index, 1) + 1` and advances
`sSinIndex += 7`. With amplitude 1, `Sin(index,1) = gSineTable[index] >> 8` is
only -1 or 0 (table max 255 >> 8 = 0), so `y2` is exactly **0 or +1**, and the
sine's half-period is 256/7/2 ≈ **18.3 frames** — matching the observed 18-frame
phases exactly (square-ish wave, 50 % duty). The sprite is never hidden; it
only moves 1 px.

### 5.3 What the app does (the mismatch)

The generated-route fight menu draws the field via
`drawBattle2ActionMenuWindow` with `menuIdleBounce` (`battleMenu.ts:825`) —
the battle-1 ONIX-calibrated `bounceSin(onixSinIndex(n)) + 1` — and applies
`bounce.onixY2` to the **player** sprite and `bounce.healthboxY2` to the
**player healthbox** (`battleScene.ts:7169-7200`). Consequences on this
fixture:

- The app bounces the **player sprite** during the move menu (raised at
  760-764, 857 px diff vs the oracle's static pose; neutral at 765), and bounces
  the **player healthbox** too — the oracle's healthbox is static.
- The app does **not** apply any y2 to the **opponent** sprite, so MURKROW's
  y2=+1 phases (766-783, 987-1000, 1042-1043, 1050+) show as 1776 px diffs.
- Both problems are phase/value: the mechanism (bounce sine + `+1`) is already
  the right family; the phase and which-sprite/healthbox it applies to are the
  battle-1 hardcode.

### 5.4 Move-menu sprites are static — but only because of phase

Oracle frames 747-765 are byte-identical (dense-verified), i.e. the settled
move-menu idle lands entirely in the y2=0 half of the same oscillator — not a
separate "freeze" rule. The ISSUES phrasing "the oracle's move-menu sprites
appear static" is true for the sampled 760-765 window; the general truth is the
§5.1 schedule.

## 6. What a MAIN bind needs (the class-4 contract)

1. Replace the battle-1 `menuIdleBounce` application on the live generated
   route with the real `SpriteCB_BounceEffect` contract: `y2 = Sin(index,1)+1`,
   index advancing `+7`/frame from the state-appropriate phase, applied to
   **both** the player and opponent sprites (not the healthboxes). The
   opponent sprite needs its own y2 term (currently absent).
2. Accept that the "A-press highlight" is not a highlight: it needs no special
   state, only the sprite y2 schedule above.
3. The per-frame schedule in §5.1 is the acceptance oracle; frames 760-765,
   978-986, and the reopened menu must land on y2=0, and the message-hold
   phases must follow the 18-frame cadence.

## 7. Files touched this round

- `tools/compare/traces-groundtruth/fight-menu-chrome-torment-off.json` (new).
- `tests/fightMenuChromeGroundTruth.test.ts` (new; Tier-1 pins).
- This doc.
- No presentation-state-machine, engine, or appTrace change was made: the two
  static residuals (classes 2/3) and the HP-bar cap (12 px) all live in
  `appTrace.ts` / `healthboxAssembly.ts`, which are outside this round's
  ownership. The exact one-line fixes are in §3/§4.
