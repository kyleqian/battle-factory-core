# ISSUES #80 settled-band forensics: the ~757px residual is NOT icon palette/position — it is the missing per-slot menu Pokéball sprites

Dated 2026-08-07 (SIDE lane pixel-forensics step). Re-measures the two named
residual classes of `party-menu-status-item-off` (band ~757/803 px/frame,
bbox 2,11-162,55, ISSUES #80) and attributes every diff pixel to a named class
**with 0 unattributed** on all three representative frames. Mechanism verdicts
are oracle-pixel + engine-source backed; nothing here binds the main lane —
the ordered fix plan is at the bottom for a later MAIN worker to land literal
draw calls without guessing.

## Measurement receipt

- `npm run compare -- party-menu-status-item-off --summary` rerun this
  session: band **757/803 px/frame** (bbox 2,11-162,55), 0/251 fully matched.
  Frames 2060 / 2150 / 2280 are all the **757px** phase (the 803px phase is
  the icon bounce holding a 46px-taller footprint — see §6).
- All class numbers from `tools/probe/party-band-forensics.ts` on frames
  2060 / 2150 / 2280 (out dir from the compare run):
  `node --experimental-strip-types tools/probe/party-band-forensics.ts
  tools/compare/out/run-*/` (default frames 2060 2150 2280).

## 1. Per-class attribution (identical on all three frames, total 757)

| class | bbox | px | mechanism |
| --- | --- | --- | --- |
| pokeball_slot0 (open ball) | (2,18)-(21,40) | 315 | per-slot menu Pokéball sprite, **OPEN frame** (anim 1) |
| pokeball_slot1 (closed ball) | (88,11)-(107,40) | 206 | per-slot menu Pokéball sprite, **CLOSED frame** (anim 0) |
| pokeball_slot2 (closed ball) | (88,41)-(107,54) | 74 | per-slot menu Pokéball sprite, CLOSED frame |
| leveltext_slot2 ("Lv50") | (129,48)-(145,55) | 90 | level-line glyph rendering difference |
| gender_slot0 (♂ vs ♀) | (72,48)-(76,55) | 36 | data gap: RATTATA genderRatio unbanked → app male, oracle female |
| gender_slot2 (♂ vs ♀) | (158,48)-(162,55) | 36 | same |
| **total / unattributed** | | **757 / 0** | |

The ISSUES #80 "~525px mon-icon class" is **not** icon palette/position/bounce:
the RATTATA icon itself is pixel-exact (see §4). The 525px is the three per-slot
**menu Pokéball sprites** (595px total minus the 70px where the ball overlaps
the icon on slots 1/2), and the "~210px box-edge/text" splits into the level
text (90px) + gender glyphs (72px).

## 2. Class (1) — per-slot menu Pokéball sprites (595px): MISSING in the app

`CreatePartyMonPokeballSprite` (party_menu.c:4122-4126) creates
`sSpriteTemplate_MenuPokeball` at each slot's `spriteCoords[6],[7]` =
**pokeball coord** from `sPartyMenuSpriteCoords` (data/party_menu.h:68-78):
slot 0 (16,34), slot 1 (102,25), slot 2 (102,49). The sprite sheet is
`gPartyMenuPokeball_Gfx` = `graphics/party_menu/pokeball.png` (32x64, two
32x32 frames), palette `gPartyMenuPokeball_Pal`. The anim is chosen by
`AnimatePartySlot` (party_menu.c:861-865): the **cursor slot** gets anim 1 =
`{LV}`-style **open** ball (`sPokeballAnim_Open`, frame offset 16), every other
slot anim 0 = **closed** ball (`sPokeballAnim_Closed`).

The app never draws these: `renderBattlePartySelect`
(src/engine/battlePartySelect.ts:882-931) draws the slot boxes, text, gender,
HP bar, mon icon, held item, and status — no per-slot pokeball.

**Measured sprite geometry (oracle):**
- slot 0 (cursor, open frame): ball pixels at (2,18)-(21,40), palette colors
  (107,107,132), (247,181,123), (222,231,239) — these are pokeball.png **frame
  1** (open) colors (106,106,131),(246,180,123),(222,230,238) expanded +1.
- slots 1/2 (closed frame): colors (74,74,99),(181,66,0),(198,82,0),
  (181,189,206) — pokeball.png **frame 0** (closed) colors
  (74,74,98),(180,65,0),(197,82,0),(180,189,205) expanded +1. Slot 1 ball
  pixels at (88,11)-(107,40), slot 2 at (88,41)-(107,54) (partly hidden behind
  the slot-2 box/icon).

**The banked asset only carries frame 0 (closed).** `party-menu-pokeball.json`
was extracted by `tools/extract/extract-party-menu-content.ts` (lines 236-258)
which slices **only the first 32 rows** (`frame 0 = sheet rows [0,32)`); frame 1
(the open ball) is not banked. The app's `drawCancelWindow`
(battlePartySelect.ts:839-879) uses frame 0 for the CANCEL window ball and
blits it pixel-0 transparent at `bx = 198-16, by = 148-16`.

## 3. Class (2) — box-edge/text: level text + gender glyphs

### 3a. leveltext_slot2 ("Lv50"), 90px at (129,48)-(145,55)

Only slot 2 prints a level line in this window: slots 0/1 are PRZ'd so
`DisplayPartyPokemonLevelCheck` (party_menu.c:2300-2313) suppresses it and the
status icon takes its place (the app mirrors this at
battlePartySelect.ts:758-760). The oracle's line is `gText_LevelSymbol` =
"{LV}" (strings.c:208) + the level digits, printed with FONT_SMALL via
`DisplayPartyPokemonBarDetail` (party_menu.c:2282-2285). The app prints
`Lv${row.level}` with the banked fontSmall + charmap at
battlePartySelect.ts:759.

**The diff is a glyph-rendering difference, not a position bug** (cross-
correlation of ink/shadow columns peaks at shift 0). Measured ink columns
(oracle vs app): oracle 126-143, app 126-146 — the app's "Lv50" ink is
**3px wider** and the glyph shapes differ (per-row ink overlay measured this
session; reproduce with `party-band-forensics.ts` on frame 2150 + the
`--verbose` level-text dump). The "Lv" prefix: the ROM prints the single
`{LV}` ligature glyph (charmap char 34, font-small widths[34]=5) while the app
prints 'L' (198) + 'v' (234) as two glyphs. Root cause candidates for the main
worker: (a) use the `{LV}` ligature glyph instead of L+v, or (b) the banked
font-small '5'/'0' glyph cells differ from the ROM's FONT_SMALL cells. The fix
worker should render the ROM's `{LV}` + "50" and diff again.

### 3b. gender_slot0 + gender_slot2 (72px): RATTATA genderRatio unbanked

The oracle renders **female** glyphs on slots 0 and 2 (fg 255,156,148 /
shadow 156,66,57); the app renders **male** (fg 66,206,255 / shadow 0,99,148).
Slot 1 (the active switched-in mon) matches (0px) — both male.

The app's gender comes from `memberGender` (battlePartySelect.ts:272-276) →
`getMonGender(stats.genderRatio, personality)` (monGender.ts:13-18) with the
species' genderRatio looked up in `src/data/gen/summary-info.json`
(`SPECIES_STATS_BY_ID`, battlePartySelect.ts:266-270). **RATTATA (species 19)
is not in that JSON**: `extract-summary-info.ts` banks only the 6 anchor
species (line 23: `POOL_SPECIES = ["ONIX","MAGBY","BAYLEEF","BUTTERFREE",
"HAUNTER","QUILAVA"]`), and `memberGender` falls back to `"male"` when the
species is missing (battlePartySelect.ts:274-275). So any species outside the
6-anchor pool renders male in the party menu, regardless of the ROM's real
personality-derived gender.

The oracle's RATTATA: genderRatio = `PERCENT_FEMALE(50)` = 127
(species_info.h:591, `min(254,(50*255)/100)`); bench personalities (low byte
0) are female (127 > 0 → female), the active (personality 150, low byte 150)
is male (127 ≤ 150). The 36px on each of slots 0/2 is exactly the female-vs-
male glyph delta.

**Fix (data, side-owned):** extend `extract-summary-info.ts`'s `POOL_SPECIES`
to include the species the party menu can stage (at minimum RATTATA/species 19;
robustly, all Factory rental-pool species) and re-run. That alone flips slots
0/2 to female — expected band drop ~72px. (The 8px of box-wash pixels that
bordered the gender boxes on the first classification pass are absorbed into
the gender class by checking both sides' colors; the shipped probe reports 0
unattributed.)

## 4. The icon itself is pixel-exact (NOT the residual)

The forensics probe scans the RATTATA sheet (party-mon-icons.json
SPECIES_RATTATA, paletteIndex 2) at every origin near the three slot centers
(verification helper in the probe): **oracle and app both match frame 0 at
sheet-origin (0,21) for slot 0, (84,2) for slot 1, (84,26) for slot 2 —
190-192/197 pixels, identical bboxes** on both sides. The slot-0 icon's
per-frame y over a full 15-frame bounce cycle (2144-2158) is identical in
oracle and app (top y 32↔37 alternating). So the ISSUES #80 "icon
palette/position/bounce interplay" attribution was wrong: the palette fix
(slice 2) landed correctly, and the ~525px is the missing pokeball sprites
sitting in/over the icon footprints.

## 5. Class (3) — held-item / status icons

The held-item sprites (Leftovers/Silk Scarf/Quick Claw) and the PRZ status
icons were **not** in the residual: `drawHeldItemIcon` / `drawStatusIcon`
(battlePartySelect.ts:645-662) already match the oracle's per-slot sprites at
their `sPartyMenuSpriteCoords` positions. No class for them.

## 6. The 803px phase (bounce)

The band alternates 757/803. The 46px delta is the selected slot-0 icon's
bounce: `monIconSelectedY2` (battlePartySelect.ts:548-553) vs the oracle's
`SpriteCB_BouncePartyMonIcon` (party_menu.c:3978-4001). Both sides already
bounce slot 0 identically in y-position (measured §4) — the 46px is the
**open-ball sprite's** larger frame footprint overlapping the bounced icon on
the 803px frames, i.e. it is a side effect of class (1), not a separate bug.
Once the pokeball sprites are drawn, both phases should collapse together.

## 7. Ordered fix plan (smallest risk first), per-class predicted drop

All numbers are from the 757px phase; keep-green specs:
`battle-command-generated-off` 128/128 and `mid-battle-switch-dense-a-off`
276/276 (battlePartySelect.ts is file-disjoint from both).

1. **Gender glyphs (72px) — data-only, lowest risk.** Extend
   `tools/extract/extract-summary-info.ts` `POOL_SPECIES` to include every
   species the party menu can stage (RATTATA at minimum; all Factory
   rental-pool species for robustness), re-run the extractor, re-verify the
   gender class on the probe. Expected: gender_slot0+gender_slot2 → 0,
   band 757 → ~685px. Risk: near-zero (JSON data, renderer untouched). Note:
   without this, the app renders male for ANY non-anchor species in the party
   menu — a latent data-breadth debt beyond this window.
2. **Per-slot menu Pokéball sprites (595px) — the bulk of the residual.**
   a. **Bank frame 1 (open ball)**: extend `extract-party-menu-content.ts`
      (lines 236-258) to also slice sheet rows [32,64) as a second frame
      (columns stay 4x4; frame 1 non-zero bbox (2,2)-(21,21) of the 32x32
      frame, colors (106,106,131),(246,180,123),(222,230,238)). The existing
      `party-menu-pokeball.json` keeps `frame` (closed) for the CANCEL window;
      add `frameOpen` (or a two-frame array).
   b. **Draw the sprites** in `renderBattlePartySelect` after the mon icons
      (so the icon draws over the ball where they overlap, matching the
      oracle's priority: icon oam.priority 1, ball default 3):
      - slot 0: blit `frameOpen` (open) pixel-0 transparent centered at
        (16,34) — frame top-left (0,18).
      - slots 1/2: blit `frame` (closed) pixel-0 transparent centered at
        (102,25) / (102,49) — top-left (86,9) / (86,33).
      Reuse `blitIconFrame` (battlePartySelect.ts:612-638); it already centers
      and skips palette-index 0 (the ball's blue, OBJ-transparent). Expected:
      pokeball classes → 0, band 757 → ~160px (leveltext 90 + gender 72).
   c. Rerun the forensics probe: 0 unattributed, pokeball_* absent.
3. **Level-text glyphs (90px).** Render the level line with the `{LV}` ligature
   (or correct the banked font-small '5'/'0' cells / advance) so the app's
   "Lv50" ink matches the oracle's 126-143 column span. Expected: band
   → ~70px (gender only) then step 1 closes the window. Risk: font cells are
   shared with the fight menu (`battle-command-generated-off` 128/128 pins
   FONT_SMALL there) — **do not touch the shared glyph cells**; prefer the
   ligature/render-side fix scoped to the level line, or a party-menu-local
   advance override.

After steps 1+2 the settled window should be ~160/803 px/frame (vs 757/803
today); step 3 closes the rest. All three classes verified rerunnable via
`tools/probe/party-band-forensics.ts` (0-unattributed acceptance).

## 8. Files touched by this step (SIDE, docs + probe only)

- `tools/probe/party-band-forensics.ts` — the rerunnable verify script
  (classification tables, per-class PASS/FAIL, unattributed count).
- This doc.
No `src/`, `PROGRESS.md`, or `ISSUES.md` edits (side-lane rule).
