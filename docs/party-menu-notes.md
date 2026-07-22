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

## 6. 2026-07-22 worktree probe: the three open items closed

Bounded worker (WORKTREE lane, stacked on §1-5's groundwork). Closes all
three items named in this doc as blocking the party-select ENGINE rung.
New probe: `tools/probe/dump-party-icon-bounce.py` (all 64 `gSprites[]`
slots' x/y/x2/y2/animNum/animCmdIndex/animDelayCounter, reusing
`battle1-turn15-dense.json`'s own segments verbatim, same convention as
`dump-turn14-bounce-driver.py`/`dump-fly-anim.py`).

**Item 1 — selected-icon bounce hop: DERIVED, formula-general, verified
at off-sample ticks.** Full model banked in
`src/data/gen/party-menu-icon-animation.json` (`mechanism.hopModel` +
`.renderLag`), summary:

- Each icon sprite's `struct Sprite` x/y (RAM-confirmed) is its OAM
  **center**, not top-left; top-left = `(x+x2-16, y+y2-16)`. Base x/y is
  constant per icon all turn: ONIX (16,40), MAGBY (104,18), BAYLEEF
  (104,42).
- Deselected: a **permanent fixed offset** (`AnimateSelectedPartyIcon`,
  `animNum` param 0) — box1/"current" slot (sprite x==16) gets y2=-4;
  every other box gets x2=-4. No further animation once set.
- Selected: x2 stays 0 (no horizontal hop — refutes nothing, just confirms
  the hop is purely vertical); y2 alternates -3/+1, changing only on an
  actual `UpdateMonIconFrame` frame-advance event. For animNum N (per-frame
  delay `D_N` from the existing speed table: 6/8/14/22/29), **y2=-3 holds
  for `D_N+1` ticks, y2=+1 holds for `D_N+2` ticks, full period =
  `2*D_N+3`** — the asymmetry is `sMonIconAnims`'s own trailing `JUMP(0)`
  re-arming the cycle one tick early without touching y2. RAM-verified
  against ONIX (animNum 4, D=29: flip ticks 20114→20144→20175, deltas
  30/31) and MAGBY post-select (animNum 0, D=6: flip ticks
  20195→20203→20212→20220, deltas 8/7/8) — both exactly `D+1`/`D+2`, not
  curve-fit to one instance.
- **Render lag, bisected (not assumed)**: the y2/bitmap effects of
  `UpdateMonIconFrame`'s delay-driven redraw lag the RAM's own bookkeeping
  by **exactly 1 tick** in the rendered PNG (confirmed independently for
  ONIX's y2 flip at RAM-tick 20144/visible-tick 20145, and MAGBY's frame
  flip at RAM-tick 20150+20212/visible-tick 20151+20213) — a GBA-generic
  one-VBlank pipeline delay, same class this run's ledger has bisected
  elsewhere. The SELECT/DESELECT position jump itself has **zero** lag
  (DOWN pressed at trace-tick 20191; the x2/y2 swap is visible in that same
  tick) since it's applied synchronously by `AnimateSelectedPartyIcon` on
  the input tick, unrelated to the delay counter.
- Also found (bonus, not chased further): a 2-tick global stall
  (20205-20207) where BOTH ONIX's and MAGBY's independent
  `animDelayCounter`s freeze simultaneously instead of decrementing — noted
  as a real, probed artifact of this mechanism's own timing, cause not
  pinned down (out of scope: no engine rendering this session).
- The old "ONIX's y2 hop doesn't show for a fainted mon" claim is
  **refuted**: it does hop (bitmap frozen, position doesn't), the earlier
  121-tick "zero pixel change" capture just never sampled a phase-changed
  tick.

**Item 2 — ONIX's fainted-icon palette: REFUTED, no table exists.**
Direct RAM dump of OBJ palette slot 5 (ONIX's icon sprite, tick 20150) is
byte-identical (5-bit↔8-bit expansion aside) to
`graphics/pokemon/icon_palettes/icon_palette_2.pal` — ONIX's perfectly
normal species table, **already** the one embedded in
`party-mon-icons.json`. `PARTY_PAL_FAINTED` (`party_menu.c:2244-2256`)
only ever loads into the box panel's own **BG** palette
(`LoadPartyBoxPalette` → `BG_PLTT_ID(...)`) — background palette memory,
never the icon's own OBJ-palette slot. The earlier "~400/1024px mismatch,
confirming the palette-swap theory" was actually the unmodeled bounce hop
(item 1) shifting ONIX's position by up to 4px, misread as a color
problem. No new palette table needed or banked; the existing ONIX icon
entry is correct as-is.

**Item 3 — the 19/38400px BAYLEEF-corner residual: root cause named,
NOT extractor-side.** RAM-probed at tick 20070: `gSprites` slot 9 — an
always-created per-slot sprite (`sSpriteTemplate_StatusIcons`,
`CreatePartyMonStatusSprite`/`UpdatePartyMonAilmentGfx`,
`party_menu.c:4184-4221`, hidden only when `GetMonAilment(mon) ==
AILMENT_NONE`) — is **in-use and not invisible** at BAYLEEF's icon's
bottom-right corner: BAYLEEF is carrying a status ailment this turn, and
its indicator draws on top of the icon there. Its 8x8 tile (OBJ palette
slot 0, VRAM tile 0) decodes to colors ((248,240,152)/(216,216,112)/
(240,80,40)/(160,88,80) in 15-bit RAM) that match the residual's actual
oracle pixels **exactly** once expanded to 24-bit. This is candidate 1
from §3, confirmed, not candidate 2: the icon extraction/decode is
correct; a genuinely separate, correctly-behaving UI sprite (out of the
icon asset's own scope) draws over that exact corner. No extractor fix
applies — extending the composite to also model the status-icon sprite
would be a new (4th) asset, out of this step's scope.

**Composite results** (`composite-party-menu.ts`, extended to decompose
**all three** icons, not just the unselected two, plus 2 new off-sample
mid-hop ticks — 5/5 checks, fresh independent oracle round trip):

```
FAIL  list, cursor on ONIX (chrome + all 3 icons decomposed, selected hop phase -3) (tick 20070): 19/38400
FAIL  list, cursor on ONIX, MID-HOP (selected hop phase +1, off-sample tick) (tick 20158): 30/38400
FAIL  list, cursor on MAGBY (chrome + all 3 icons decomposed, selected hop phase -3) (tick 20206): 34/38400
FAIL  list, cursor on MAGBY, MID-HOP (selected hop phase +1, off-sample tick) (tick 20215): 54/38400
PASS  submenu SEND OUT/SUMMARY/CANCEL (harvested chrome, round-trip check) (tick 20220): 0/38400
```

Every non-zero residual's bbox lands in the same x105-111,y25-26 window —
the item-3 status-icon corner, confirmed identical cause each time
(including the MAGBY-selected cases, where MAGBY's own expanded/shifted
bbox now additionally clips into that same corner — a second confirming
data point for item 3, not a new bug). **Decisive outcome**: items 1 and 2
fully closed (hop model exact and formula-general, verified off-sample;
fainted palette theory refuted with direct evidence); item 3's exact
blocker is named precisely with RAM+source evidence and is not
extractor-side, so no extractor fix applies — a true engine-wiring rung
would need a 4th "status icon" asset to reach a clean 0/38400 on the
ONIX/MAGBY composites, which is new scope, not a residual bug.

Verification: `npm test` **993/993**, `npm run build` green. New/changed
files this session: `tools/probe/dump-party-icon-bounce.py`,
`tools/extract/extract-party-menu-chrome.ts` (2 new harvested ticks),
`tools/extract/composite-party-menu.ts` (rewritten: all-3-icon
decomposition + 2 new mid-hop checks), `src/assets/gen/party-menu-
chrome.json` (regenerated, 5 frames), `src/data/gen/party-menu-icon-
animation.json` (hop model + render-lag + fainted-palette + status-icon
findings), this doc. No `src/engine/` files touched.

## 7. 2026-07-22 corrective wiring: icon-free chrome is now a live compositor

This section supersedes the historical §4/§5 caveat above. The production
renderer now calls `partyMenuLayers(PartySelectState)` and composes the
source-extracted ONIX/MAGBY/BAYLEEF tiles, extracted BAYLEEF status OBJ, and
RAM-derived selected-hop/deselected-offset state over an **icon-free** chrome
base. `extract-party-menu-chrome.ts` replaces every opaque source icon/status
texel in each persisted base with a conspicuous sentinel before
palette-indexing it; transparent icon texels retain only underlying panel/BG
chrome. Neither production nor the proof can reveal a harvested source icon
through transparency.

`composite-party-menu.ts` starts from that erased base and redraws all three
icons plus status before every comparison. Fresh oracle result: **5/5 PASS,
0/38400 px each** at list-ONIX `20070`, ONIX mid-hop `20158`, list-MAGBY
`20206`, genuine pre-confirm MAGBY mid-hop `20196` (replaces the old,
incorrectly-labelled post-confirm `20215` sample), and submenu `20220`.

The live canonical and 30-frame delayed-dismiss traces now capture 62 frames
each (formerly 46): both add eight-frame representative ONIX-selected and
MAGBY-selected frame-flip/hop plateaus, and both are **62/62, 0 diff**. The
remaining party-menu debt is intentionally out of this rung: entry fade/black
and the post-SEND-OUT path.
