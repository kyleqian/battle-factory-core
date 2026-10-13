# sad133 (S10A, ISSUES #168 slices SA6 + SA7 + SA8): drawing the Scene ON status animations CURSED, NIGHTMARE, CONFUSION and FRZ

Base: `7ae8aff49` (the sar131 tip; production src `4c1c48c97`), plus stp128's seven commits cherry-picked unchanged (`d4b1203e6` ..
`113b193d0`, the same blobs as master's `41b5ccaf5` .. `d6fb37f78`: the reducer `src/animation/statusConditionAnimations.ts`, its test,
the ROM windows and tools; the base did not carry them). Recipe: docs/stp128-status-condition-render-prep.md §3; plumbing:
docs/sar131-status-animation-render.md. **Pixels only**: no kernel, command-timing (sa125: CURSED 75, NIGHTMARE 75, CONFUSION 100,
FRZ 117), RNG, damage, turn-order or facility change; liveMoveAnimation.ts bodies, the order host / allocator, the palette host and
liveBattlerX2History.ts are untouched; the stp128 reducer is reused as is (its test unchanged and green; no re-fit).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The renderer | `statusAnimation.ts liveStatusAnimationRow` gets one `case` per animation (CURSED, NIGHTMARE, CONFUSION, FRZ), each one call of `statusConditionRow` = stp128's `statusConditionDisplayRow(animation, rel = age, statusConditionTarget(side, sprite x, sprite y))`. New optional 4th argument `{ sprite, inflicted }`: the battler sprite's x / y (`battleCommandFieldSpriteOrigin` + 32, elevation included; passed by `battleScene.ts statusAnimationRenderView`). The battler stands at its tracked rest while the reducer's offset follows the idle x2 (before ShakeMon2 shows; CONFUSION / FRZ throughout), else at the reducer's absolute ShakeMon2 x2 (the monbg copy is pixel-identical to the sprite: drawn as the sprite). Sprites: ghost (`curse.json`), devil (`lovely-kiss.json` frame 0), duck (`dizzyPunch.json`, the reducer's tile frame + hFlip), ice cube (`battle-anim-ice-cube.json`'s four pieces, palette 13..15 rotated by `objPaletteRotation`). Two optional sprite fields: `behindBattlers` (OBJ priority 3: the ducks' far half, drawn after the BG / before the battlers) and `blend` (eva / evb, drawn with production's 8-bit `drawSpriteSheetBlendedOverFb`); the rest draw where sar131's sparks draw (after the battlers, under the healthboxes / message window). `STATUS_ANIMATIONS_DRAWN` gains the four names on their own lines. | `git diff 7ae8aff49 -- src/` (3 files) |
| **Command age vs reducer row** | **command age a == stp128 rel a** (rel 0 = the gAnimScriptActive rise = sar131's a = 0). stp128 §3 suggested `age + 1`; the ROM pins δ = 0: **34 / 34 command-row-clean at a == rel, 0 / 34 at age + 1** | `controls.age+1` |
| **FRZ path (115 vs 116)** | One new presentation-only input on the effect branch: `inflicted: true` when the status-animation command directly follows **its battler's `status` command** (sa125 SA3's projection of a status the script just set: after Ice Beam). `inflicted` -> stp128 `freezeLoadLagRows` 0, else 1 (the frozen turn, MoveUsedIsFrozen). **lag-swap control: all 5 FRZ windows fail** | `battleResolutionPresentationRender.ts` effect branch; `controls.lag-swap` |
| **Production comparator** | **34 / 34 stp128 ROM windows 0 px on every command row** (a = -1 .. release, full screen, 3,094 rows) through `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`, r1 == r2. Per animation x side (windows, command rows, px): CURSED player 4 / 304 / 0, CURSED opponent 4 / 304 / 0 (incl. elevated GOLBAT), NIGHTMARE player 3 / 228 / 0 (incl. elevated HAUNTER opponent's shadow), NIGHTMARE opponent 6 / 456 / 0 (incl. elevated GOLBAT), CONFUSION player 6 / 606 / 0, CONFUSION opponent 6 / 606 / 0 (incl. elevated GOLBAT), FRZ player 3 / 354 / 0 (1 inflicted + 2 frozen turns), FRZ opponent 2 / 236 / 0 (1 + 1). **31 / 34 also 0 px on the two next-command rows (release + 1 .. + 2)**; the 3 others are the residual below | `tools/integration/fixtures/sad133/production-compare.json` |
| Residual (named, pre-existing, not fitted) | **CONFUSION on the ONIX opponent (3 windows): 1,091 px on each of the next message command's rows a = 100, 101 only** (outside the box band; 0 on the 101 command rows). Mechanism: CONFUSION keeps the battler's x2 (ONIX's front idle +1, ROM x2 1 before and after), and production's ordinary (message) rows never draw the opponent's idle rest (sar131 §6: "ONIX / RATTATA +1", a renderer gap of the ordinary field, not of this command). The ghost / PSN / PRZ windows do not show it because ShakeMon2 leaves x2 0 | `residualWindows` in the receipt |
| **Controls (must fail)** | command-row-clean windows: `age+1` **0 / 34**; `wrong-side` **0 / 34**; `no-shake` (production's sprite pixels kept, the battler at its age-0 place) **17 / 34** = all 17 ghost windows fail; `no-ghost` **17 / 34** = all 17 ghost windows fail; `no-ducks` **22 / 34** = all 12 CONFUSION windows fail; `no-cube` **29 / 34** = all 5 FRZ windows fail; `lag-swap` **29 / 34** = all 5 FRZ windows fail. Each fails exactly its own family (tier-1 test) | `tools/integration/fixtures/sad133/controls.json` |
| sar131 PSN / PRZ | **17 / 17 windows still 0 px**; its `production-compare.json` (every-row production frame sha256) **byte-identical** on the final code; rom-r1 SAME, probes r1 == r2 7 / 7 | runner step 4 |
| **x2 (step 3)** | sar131's rows (CURSED / NIGHTMARE zeroed, CONFUSION / FRZ keep) vs the ROM x2 of both battlers on each window's last row (release + 2; no script row writes a battler's x2 between there and the next body): **34 / 34 match**. Discriminating windows: the 3 ONIX-opponent CONFUSION windows (keep: 1 = ROM 1; a zeroed rule would predict 0). The ghost / FRZ windows are consistent (17 + 5 / 22: x2 0 after) but not discriminating: their targets' rest is 0 or already zeroed before (stp128 staged no idle-x2 target for them). A next-live-body probe after a ghost / FRZ on an idle-x2 target is **not** done (see §6) | `sad133X2.ts`, receipt `x2` |
| **App routes** | sar131RouteRender.ts, Scene ON, base `7ae8aff49` vs final, **5 / 5 OK**: seeds 5, 24, 19, 22, 9 (slot 0): 28 CONFUSION commands (move-inflicted, Sweet Kiss / Confuse Ray / Signal Beam / Confusion, self-checks "is confused!", both sides, the elevated VOLTORB) + 2 PSN. Identical frame count, presented frames and per-frame (key, type, age); differing frames: 2,541 inside newly drawn CONFUSION commands (88 / 100 ages each; 99 / 100 on the elevated VOLTORB: its shadow hide) + 7 first frames after one (VOLTORB's shadow hold, postBodyShadowHiddenAt), **0 unexplained**, PSN commands 0 differing. No route of the tool's seed space (223 scanned: 30..180 slot 0, 0..80 slot 1) has a FRZ / CURSED / NIGHTMARE; the census has them (below) | `tools/integration/fixtures/sad133/routes-delta.json` |
| **Census 0..999** | sa125LiveShareCensus.ts, base `7ae8aff49` (src `4c1c48c97`) vs final (src `72bf269e0`), 10 shards each: **0 key / frame / status / liveFrames / decline / battle / segment changes; battleDigestExcludingFrames, battleDigest, battleFrames, commandDigest identical in all 10 shards**; 27,403 move records, 8,063 status-animation commands (CONFUSION 2,404, FRZ 147, NIGHTMARE 55, CURSED 21 among them), 15,915,101 battle frames both | `tools/integration/fixtures/sad133/census-delta.json` |

## 2. The source schedule (no fitting: stp128's reducer)

All four rows come from `statusConditionDisplayRow` (literal ports of AnimGhostStatusSprite / AnimConfusionDuck, ShakeMon2 via
`shakeMon2OffsetAtTick`, AnimTask_FrozenIceCube via `frozenIceCubeState`; stp128 §2). sad133 adds no constant: the only adapter
logic is the rest test (the reducer is called with idle x2 0 and 1; where the offsets differ the battler is at its rest, which
production takes from the tracked x2 history), the sprite art lookup, the ice cube's four pieces (`sFrozenIceCubeSubspriteTable`,
skipped at blend null / eva 0 as stp128's comparator), and the FRZ lag choice.

- CURSED / NIGHTMARE: monbg on rel 3, ghost / devil created on 6 (shown from 8), ShakeMon2 (TARGET, 2, 0, 14, 1) shown from 7, fade
  from display rel 36, clearmonbg 47; x2 0 after. Blended OBJ (BLDALPHA 0x050B ->), under the opponent healthbox for a player target.
- CONFUSION: five ducks created on rel 3 (shown from 5), 90 ticks, priority 1 in front / 3 behind the battlers by the wave angle.
- FRZ: monbg 3 + lag, cube created 6 + lag, blend 0/16 -> 9/7 -> 0/16, palette 13..15 rotation, clearmonbg 111 + lag; lag 0 inflicted,
  1 on the frozen turn.
- The elevated opponent's shadow: sar131's rule (hidden ages 1 .. end + the next command's first row; `STATUS_ANIMATIONS_DRAWN` feeds
  `postBodyShadowHiddenAt`) equals stp128's `enemyShadowHidden` (rel 1 .. E + 1) at a == rel.

## 3. Windows (stp128's pack, reused)

34 windows, 14 scenarios, direct mGBA Scene ON, explicit lab seeds, rows rel -2 .. E + 3 (stp128 §1). Rerun here: 14 / 14 jobs r1 ==
committed sha256 (runner: r1 == r2 and both == committed). Species: CURSED Onix / Golbat (both sides, Gengar user), NIGHTMARE Shuckle /
Golbat (Haunter / Gengar), CONFUSION Onix / Golbat (Primeape: Confuse Ray + 2 self-checks), FRZ Shuckle (Delcatty: Ice Beam + frozen
turns).

## 4. Tier-1 test (`tests/sad133StatusAnimationRender.test.ts`, 16 tests)

The four cases are drawn and in `STATUS_ANIMATIONS_DRAWN` (null without the geometry; PSN / PRZ ignore it); **every row of every age,
both sides, both FRZ paths == the reducer's display row** (offset / rest, sprite places, priority, blend); schedule spot checks; the
receipt (34 / 34 command rows, the named residual exactly); the controls fail exactly their families; **8 windows' every-row production
frame sha256 == the 0 px receipt** (one per animation x side: elevated GOLBAT CURSED / NIGHTMARE / CONFUSION, the HAUNTER-shadow
NIGHTMARE, both FRZ paths); the effect's `inflicted`; the elevated GOLBAT shadow ages; the x2 rows vs the ROM. sar131's drawn-set test now
passes the battler geometry (`liveStatusAnimationRow(name, 10, "opponent", { sprite })`) and asserts PSN / PRZ drawn and drawn ==
`STATUS_ANIMATIONS_DRAWN`.

## 5. Gates (final code: production src `72bf269e0`; tested at `f7018ff64`, later commits are runner / doc only)

- `sh tools/integration/sad133Run.sh .integration/validation/sad133/run3/out --census` (final = this workspace, base = `7ae8aff49`):
  **ALL SAME** (~12 min): stp128 probes r1 == r2 14 / 14, 28 / 28 == committed sha256, rom-windows SAME; comparator 34 / 34 command
  rows 0 px (31 / 34 all rows), r1 == r2 == committed; controls SAME (command-row-clean 0 / 0 / 17 / 17 / 22 / 29 / 29 of 34); x2 34 / 34;
  sar131 PSN / PRZ: probes 7 / 7, rom-r1 SAME, 17 / 17 0 px, production-compare.json SAME; routes 5 / 5 OK, SAME; census delta SAME
  (0 changes); sad133 test 16 / 16 in the copy; receipt SAME (all verdicts true).
- Targeted (4 workers): tests/sad133StatusAnimationRender, sar131StatusAnimationRender, sa125StatusAnimationCommand,
  stp128StatusConditionReducer, animation/statusAnimation, animation/factoryAnimationInventory, animation/animationBoundaryRatchet,
  playableAnimationIntegration: **8 files / 99 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, two shards, 4 workers: shard 1 **822 files / 7,110 tests passed** (22 / 119 skipped), shard 2 **821 files / 6,501 tests
  passed** (22 / 104 skipped); total **1,643 files / 13,611 tests passed**, 0 failed (sar131's 1,641 / 13,558 + stp128's 37 + sad133's 16).
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 7ae8aff49`:
  **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173): the two canonical railroad traces unchanged, no capture of the app-only
  trace moved (none falls on a drawn CURSED / NIGHTMARE / CONFUSION / FRZ frame). The canonical Thunder Wave path
  (`statusAnimationAtSourceAge`) is untouched.
- `git diff --check 7ae8aff49 HEAD`: clean.

## 6. Open (not in scope) and integration notes

- **sag130 (master) integration**: sag130 puts the IsBattleSEPlaying gate rows at the START of the command (minimumFrames = gate +
  STATUS_ANIMATION_ADDED_ROWS). The render effect's age here is the command's phaseElapsed, so after the merge every drawn status
  animation (sar131's PSN / PRZ too) would start `gate` rows early on gated paths. The merge needs `rel = age - (minimumFrames -
  STATUS_ANIMATION_ADDED_ROWS[animation])` in the effect branch (or the view); with it, `inflicted` could also become `gate > 0`.
- FRZ after Ice Beam: the ROM's controller rows are 116 (+ the gate), the command is 117 (sa125's frozen-turn value). Pixel-identical
  on the extra row (nothing is drawn after clearmonbg); a timing residual of the command, not of this slice.
- `inflicted` = "the previous command is the battler's status command" is measured on Ice Beam only; the other freezing moves
  (Ice Punch, Blizzard, Powder Snow, Tri Attack) share MoveEffectFreeze and the gate class, unprobed.
- The ordinary (message) rows never draw the opponent's idle rest (the CONFUSION-on-ONIX residual above; sar131 §6).
- x2: no next-live-body probe after a ghost / FRZ on an idle-x2 target (only CONFUSION discriminates in stp128's pack).
- BRN / SLP / INFATUATION (stq132's reducer) are the SIDE sibling's; SA9 (host / order / allocator checks) remains.

## 7. Reproduction (from workspace/)

```
sh tools/integration/sad133Run.sh <fresh-out-dir-inside-the-repo> [--census]   # copies (final = this workspace, base = 7ae8aff49 from the
                       # enclosing repo), 28 stp128 probe jobs (r1 == r2 == sha256), rom-windows == committed, comparator x2 (r1 == r2 ==
                       # committed) + 7 controls, x2, sar131 PSN / PRZ recheck, 5 routes, census (--census), test, receipt -> ALL SAME
sh tools/integration/stp128Job.sh <out-dir> <scenario.json> [<dump-dir>]; python3 tools/integration/stp128NpzToRaw.py <dump> tools/integration/fixtures/stp128/rom-windows.json <raw>
node --experimental-strip-types --no-warnings tools/integration/sad133ProductionCompare.ts <raw-dir> <out.json> [--neg=age+1|wrong-side|no-shake|no-ghost|no-ducks|no-cube|lag-swap]
python3 tools/integration/sad133Controls.py <controls.json> <name>=<neg.json> ...
node --experimental-strip-types --no-warnings tools/integration/sad133X2.ts <out.json>
node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=5:0:on,24:0:on,19:0:on,22:0:on,9:0:on --out=<f.json>
python3 tools/integration/sad133RouteDelta.py <base.json> <final.json> <out.json>
sh tools/integration/sad133Census.sh <tree-dir> <fresh-dir>; python3 tools/integration/sar131CensusDelta.py <base-dir> <final-dir> <out.json>
python3 tools/integration/sad133Receipt.py <run-dir> <receipt.json>
npm test -- tests/sad133StatusAnimationRender.test.ts
```
