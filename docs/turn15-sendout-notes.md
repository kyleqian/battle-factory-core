# Turn 15 — post-SEND OUT implementation dossier (#37)

Scope is the canonical `battle1-turn15-dense.json` only: the final `A`
press on SEND OUT at tick **20245** through MAGBY-vs-MURKROW's settled
action menu. This is a characterization handoff, not an engine change.

## Reproduce and inspect

```sh
node --experimental-strip-types tools/probe/verify-turn15-sendout.ts
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-turn15-sendout.py \
  tools/compare/traces-groundtruth/battle1-turn15-dense.json \
  /tmp/turn15-sendout.json 20245 20560
```

The verifier performs two fresh capped oracle runs (316 dense frames total)
and currently reports **17 PASS assertions**. The RAM dump scans live sprite
slots rather than treating a slot as an asset identity; it records callbacks,
OAM position/affine/tile/palette, matrices, tile/palette hashes, healthbox
components, controller flags, active tasks, species/HP/PP and menu cursor.

## Exact implementation rungs

| rung | rendered boundary / evidence | future compare capture range |
| --- | --- | --- |
| 1 — leave party UI | confirm transient **20245-46**; party fade changes 20247-62; pure black **20263-20301** | `20245-20302` stride 1 |
| 2 — battle field + text | first battle fade-in **20302** (`4da3117d37db`); fade advances through 20317; `Go! MAGBY!` handoff first changes at **20330** | `20302-20345` stride 1 |
| 3 — visible player ball | the player ball's slot 6 is allocated at 20343, but its first visible texel is **20345**; every ball-only frame ends **20390** and MAGBY already owns pixels at 20391 | `20345-20390` stride 1 (delayed +30) |
| 4 — open/materialize | burst begins **20402**; growing/tinted MAGBY pixels start **20400**, continuous through 20430; materialize settles in visible pixels **20534-50** (`4f63d4696c93`) | `20400-20550` stride 1 |
| 5 — healthbox | all three player components become visible at **20407**, slide x=268→158 by **-5 px/tick**, settle **20429**; populated full HP throughout | `20404-20431` stride 1 |
| 6 — clear/menu | blank message **20551-56**, no flavor quip; first settled action-menu frame **20557** (`5950e7b3d8ba`), then bounce `5950 → 083f → 5950` at 20557-59 | `20534-20560` stride 1 |

Use a new *ground-truth-only* capture list with those ranges (split each
range under 256 captures) before wiring each rung. Do not add a red app
trace: the existing canonical and delayed party traces stay 143/143.

### Rung-2 closure (2026-07-22)

A fresh oracle-only every-frame run over canonical **20302--20345** confirms
the field's BLDY sequence is 15 through 0 at 20302--17, followed by an
unchanged blank message box through 20329. `Go! MAGBY!` changes at 20330,
charges its silent space as a FAST-speed character, and is complete at 20339.
The direct OAM probe calls the new slot live at 20343--44, but fresh
framebuffer deltas are zero there. At **20345** it becomes a visible affine
closed ball (111px, bbox 18,62--29,73; tile 405/palette 6, first x2/y2
translation). The honest text-only compare endpoint is therefore 20344, not
the RAM boundary; this is rung 3's ball/trainer handoff, not text work.

`turn15-sendout-rung2.json` and its 30-frame delayed counterpart each capture
43 frames through that endpoint and both compare **43/43 exact**. The engine
uses no global trace tick: `PartySelectState.sendOutElapsed` selects the
transferred field's BLDY coefficient and the existing font primitives type
the text. Brendan, ball, materialization, and healthbox remain rung 3+.

## RAM/OAM/VRAM facts

- The confirmation leaves party ownership after 20267; no live party-list
  sprites remain by 20274. `gBattleControllerExecFlags` is `0x1` through
  the menu/fade, runs `0x2` at 20329 when battler data commits, and returns
  to `0x0` at 20538 before the menu redraw.
- Battler 0 becomes **MAGBY species 240 by 20330**, `138/138`, PP
  `[15,20,10,20]` (FIRE_PUNCH/SMOKESCREEN/CONFUSE_RAY/SMOG); move cursor is
  **0** at settle. MURKROW remains 142/142. The two known AI bookkeeping
  steps remain 20550/20556; there is no send-out-animation RNG.
- **Correction (fresh direct OAM/callback/VRAM + PNG evidence):** slot 6,
  tile 405/palette 6, callback `0x8076205`, sheet `aefecfa10ef3`, and path
  `(24,68)→(72,126)` are the **player Poké Ball**, not Brendan. No Brendan
  sprite is instantiated in this forced-switch handoff. Software allocation
  at 20343--44 owns no framebuffer texel; ball pixels begin 20345. The
  player-mon slot and particle slots are already live earlier than their
  visible ownership: the first rendered MAGBY pixels are 20391, so 20390 is
  the honest ball-only endpoint (delayed: 20420).
- The player mon lives in slot 5 (tile 341/palette 0; sheet
  `7ccf3b994cb4`). It begins with affine matrix 1 at scale 1638 on 20389,
  contracts to identity `(256,0,0,256)` by 20402, then changes into the
  release/fade callback `0x8184a3d` at 20405. Palette hash transitions
  while the tint task runs; this is not a static MAGBY bitmap.
- Open particles occupy transient slots 6-21, tiles 417-419/palette 7
  (sheet hashes `f0db286dace3`/`1e998c67312c`/`952989352b4c`): they spawn
  20402 onward, then drain away by 20431. Their staggered start is part of
  the shared ball-open primitive, not a MAGBY-specific table.
- Player healthbox IDs resolve as left/right/bar **1/63/62**, tile starts
  **0/64/256**, palette banks **4/4/5**. At first visible tick 20407 their
  left centers are `(268,88)`, then -5 x/tick to `(158,88)` at 20429;
  there is a one-pixel menu-bounce y2 at 20557. The content tiles have
  stabilized by 20407 (`9ffd0f4c6308` left, `8f45ebe594ce` bar), so this
  rung must create/populate before slide, not fill it after settling.

## Reuse map — explicit, not merely “same shape”

| existing primitive | verdict for MAGBY | required change |
| --- | --- | --- |
| Initial ONIX `battleMenu.ts`: `goTextVisibleChars`, `brendanThrowFrame`, `brendanThrowDx`, ball trajectory/poses | **Verbatim math and tables** | parameterize the text string/species and anchor all clock helpers at post-confirm rather than their current intro ticks. Do not copy the ONIX absolute constants. |
| Initial ONIX `battleScene.ts`: `drawPlayerMaterialize`, `drawPlayerMaterializeSettle`, `playerHealthboxSlideDx`, `drawMenuHealthboxPlayer` | **Reusable render primitives; current wrappers are not** | extract press-relative anchor + HP/species arguments. The proven healthbox formula is identical (`dx=110-5*n`, rendered here as 268→158), but MAGBY needs its own start tick and content. |
| Turn 5 Pidgeotto switch-in: `TURN5_BALL_HANDOFF_TICK`, ball poses, `drawTurn5SwitchinParticles`, `affineEmergeAccumulator`, `MATERIALIZE_Y2_TABLE`, tint/blend and BG fade | **Verbatim low-level ball/particle/affine/tint mechanisms** | re-anchor only for the common mechanism. Keep the clean switch-in particle age formula; do not inherit S6's one-off particle stall correction. Supply MAGBY front sheet/palette/animation identity. |
| Turn 13 Murkrow switch-in materialize/wobble tables | **Not verbatim reusable as a table** | only the materialize framework/ramp sequencing transfers. Its species-specific front-animation and wobble entries are evidence that MAGBY needs either direct extraction or a fresh table; do not transpose Murkrow values. |
| Standard `battleMenu` action-menu redraw/cursor bounce (turn 13/14) | **Verbatim bounce primitive** | re-anchor redraw to 20557 and retain cursor 0/PP `[15,20,10,20]`; this trace proves the initial `5950/083f/5950` bounce, not a static idle frame. |

New data genuinely needed before code: MAGBY's player-front asset/frame
selection and its palette identity, and any MAGBY-only post-release
wobble/animation table. Everything else above is an anchor/species/HP
parameterization of already-owned mechanisms.

## Rung-1 corrective palette/OAM probe (2026-07-22)

Reproduce with the checked-in direct probe (mGBA diagnostics can be safely
discarded):

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-turn15-sendout.py \
  tools/compare/traces/turn15-party-select.json \
  /tmp/turn15-rung1-palette-oam.json 20248 20302
```

The dump now stores all 16 BG + 16 OBJ `gPlttBufferUnfaded` and
`gPlttBufferFaded` banks as BGR555, each live `gSprites` identity and VRAM
sheet hash, the PPU's actual OAM, and display/BG-control/VRAM hashes. This
is intentionally direct state, not a screenshot-color fit.

- The 5px residual at 20248/50/58/60/62 is the top MAGBY icon's palette-4
  entries 4/5. At 20248, their direct palette values are `173,239,255` /
  `123,214,239` unfaded and `148,206,222` / `107,181,206` faded. The live
  icon is gSprite 4 (tile 106, bank 4); it remains PPU OAM entry 5 on those
  ticks. The old screenshot-derived status overlay treats its transparent
  backing as opaque, so only those bank-4 colors expose the ownership error.
- The 273px residual at 20253/54 is one exact rendered color,
  `41,41,66` vs hardware `41,41,57`. The latter is OBJ palette bank 1
  (global bank 17), index 15: direct state gives unfaded `74,74,99` and
  faded `41,41,57`. The four live menu Poké Ball sprites use that bank (PPU
  entries 6--9); `sendOutExitFrame0`'s palette restoration chose the
  ambiguous blue candidate ending in 115 instead of this RAM-proven entry.
  This is an extracted palette-bank correction, not a mask/diff exception.
- 20302 is not the frozen faint frame under a simple global fade. Hardware
  has switched to `DISPCNT=0x1f40`, `BLDCNT=0x00ff`, `BLDY=15`; BG controls
  are `9800/9c00/5e01/5a0b` and BG3 uses char base 2/screen base 26.
  The live OAM is field ownership (MURKROW tile 273/pal1 plus opponent
  healthbox pieces), while the old compositor instead draws its stale
  faint-frame field/window arrangement. A correct implementation must
  compose this register/VRAM-derived battle field and then use the real
  per-bank fade; `fadeTurn15BattleFirstFrame` is only an approximation.

### Rung-1 raw compositor closure (2026-07-22)

`dump-turn15-sendout.py` now saves selected BG character/map blocks, palette
RAM, window registers, 1D OBJ VRAM, and transferred affine OAM matrices. The
extractor retains only OAM-referenced indexed OBJ tiles. `src/engine/gbaPpu.ts`
composes text-BG priority/flips/transparency, OAM priority/order and matrices,
then mGBA's source-pinned expanded packed-RGB `_darken` transfer. This is not
the misleading 5-bit BLDY calculation: white at BLDY 15 becomes RGB
`16,15,15`; BGR555 `0x4210` becomes `9,8,8`.

The regenerated asset has BG size-1 maps at 0x1000 bytes (BG3 is size 1), raw
BGR555 palette RAM, six visible OAM entries and 137 referenced OBJ tiles. Its
one affine entry carries the transferred identity matrix `[256,0,0,256]`.
The first composition exposed a 1551px MURKROW displacement (bbox
`123,0–196,71`); honoring the transferred affine geometry fixed it without a
coordinate patch. The asset is wired only to SEND OUT's press-relative first
battle-fade boundary, replacing `fadeTurn15BattleFirstFrame`; no screenshot,
fullscreen RGBA pixels, per-frame replay, trace-name branch or global tick is
stored. Both party compares are now 193/200 with 20302/20332 exact; the seven
remaining red frames are the menu-owned residuals recorded above.

### Rung-1 exit OBJ closure (2026-07-22)

The last seven menu-owned residual frames are closed without a framebuffer,
coordinate patch, or tick table. A direct PPU dump over 20247--62 showed that
the exit OAM is stable: status objects are entries 1--2, live party icons are
3--5, and the four menu balls are 6--9. Equal-priority ties therefore require
balls behind the existing live icon compositor and status in front (lower OAM
index wins). `extract-turn15-party-exit-obj.ts` retains only their 33 indexed
OBJ tiles, transferred attributes, and BGR555 palette source. Exit chrome
erases precisely those raw opaque texels; its old status screenshot overlay is
not used as an opacity source because it falsely claims five transparent
backing pixels. The existing press-relative OBJ fade applies after the ordered
raw composition. Canonical and delayed dense traces both finish **200/200**;
Tier-1 is 1009/1009, verifier 17/17, and the independent normal-menu
compositor remains 5/5.
