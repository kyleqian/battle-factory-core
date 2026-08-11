# Opponent-release affine-emerge tint: third/fourth data point (ISSUES #56 item 3)

Side-lane, evidence-only step. No `src/` changes. Builds on
`docs/trainer-pic-off-window-scout.md`'s Round-10 finding and the open
question at `drawGeneratedOpponentRelease`'s doc comment
(`src/engine/battleScene.ts:4247-4278`): two data points (MAGNETON wants
`origin.y` with `coords.yOffset` **excluded**, COMBUSKEN wants it
**included**) under-determine whether the rule is a real per-species
geometry term or a `coords.height`-keyed one. This step gathers a third and
fourth species and finds the actual mechanism.

## Species chosen

`origin.y = (side==="opponent" ? 8 : 48) + coords.yOffset`
(`battleCommandFieldArt.ts:86`) is the formula in dispute. From
`src/data/gen/mon-pic-coords.json`'s `front` table:

| Species | `coords.height` | `coords.yOffset` |
| --- | --- | --- |
| MAGNETON (known, excludes yOffset) | 48 | 8 |
| COMBUSKEN (known, includes yOffset) | 64 | 1 |

To split "real per-species term" from "`coords.height`-keyed", I picked:

- **DUNSPARCE** — `height=32` (shorter than MAGNETON, so if the rule were
  "any `height<64` sprite excludes yOffset" this must also exclude) with
  `yOffset=17` (far from MAGNETON's 8, so the two hypotheses predict origins
  25px apart — impossible to confuse by measurement noise).
- **GOLBAT** — `height=64` (as tall as COMBUSKEN, so the height-keyed
  hypothesis predicts "includes yOffset" here) with `yOffset=3` (different
  from COMBUSKEN's 1, extending the tall-sprite range tested).

Both are legal Battle Factory rentals
(`FRONTIER_MON_DUNSPARCE`=305, `FRONTIER_MON_GOLBAT`=336,
`src/data/gen/battle-frontier-mons.json`) inside the same Level-50
challenge-2 setId band (267-371) MAGNETON's own committed fixture
(`tools/battle-lab/factory-arbitrary-intro-magneton-off.json`) already uses,
so I mirrored that fixture exactly (`trainerId=109`, same `playerSetIds`,
`challengeNum=2`, `rentalSwapCount=0`, `seed=70`), only swapping
`opponentSetIds[0]`. Both leads' held items (`LAX_INCENSE` for DUNSPARCE,
`SHELL_BELL` for GOLBAT) don't collide with the player trio's
(`QUICK_CLAW`/`LUM_BERRY`/`CHERI_BERRY`) or the reused fillers'
(`LEFTOVERS`/`SALAC_BERRY`) — avoiding the held-item-duplication rejection
papercut from round 9. Committed as
`tools/battle-lab/factory-tintprobe-dunsparce-off.json` and
`factory-tintprobe-golbat-off.json` (genuinely useful to the next, fixing
step, which will want to re-verify these same two species — not deleted as
scratch).

An attempted **GYARADOS** pick (`yOffset=8`, identical to MAGNETON, at
`height=64`) would have been the cleanest possible discriminator, but no
Level-50 challenge-2 setId band reaches `FRONTIER_MON_GYARADOS_*`
(indices 459/555/651, all outside every band `factory-round-policy.json`
lists for `trainerId=109`); left as a lead for a future probe that changes
route/challenge instead of chasing band unlocks in this budget.

## Method

Ran each fixture through `bin/oracle lab ... -o ...` with
`preCheckpointCaptureAllFrames: true`, giving ~2000 dense pre-checkpoint
PNGs (base64 in `manifest.json`, one video frame apiece). For each species:

1. Scanned every frame for the first appearance of the exact materialize
   tint color `(255,181,247)` (`MATERIALIZE_TINT_COLOR` /
   `battleAnimTables.ballOpenFadeColor.rgb8`) anywhere on screen — this
   anchors "local tick 0" empirically, no engine-clock arithmetic needed.
2. Reconstructed the **predicted** tinted-pixel set for local ticks 0-11
   from the engine's own already-validated primitives, applied uniformly to
   every species:
   - `affineEmergeAccumulator(local+1)` (`battleScene.ts:4698`, table-driven,
     not hardcoded) — confirmed the 12-tick window (render ticks
     `TURN5_BALL_HANDOFF_TICK+MATERIALIZE_START_OFFSET+local-1`, i.e.
     6745-6756) sits entirely below `TURN5_MATERIALIZE_RAMP_RENDER_START`
     (6768), so `turn5MaterializeCoeff` is flat at `16` (max) throughout —
     every opaque source pixel becomes the *exact* tint color, no partial
     blend to account for.
   - `MATERIALIZE_Y2_TABLE` (`[14,13,12,11,10,9,8,7,5,4,3,2]`).
   - The exact affine sampler from `drawSpriteSheetAffineTintedBlend`
     (`battleScene.ts:5472-5513`): `screenY = oy + dy + y2`, with `dy` over
     the full 64×64 padded canvas and `sy = ((dy-32)*trunc(65536/acc))>>8 + 32`
     sampled from each species' own tileset opacity
     (`src/assets/gen/battle-opponent-front-sprites.json`).
   - `oy` is the one free parameter under test — three candidate formulas
     (below).
3. Diffed predicted vs. observed tint-pixel sets per tick (symmetric
   difference), summed over the 12-tick window, searching a small frame
   alignment shift (±4) per hypothesis to avoid biasing the comparison
   against an anchoring error. Re-ran the **same** method against MAGNETON's
   and COMBUSKEN's own already-committed fixtures
   (`factory-arbitrary-intro-magneton-off.json`,
   `factory-arbitrary-intro-yoshi-off.json`) so all four points are
   comparable.

Honesty note: this reconstruction does **not** reach the exact 0-diff Round
10 reported from its own (uncommitted) brute-force script — my best-fit
residual is a few hundred px per 12-tick sum, not zero, for every species,
suggesting a small remaining alignment/base-constant detail neither script
pins down. But the *relative* ranking between hypotheses is stark (6-13×)
and, combined with the source-level confirmation below, is decisive.

## Hypotheses tested

- **H1 "inclusive"** (today's code): `oy = 8 + coords.yOffset`.
- **H2 "exclusive"** (MAGNETON's curve fit): `oy = 8`.
- **H3 "elevation-adjusted"** (new, this step): `oy = 8 + coords.yOffset -
  gEnemyMonElevation[species]`, sourced directly from vanilla pokeemerald —
  `reference/pokeemerald/src/battle_anim_mons.c:250-283`:
  `GetBattlerElevation()` returns `gEnemyMonElevation[species]` **only for
  the opponent side** (`GetBattlerSide(battler) == B_SIDE_OPPONENT`), and
  `GetBattlerSpriteFinal_Y()` computes `offset = GetBattlerYDelta(...) -
  GetBattlerElevation(...)` for exactly that side —
  `GetBattlerYDelta`'s opponent branch returns
  `gMonFrontPicCoords[species].y_offset`, i.e. our `coords.yOffset`
  precisely. `gEnemyMonElevation`
  (`reference/pokeemerald/src/data/pokemon_graphics/enemy_mon_elevation.h`)
  is a **third per-species table this engine has never extracted**
  (`grep -rl gEnemyMonElevation src/` returns nothing) — "how much higher
  above the usual position the enemy Pokémon is... [for] species that float
  or fly."  Values used here: `MAGNETON=8`, `GOLBAT=8`,
  `COMBUSKEN`/`DUNSPARCE` absent from the table (defaults to `0`).

## Results

| Species | height | yOffset | elevation | H1 (incl.) diff | H2 (excl.) diff | H3 (elev-adj) diff | Winner |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| MAGNETON | 48 | 8 | 8 | 5148 | **791** | **791** (=H2, oy=8) | H2≡H3 |
| COMBUSKEN | 64 | 1 | 0 | **1243** | 2565 | **1243** (=H1, oy=9) | H1≡H3 |
| DUNSPARCE | 32 | 17 | 0 | **1175** | 6373 | **1175** (=H1, oy=25) | H1≡H3 |
| GOLBAT | 64 | 3 | 8 | 6252 | 4843 | **477** (oy=3) | **H3 alone** |

GOLBAT is the species that actually separates H3 from H1/H2: elevation-adjust
predicts `oy=3`, distinct from both `8+3=11` (H1) and `8` (H2), and the
pixel data favors it by **10-13×** over either binary hypothesis — the
sharpest margin of any species measured, at a clean zero-shift alignment
(H1/H2 both needed an implausible ±1-3 frame fudge to reach their
best-but-still-much-worse fit for GOLBAT). DUNSPARCE independently falsifies
the `coords.height`-keyed hypothesis outright: it's *shorter* than MAGNETON
(32 vs 48) yet wants the **inclusive** origin like COMBUSKEN, not the
excluded one — height was never the discriminator.

## Verdict

**Resolved, not just bounded.** The universal rule is
`origin.y = 8 + coords.yOffset - gEnemyMonElevation[species]`
(`gEnemyMonElevation` defaulting to 0, i.e. non-floating/flying species).
MAGNETON's own two-point "exclude yOffset" fit was a coincidence: MAGNETON's
`coords.yOffset` (8) happens to exactly equal its own elevation (8), so
`8+8-8=8` numerically matches H2 by accident. `drawGeneratedOpponentRelease`
and (likely) every other opponent-side placement in `battleCommandFieldArt.ts`
that uses `origin.y` should subtract a newly-extracted
`gEnemyMonElevation[species]` table — this is a **data-extraction gap**, not
a rendering-formula bug in the affine/tint mechanism itself (that part —
accumulator, `MATERIALIZE_Y2_TABLE`, blend coefficient — was already right
per Round 10 and reconfirmed here).

Not chased further this round: the suggested RAM probe (task 3) is no
longer the most valuable next measurement now that the mechanism is
source-confirmed (not curve-fit) and cross-checked against 4 species'
pixel data; it would mainly re-derive what `reference/pokeemerald/src/
battle_anim_mons.c` already states verbatim. The next (fixing) step should:
extract `gEnemyMonElevation` into `src/data/gen/` (same pattern as
`mon-pic-coords.json`), subtract it in `fieldArtBattler`'s opponent branch
(`battleCommandFieldArt.ts:86`), and re-verify against MAGNETON (should now
hit 0 missing-tint residual), COMBUSKEN/YOSHI (should hold), and the two
fixtures committed here (DUNSPARCE, GOLBAT) as fresh pins.

## Reproduction

Fixtures: `tools/battle-lab/factory-tintprobe-dunsparce-off.json`,
`factory-tintprobe-golbat-off.json`. Run via
`bin/oracle lab tools/battle-lab/factory-tintprobe-<name>-off.json -o <dir>`;
`manifest.json`'s `battleLab.preCheckpointCaptures[].pngBase64` holds the
dense per-frame PNGs. The pixel-reconstruction/diff script used for this
step's table is scratch (not committed, matching the brief) — it's a
direct transcription of `affineEmergeAccumulator`, `MATERIALIZE_Y2_TABLE`,
and `drawSpriteSheetAffineTintedBlend`'s sampler, parameterized over
`oy`, re-derivable from the citations above in a few minutes if needed
again.

---
**STATUS (2026-07-31, `7cfef2d7`):** APPLIED. The elevation table is
extracted (`src/data/gen/enemy-mon-elevations.json`) and the rule is live
at all three settled-opponent draw sites; MAGNETON 424→703/751, shadow
branch verified. This doc remains as the derivation evidence.
