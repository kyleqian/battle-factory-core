# S10A plans48 — the tail of the sprite-order host stops: EXACT / KEYED / GEOMETRY-KEYED order plans

Integration lane, evidence + production in one step, with the prep43 / prep45 / gdgeo method. Base: master `768ef4961` (src tree
`1fb74f37`). Tested code: `5b8c5a5ec` (src tree `f34f016f`); later commits touch tools, tests and docs only.

## Results

**Census, seeds 0..299** (`liveShareCensus.ts`, paired by `prep43CensusDelta.py`). Base `768ef4961` against the tested code. 7970
commands, 0 pairing mismatches, identical command sequence, identical battle digest (`bb30f572…`), **0 live → fallback regressions**.

| | live by count | live by frames |
|---|---|---|
| `768ef4961` | 7101 / 7970 = **89.10 %** | 1048614 / 1168273 = **89.76 %** |
| plans48 | **7186 = 90.16 % (+85)** | **1065629 = 91.21 % (+17015)** |

Report sha256: before `e6e8af04…bac7`, after `0238a463…a54f`. Command jsonl: before `71b32e7c…3813`, after `004d9e04…4463`. All in
`tools/integration/fixtures/plans48-live-receipt.json`.

Largest gains, by first stop: Attract 213 (18 + 1 commands, 3922 frames), FRZ (18 / 3620), Ice Punch (16 / 3966), ITEM_KNOCKOFF
(8 / 1292), NIGHTMARE (4 / 890), Razor Wind (3 / 669), Razor Leaf opponent (3 / 458), Present (4 / 304), Dream Eater (2 / 380),
CURSED, Grudge player. 4 commands behind "gate: lowestFree.length !== 6" also went live, because the order host stays known.
The remaining declines of the cleared chains stop at "later-body (order lend not a first body)" (consumer gate), "unclassified
(case-local gate)", SUBSTITUTE_FADE, Shock Wave and Outrage.

**Per-unit verdicts.** Probes are `plans48Probe.py`: direct mGBA, never the HTTP oracles. Every job ran twice in fresh processes;
291 jobs, all A == B. The per-frame check is `plans48Check.ts`, using prep45Check's `checkUnit` unchanged: the production cursor
applies the plan prefix through every allocation window, and created / destroyed / F must equal the ROM after each one. A single
survivor must be destroyed by the next allocation window, which is the carry.

| unit (host key) | verdict / plan | ROM instances (exact / total), allocation frames | species | source |
|---|---|---|---|---|
| status FRZ (`STATUS_FRZ`) | EXACT `Cf;D0` | 23/23, 46 | staged by an Ice Beam lab-seed sweep (23 freezing seeds of 159); frozen: opponent Shuckle / Snorlax, player Shuckle / Golbat | `Status_Freeze` → `AnimTask_FrozenIceCube` (one cube) |
| status NIGHTMARE (`STATUS_NIGHTMARE`) | EXACT `Cf;D0` | 6/6, 12 (+ control STATUS_SLP 15/15 with carry) | target Shuckle / Snorlax / Golbat, both sides | `Status_Nightmare`: one devil sprite |
| status CURSED (`STATUS_CURSED`) | EXACT `Cf;D0` | 6/6, 12 | target Magikarp / Snorlax / Golbat, both sides | `Status_Curse`: one ghost sprite |
| general ITEM_KNOCKOFF | EXACT `Cf` + carry | 6/6, 12 (6 carries) | Onix / Snorlax / Golbat holding Leftovers, both sides | `General_ItemKnockoff`: the item bag survives the unit |
| body 8 Ice Punch | EXACT, both sides identical | 8/8, 200 | defender Onix / Snorlax / Golbat (elevated), attacker Cacturne / Pichu | `Move_ICE_PUNCH` (no Random2) |
| body 75 Razor Leaf, opponent | EXACT = the base table's 75:player text | 6/6, 132 | both sides, 3 defenders | `Move_RAZOR_LEAF` |
| body 173 Snore | EXACT, both sides identical | 6/6, 36 | 3 defenders per side | `Move_SNORE` |
| body 165 Struggle, opponent | EXACT = the base table's 165:player text | 4/4, 16 | both sides, 2 defenders | `Move_STRUGGLE` |
| body 288 Grudge, player | EXACT, side-keyed (`Cffffff;D3,4,5,2,0,1`; the opponent plan is the base table's) | 8/8 + 8/8, 32 | 4 attacker species per side (Haunter, Snorlax, Golbat, Pichu / Haunter, Golbat, Snorlax, Onix) | `AnimTask_GrudgeFlames` |
| body 13 Razor Wind, turn-keyed (13 / 10013) | EXACT per choosetwoturnanim branch | 6/6 + 6/6, 48 | 3 defenders per side | `choosetwoturnanim RazorWindSetUp, RazorWindUnleash`; `TWO_TURN_ANIM_MOVE_IDS` + 13 |
| body 217 Present, branch-keyed (217 / 20217) | EXACT per branch | damage 16/16, heal 6/6, 360 | damage: 3 / 2 defenders; heal: player Onix / Snorlax / Golbat, opponent Onix / Snorlax | `Move_PRESENT`: `AnimTask_IsHealingMove` → `gAnimMoveDmg > 0` |
| body 213 Attract | **boundary-EXACT** (not geometry-keyed), both sides | 18/18 per-frame against A or B; post-unit order == A 18/18 | 9 species pairs per side | see below |
| body 138 Dream Eater | **GEOMETRY-KEYED**, computed from the renderer's timeline | 10/10 against the pre-recorded prediction (incl. 4 predicted-flip instances), 340; prep45's 4 == model | 12-pair grid (3 jobs never reached the body: Sing missed) | absorption-orb family (below) |

**Present key.** The host keys Present by the branch the ROM takes. `Cmd_attackanimation` passes `gBattleMoveDamage`, and the kernel's
MOVE_ANIMATION argument 3 is `battleMoveDamage`: negative (−heal) on the heal branch (`battleScriptPresentDamageOpcode.ts`). So Present
with damage ≤ 0 → 20217. This is a presentation key over an existing event argument, with no gameplay change. The route scan
mirrors the key. The corpus replays have no damage argument, so they read the branch from the body's allocation count (PresentDamage
creates 6 sprites).

**Attract (prediction recorded before the grid, `attract-prediction.json`, commit `40346b0cf`).** prep45 called Attract
geometry-keyed: 2 plans in 4 instances. The grid refutes that key.
- The projectile flight schedule is identical in every pair (1 distinct schedule).
- The two plans differ only in whether 1 or 2 of the 8 rising hearts are seen before the probe's frame boundary at ~f+160/161. Those
  hearts are 8 consecutive `createsprite` commands executed in one script frame.
- The split shows no species pattern. Eevee → Onix gives B and Eevee → Golbat gives A, on both sides.
- A and B leave the identical order after the unit from 3618/3618 start orders (every ROM F0, plus 200 random permutations of its
  free slots each).

The host only exposes unit-boundary states, so plan A is exact for the host in every instance. All three predictions held.

**Dream Eater (prediction recorded before the grid, `dream-eater-prediction.json`, commit `4870519d6`).**
- `dreamEater.ts dreamEaterSpriteOrderPlanText` feeds the renderer's own timeline through the shared
  `absorptionOrbSpriteOrderPlan.ts`, as Giga Drain and Mega Drain do. The timeline is DreamEaterAbsorb's orbs (Giga Drain's eight
  triples) plus HealingEffect's stars. There is no hitsplat and no palette-controller sprite.
- `liveMoveGeometrySpriteOrderPlanText` and `SPRITE_ORDER_GEOMETRY_KEYED_BODIES` gain 138. This is the pinned seam, so the
  boundary ratchet is unchanged.
- The model gives 1 plan on the player side over 48 sampled pairs and 2 on the opponent side (7 / 48 flips). The grid confirmed the
  predicted plan in every reached instance, including the flips (Wigglytuff → Lapras, Diglett → Onix, Steelix → Lapras ×2).

**Not landed (each still invalidates):**
- **Shock Wave 351**: GEOMETRY. The opponent side shows 2 plans over 4 species; the player side was constant over 4. Not modelled.
- **SUBSTITUTE_FADE**: NOT REACHED. Three stagings never broke the substitute: Alakazam KO'd or moved first; Rhydon's Ancient Power
  was too weak; Rock Slide with 2 seeds also failed. The jobs are kept in the probe list as the record. The script is tasks-only,
  so an empty plan is likely but unproven.
- **FOCUS_BAND**: NOT REACHED. A 160-seed sweep with Pichu / Magikarp holders never activated the band. Pichu's mv-0 units were Static
  PRZ. The jobs were removed.
- **Fly 19**: plans are EXACT per branch (4/4 + 4/4: `Cf;D0` / `Cf;Cf;D0;D1`), but no production change. FlySetUp hides the
  attacker and the host invalidates on "semi-invulnerable battler hidden" (Dig has its own handling), so a plan gains nothing.
- **Fury Cutter 210**: the script branches on `AnimTask_GetFuryCutterHitCount` (1 / 2 / 3 / 4+ → different `complex_palette_blend`
  sprites). The MOVE_ANIMATION request carries no Fury Cutter counter. Keying it needs a new presentation payload: not attempted.
- **Water Spout 323**: `GetWaterSpoutPowerForAnim` depends on attacker HP, which is not in the event. Not attempted.
- **Blizzard 59, Hail 258 / HAIL_CONTINUES**: geometry. Not attempted (time).
- **TURN_TRAP Clamp**: not in this census's ranking (0 frames). Not attempted.
- Out of scope (owned by other steps): Dive, Mud-Slap, Ice Ball, return to ball, battle-start seeds.

## Ranking (base `768ef4961`, seeds 0..299)

`prep47OrderCensus.ts` + `prep45Chains.py`, in `chains-before-seeds0-299.json`. 325 order-lend-unknown declines / 52188 frames.
Greedy gain over the non-excluded units:

| unit | gain |
|---|---:|
| Attract | 4753 |
| FRZ | 2930 |
| Ice Punch | 2129 |
| Dive | 1846 (out of scope) |
| ITEM_KNOCKOFF | 1325 |
| Water Spout | 1112 |
| SUBSTITUTE_FADE | 1068 |
| Dream Eater | 2019 |
| HAIL_CONTINUES | 1017 |
| Hail | 1314 |
| Blizzard | 1826 |
| NIGHTMARE | 890 |
| Fury Cutter | 821 |
| Mud-Slap | out of scope |
| Ice Ball | out of scope |
| Present | 665 |
| Razor Leaf | 458 |
| Shock Wave | 693 |
| Fly | 376 |
| FOCUS_BAND | 337 |
| Struggle | 333 |
| Snore | 228 |
| CURSED | 203 |
| Razor Wind | 196 |
| Grudge | 158 |

## Production change

**Plans.** `fixtures/plans48/plan-rows.json` is rows-v1, written by `plans48PlanRows.ts` from `check.json`. It is appended after
prep45's rows in `spriteOrderProductionTable.ts`, and the table is regenerated, never hand-edited.
- bodies 508 → 525, plans 212 → 219, anims 20 → 24.
- No base index moved.
- Deduped texts:
  - FRZ / NIGHTMARE / CURSED → index 1 `Cf;D0`
  - ITEM_KNOCKOFF → `Cf`
  - 75:opponent / 165:opponent → the base player texts
  - 10013 → Leech Seed's `Cf;Cf;Cf;D0;D1;D2`

**Host (`liveSpriteOrderHost.ts`).**
- `TWO_TURN_ANIM_MOVE_IDS` gains 13.
- Present with MOVE_ANIMATION damage ≤ 0 → 20217.

**Geometry.** `dreamEater.ts`, `liveMoveAnimation.ts` (seam) and `spriteOrderEventTransform.ts`
(`SPRITE_ORDER_GEOMETRY_KEYED_BODIES`).

**Tooling mirrors** (not production): `orderCrossBodyRouteScan.ts`, `spriteOrderCrossBodyCorpusReplay.ts` and
`prep45CorpusReplay.ts` take the same keys.

**Corpus replay** (`prep45CorpusReplay.ts`), master → plans48:

| replay | edges | known | exact | mismatched |
|---|---:|---:|---:|---:|
| corpus, turn-keyed | 1366 | 1143 → 1159 | 1143 → 1159 | 0 → 0 |
| prep45 probes | 291 | 241 → 241 | 241 → 241 | 0 → 0 |

Unkeyed, the Present-heal edge is a third mismatch beside the two Dig edges. The key is load-bearing.

**Pins that moved**, each because a newly planned unit now lends: `tests/spriteOrderEventTransform.test.ts` and
`tests/liveSpriteOrderHost.test.ts`.

| pin | before → after | cause |
|---|---|---|
| table counts | 508 / 212 → 525 / 219 | regenerated table |
| corpus known / laterKnown | 1143 / 589 → 1159 / 605 | newly planned units lend |
| unkeyed corpus | 1143 / 1141 / 2 → 1159 / 1156 / 3 | adds the Present-heal edge |
| "refuses everything" examples | 288:player, CURSED, FRZ → 351:player, WRAPPED, SUBSTITUTE_FADE | the old three are now modelled |
| 20-battle sweep laterKnown | 64 → 71 | Attract, then Present / Struggle |
| 20-battle sweep laterBefore | 49 → 56 | same |
| route sweep hostKnown / laterAfter | 709 / 65 → 772 / 72 | still 0 declines, 0 mismatches |
| choosetwoturnanim table | adds `[13, 0, 13], [13, 1, 10013]` | Razor Wind key |

New tests:
- the plans48 block in `spriteOrderEventTransform.test.ts`: ROM receipts → production text per key, the Attract boundary
  equivalence, and known-after-event checks.
- the Present key test in `liveSpriteOrderHost.test.ts`.
- `tests/spriteOrderDreamEaterGeometry.test.ts`: 14 ROM instances == model == prediction, a per-frame check, a geometry sweep, and
  the transform with / without the geometry plan.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py
    ../../vendor/mgba-venv/bin/python tools/integration/plans48Probe.py /tmp/p48/probe --jobs 12   # ~4 min
    python3 tools/integration/plans48Extract.py /tmp/p48/probe /tmp/p48/units.json            # == fixtures/plans48/units.json
    node --experimental-strip-types tools/integration/plans48Check.ts /tmp/p48/units.json /tmp/p48/check.json   # == check.json
    node --experimental-strip-types tools/integration/plans48PlanRows.ts tools/integration/fixtures/plans48/check.json /tmp/rows.json
    node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts && git diff --exit-code src  # table regenerates
    node --experimental-strip-types tools/integration/plans48DreamEaterPredict.ts /tmp/de.json   # == dream-eater-prediction.json
    node --experimental-strip-types tools/integration/prep45CorpusReplay.ts /tmp/replay.json
    node --experimental-strip-types tools/integration/liveShareCensus.ts --seeds=0..299 --out=/tmp/after.json --commands=/tmp/after.jsonl
    python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> /tmp/after.json /tmp/after.jsonl /tmp/delta.json

Caveats:
- `fz-opp-s27` lost its run A (teardown), so it is not in the receipts. The FRZ sweep counts 159 jobs.
- The receipts come from one probe directory whose jobs were re-run as batches were added. Each job's A/B pair is from one batch.

## Gates (tested commit `5c3fd4847`, src tree `f34f016f`; serialized, 4 Vitest workers)

| gate | result |
|---|---|
| targeted: `tests/spriteOrder*.test.ts` (incl. the new Dream Eater file), `liveSpriteOrderHost`, `liveSpriteAllocator*`, `factoryAnimationInventory`, `animationBoundaryRatchet`, `playableAnimationIntegration`, `wordsOrderDeferredLend`, `liveOrderConsumerMoveAdapters` | 18 files / 156 tests passed |
| `npm run typecheck` | pass |
| `npm run test:smoke` | 448 / 448 |
| full `npm test -- --maxWorkers=4` | 1580 files passed (44 skipped), 13008 tests passed (223 skipped), first run, no reruns |
| `npm run build` | pass |
| `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 768ef4961` | PASS, 624 / 624 byte-identical |
| `git diff --check` | clean |

**Fresh reproduction** (after the gates, `/tmp/p48-repro`, all 292 jobs × 2 fresh processes, 0 A/B differ): every one of the 291
committed jobs' unit receipts is byte-identical to `fixtures/plans48/units.json`. The only addition is `fz-opp-s27`, which completed
both runs this time (A == B, no freeze). Every `check.json` label's instances / matched counts are identical.
