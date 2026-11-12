# S10A gdgeo — geometry-keyed sprite-order plans for Giga Drain (202) and Mega Drain (72)

prep43 (`docs/next-adapters-prep43.md`) left the Giga Drain body BLOCKED: its majority plan matched 9 / 10 probes, a DIGLETT
opponent attacker flipped one same-frame orb pair (window 18, `D9,7` vs `D7,9`). This step proves the mechanism, models it from
the renderer's own orb arithmetic, and lets the production order host apply the computed plan. Mega Drain (72), the same orb
family, had no production plan either and gets the same treatment. Base master `a556f6cdf` (src tree `df965113`); final
production code `aacedbdc6` (src tree `6d17aa72`). Receipts: `tools/integration/fixtures/gdgeo/`, summary
`tools/integration/fixtures/gdgeo-live-receipt.json`.

## Mechanism (verdict: CONFIRMED, from source and RAM)

- `Move_GIGA_DRAIN` / `GigaDrainAbsorbEffect` (`data/battle_anim_scripts.s:5814`, `:5840`) and `Move_MEGA_DRAIN` /
  `MegaDrainAbsorbEffect` (`:5753`, `:5779`) create `AnimAbsorptionOrb` orbs (`src/battle_anim_effects_1.c:2315-2332`):
  start at the target's X_2 / Y_PIC_OFFSET + offsets, `InitAnimArcTranslation` (`src/battle_anim_mons.c:785`) toward the
  attacker's X_2 / Y_PIC_OFFSET, `TranslateAnimHorizontalArc` (`:794`: linear translation + `Sin(data[7] >> 8, amplitude)`)
  until the linear translation ends, then `DestroyAnimSprite`. Two orbs whose spawn + period coincide die on the same frame.
- `DestroySprite` → `ResetSprite` (`src/sprite.c:618`, `:682`) copies `sDummySprite` (`:159`): every dead slot has the same
  keys. `BuildOamBuffer` → `SortSprites` (`:325`, `:372`) is a stable insertion sort on the priority word
  (`subpriority | oam.priority << 8`) and then `oam.y` descending. So a same-frame destroy group keeps the order of the last
  sort in which its members were live, and that order is decided by their `oam.y` there (or, on equal y, by the latest earlier
  frame where they differed). `oam.y` = y + y2 − 8 (16x16 affine orb), a sub-pixel function of the two picture coordinates
  through the Q8 linear translation and the sine wave.
- RAM (`gdgeoMechanism.py`; `spriteOrderEventProbe.py` keeps the SortSprites keys on the frame before each mask change): all
  158 multi-destroy windows (144 Giga Drain, 14 Mega Drain) have one priority word, are in `oam.y`-descending (or equal) order
  at the last live frame, and keep that order through the destroy. 0 violations. The model's orb `oam.y` at the last live age
  equals the ROM's for every destroyed orb: 288 / 288 (Giga Drain), 28 / 28 (Mega Drain).
- The flipping Giga Drain pair is window 18: orb 5 (group 1: x −10, y 20, amplitude 40, period 39) and orb 7 (group 2: x −5,
  y 15, amplitude 16, period 33), both last live at age 100. Mega Drain's pair is plan n5 / n6: orb 3 (amplitude 20, period 39)
  and orb 4 (amplitude 16, period 33), last live at age 94. Every other same-frame group is geometry-invariant on the whole
  species table (identical arguments, or a y difference that never changes sign). No Random2 anywhere.

## Model (production)

`src/animation/absorptionOrbSpriteOrderPlan.ts` `absorptionBodySpriteOrderPlanText(lastAge, stateAt)`: walks the body's own
timeline (`gigaDrainAtAge` / `megaDrainAtAge`, the accepted renderers' arithmetic: ONE implementation for pixels and order),
one allocation window per frame whose sprite set changes (the palette-blend controller sprite of each `simple_palette_blend`,
the hitsplat, the orbs, the healing stars; created first-free in script order), the live sprites kept in a stable sort on
`oam.y` (8-bit, read as negative from 160), a new sprite entering behind the live ones, and each destroy group listed in that
order. `gigaDrainSpriteOrderPlanText` / `megaDrainSpriteOrderPlanText` feed it; `liveMoveAnimation.ts`
`liveMoveGeometrySpriteOrderPlanText(moveId, side, species)` (the pinned live seam: the only engine module besides battleScene /
core / palette / field art that may import `src/animation`, `tests/animation/animationBoundaryRatchet.test.ts`) supplies the
centres from the displayed species with the adapter's own `liveBattlerAnchors(...).picOffsetPoint` (`case 202` / `case 72`:
target `animationCenter`, attacker `absorptionCenter`; a Substitute doll anchors on its species). No species table, no capture
rows.
Independent control: the same generator on `absorbAtAge` reproduces Absorb's ROM-captured production plan (table index 44)
exactly at every sampled geometry (pinned by test).

Host: `SPRITE_ORDER_GEOMETRY_KEYED_BODIES` = {202, 72} (`spriteOrderEventTransform.ts`; it only decodes). `advanceLiveSpriteOrderHost`
takes a `bodyPlanAt(segment, sequence, moveId, side)` resolver and attaches the plan text as `geometryPlan` to those bodies'
`move-animation` events; the orchestrator (`liveSpriteOrderBodyPlanAt`) resolves it with `battleResolutionMoveAnimationField` (the
segment's field after the commands before the body's own command — the field the live renderer draws that body on). Without a
plan (no resolver, no command) the transform invalidates exactly as before (`no EXACT plan: body 202:<side>`). The generated
table `spriteOrderProductionPlans.ts` is untouched; no import cycle and no boundary-ratchet entry was added.

## Grid (direct mGBA, every job twice fresh, A == B 38 / 38; prediction committed before the probes ran)

Plan classes: Giga Drain `majority` = prep43's plan (`D7,9`), `flip` = `D9,7`; Mega Drain `older` = `D5,6`, `newer` = `D6,5`.
Y = Y_PIC_OFFSET (player / opponent), d = player Y − opponent Y. Model predictions: Giga Drain player attacker flips only at
d = 48; opponent attacker at d ∈ {27, 30, 37, 38, 44, 45, 52, 55, 62, 63, 69, 70}; Mega Drain player newer-first only at
d = 48, opponent newer-first except d ∈ {24..26, 32..34, 39, 40, 47, 50, 57, 64, 65, 67, 72}.

| move | attacker side | attacker → target | Y p / o | d | predicted | observed | r1 == r2 |
|---|---|---|---|---:|---|---|---|
| 202 | player | ROSELIA → ONIX | 96 / 42 | 54 | majority | majority | yes |
| 202 | player | ROSELIA → GYARADOS | 96 / 48 | 48 | **flip** | **flip** | yes |
| 202 | player | MAGIKARP → SHUCKLE | 97 / 49 | 48 | **flip** | **flip** | yes |
| 202 | player | GOLBAT → WOBBUFFET | 94 / 46 | 48 | **flip** | **flip** | yes |
| 202 | player | ROSELIA → SHUCKLE | 96 / 49 | 47 | majority | majority | yes |
| 202 | player | MAGIKARP → GYARADOS | 97 / 48 | 49 | majority | majority | yes |
| 202 | player | DIGLETT → DIGLETT | 104 / 58 | 46 | majority | majority | yes |
| 202 | player | ONIX → FLYGON (elev.) | 88 / 34 | 54 | majority | majority | yes |
| 202 | player | ONIX → GOLBAT (elev.) | 88 / 35 | 53 | majority | majority | yes |
| 202 | player | BULBASAUR → FLYGON (elev.) | 104 / 34 | 70 | majority | majority | yes |
| 202 | player | SNORLAX → DIGLETT | 99 / 58 | 41 | majority | majority | yes |
| 202 | player | ONIX → DIGLETT | 88 / 58 | 30 | majority | majority | yes |
| 202 | opponent | DIGLETT → ONIX (prep43) | 88 / 58 | 30 | **flip** | **flip** | yes |
| 202 | opponent | ROSELIA → ONIX | 88 / 48 | 40 | majority | majority | yes |
| 202 | opponent | ROSELIA → WOBBUFFET | 100 / 48 | 52 | **flip** | **flip** | yes |
| 202 | opponent | SHUCKLE → GOLBAT | 94 / 49 | 45 | **flip** | **flip** | yes |
| 202 | opponent | ONIX → DIGLETT | 104 / 42 | 62 | **flip** | **flip** | yes |
| 202 | opponent | FLYGON (elev.) → BULBASAUR | 104 / 34 | 70 | **flip** | **flip** | yes |
| 202 | opponent | SNORLAX → ZANGOOSE | 89 / 45 | 44 | **flip** | **flip** | yes |
| 202 | opponent | ROSELIA → SNORLAX | 99 / 48 | 51 | majority | majority | yes |
| 202 | opponent | GOLBAT (elev.) → ONIX | 88 / 35 | 53 | majority | majority | yes |
| 202 | opponent | FLYGON (elev.) → ONIX | 88 / 34 | 54 | majority | majority | yes |
| 202 | opponent | DIGLETT → GOLBAT | 94 / 58 | 36 | majority | majority | yes |
| 202 | opponent | BULBASAUR → BULBASAUR | 104 / 54 | 50 | majority | majority | yes |
| 72 | player | SKIPLOOM → ONIX | 101 / 42 | 59 | older | older | yes |
| 72 | player | ROSELIA → GYARADOS | 96 / 48 | 48 | **newer** | **newer** | yes |
| 72 | player | MAGIKARP → SHUCKLE | 97 / 49 | 48 | **newer** | **newer** | yes |
| 72 | player | ROSELIA → SHUCKLE | 96 / 49 | 47 | older | older | yes |
| 72 | player | ONIX → FLYGON (elev.) | 88 / 34 | 54 | older | older | yes |
| 72 | player | DIGLETT → DIGLETT | 104 / 58 | 46 | older | older | yes |
| 72 | opponent | SKIPLOOM (elev.) → ONIX | 88 / 43 | 45 | **newer** | **newer** | yes |
| 72 | opponent | ROSELIA → ONIX | 88 / 48 | 40 | older | older | yes |
| 72 | opponent | DIGLETT → ONIX | 88 / 58 | 30 | **newer** | **newer** | yes |
| 72 | opponent | BULBASAUR → BULBASAUR | 104 / 54 | 50 | older | older | yes |
| 72 | opponent | SHUCKLE → ROSELIA | 96 / 49 | 47 | older | older | yes |
| 72 | opponent | SKARMORY → DIGLETT | 104 / 40 | 64 | older | older | yes |
| 72 | opponent | GOLBAT (elev.) → ONIX | 88 / 35 | 53 | **newer** | **newer** | yes |
| 72 | opponent | FLYGON (elev.) → BULBASAUR | 104 / 34 | 70 | **newer** | **newer** | yes |

Model == observed plan: Giga Drain 34 / 34 (the 24 above + prep43's 10), Mega Drain 14 / 14. Per frame (prep43Check
discipline, production `applySpriteOrderUnitPlan` from the ROM F at the unit start, F after every allocation window): Giga Drain
34 / 34 instances, 1360 allocation frames; Mega Drain 14 / 14, 518 frames. The geometry sweep over the whole species table has
exactly the two classes per move and side; the plan never differs from the majority outside the same-frame group.

## Production effect

- **Corpus replay** (`prep43CorpusReplay.ts`, turn-keyed; geometry from each scenario's lead species; "before" = the same tool
  on the `a556f6cdf` src, which ignores the field): corpus 1366 edges, known 1136 → 1136 (its two Giga Drain and two Mega Drain
  bodies are each scenario's last body: no edge follows), prep43 probes known 151 → 155, gdgeo Giga Drain grid 32 → 40, Mega
  Drain grid 17 → 23; **0 mismatches** everywhere.
- **Census** seeds 0..299 (`liveShareCensus.ts`, `prep43CensusDelta.py`), `a556f6cdf` vs `aacedbdc6`: live by count
  **82.48 → 83.10 %** (6574 → 6623 of 7970, +49), by presented frames **80.87 → 81.76 %** (944805 → 955124 of 1168273, +10319);
  **0 live → fallback regressions**, 0 pairing mismatches (identical command sequence), battle digest identical
  (`bb30f572…`); render sanity 9847 sampled live frames, 0 throws. Before-reason attribution: body 202 player 24 / 33 commands
  became live, 202 opponent 15 / 42, 72 opponent 8 / 18, 72 player 2 / 8; the rest stop at the next unplanned unit (next-mon
  summary, bodies 56 / 291 / 28, WISH_HEAL, later-body gates). No order-host state `body 202` / `body 72` remains. Report
  sha256: before `c4d8255e…`, after `e60c33e7…` (full hashes in the receipt; the `8e5c778cf` run differed only in the cited
  `liveMoveAnimation.ts` gate line numbers).

## Tests

`tests/spriteOrderGigaDrainGeometry.test.ts` (9): the 34 + 14 ROM grid plans and predictions, the DIGLETT flip, per-frame
cursor vs ROM F (the majority plan fails on every flip), the species sweep property, transform with / without geometry for
both moves, host resolver + `battleResolutionMoveAnimationField`, ordinary route seed 101 / streak 33 (slot 1): every body after
the opponent's Giga Drain lends, Scene ON/OFF boundaries and RNG identical. Controls: with a constant majority plan 5 / 7 Giga
Drain tests fail; without the orchestrator resolver the route test fails (`225p-`). No existing pin moved (one comment in
`tests/liveSpriteOrderHost.test.ts` updated).

## Reproduce

```
OUT=/tmp/gdgeo-repro REC=/tmp/gdgeo-rec sh tools/integration/gdgeoRun.sh   # ~1 min, prints same / DIFF per receipt
node --experimental-strip-types --no-warnings tools/integration/prep43CorpusReplay.ts /tmp/replay.json
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=/tmp/after.json --commands=/tmp/after.jsonl
python3 tools/integration/gdgeoReceipt.py <commit> <src tree> tools/integration/fixtures/gdgeo-live-receipt.json
```

## Limits

- The key is the displayed species of the body's own command. A battler whose picture coordinates differ from its species'
  (Transform's `transformSpecies`, Castform forms) uses whatever the displayed field says — the same input the live renderer
  draws with; not separately probed.
- Bodies replayed by a path without the resolver (none in production today) invalidate as before.
- Absorb (71) already has a constant production plan; it has no same-frame orb group and is unchanged.
