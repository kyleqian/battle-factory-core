# In-battle party-menu visual gap inventory (ISSUES #80)

Ground-truth inventory for ISSUES #80: the mid-battle party/switch menu in
live play "looks completely wrong" (layout/sprites/HP bars/message strip).
This doc captures the settled party-menu frame from the real ROM, renders the
app's same state with the live renderer, and ranks the visual gaps region by
region with pixel-diff magnitudes. **No fixes here** — this is the slice plan
source for a MAIN bind step.

Source of the staged frame: the ISSUES #78 mid-battle-switch scout's committed
scenario `tools/battle-lab/scratch-mid-battle-switch-coarse-off.json` /
`-dense-menu-a-off.json` / `-dense-menu-b-off.json` (3× RATTATA in that trace
— note: the menu *layout* is the object of study, not the species; the app
render below stages the same layout state). The settled span is frames
**884-925**: party menu faded in (menu open 764+), cursor moved RIGHT from
slot 0 to **slot index 1** (the second slot) at frame 884, submenu not yet
opened (A at 922 opens it). Reference frame: **oracle 905** (mid-span, cursor
on slot 1).

App render: `tools/scratch-render-party-menu.ts` (committed) — constructs the
live route's `BattlePartySelectState` (3× ONIX, cursor 1, submenu closed,
"Choose a POKéMON.") and renders with the exact live renderer
`renderBattlePartySelect` (`src/engine/battlePartySelect.ts:331`),
`node --experimental-strip-types tools/scratch-render-party-menu.ts
/tmp/app-party-menu.png`.

## 1. Headline

Full-frame pixel diff (oracle 905 vs app render): **15 267 / 38 400 px
(~40 %)**. The app's menu is recognizably the same screen (same checkerboard
panel, same card positions) but every content element inside the cards and the
message strip differs.

## 2. Region-by-region diff (oracle-aligned bands)

| # | Region (oracle rows) | Diff | Oracle (real) | App (live renderer) |
| --- | --- | ---: | --- | --- |
| 1 | Top margin / header (0-26) | 22 % | Checkerboard panel + the slot-1 card's top edge starts at y8. | Same checkerboard; slot-1 card drawn at (96,8) — matches source position. Diff is the card *content* bleeding into the band + missing top-right accent. |
| 2 | **Slot 0 card (26-56)** | **62 %** | Left card x8-88 y24-80 (`data/party_menu.h` SINGLE slot 1: window tilemap (1,3) 10×7): front-mon art, name, Lv, gender, HP bar. | Card frame at (8,24) matches; art = 16×16-party-icon tiles at (16,40) (`drawIcon`, `battlePartySelect.ts:283-307`); name+Lv+`hp/maxHP` drawn as text (`drawRowText` :309-328); **no gender, no graphical HP bar, no status/held-item icons**. 1842/4480 px differ inside the art region alone. |
| 3 | **Slot 1 card (8-32)** | **23 %** | Right card x96-236 y8-32 (window (12,1) 18×3): front-art, name, Lv, **gender symbol** (pink `(198,165,206)` measured), HP bar at (88,10,48×3 rel). | Card frame at (96,8) matches; art = icon tiles at (104,18); name/Lv/HP text at (118,11)/(126,20); **gender symbol absent** (no pink anywhere in the app's slot-1 art; oracle has 38 pink px). 558/960 px differ in the art region. |
| 4 | Slot 2 card (32-56) | 12 % | Right card x96-236 y32-56 (window (12,4)). | Card frame at (96,32) matches; same icon-vs-front-art + missing gender/HP-bar class. Closest of the three cards because its content is smallest. |
| 5 | **Message strip (110-160)** | **58 %** | Real `WIN_MSG` window at tilemap (1,15) 28×4 = px **(8,120)-(232,152)** (`data/party_menu.h:179-187`), party-menu-tileset styled, "Choose a POKéMON." text. | App draws `drawStandardWindowFrame(fb, 0, 112, 28, 4)` — the **generic prebattle-room standard window** at px (0,112)-(224,143) (`battlePartySelect.ts:351-356`): shifted up 8px, 8px wider each side, wrong window style/tileset. |
| 6 | Selection highlight / cursor | n/a | Real selected slot gets the party-menu cursor (Poké ball + slot border highlight + the list art's idle animation — `listOnix`/`listOnixFrame1` frames exist in `party-menu-chrome.json`). | App swaps the slot's `paletteBank` 3→7 (`battlePartySelect.ts:336-338`); no ball sprite, no animated art. |

## 3. Ranked gap list (bind priority)

1. **HP display: graphical bar + HP numbers, per card.** Real cards show a
   colored HP bar (green/yellow/red by fraction) with `HP/maxHP` text; the app
   draws only the text `110/110`. Touches all three cards; biggest single
   readability defect. Source geometry: `sPartyBoxInfoRects[RIGHT_COLUMN]`
   HP bar (88,10,48×3) / HP (102,12) / Max HP (117,12), `data/party_menu.h:48-61`;
   left card HP bar (24,35,48×3) rel.
2. **Slot art: front-mon art, not the 16×16 icon.** The app renders
   `party-mon-icons.json` tiles; the real menu renders the mon's list art
   (front pic family — `party-menu-chrome.json` already banks full-screen
   captures `listOnix`/`listMagby` at ticks 20070/20206, and the `listOnix`
   name/positions can be componentized). 1842/4480 px of the slot-0 region
   diff is this alone.
3. **Gender symbol per card.** Real shows ♂/♀ in pink/blue; the app omits it
   entirely. Tiny region (~38 px/slot measured) but cheap to add once the
   glyph asset is extracted.
4. **Message strip: real party-menu window, not the standard window.** The app
   reuses the prebattle standard window (`drawStandardWindowFrame`) at the
   wrong offset (0,112 vs real 8,120) with the wrong tileset. Needs the party
   menu's own `WIN_MSG` window tiles (same `party-menu-source.json` tileset
   family the cards already use — derivable, no new asset family).
5. **Status-condition + held-item icons.** Real cards draw status overlays and
   the held-item ball/icon (`sPartyMenuSpriteCoords[PARTY_LAYOUT_SINGLE]`,
   `data/party_menu.h:68-78`); app draws neither. This fixture (no items, no
   status) doesn't exercise them — defer to a fixture that does.
6. **Cursor/selection presentation.** Palette-swap is the visible gap; the
   ball + border-highlight + art animation are the real mechanism. Only worth
   binding after 1-4 (it is the interactive framing, not the static content).

## 4. Source-derivable vs new extraction

**Derivable from assets already in the tree** (no new source extraction):
- Card frames + panel background: already used (`party-menu-source.json`,
  `battlePartySelect.ts:264-281`).
- Message-window chrome: same `party-menu-source.json` tileset family — the
  `WIN_MSG` window is drawn from the same bg0/bg1 tiles.
- Slot front-art: `party-menu-chrome.json`'s `listOnix`/`listMagby` are
  captured reference screens (240×160 at a known tick); the ONIX/MAGBY list
  sprites can be componentized from them (they already carry per-frame
  `listOnix`/`listOnixFrame1` entries). Species breadth for the other 374
  species needs either a per-species chrome capture pass (dev-time oracle
  sweep) or the front-sprite family already banked for the field renderer.
- HP-bar fill colors and the HP/Max-HP text positions: source constants
  (`data/party_menu.h:32-62`) — numeric, no asset work.

**Needs new extraction / capture:**
- Gender glyphs (♂/♀) in the party-menu font/palette.
- Status-condition overlay icons and held-item ball/icon per species
  (`sPartyMenuSpriteCoords` positions are source-known; the art tiles are not
  yet extracted).
- Non-ONIX/MAGBY list-art chrome for species breadth (or a decision to reuse
  the field front-sprite family at the list positions).

## 5. Reuse / acceptance commands

- Oracle reference re-runnable: `bin/oracle lab
  tools/battle-lab/scratch-mid-battle-switch-dense-menu-a-off.json -o /tmp/pm`
  (frames 700-955 dense; settled cursor-on-slot-1 span 884-921 is inside).
- App render re-runnable: `node --experimental-strip-types
  tools/scratch-render-party-menu.ts /tmp/app-party-menu.png`.
- Diff recipe used here: `python3 -` image-diff on oracle `frame-00905.png`
  vs the app PNG (region bands above).
- Bind acceptance (future MAIN work): after each slice, re-run the pair and
  shrink the band diffs; a dense compare stage over the party-menu span
  (`scratch-mid-battle-switch-dense-menu-a-off.json`) is the eventual gate.

**Out of scope:** the switch-in/out cadence (ISSUES #78, main-lane bind in
flight); message hold timing (#77); anything past the submenu-open edge (A at
frame 922) — the submenu's SEND OUT/SUMMARY/CANCEL window is its own slice.
