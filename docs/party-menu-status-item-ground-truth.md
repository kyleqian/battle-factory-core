# In-battle party menu: status-condition + held-item icon ground truth (ISSUES #80 rank 5)

Banked draw contract for the mid-battle party/switch menu's **status-condition
icon** (PRZ exercised here) and **held-item icon**, from a fresh mechanicLab OFF
oracle run, under the standing two-run byte-identical standard. This gives a
MAIN worker everything needed to bind rank 5 in `battlePartySelect.ts` without
re-deriving anything.

Measurement receipt: the fixture below was run **twice fresh** against the
oracle; the two manifests are **byte-identical: 251/251 PNG `sha256`s equal**
and all semantic state equal (see §6). All pixels below are from
`frame-02150.png`, deep in the settled menu plateau (frames 2150-2300 are
pixel-identical to each other).

## 1. Staged fixture

`tools/battle-lab/party-menu-status-item-off.json` — mechanicLab,
`overrides.parties`, Battle Scene OFF, seed 1. Both sides field three
**RATTATA (species 19)**, level 50, 31 IVs / 0 EVs, `abilitySlot 0`.

- **Player:** slot 0 holds **Leftovers (200)**, slot 1 **Silk Scarf (217)**,
  slot 2 **Quick Claw (183)**; all four move slots `MOVE_SPLASH` (150).
- **Opponent:** all three `MOVE_THUNDER_WAVE` (86) ×4 — the Factory AI's only
  legal choice, no AI injection.

**Status staging (real moves only, no transient injection):** turn 1 the
opponent's Thunder Wave paralyses the player's active slot 0. The player then
voluntarily switches (proven `DOWN, A, RIGHT, A, A` recipe) slot 0 → slot 1,
**benching the PRZ'd slot 0**. The opponent's turn-2 Thunder Wave then
paralyses the newly-active slot 1. A second `DOWN, A` opens the party menu
again, where slot 0 is **benched-and-PRZ'd**, slot 1 is active-and-PRZ'd, and
slot 2 is clean. All three slots hold items.

Input recipe (extends the mid-battle-switch dense-a recipe from
`docs/mid-battle-switch-presentation-ground-truth.md` §1 with a second menu
open):

```
A(2f), idle 18f, A(2f)   (fight menu → move 1 = Splash)
idle 700f                (turn 1: opponent Thunder Wave → slot 0 PRZ)
DOWN(2f), idle 38f, A(2f)     (open party menu 1)
idle 118f
RIGHT(2f), idle 38f, A(2f)    (menu cursor slot 0→1)
idle 38f, A(2f)               (SEND OUT / SUMMARY / CANCEL submenu, default SEND OUT)
idle 900f                     (switch plays out; opponent turn-2 Thunder Wave → slot 1 PRZ)
DOWN(2f), idle 38f, A(2f)     (open party menu 2)
idle 600f                     (settled menu; capture window 2050-2300)
```

`captureFrames = 2050..2300` (251 frames). Two runs byte-identical.

## 2. What the settled menu shows (semantic state, frame 2150)

| Slot | Party idx | HP | Status | Held item | Role |
| --- | --- | --- | --- | --- | --- |
| 0 (left card) | 0 | 105/105 | **PRZ** (`status1 64`) | Leftovers 200 | **benched** — statused turn 1, switched out |
| 1 (right, top) | 1 | 105/105 | **PRZ** (`status1 64`) | Silk Scarf 217 | **active** — statused by opponent turn-2 Thunder Wave |
| 2 (right, bottom) | 2 | 105/105 | none | Quick Claw 183 | benched, clean |

`state.battlers.player.partyIndex == 1` confirms the active battler is slot 1.

## 3. Sprite draw sites (source citations)

All icons are OBJ sprites created per party slot from
`sPartyMenuSpriteCoords` (`src/data/party_menu.h:68-78`; banked in
`src/assets/gen/party-menu-sprite-coords.json`). Order per slot:
**icon, heldItem, status, pokeball**.

- **Held-item icon** — `CreatePartyMonHeldItemSprite`
  (`party_menu.c:4021-4038`) → `CreateSprite(&sSpriteTemplate_HeldItem,
  spriteCoords[2], spriteCoords[3], 0)`; `ShowOrHideHeldItemSprite`
  (`party_menu.c:4039-4055`) hides it for `ITEM_NONE`, anim 0 for a held item
  (anim 1 = mail). 8×8, `sOamData_HeldItem` (`party_menu.h:804-819`), gfx
  `graphics/party_menu/hold_icons.png`.
- **Status icon** — `CreatePartyMonStatusSprite`
  (`party_menu.c:4185-4200`) → `CreateSprite(&sSpriteTemplate_StatusIcons,
  spriteCoords[4], spriteCoords[5], 0)`; `UpdatePartyMonAilmentGfx`
  (`party_menu.c:4208-4220`) runs `StartSpriteAnim(..., status - 1)`
  (frame = `GetAilmentFromStatus` result − 1) and makes the sprite invisible
  for `AILMENT_NONE`. 32×8, `sOamData_StatusCondition`
  (`party_menu.h:998-1013`), gfx `graphics/interface/status_icons.png`.

**The sprite coords are centers, not top-lefts.** The 32×8 status sprite
spans `(x−16, y−4)` … `(x+15, y+3)`; the 8×8 item sprite spans
`(x−4, y−4)` … `(x+3, y+3)`. Both match `drawIcon`'s existing center-based
placement in `battlePartySelect.ts`.

## 4. Per-slot icon ground truth (frame 2150, measured)

### 4.1 Status icon (PRZ)

The 32×8 sprite's PRZ glyph occupies x-offsets **6..25** of the 32-wide frame
(banked `party-menu-content.json` `statusIcons.frames.paralyzed`, palette
indices **2/6/7**: white `(255,255,255)`, `(189,189,24)`, `(206,206,132)`).

| Slot | Sprite center | Glyph bbox (rendered) | Variant | Palette used |
| --- | --- | --- | --- | --- |
| 0 | (50, 52) | x 40-59, y 48-55 | PRZ | 2 white, 6 (189,189,24), 7 (206,206,132) |
| 1 | (136, 27) | x 126-145, y 23-30 | PRZ | same |
| 2 | (136, 51) | *none rendered* | — | — |

Template match of the banked `paralyzed` frame against the oracle frame:
**156/156 glyph pixels exact** at both slot 0 center (50,52) and slot 1 center
(136,27). Slot 2's sprite is invisible (`AILMENT_NONE`).

**Layout interaction — the status icon replaces the "Lv50" level line.**
`DisplayPartyPokemonLevelCheck` (`party_menu.c:2290-2298`) only prints the
level when `GetMonAilment(mon)` is `AILMENT_NONE || AILMENT_PKRS`. For a
statused mon the level text is **suppressed** and the status icon is drawn at
the level line's position. Measured on the clean slot 2 (right column, window
origin (96,32)): "Lv50" text is at x126-142, y48-54. On the statused slot 1
(same column, origin (96,8), shifted −24): the PRZ glyph sits at x126-145,
y23-30 — exactly the level line. The level text is absent.

### 4.2 Held-item icon

The 8×8 sprite's generic item glyph (non-mail anim 0) occupies tile offsets
**x 1..7, y 1..7** (banked `party-menu-held-item.json` `frames.item`; palette
indices **4** `(255,247,156)`, **5** `(222,222,115)`, **6** `(247,82,41)`,
**7** `(165,90,82)`, **15** `(99,99,99)`; index 15 is the gray shadow on the
glyph's right/bottom edges at offset 7).

| Slot | Sprite center | Glyph bbox (rendered) | Item | Palette used |
| --- | --- | --- | --- | --- |
| 0 | (20, 50) | x 17-23, y 47-53 | Leftovers | 4,5,6,7,15 |
| 1 | (108, 28) | x 105-111, y 25-31 | Silk Scarf | same |
| 2 | (108, 52) | x 105-111, y 49-55 | Quick Claw | same |

**The held-item icon is a single generic 8×8 sprite** — the same tiles render
for every held item (`ShowOrHideHeldItemSprite` only switches mail vs non-mail
anim). There is no per-item art in the party menu.

## 5. Interaction with name / level / HP-bar layout

Cards use `sPartyBoxInfoRects` (`data/party_menu.h:32-62`), already banked as
`PARTY_CARD_INFO` (`battlePartySelect.ts:453-457`). Measured in frame 2150:

| Slot | Name ink | Level ("Lv50") | HP bar (filled 48px) | HP numbers |
| --- | --- | --- | --- | --- |
| 0 | x32-62, y39-45 | **suppressed** (PRZ) | x32-73, y59-60 | x46 "105/" x61 "/105" |
| 1 | x118-148, y15-24 | **suppressed** (PRZ) | x184-225, y18-19 | x198 "105/" x213 "/105" |
| 2 | x118-148, y39-48 | x126-142, y48-54 | x184-225, y42-43 | x198 "105/" x213 "/105" |

Layout relationships:

- **Status icon sits on the level line** (§4.1) — right of the name, above the
  HP bar. It does not overlap the name or the HP bar.
- **Held-item icon overlaps the mon icon's lower-left corner**: slot 0 mon icon
  spans x0-31,y24-55 (center (16,40)); the item glyph x17-22,y47-52 sits inside
  that region's bottom-left. Slots 1/2 mon icons span x88-119 (y2-33 / y26-57)
  and the item glyph x105-110 (y25-30 / y49-54) sits inside the icon's
  lower-left. The item sprite draws on top of the icon.
- HP bar geometry (green `(90,214,132)` dark / `(115,255,173)` light, 48px max,
  `GetScaledHPFraction`) is unchanged; neither icon overlaps the HP bar.

## 6. Determinism / run receipt

The fixture was run twice, fresh, to separate output dirs:

```
run1 vs run2: 251/251 captures, PNG sha256 lists identical, byte-identical files
```

Semantic state at frame 2150 (both runs): player slot0 `item 200 status1 64`,
slot1 `item 217 status1 64`, slot2 `item 183 status1 0`; `active partyIndex 1`.
`rngValue` constant across the settled window (switching is RNG-free, matching
`docs/mid-battle-switch-presentation-ground-truth.md` §7).

## 7. Bind plan for a MAIN worker (battlePartySelect.ts seams)

1. **Row model.** `BattlePartySelectRow` (`battlePartySelect.ts:30-42`) has no
   `item`/`status`. Both are in the source party records
   (`rules.party.player[...]`): thread `item` and the primary status
   (PSN/PRZ/SLP/FRZ/BRN) into `createBattlePartySelectState` and the
   forced-party projection (`battlePartySelectStateForForcedParty`).
2. **Draw the held-item icon.** In `renderBattlePartySelect`
   (`battlePartySelect.ts:552`), after `drawIcon`, add a per-row
   `drawHeldItemIcon`: for non-`ITEM_NONE`, blit the banked
   `party-menu-held-item.json` `frames.item` 8×8 tile at
   `(centerX−4, centerY−4)` from `party-menu-sprite-coords.json` single-layout
   `heldItem` — centers `(20,50)`, `(108,28)`, `(108,52)` — with the banked
   16-entry palette. The tile already has the glyph at offsets 1-6, so a raw
   blit reproduces the §4.2 bboxes exactly.
3. **Draw the status icon.** Add `drawStatusIcon`: when the row's primary
   status is non-none, select `statusIcons.frames[<variant>]` from
   `party-menu-content.json` and blit its 32×8 glyph at
   `(centerX−16, centerY−4)` with the banked status palette. Variant names are
   exactly `poison|paralyzed|sleep|frozen|burn`. **Suppress the "Lv50" text
   for that row** (mirror `DisplayPartyPokemonLevelCheck`).
4. **Acceptance.** Replay `tools/battle-lab/party-menu-status-item-off.json`
   through `tools/compare` and diff frames 2050-2300. Pixel-exact when the PRZ
   glyphs (x40-59/y48-55 and x126-145/y23-30) and item glyphs match the banked
   tiles, with zero diff on the surrounding settled menu. No timing/RNG work —
   the window is settled-static.

## 8. Obstacles / notes

- The **first** party menu (turn 2, pre-switch) also shows a PRZ icon on the
  then-active slot 0; the second-menu capture is preferred because it has a
  **benched** statused mon plus a statused active mon plus a clean slot — the
  three-way contrast is the ground truth.
- Only **PRZ** is exercised. The other variants (PSN/SLP/FRZ/BRN) share the
  same sprite/template/frame-selection mechanism and the banked asset already
  contains all six frames; a fixture landing e.g. SLP (REST self-sleep then
  switch) would extend per-variant evidence cheaply but is not required.
- `docs/party-menu-notes.md`'s FNT palette-swap notes concern the *overworld*
  party screen; the in-battle menu's status icon is the simple OBJ sprite above.
- The level-text suppression for statused mons is a **source-gated behavior**,
  not an app regression — the app currently always draws "Lv50"
  (`drawRowText`), so binding rank 5 must also gate it.
