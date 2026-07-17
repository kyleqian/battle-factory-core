# Summary screen notes (S4 scouting)

Implementation dossier for the Pokémon Summary Screen **as invoked from the
Battle Factory draft menu's SUMMARY option**. Scouting/extraction only — no
engine code. Sources: `reference/pokeemerald/src/battle_factory_screen.c`
(entry/return path) and `reference/pokeemerald/src/pokemon_summary_screen.c`
(the screen itself, 4183 lines). All line numbers below refer to those two
files unless stated otherwise.

## 1. Entry path (`battle_factory_screen.c`)

The draft menu's `Select_Task_HandleMenu` (`STATE_MENU_HANDLE_INPUT`,
:1603-1630) runs `Select_RunMenuOptionFunc()` on `A`; with the menu cursor on
SUMMARY (index 0 — `Select_OptionSummary` :1984-1987 just returns
`SELECT_SUMMARY`, no mode/flag work happens here) it switches the task to
`Select_Task_OpenSummaryScreen` at `STATE_SUMMARY_FADE`. That task
(:1456-1493) is a 3-state machine:

- **`STATE_SUMMARY_FADE`** (:1463-1467): backs up the species-name palette
  color, `BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK)` (delay
  0, Y 0→16, target black — fade **to** black).
- **`STATE_SUMMARY_CLEAN`** (:1468-1481): once `!gPaletteFade.active`,
  destroys the species-name-fade task, hides the mon-pic reveal sprite,
  destroys all draft sprites (balls, cursor arrow, menu highlight), frees the
  4 tileset/tilemap buffers + all window buffers.
- **`STATE_SUMMARY_SHOW`** (:1482-1491): backs up
  `speciesNameColorBackup`, destroys itself, sets `fromSummaryScreen = TRUE`,
  copies all 6 `sFactorySelectScreen->mons[i].monData` into a fresh
  `sFactorySelectMons` alloc, then:
  ```c
  ShowPokemonSummaryScreen(SUMMARY_MODE_LOCK_MOVES, sFactorySelectMons,
      currMonId /* = cursorPos */, SELECTABLE_MONS_COUNT - 1 /* = 5 */,
      CB2_InitSelectScreen);
  ```

**Mode = `SUMMARY_MODE_LOCK_MOVES`** (`pokemon_summary_screen.c:1121-1125`):
`minPageIndex = 0`, `maxPageIndex = PSS_PAGE_COUNT - 1` (**all 4 pages
reachable**: Info, Skills, Battle Moves, Contest Moves), `lockMovesFlag =
TRUE`. `lockMonFlag` stays `FALSE` — its own doc comment (:177) says it's
actually unused/redundant, and confirmed by testing: **UP/DOWN mon-switching
between the 6 rental candidates is enabled** (`ChangeSummaryPokemon`,
:1578-1626, gated only by `lockMonFlag` which is false here).

**Move-reorder lock, confirmed at the input-handler level**: pressing `A` on
a move (Battle/Contest Moves page) enters move-select highlight mode
(`SwitchToMoveSelection`); pressing `A` again while `lockMovesFlag == TRUE`
calls `CloseMoveSelectMode` instead of `SwitchToMovePositionSwitchMode`
(:1927-1934) — reordering is reachable-but-inert, not hidden.

**Return callback is `CB2_InitSelectScreen`** — the draft screen's own
init/state-machine entry point, not a step through the overworld or a
separate "return" function.

## 2. Summary screen structure (pages reachable in this mode)

### BGs (`sBgTemplates`, :319-357; all `screenSize = 1` i.e. 64×32 tiles
except BG0)
| BG | charBaseIndex | mapBaseIndex | screenSize | priority | role |
|----|----|----|----|----|------|
| 0 | 0 | 31 | 0 (32×32) | 0 (top) | all text/label/data windows |
| 1 | 2 | 27 | 1 (64×32) | 1 | page-content buffer A (double-buffered w/ BG2) |
| 2 | 2 | 25 | 1 (64×32) | 2 | page-content buffer B |
| 3 | 2 | 29 | 1 (64×32) | 3 (bottom) | **fixed** Info-page buffer, see below |

`InitBGs` (:1302-1309) points BG1←Battle-Moves tilemap, BG2←Skills tilemap,
BG3←Info tilemap (`sMonSummaryScreen->bgTilemapBuffers[page][0]`) — **and
BG3's pointer is never reassigned anywhere else in the file**: BG3 always
carries the Info page. BG1/BG2 are the two channels that actually get
re-pointed and animated by `ChangePage`, shared in rotation by
Skills/Battle-Moves/Contest-Moves. Each `[page]` entry in the
`[PSS_PAGE_COUNT][2][0x400]` buffer is really **two adjacent 32×32 screen
blocks** since these BGs are `screenSize=1` (64×32 tiles): `[page][0]` holds
the real content, `[page][1]` is a decompression target only ever populated
for `INFO` (`gSummaryPage_InfoEgg_Tilemap`, the egg variant) — for
Skills/Battle/Contest, `[page][1]` stays unused/blank. The Info/egg toggle
(`LimitEggSummaryPageDisplay`, :2713-2719) is itself just a **BG3 X-scroll**
by exactly one screen-block: `ChangeBgX(3, 0x10000, BG_COORD_SET)` for egg
vs `0` for normal — not a redraw. Tileset: one shared 128×120px (16×15 tile)
sheet `gSummaryScreen_Gfx` decompressed once into BG1's charblock at load
(:1327), 8×16-color subpalettes loaded across BG palette slots 0-7
(`gSummaryScreen_Pal`, :1354).

**Page change (Skills/Battle/Contest only — Info is BG3, exempt) is an
animated horizontal wipe, not a redraw** (`ChangePage`/`PssScrollRight`/
`PssScrollLeft`, :1761-1875): BG1/BG2 swap `BG_ATTR_PRIORITY`, the
now-back layer is re-pointed at the new page's tilemap, then `ChangeBgX`
steps that BG's X coordinate by `0x2000` (1/8 screen-width in 8.8 fixed
point) once per task tick until it accumulates past `0xFF` — **8 ticks**,
i.e. one call to `PssScrollRight`/`Left` per rendered frame while the task
is active (oracle-verified below: the scroll plus window/type-icon rebuild
that follows spans well over 8 frames total). `DrawPagination()`,
`PutPageWindowTilemaps()`, `SetTypeIcons()`, `TryDrawExperienceProgressBar()`
all fire exactly at scroll-end (`PssScrollRightEnd`/`LeftEnd`, :1815-1875),
not before.

### Window templates (`sSummaryTemplate`, :407-589; all `bg = 0`)
All coordinates are tile units (8px); `baseBlock` is the window's tile
offset into BG0's charblock.

| id | window | left,top | w×h | pal | reachable-page use |
|---|---|---|---|---|---|
|0| POKEMON_INFO_TITLE |0,0|11×2|6| Info page title |
|1| POKEMON_SKILLS_TITLE |0,0|11×2|6| Skills page title |
|2| BATTLE_MOVES_TITLE |0,0|11×2|6| Battle Moves title |
|3| CONTEST_MOVES_TITLE |0,0|11×2|6| Contest Moves title |
|4| PROMPT_CANCEL |22,0|8×2|7| "A Cancel" (Info page only) |
|5| PROMPT_INFO |22,0|8×2|7| "A Info" (Moves pages, non-select-mode) |
|6| PROMPT_SWITCH |22,0|8×2|7| "A Switch" (Moves pages, inside move-select — but see §1, inert here) |
|8| POKEMON_INFO_RENTAL |11,4|18×2|6| **"RENTAL POKÉMON" label — replaces the OT-name area** (only shown when `InBattleFactory() \|\| InSlateportBattleTent()`, :2901-2902) |
|9| POKEMON_INFO_TYPE |11,6|18×2|6| the mon's 1-2 type icons |
|10| SKILLS_STATS_LEFT |10,7|6×6|6| HP/Attack/Defense |
|11| SKILLS_STATS_RIGHT |22,7|5×6|6| Sp.Atk/Sp.Def/Speed |
|12| SKILLS_EXP |10,14|11×4|6| EXP / next level |
|13| SKILLS_STATUS |0,18|6×2|6| status condition text (sliding window) |
|14| MOVES_POWER_ACC |1,15|9×4|6| Power/Accuracy (move-select-mode only) |
|15| MOVES_APPEAL_JAM |1,15|5×4|6| Appeal/Jam (move-select-mode only) |
|17| PORTRAIT_DEX_NUMBER |1,2|4×2|7| "No.XXX" |
|18| PORTRAIT_NICKNAME |1,12|9×2|6| nickname |
|19| PORTRAIT_SPECIES |1,14|9×4|6| "Lv##" + gender + "/SPECIES" |

Dynamic, per-page-allocated windows (`AddWindowFromTemplateList`, freed on
page leave — `sPageInfoTemplate` :591-629, `sPageSkillsTemplate` :630+,
`sPageMovesTemplate` similar): Info page — `ORIGINAL_TRAINER`(11,4,11×2,
pal6, **suppressed in Battle Factory**), `ID`(22,4,7×2,pal6, **suppressed**),
`ABILITY`(11,9,18×4,pal6, name+description in one window), `MEMO`(11,14,
18×6,pal6, nature/met text). Skills page — `HELD_ITEM`(10,4,10×2,pal6),
`RIBBON_COUNT`(20,4,10×2,pal6), stats-left(16,7,6×6,pal6), stats-right
(27,7,3×6,pal6), `EXP`(24,14,6×4,pal6). Battle/Contest Moves pages —
`MOVE_NAMES`(15,4,9×10,pal6), `MOVE_PP`(24,4,6×10,pal8),
`MOVE_DESCRIPTION`(10,15,20×4,pal6) — the description window is populated
on demand (`PrintMoveDetails`/`PrintContestMoveDescription`) only once
move-select mode is entered or the move cursor moves; it stays empty
otherwise.

### Sprites
- **Mon front-pic** (`SPRITE_ARR_ID_MON`, `CreateMonSprite`/`LoadMonGfxAndSprite`)
  — visible on Info + Skills pages, hidden on the Moves pages
  (`HidePageSpecificSprites`, called from `ChangePage` :1782).
- **Caught-ball icon** (`SPRITE_ARR_ID_BALL`, `CreateCaughtBallSprite`).
- **Status condition icon** (`SPRITE_ARR_ID_STATUS`,
  `sSpriteTemplate_StatusCondition`, :1087-1096, 7-frame anim table for
  poison/paralysis/sleep/frozen/burn/pokerus/faint).
- **Markings** (`markingsSprite`, `CreateMonMarkingAllCombosSprite`,
  :4048-4061, tiles from `graphics/interface/mon_markings.png`, palette
  overridden with `sMarkings_Pal` = `graphics/summary_screen/markings.pal`).
- **Type/category icons** (`SPRITE_ARR_ID_TYPE`, up to `TYPE_ICON_SPRITE_COUNT
  = MAX_MON_MOVES + 1 = 5`; on Info page shows 1-2 mon-type icons, on the
  Moves pages shows one type/category icon per move row).
- **Move selector** (`SPRITE_ARR_ID_MOVE_SELECTOR1/2`, 10 sprites each,
  `CreateMoveSelectorSprites`, :4099-4125) — spawned on entering move-select
  mode (`A` on a move row, `SwitchToMoveSelection`); reachable and its cursor
  UI is fully live (UP/DOWN moves it, `ChangeSelectedMove` :1964-2019
  re-prints move details each move), but pressing `A` again is short-circuited
  by `lockMovesFlag` into `CloseMoveSelectMode` instead of the actual reorder
  mode (:1929-1934) — reorder is reachable-but-inert, not hidden. **The
  cursor blinks**: `SpriteCB_MoveSelector` (:4127-4147) makes it invisible
  for ticks 25-31 of a 32-tick cycle — see Risk (h).
- **A/B button icons**: not sprites — blitted directly into window tile data
  by `PrintAOrBButtonIcon` (:2821-2830, `BlitBitmapToWindow`).

### What changes per page
Page swap = BG1/BG2 priority-swap + 8-tick `ChangeBgX` wipe (§ above) + a
fresh `PutPageWindowTilemaps`/`ClearPageWindowTilemaps` pass that shows/hides
exactly the per-page label windows listed above + `SetTypeIcons()` +
`CreateTextPrinterTask` re-running that page's text-print state machine
(next section). The mon sprite, markings, ball, and status icon persist
across Info↔Skills (only hidden on the Moves pages); pagination dots
(`DrawPagination`) redraw every page change.

## 3. Data fields shown for a factory rental

Verified by reading the actual print functions gated on `InBattleFactory()`
(`battle_factory.c`/`pokemon_summary_screen.c` share this helper) — **not**
guessed from generic summary-screen behavior:

- **Nickname**: `GetMonNickname` (:2786) — standard engine fallback to the
  species name string when no custom nickname was set (rentals are
  freshly-generated `struct Pokemon`s with no nickname field written, per
  `battle_factory.c`'s mon-creation path) — **not** summary-screen-specific
  logic, just the normal nickname getter.
- **Level**: `"Lv" + summary->level` (:2782-2785), printed verbatim from the
  mon's stored level field — no override in this mode; confirms rentals
  display as **Lv50** because that's what's baked into the generated mon,
  not a display-layer assumption.
- **Item**: `PrintHeldItemName` (:3346-3369) — normal item-name lookup
  (`gText_None` if none); no Battle-Factory special case beyond an unrelated
  multi-battle Enigma Berry check.
- **OT name / OT ID**: **suppressed entirely.** `PrintMonOTName` (:3078-3091)
  and `PrintMonOTID` (:3093-3102) both early-return when
  `InBattleFactory() == TRUE`. In their place, `PutPageWindowTilemaps`
  (:2901-2902) shows window 8, `POKEMON_INFO_RENTAL`, printed with
  `gText_RentalPkmn` ("RENTAL POKéMON") at (:2864, `Select_ShowMenuOptions`'s
  sibling on this screen — actually printed by
  `PrintRentalPkmnStringIfNeeded`-equivalent, same call site as the label
  window's `PutWindowTilemap`). **This confirms the "unusual provenance"
  the brief flagged**: no OT/ID is ever rendered for these mons in this mode.
  (For completeness: the rental's actual OT ID is the player's own —
  `battle_factory_screen.c:1755` reads `T1_READ_32(gSaveBlock2Ptr->
  playerTrainerId)` into `CreateMonWithEVSpreadNatureOTID`, and `CreateBoxMon`
  seeds the OT name from `gSaveBlock2Ptr->playerName` — but since both fields
  are never displayed here, this is moot for rendering.)
- **Ability + description**: `PrintMonAbilityName`/`PrintMonAbilityDescription`
  (:3104-3114) — `GetAbilityBySpecies(species, abilityNum)` then
  `gAbilityNames`/`gAbilityDescriptionPointers`; both printed into the same
  dynamic `ABILITY` window (name at y=1, description at y=17) — standard,
  no Battle-Factory branch.
- **Nature**: shown as plain text inside the Info-page "memo" window, via
  `BufferMonTrainerMemo` (:3116-3160). **In Battle Factory the memo text is
  hard-simplified**: `InBattleFactory() == TRUE` short-circuits straight to
  `DynamicPlaceholderTextUtil_ExpandPlaceholders(gStringVar4,
  gText_XNature)` (:3126-3129) — i.e. just "**\<Nature\> nature.**", skipping
  all the met-location/met-level/trade-provenance text that a normally-owned
  mon would show. There is no separate "nature via the stat screen" UI
  distinct from this memo text in this game (that's a later-gen summary
  screen feature) — **confirmed no per-stat boosted/lowered color-coding
  exists either**: `PrintLeftColumnStats`/`PrintRightColumnStats`
  (:3391-3437) always print with `colorId = 0`; that's a later-generation
  summary-screen feature, absent here.
- **Ribbons**: `PrintRibbonCount` (:3371-3389), Skills page — prints "None"
  or "×N"; freshly-generated rentals have `ribbonCount == 0` so this always
  reads "None". There is no separate ribbon-browsing page reachable here
  (Emerald's summary screen caps at `PSS_PAGE_COUNT = 4`; individual-ribbon
  pages are a later-generation feature) — the brief's "ribbon/memo page
  content" is fully covered by this Skills-page ribbon count plus the
  Info-page memo text above.
- **Stats**: `BufferLeftColumnStats`/`BufferRightColumnStats`
  (:3391+) print the already-computed Lv50 stats (HP/Atk/Def/SpAtk/SpDef/Spd)
  verbatim from `sMonSummaryScreen->summary.*` — these numbers are exactly
  what S3's RAM-dumped/Tier-1-tested stat derivation already pins in
  `src/data/gen/anchor-state.json`; the summary screen adds no extra
  computation, just formatting (not yet traced: the boosted/lowered
  nature stat text-color coding — flagged as unverified below).

## 4. Oracle-probed reference timings

Traces run from the anchor (`bin/oracle run <trace.json> -o <dir>`),
scratch captures under `/tmp/s4-scout/` (not committed — PNGs excluded per
instructions). All frame numbers are **absolute trace frames**; "press
tick" = the first of the 2-frame button-press pulse (this repo's existing
trace convention).

**Entry — `/tmp/s4-scout/summary-entry-dense/`** (`A` open ball+menu at
frame 0-1, wait 40, `A` on SUMMARY — cursor already there, no DOWN presses
needed — at press-tick 42):
- Screen frozen (ball-open+menu already settled) from frame 40 through 46 —
  no visible change until the state machine's `STATE_SUMMARY_FADE` actually
  runs.
- First visible fade pixel change: **frame 47** (press-tick+5).
- Fully faded to black, screen sha stable: **frames 62-85** (press-tick+20
  through +43) — this ~24-frame black hold is `CB2_InitSummaryScreen`/
  `LoadGraphics`'s many `gMain.state` steps (decompression, sprite/BG setup)
  running behind the black screen.
- Fade-in complete, Info page fully drawn and momentarily stable:
  **frames 101-106** (press-tick+59 to +64).
- **From frame 107 onward the screen never re-stabilizes** — see Risk (a).

**Page change (RIGHT) — `/tmp/s4-scout/summary-page-right/`** (RIGHT
pressed at press-tick 106, from the same settled Info-page state): screen
sha changes on every single captured frame from 107 through the end of the
capture window (165, i.e. +59 with no re-stabilization observed). This is
consistent with the 8-tick BG scroll immediately handing off into the
persistent mon-animation churn (Risk (a)) — **the page-scroll's own settle
point was not cleanly isolated this session**; a dense trace with the mon
sprite hidden (Moves-page-to-Moves-page change instead of Info→Skills) is
needed to measure the scroll in isolation. Flagged as unverified.

**B-exit — `/tmp/s4-scout/summary-exit/`** (`B` pressed at press-tick 106
from settled Info page): fully faded to black and stable from **frame
124-143** (a 20-frame hold, same dark-screen sha as the entry trace's
fade-out hold — good cross-trace consistency check), then fade-in, settling
to a framebuffer **hash-identical to the pre-entry ball-open+menu screen**
at **frame 159** (press-tick+53). This confirms the return path fully
restores the draft screen pixel-for-pixel (menu cursor position preserved,
same ball-open blend state) when the summary's mon-cursor wasn't moved.

## 5. Risk list — frame-exactness threats

1. **Persistent mon idle-animation loop** (`pokemon_summary_screen.c:4030-4036`,
   `StopPokemonAnimations` — "stops Pokémon animations when leaving the
   PSS", only called on close/A-on-Info/B). The front sprite plays its
   species' normal battle-idle `AnimCmd` loop continuously the whole time
   the screen is open (Info/Skills pages). Oracle-observed: continuous
   framebuffer churn from ~press-tick+65 onward with ~19-26-frame repeat
   spacing. **This cannot be modeled as "settle then freeze"** — it needs
   the same per-species front-sprite animation tables S2's `monPic.ts`
   already extracts/uses, driven frame-exactly for as long as the page is
   visible.
2. **Page-change is an 8-tick animated BG wipe**, not a redraw
   (`PssScrollRight`/`PssScrollLeft`, :1785-1875 — `ChangeBgX` by `0x2000`
   per tick, BG1/BG2 priority swap, `SetBgAttribute`). `DrawPagination`,
   `PutPageWindowTilemaps`, `SetTypeIcons`, `TryDrawExperienceProgressBar`
   fire only once the wipe completes (`PssScrollRightEnd`/`LeftEnd`,
   :1815-1875). BG3's exact role in the 3-buffer scheme (:1306-1308,
   :1860-1864) was **not fully resolved this session** — needs a dedicated
   probe (Moves↔Moves page changes, mon sprite hidden, to isolate the wipe
   from Risk 1's churn) before implementation.
3. **Cross-frame text-print scheduling — but only on page CHANGE, not
   initial entry.** `PrintTextOnWindow` itself is synchronous (`speed=0` →
   `AddTextPrinter`, `reference/pokeemerald/src/text.c:271-315`, renders the
   whole string and flushes to VRAM in one call — no letterwise typewriter
   effect anywhere on this screen). But `ChangePage` (RIGHT/LEFT or L/R)
   calls `CreateTextPrinterTask(page)` (:1781, :3023-3026), which runs
   `Task_PrintInfoPage`/`Task_PrintSkillsPage`/etc as a `data[0]`-indexed
   state machine printing **one field per frame** (Info: 7 states —
   OT-name-skip → OTID-skip → ability name → ability description → buffer
   memo → print memo → destroy, :3048-3076; Skills: 8 states — item →
   ribbons → buffer-left → print-left → buffer-right → print-right → EXP →
   destroy, :3312-3344). The page's BG tilemap is already fully drawn (from
   the 8-tick scroll, Risk 2) before this runs, so **on a page change**, text
   visibly "pops in" field by field over several frames after the page art
   itself appears. On the very **first** page shown at screen-open, by
   contrast, `LoadGraphics` calls `sTextPrinterFunctions[pageIndex]`
   directly and synchronously in a single state (:1237, dispatch table
   :730-736) — all of Info's text appears in one frame at open, with no
   per-field pop-in. A single-frame full-redraw implementation must
   reproduce this entry/page-change asymmetry, not just the end state.
4. **Mon-switch (UP/DOWN) is its own ~13-state multi-frame machine**
   (`Task_ChangeSummaryMon`, :1628-1687+): destroys the old mon sprite,
   frees/reloads gfx, rebuilds markings/ball/type-icon sprites, and
   **re-runs the same per-page text-print scheduler** (Risk 3) for the new
   mon. Not probed this session (only the Info-page open/close/RIGHT paths
   were traced) — needs its own dense trace before S4 implementation.
5. **Return-path reuses S2's mon-pic blend state.** `CB2_InitSelectScreen`'s
   `fromSummaryScreen` branch (:1220-1229) re-arms the exact ball-open WIN0
   blend registers (`Select_SetWinRegs(88, 152, 32, 96)`,
   `BLDCNT_TGT1_BG3|BLDCNT_EFFECT_BLEND|BLDCNT_TGT2_BG1|BLDCNT_TGT2_OBJ`,
   `BLDALPHA_BLEND(11, 4)`) instead of replaying the ball-open animation —
   this is a second entry point into the exact mechanism S2/`ISSUES.md` #3
   is still chasing redraw-scheduling transients on. Any fix there should be
   re-verified against this return path too, not just the original A-open.
6. **`gLastViewedMonIndex` persistence**
   (`pokemon_summary_screen.c:1519` on close, consumed at
   `battle_factory_screen.c:1242`): if UP/DOWN was used inside the summary
   to view a different rental, the draft cursor **jumps to that slot** on
   return — it does not restore the slot the player opened SUMMARY from. S4
   traces must cover both the no-switch and switch-then-return cases.
7. **Species-name-breathe task continuity.** The draft screen's
   `Select_Task_FadeSpeciesName` is fully `DestroyTask`'d on summary-open
   (:1471) and recreated on return already in `FADESTATE_RUN` (not reset to
   `FADESTATE_INIT`, :1279 vs :1273) — whether its internal phase/timer
   counter resumes continuously or restarts was **not verified**; matters
   for `ROADMAP.md`'s documented ~104-frame idle-breathe behavior if a trace
   dwells on the draft screen after returning from SUMMARY.
8. **Move-selector cursor blinks on its own timer.** Reachable in this mode
   (§1/§2 — `A` on a Battle/Contest-Moves row enters move-select; only the
   *reorder* action is locked out, not entry). `SpriteCB_MoveSelector`
   (`pokemon_summary_screen.c:4127-4147`) makes the 10-sprite cursor
   invisible for ticks 25-31 of a 32-tick cycle — another continuously-
   running, non-settling animation (like Risk 1) that any trace dwelling in
   move-select mode must reproduce tick-exactly rather than treat as static.

## 6. S4 slice-1 addendum: fade math pinned exactly, first churn frame confirmed

Dense every-frame oracle probes (fresh dense captures, all 4 sha-pixel-level)
of all four `BeginNormalPaletteFade(PALETTES_ALL, 0, ..., RGB_BLACK)` calls
(entry fade-out `battle_factory_screen.c:1465`, entry fade-in
`pokemon_summary_screen.c:1290`, exit fade-out
`pokemon_summary_screen.c:1510`, exit fade-in `battle_factory_screen.c:1217`)
fully pinned the per-frame blend curve — see `src/engine/paletteFade.ts`'s
module doc for the derivation and `tests/paletteFade.test.ts` for the
oracle-literal pixel values. Summary:

- **Blend formula**: `util.c:264`'s `BlendPalette` runs in 5-bit GBA color
  space; for `blendColor=RGB_BLACK` this reduces to
  `faded5 = floor(c5 * (16-y) / 16)`, `c5 = c8 >> 3` (exactly invertible from
  our already-8-bit-expanded assets), re-expanded via the same `(c5<<3)|
  (c5>>2)` as the rest of the color pipeline.
- **BG/OBJ stagger**: `palette.c:406`'s `UpdateNormalPaletteFade` alternates
  BG-palette and OBJ-palette blending on successive calls
  (`objPaletteToggle`), so the OBJ layer's `y` always lags the BG layer's `y`
  by exactly 1 tick — confirmed pixel-for-pixel (a red OBJ sample vs. a BG
  chrome sample) through the entry fade-out.
- **Per-transition tick constants** (ticks relative to each transition's own
  trigger tick; `y` steps by 2 every 2 ticks after an initial task-dispatch
  `startDelay`): entry fade-out `startDelay=5`, settles black (both layers)
  at **tick 20**; entry black hold **24 ticks**; fade-in (shared shape by
  both directions) `startDelay=0`, settles at **tick 15**; exit fade-out
  `startDelay=3`, settles black at **tick 18**; exit black hold **20
  ticks**. Totals: entry **20+24+15=59** ticks, exit **18+20+15=53** ticks —
  both match §4's press-tick+59/+53 exactly, cross-validating both scouting
  sessions' independent probes.
- **First mon idle-animation churn frame (Risk 1), confirmed**: freshly
  probed (dense captures press-tick+54 through +151 of an A-on-SUMMARY-slot1
  trace) — the settled Info page is sha-stable for frames press-tick+59
  through **+64** (6 frames), then the **first churn frame is
  press-tick+65**, after which every single subsequent frame differs
  (continuous churn, no further stable window found through +151). This is
  for **slot 1 (ONIX)**; slot 2 (MAGBY) was not independently probed this
  session — assume the same ~65-tick lead-in until verified, and keep any
  committed trace's dense-capture window within `[settle, +64]` to stay
  clear of it (per the S4 brief, captures should stay legitimately dense up
  to the first churn frame, not thinned to dodge it).

**Not implemented this slice**: the state machine above
(`src/engine/summaryScreen.ts`) is not wired into `core.ts`/render, and the
static Info page itself has no renderer yet. Blocking gaps found while
scoping that work: `src/data/gen/species-stats.json` has no per-species type
or dex-number fields, and no ability name/description text table or gender
ratio table has been extracted yet (`anchor-state.json` only carries the
ability *enum id*, not display text). See `PROGRESS.md` for the full
next-slice punch list.

## Extraction

`tools/extract/extract-summary-screen.ts` (run via
`node --experimental-strip-types tools/extract/extract-summary-screen.ts`),
writing to `src/assets/gen/`:
- `summary-bg.json` — shared 128×120 BG tileset (16×15 tiles) + 8×16-color
  subpalettes (`graphics/summary_screen/tiles.png`) + the 4 reachable pages'
  32×32 tilemaps (`page_info.bin`, `page_skills.bin`,
  `page_battle_moves.bin`, `page_contest_moves.bin` — pre-LZ raw tilemaps,
  parsed like `battle_factory_screen`'s `menu.bin`; the egg-only
  `page_info_egg.bin` is intentionally not extracted, out of scope for
  rentals).
- `summary-type-icons.json` — all 18 `TYPE_*` + 5 contest-category icon
  sheets (`graphics/types/*.png`), each with its own embedded palette (the
  shared runtime OAM palette is a binary `.gbapal`, not extracted — no JASC
  parser for that format exists yet).
- `summary-markings.json` — the mon-markings sprite sheet
  (`graphics/interface/mon_markings.png`) plus both its embedded palette and
  the summary-screen-specific override (`graphics/summary_screen/markings.pal`).
- `summary-buttons.json` — the A/B button prompt icons.

Verified deterministic (byte-identical output on rerun). Not extracted this
session (flagged for the next worker, all cheap/mechanical once needed):
`status_tilemap.bin` (status-condition sliding-window tiles),
`effect_battle.bin`/`effect_cancel.bin`/`effect_contest.bin` (move-list
corner icons — raw flat tile-entry arrays, exact placement rectangle not
determined), and the move-selector cursor art (`move_select.png`, inert in
this mode per §1 but drawn once on entering move-select mode).
