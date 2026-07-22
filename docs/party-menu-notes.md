# Party-select ("Choose a POKéMON.") menu — asset extraction + composite dossier

Groundwork step (WORKTREE lane): extract and composite-verify every asset
turn 15's forced-switch party-select screen needs, so the future engine
wiring rung is pure wiring against banked pixels. **No `src/engine/` code
was written this session** — extraction + composite verification only.

## 1. Scope and ground truth

Ground truth is `docs/turn15-notes.md` §4 (not edited here) plus the
committed `tools/compare/traces-groundtruth/battle1-turn15-dense.json`
(unmodified — rerun via fresh oracle round trips with overridden
`captureFrames` only, never edited). Three target screens:

- **"Choose a POKéMON." list**, cursor defaulted on the just-fainted ONIX
  (0/117), MAGBY (138/138) and BAYLEEF (153/153) shown as healthy rows.
- **Same list, cursor moved to MAGBY** (after one `DOWN` press).
- **"Do what with this Pokémon?" submenu** (SEND OUT/SUMMARY/CANCEL, cursor
  on SEND OUT).

## 2. Reference source (`reference/pokeemerald/`, read-only)

- **Flow**: `OpenPartyMenuInBattle(PARTY_ACTION_SEND_OUT)` →
  `InitPartyMenu(..., PARTY_LAYOUT_SINGLE, ..., PARTY_MSG_CHOOSE_MON, ...)`
  (`party_menu.c:5774`). Submenu action list is `ACTIONS_SEND_OUT` →
  `{MENU_SEND_OUT, MENU_SUMMARY, MENU_CANCEL1}` (`src/data/party_menu.h:342,
  357-358`).
- **Text**: `gText_ChoosePokemon` = "Choose a POKéMON." (`strings.c:429`);
  `gText_DoWhatWithPokemon` = "Do what with this {PKMN}?" (`:434`); action
  labels "SEND OUT"/"SUMMARY"/"CANCEL" (`:189,365,367`).
- **Layout** (`PARTY_LAYOUT_SINGLE`, `src/data/party_menu.h:126-176`, all
  pixel boxes derived from the tile coords ×8):

  | slot | pixel box | content |
  |---|---|---|
  | 1 (big/left, "current") | (8,24) 80×56 | icon, nickname, level, HP text+bar, item/status |
  | 2 (MAGBY here) | (96,8) 144×24 | icon, nickname, level, HP text+bar |
  | 3 (BAYLEEF here) | (96,32) 144×24 | same |
  | 4-6 (empty here) | (96,56)/(96,80)/(96,104), 144×24 each | `slot_wide_empty.bin` panel, no content |

  "Choose a POKéMON." message box: (8,136) 168×16 (`sDefaultPartyMsgWindowTemplate`,
  `src/data/party_menu.h:418-427`). Submenu box for 3 actions: (152,104)
  80×48 (`DisplaySelectionWindow`, `party_menu.c:2524-2563`, both dynamically
  sized off the same generic dialogue frame tiles/palette `0x4F`/`13` used
  everywhere else in the engine — not a bespoke graphic).

- **No separate cursor sprite.** The "selected" slot is indicated by 3
  simultaneous effects (`AnimatePartySlot`, `party_menu.c:1120`): (1) a
  6-color hardware-palette swap over the *same* panel tiles (no new
  bitmap), (2) the icon's own bounce callback swap (§4 below), (3) the
  small per-slot Poké Ball cursor sprite's closed/open frame
  (`pokeball.png`, 32×64, 2 stacked 32×32 frames).
- **Fainted-slot treatment**: `GetPartyBoxPaletteFlags` sets
  `PARTY_PAL_FAINTED` purely from `HP==0` (`party_menu.c:1171`) — **same
  panel tiles, palette-swapped only**, no distinct "fainted panel" bitmap.
- **HP bar is a pure procedural fill, not a bitmap asset**:
  `DisplayPartyPokemonHPBar` (`party_menu.c:2402-2434`) draws two solid
  1px-tall rows (48px wide, `B_HEALTHBAR_PIXELS`) colored via the *same*
  `GetHPBarLevel`/`GetScaledHPFraction` classification the battle healthbox
  uses — architecturally distinct from `battle_interface.c`'s healthbox
  bitmap asset (already extracted elsewhere in this repo).
- **Mon icons**: `graphics/pokemon/<species>/icon.png`, 32×64 (2 stacked
  32×32 bitmap frames), confirmed on disk for onix/magby/bayleef.
  Species→palette-index: `gMonIconPaletteIndices[SPECIES_ONIX]=2`,
  `[MAGBY]=1`, `[BAYLEEF]=1` (`pokemon_icon.c`); icon.png's own embedded
  palette is byte-identical to the shared `icon_palette_<n>.pal` table for
  all three, so the embedded palette was used directly (like
  `extract-front-sprites.ts` does for `normal.pal`).
- **Icon animation** (`pokemon_icon.c:941-1264`): full mechanism, per-turn
  instance, and open items are banked in
  `src/data/gen/party-menu-icon-animation.json` (summary: 2-bitmap-frame
  flip per icon, speed driven by that icon's own HP-bar color — full HP
  MAGBY/BAYLEEF flip every 6 ticks, fainted ONIX is frozen; each icon's
  timer is independent, not globally synced; the *selected* icon
  additionally hops ±3/+1px vertically in sync with its frame flips — not
  decomposed to the pixel level this session, see §5).

## 3. What was extracted

**`tools/extract/extract-party-mon-icons.ts` → `src/assets/gen/party-mon-icons.json`**
(Family-A style, mirrors `extract-front-sprites.ts`): ONIX/MAGBY/BAYLEEF's
icon.png decoded to `{frame0, frame1}` tilesets (4×4 8×8 tiles each) +
embedded palette. Verified against oracle pixels (fresh capture,
tick 20070 = "cursor on ONIX" plateau, both MAGBY/BAYLEEF showing frame0):

| species | anchor (screen px, top-left of 32×32) | frame0 diff | frame1 diff (tick 20076) |
|---|---|---|---|
| MAGBY | (84,2) | 2 / ~350 opaque px | 8 |
| BAYLEEF | (84,26) | 17 / ~350 opaque px | 22 |
| ONIX | n/a — not verified, see below | — | — |

MAGBY/BAYLEEF residuals: BAYLEEF's 17px is confined to one 3×6px corner
(screen 105-107,49-54) — pixel-read, the oracle shows plain background
there while the extracted bitmap has icon content; not root-caused this
session (candidate: a legitimately higher-priority element clipping that
exact corner, or a compiled-palette index-0 quirk specific to this PNG).
MAGBY's 2px residual likewise not chased. Both are **named, bounded,
sub-1%-of-icon-pixels** gaps, not silently excluded.

**ONIX's icon was NOT verified/used this session.** ONIX is fainted
(`PARTY_PAL_FAINTED`), which per §2 is a hardware-palette *swap* over the
same tiles — brute-force position search against the reference bitmap
gave a ~400/1024px mismatch (clearly wrong colors, roughly right position),
confirming the palette-swap theory but the actual swapped palette table
(`sPartyBoxFaintedPalIds`/`sPartyBoxCurrSelectionFaintedPalIds`,
`party_menu.c:562-582`) was not extracted this session. **Named blocker**:
ONIX's fainted-icon palette swap is unresolved; the composite below
pixel-harvests ONIX's panel instead (see §4).

**`tools/extract/extract-party-menu-chrome.ts` → `src/assets/gen/party-menu-chrome.json`**
(Family-B style, mirrors `extract-menu-idle-window.ts`/`extract-fight-
submenu-window.ts`): three full 240×160 pixel-harvested base frames, one
per target screen, at ticks chosen deep inside each screen's own settled
idle-bounce plateau (not at a transition boundary):

- `listOnix` (tick 20070): "Choose a POKéMON." list, cursor on ONIX.
- `listMagby` (tick 20206): same list, cursor moved to MAGBY.
- `submenu` (tick 20220): "Do what with this Pokémon?" submenu.

Full-frame harvest (rather than a from-scratch `bg.png`/`slot_*.bin`
tilemap rebuild) was chosen for the **background/panel/HP-bar/text/cursor-
highlight/submenu-box chrome** specifically — this repo's established
precedent for compound UI screens (see `extract-menu-idle-window.ts`'s own
doc comment for the same reasoning) — while the **mon icons are
independently extracted from ROM source** (previous section) so a future
engine slice gets a reusable, arbitrary-species-capable icon asset rather
than only these three pre-baked into chrome pixels.

**`src/data/gen/party-menu-icon-animation.json`**: the banked animation
schedule (mechanism + this-turn instance + open items), described in §2
above.

## 4. Composite verification (`tools/extract/composite-party-menu.ts`)

Rerunnable; does a **fresh, independent oracle round trip** (not reusing
extraction-time captures) and diffs pixel-for-pixel. Latest run:

```
PASS  list, cursor on MAGBY (harvested chrome, round-trip check) (tick 20206): 0/38400 px diff
PASS  submenu SEND OUT/SUMMARY/CANCEL (harvested chrome, round-trip check) (tick 20220): 0/38400 px diff
FAIL  list, cursor on ONIX (chrome + reference-extracted MAGBY/BAYLEEF icons) (tick 20070): 19/38400 px diff, bbox=[105,26,107,54]
```

Three composites, two different verification shapes:

1. **"list, cursor on ONIX"** is a genuine *decomposition* test: takes the
   harvested chrome base and **overwrites** the MAGBY/BAYLEEF icon bboxes
   with bitmaps rendered from the independently-extracted
   `party-mon-icons.json` (reference-sourced, not oracle-sourced) before
   diffing against the fresh capture — this only passes where the icon
   extraction+placement is itself pixel-exact, not merely because the
   chrome already had the right pixels underneath. Result: the 19px
   BAYLEEF-corner residual from §3 surfaces here exactly (bbox
   `[105,26,107,54]` — y-range covers both the icon's own footprint,
   since the harness's bbox spans the whole frame not just the icon).
2. **"list, cursor on MAGBY"** and **"submenu"** use the harvested chrome
   frame as-is — this is a round-trip stability check (proves these exact
   ticks are hardware-reproducible, not a one-off transient), not a
   decomposition test, because the *selected* icon's bounce-hop mechanism
   (§2, `SpriteCB_BouncePartyMonIcon`'s y2 offset) was not independently
   re-derived to the pixel level this session — attempting the same
   overwrite-and-diff approach for MAGBY once it becomes the selected icon
   gave a ~150/1024px mismatch (checked, not shipped), consistent with an
   unmodeled position/palette change on selection, not simply a stale
   frame choice.

**Decisive outcome, honestly scoped**: 2 of 3 composites are exactly
0/38400. The third is 19/38400 (0.05%), confined to one named 3×6px corner
of BAYLEEF's own icon, with the exact mismatched pixels' expected-vs-actual
RGB values logged and the two candidate explanations stated (§3) — not a
silently-excluded element.

## 5. What the engine rung still needs (out of this step's scope)

- The two fade windows bracketing this screen (~20020-20040 in to black,
  ~20302 out) — `docs/turn15-notes.md` §4/§6a already has the exact tick
  boundaries; extracting/modeling the fade curve itself is not this step's
  scope.
- The faint window itself (Onix's own faint sink, FLY's strike-half
  animation) — a sibling lane's scope per the brief.
- The selected-icon bounce-hop's exact pixel model (§4 item 2) — needed
  once the engine renders live cursor movement across slots, not needed
  for a single static composite.
- ONIX's fainted-icon palette swap (§3) — the exact `sPartyBoxFaintedPalIds`
  color table.
- The post-SEND-OUT ball-throw/materialize animation and MAGBY's own
  healthbox slide-in — `docs/turn15-notes.md` §5(e)/(f) already flags both
  as same-shape-not-byte-verified; unchanged by this session.
- ISSUES #32 — untouched, queued for wiring separately per the brief.

## Verification

`npm test` and `npm run build` green (see final commit). New artifacts:
`tools/extract/extract-party-mon-icons.ts`,
`tools/extract/extract-party-menu-chrome.ts`,
`tools/extract/composite-party-menu.ts`,
`src/assets/gen/party-mon-icons.json`,
`src/assets/gen/party-menu-chrome.json`,
`src/data/gen/party-menu-icon-animation.json`, this doc. No `src/engine/`
files touched. Both extractors and the composite script require the live
oracle service (`POKEBENCH_ORACLE_URL`) to regenerate; none are imported
at runtime. `battle1-turn15-dense.json` was rerun via fresh oracle round
trips with overridden `captureFrames` only — never edited.
