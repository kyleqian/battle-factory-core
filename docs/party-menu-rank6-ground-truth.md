# Party menu rank 6 ground truth: cursor wash, mon icons, ink, buttons, fade (ISSUES #80)

Dated 2026-08-06 (SIDE lane ground-truth scout). All numbers measured this
session against the Battle Scene OFF oracle (`http://127.0.0.1:8014`) with the
compare aids + committed probe scripts (`tools/probe/rank6-*.ts`). Every
mechanism claim is source-cited. Nothing here binds anything; it is the bank
for a later MAIN step to close ISSUES #80's remaining classes without guessing.

Measurement receipt:
- `party-menu-status-item-off` compare rerun this session: **0/251 matched**,
  baseline **9234 / 9306 px/frame alternating** over 2050-2300 (72 px swing =
  the oracle's selected slot-0 mon-icon bounce; frames 2150/2250 are the 9234
  phase, 2200 the 9306 phase). bbox every frame = 2,8-239,153.
- All class numbers below from `tools/probe/rank6-final.ts` on the three
  representative frames 2150 / 2200 / 2250 (out/ dir from the compare run).
- Fade numbers from two fresh oracle runs of the existing dense fixtures;
  `scratch-mid-battle-switch-dense-menu-a-off` re-run **byte-identical
  256/256 PNG sha256s**.

## 1. Per-class pixel attribution (frame 2150; 2200 = +72px all on the icons)

| Class | bbox set | px (2150) | px (2200) |
| --- | --- | --- | --- |
| (a) cursor selected/unselected wash + card text | left card (8,24)-(88,79) + right-top (96,8)-(240,31) + right-bottom (96,32)-(240,55) | 3214 | 3214 |
| (b1) mon-icon palette class | icon footprints (0,24)-(32,55), (88,2)-(120,33), (88,26)-(120,57) | 1579 | 1651 |
| (b2) **mon-4/5/6 empty boxes (missing entirely)** | (96,56)-(240,79), (96,80)-(240,103), (96,104)-(240,127) | 1908 | 1908 |
| (c) card name/level ink | text bands (32,39)-(76,62), (118,11)-(220,30), (118,35)-(220,54) | 1990 | 1990 |
| pokeball/CANCEL buttons | (184,134)-(234,153) | 467 | 467 |
| unattributed (icon/item edges) | — | 76 | 76 |
| **total** | | **9234** | **9306** |

99.2% attributed on all three frames; the (b1) 72 px swing between 2150 and
2200 is the selected icon's bounce phase, i.e. exactly the baseline swing.
The (a)/(c) boundary is a band choice — the text bands include the box wash
behind the glyphs, so (a)+(c) split is a convention; the glyph-ink portion of
(c) is ~290 px (measured `(255,255,255)->(57,148,222)` 199 px + `(255,255,255)
->(123,214,239)` 91 px at the name/level glyph positions).

## 2. Class (a) — cursor opens on slot 0; the app opens on the active slot

**Rule.** `OpenPartyMenuInBattle` (party_menu.c:5774-5779) →
`InitPartyMenu(..., keepCursorPos=FALSE, ...)` → `if (!keepCursorPos)
gPartyMenu.slotId = 0;` (party_menu.c:524-527). The in-battle party menu
**always opens on slot 0** (the left card), not the active battler.
The app's `createBattlePartySelectState` sets `cursor: activePartyIndex`
(battlePartySelect.ts:278) — fix to 0.

**Wash.** Box tiles render from each window's palette bank
(`sSinglePartyMenuWindowTemplate`, data/party_menu.h:123-151: mon1 bank 3,
mon2 bank 4, mon3 bank 5); `LoadPartyBoxPalette` (party_menu.c:2205-2280)
overwrites the selected box's bank with `sPartyBoxCurrSelectionPalIds`
({116,117,118}→{4,5,6} and {97,103,104}→{1,7,8},
data/party_menu.h:587-594). The app already renders selected boxes from its
bank 7 and unselected from bank 3 (battlePartySelect.ts:712-714) — those bank
values are correct for the box tiles (verified pixel-exact via
`rank6-attrib.ts`: the only selected-box palette error is **color0**: app
draws raw bank7 color0 (57,156,255) where the real selected box keeps the raw
bank-3 color0 (123,156,115) — color0 is a transparent box-tile slot, so it
never renders; no fix needed). Fixing the cursor rule alone (slot 0) makes the
left card render selected-bank and the right-top card render empty-bank,
matching the oracle; the wash class is then the icon/ink fixes below.

**Selected icon bounce.** `AnimateSelectedPartyIcon` (party_menu.c:3978-4001):
selected icon x2=0,y2=0 then `SpriteCB_BouncePartyMonIcon` (±3/+1 on frame
change); unselected left-column x2=0,y2=-4, right-column x2=-4,y2=0. The app's
`drawIcon` offsets already match the source — but because the app's cursor is
slot 1, the bounce is on the wrong slot. Cursor fix flips it.

## 3. Class (b1) — RATTATA mon-icon palette: the app banks palette 0, the ROM uses palette 2

`CreateMonIcon` (pokemon_icon.c:1124-1142) sets `paletteTag =
POKE_ICON_BASE_PAL_TAG + gMonIconPaletteIndices[species]`; the party menu
calls it via `CreatePartyMonIconSpriteParameterized` (party_menu.c:3942-3948,
`CreateMonIcon(..., menuBox->spriteCoords[0], ...)`).
`gMonIconPaletteIndices[SPECIES_RATTATA] = 2` (pokemon_icon.c:489).

- Real palette: `graphics/pokemon/icon_palettes/icon_palette_2.pal`
  = `gMonIconPalettes[2]` (graphics.c:1501-1506): colors incl. (65,65,65),
  (98,98,90), (148,123,205), (197,164,205), (189,189,180), (246,98,82),
  (238,197,139).
- App's banked `src/assets/gen/party-mon-icons.json` `SPECIES_RATTATA`
  palette holds **icon_palette_0** values ((99,156,132), (132,132,115),
  (189,189,189), …) — a data-extraction bug: the extractor
  (`tools/extract/extract-party-mon-icons.ts`) ignores `gMonIconPaletteIndices`.

**Proof** (`tools/probe/rank6-iconcheck.ts`): the oracle's bouncing icon
pixels (isolated by diffing two bounce phases, frame 2150 vs 2200) match
icon_palette_2 values exactly — (66,66,66)≈2[15], (99,99,90)≈2[14],
(148,123,206)≈2[11], (198,165,206)≈2[12], (189,189,181)≈2[2], (247,99,82)≈2[10],
(239,198,140)≈2[7]. Fixing the palette index (species→gMonIconPaletteIndices)
covers every species the party menu can stage, not just RATTATA.

## 4. Class (b2) — the mon-4/5/6 empty boxes are missing

For a 3-mon party the real menu still draws all six right-column boxes; slots
4-6 are **empty boxes**. `RenderPartyMenuBox` (party_menu.c:824-870):
`GetMonData(..., SPECIES) == SPECIES_NONE` → `DrawEmptySlot(windowId)` →
`BlitBitmapToPartyWindow(windowId, sSlotTilemap_WideEmpty, 18, 0, 0, 18, 3)`
(party_menu.c:2195) with `LoadPartyBoxPalette(..., PARTY_PAL_NO_MON)` →
`sPartyBoxNoMonPalIds {17,27,28}` at offsets {1,11,12}
(data/party_menu.h:576,596) = raw gPartyMenuBg_Pal colors
(74,74,98), (230,238,139), (98,90,0).

Measured on the oracle: empty boxes at (96,56)-(240,79), (96,80)-(240,103),
(96,104)-(240,127), each **636 px** of diff (the app shows the raw bg.bin
checkerboard instead: `(74,74,99)->(206,214,123)` x480 etc.). The app renders
only 3 `drawSlot` calls (battlePartySelect.ts:712-714); it must add three
`slot_wide_empty`-tile draws with a NO_MON palette (color1/11/12 =
(74,74,99)/(231,239,140)/(99,90,0)). `slot_wide_empty.bin` is
`graphics/party_menu/slot_wide_empty.bin` (not yet banked).

## 5. Class (c) — card text ink is white, the app prints blue

`DisplayPartyPokemonBarDetail` (party_menu.c:2282-2285) prints the nickname
(`DisplayPartyPokemonNickname` :2287-2298), the level line
(`DisplayPartyPokemonLevelCheck` :2300-2313 → `DisplayPartyPokemonLevel`
:2315-2321, suppressed for statused mons), HP, and maxHP with
`sFontColorTable[0]` = **{TRANSPARENT, LIGHT_GRAY, DARK_GRAY}**
(data/party_menu.h:113-117). The window font palettes resolve LIGHT_GRAY=3 →
the window bank's color3 = **white (255,255,255)** and DARK_GRAY=2 →
(115,115,115) — for every box window (bank 3/4/5 all have white at color3 and
(115,115,115) at color2).

Measured: the oracle's name/level glyphs are white at the exact positions the
app draws blue — slot 1 name x118-148 y15-21, slot 2 name y39-45, slot 2
"Lv50" x126-142 y48-54; the HP numbers (x199-231 y24-30 / y48-54) are already
**white and position-exact in the app** (the brief's "Lv50/HP-text ink"
~1.2kpx is the name+level glyphs; the HP text needs no change). Fix: replace
`CARD_TEXT_FG_SELECTED/UNSELECTED` (battlePartySelect.ts:605-608) with white
(255,255,255) for name+level, keep the (115,115,115) shadow. **Scoping note:**
this must touch only `battlePartySelect.ts`'s `drawRowText` palette — the
battle-command specs pin the fight-menu ink (`battle-command-generated-off`
128/128) and the fight-menu window ink lives in `battleMenu.ts`'s own palette,
so no cross-window regression if the change stays inside the party renderer.

## 6. Buttons — pokeball + CANCEL window (x184-234 y134-153, 467 px)

The single-cancel layout (non-chooseHalf, our case): `CreateCancelConfirmPokeballSprites`
(party_menu.c:1097-1118) → `CreatePokeballButtonSprite(198, 148)`
(`sSpriteTemplate_MenuPokeball`, graphics/party_menu/pokeball.png, colors
(41,131,205)/(180,65,0)/(197,82,0)/(222,230,238)/(180,189,205)/(74,74,98));
`CreateCancelConfirmWindows(FALSE)` (party_menu.c:2101-2143) →
`sCancelButtonWindowTemplate` at tile (24,17), 6x2, paletteNum 3
(data/party_menu.h:386-395) = px **(192,136)-(239,151)**, "CANCEL" text
centered (measured glyphs x204-232 y141-147, white via `sFontColorTable[0]`).

Measured oracle pixels: window frame (74,74,99) interior (206,214,123)/
(181,181,90), pokeball red (181,66,0) at y136-142 x186-201, pokeball blue-grey
(115,90,181) ≈ (115,90,181) [the sprite's palette row], CANCEL text white
x204-232 y141-147. The app draws only the background there (no button
window, no pokeball sprite); its `▶ CANCEL` text at (168,145) is the wrong
mechanism entirely. **Bind:** blit the pokeball sprite (16x16, centered
(198,148) → red half bbox x186-201 y136-143) + the 6x2 std window frame at
(192,136) + "CANCEL" white text at the measured glyph position. Pressed state
is `SetBgTilemapPalette(1, 23, 17, 7, 2, 2)` (party_menu.c:1141-1148) — the
window palette swap (bank 1 → 2), only relevant when the cursor is on CANCEL
and out of scope for this settled window.

## 7. Fade schedule (open + close, measured)

Both fades are the standard `BeginNormalPaletteFade` blend, steps held **2
frames each**, coeff stepping 1/16 of full per step. Blend formula is ISSUES
#78's landed model (`faded = c + ((target-c) * coeff) >> 4`, target = black
for open/close, white for the field reveal). Measured per-pixel curves in
`rank6-fadecurve.ts`.

**Open (party menu in):** A at 764-765 → battle field fades out **766-808**
(black hold; box-frame count 0) → party menu **fade-in 809-823**: blend steps
1/16…7/16 held 2 frames each (809-810 … 821-822), **full at 823-824**, stable
after (interactive from ~824). NB the brief's approximate "menu open
895-905" does not match the measured fixture — the menu is fully drawn by
824; 895-905 is inside the stable interactive span. `Fade pixels`: the full
menu drawn dimmed with coeff 1/16..7/16 on 809-822, full 823+.

**Close (party menu out):** confirm A at 964; the cancel-pokeball button
sprite starts its disappear anim at 964; menu **fade-out 965-978** (blend
steps 1/16..7/16 held 2 frames: (115,115,115)→(99,99,99)→…→(8,8,8), full
black at **979**); **all-black hold 979-1018**; battle field **white fade-in
1019-1034** (16 frames, (0,0,0)→(16,15,15)→…→(240,239,239), full field at
1034; the recall printstring's first glyph lands 1044).

**Frame-budget note:** `mid-battle-switch-dense-a-off` 221/221 captures
**1035-1255 only** — the close-fade frames 964-1034 are not in the spec. The
app holds the full menu through the close (`renderBattlePartySelect` ignores
`closeElapsed`, battlePartySelect.ts:702-742; the `PARTY_SELECT_CLOSE_*`
constants at :147-162 are state-model only) and cuts at 1035, which is why
221/221 stays green. Byte-exact for the close = render the 965-978 menu
blend-to-black + 979-1018 black hold + 1019-1034 white field fade, and extend
the spec to cover 964-1034. Similarly the open-side fade (809-823) has no
spec pin today.

## 8. Ordered bind plan (smallest risk first), per-slice acceptance

Acceptance is measured on the `party-menu-status-item-off` window 2050-2300
(current 9234/9306). "Keep green" specs: `battle-command-generated-off`
128/128 and `mid-battle-switch-dense-a-off` 221/221.

1. **Slice 1 — text ink (c):** white FG for name+level in `drawRowText`
   (battlePartySelect.ts:674-700); keep shadow (115,115,115). Expected:
   removes the ~290 px pure-glyph ink plus its share of the text bands
   (~1900 px band delta shrinks to the wash-only remainder). Risk: near-zero
   (renderer-local, file-disjoint). Keep green: both specs (no cross-window
   ink changes).
2. **Slice 2 — mon-icon palette (b1):** fix `extract-party-mon-icons.ts` to
   apply `gMonIconPaletteIndices` (species → icon_palette_{0,1,2}) and
   re-bank; RATTATA flips palette 0 → 2. Expected: removes ~1500 px of the
   icon class on this window (the rest is the bounce/position interplay with
   the cursor rule). Risk: data-only extractor change; re-run the extractor
   and the two specs.
3. **Slice 3 — cursor rule (a):** `createBattlePartySelectState` opens on
   slot 0 (not `activePartyIndex`); the box banks + icon offsets then land on
   the oracle's slots. Expected: removes the ~3200 px wash class (left card
   selected-bank + right-top empty-bank, plus the slot-0 bounce). This is the
   biggest single slice. Risk: input/state semantics — the existing
   `advanceBattlePartySelect` cursor math is slot-based and should be
   unaffected; run the Tier-1 `inbattlePartyMenu*` pins + both specs.
4. **Slice 4 — empty boxes (b2):** bank `slot_wide_empty.bin` and draw the
   mon-4/5/6 empty boxes at (96,56)/(96,80)/(96,104) with the NO_MON palette
   (color1/11/12 = (74,74,99)/(231,239,140)/(99,90,0)). Expected: removes the
   1908 px empty-box class. Risk: low (three drawSlot calls + one asset).
5. **Slice 5 — pokeball/CANCEL buttons:** blit the 16x16 pokeball (center
   (198,148)) + 6x2 std window at (192,136) + "CANCEL" text x204-232
   y141-147. Expected: removes the 467 px button class. Risk: low.
6. **Slice 6 — close/open fade pixels:** render the 965-978 menu
   blend-to-black, 979-1018 black hold, 1019-1034 white field fade (and
   optionally 809-823 open fade-in), extending `mid-battle-switch-dense-a-off`
   to 964-1034. Expected: byte-exact on the currently-excluded 71 close
   frames; the 221/221 frame count grows (spec extension is its own compare
   change). Risk: touches `battleScriptOpenPartyScreenOpcode`/orchestrator
   timing — run the full suite.

After slices 1-5 the settled window should drop from ~9234/9306 to roughly
the unattributed ~76 px + any residual overlap; slice 6 closes the dynamic
edges. Fade/open+close numbers and the close budget are in §7.
