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
| 3 — Brendan + ball | trainer slot 6 appears RAM 20343 and throws 20344-88; player ball slot 6 is created **20389**, changes open pose at 20394, and reaches its release/open boundary 20400-01 | `20342-20406` stride 1 |
| 4 — open/materialize | burst begins **20402**; growing/tinted MAGBY pixels start **20400**, continuous through 20430; materialize settles in visible pixels **20534-50** (`4f63d4696c93`) | `20400-20550` stride 1 |
| 5 — healthbox | all three player components become visible at **20407**, slide x=268→158 by **-5 px/tick**, settle **20429**; populated full HP throughout | `20404-20431` stride 1 |
| 6 — clear/menu | blank message **20551-56**, no flavor quip; first settled action-menu frame **20557** (`5950e7b3d8ba`), then bounce `5950 → 083f → 5950` at 20557-59 | `20534-20560` stride 1 |

Use a new *ground-truth-only* capture list with those ranges (split each
range under 256 captures) before wiring each rung. Do not add a red app
trace: the existing canonical and delayed party traces stay 143/143.

## RAM/OAM/VRAM facts

- The confirmation leaves party ownership after 20267; no live party-list
  sprites remain by 20274. `gBattleControllerExecFlags` is `0x1` through
  the menu/fade, runs `0x2` at 20329 when battler data commits, and returns
  to `0x0` at 20538 before the menu redraw.
- Battler 0 becomes **MAGBY species 240 by 20330**, `138/138`, PP
  `[15,20,10,20]` (FIRE_PUNCH/SMOKESCREEN/CONFUSE_RAY/SMOG); move cursor is
  **0** at settle. MURKROW remains 142/142. The two known AI bookkeeping
  steps remain 20550/20556; there is no send-out-animation RNG.
- Brendan is slot 6, OBJ tile 405/palette 6, callback `0x8076205` during
  the throw. Its live sheet hash is `aefecfa10ef3`. Its path starts
  `(24,68)` and reaches `(72,126)` at 20387 before the ball handoff.
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
