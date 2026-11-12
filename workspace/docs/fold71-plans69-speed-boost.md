# fold71: plans69 sprite-order plans folded + Speed Boost STATS_CHANGE payload

## Results

- **Census 0..999** (base `2c77c9c61` vs final; `liveShareCensus.ts`, three ranges, `prep43CensusDelta.py`; receipt
  `tools/integration/fixtures/fold71-live-receipt.json`): **+43 commands / +5,594 live frames**, 0 live -> fallback regressions,
  0 pairing mismatches, identical battle digest and identical command key sequence (battle, kind, moveId, side, attacker, target) in every range.

  | range | commands | live cmds | live frames |
  |---|---|---|---|
  | 0..299 | 7,970 | 7,794 -> 7,794 (+0) | 1,157,616 -> 1,157,616 (+0) |
  | 300..649 | 10,392 | 9,399 -> 9,422 (+23) | 1,411,265 -> 1,413,879 (+2,614) |
  | 650..999 | 9,285 | 8,806 -> 8,826 (+20) | 1,332,752 -> 1,335,732 (+2,980) |

  Plans69 predicted +37 / +4,926. The extra +6 / +668 are chain members behind a now-cleared unit ("sprite allocator history unknown" 2 + 2
  commands; "presentation: unclassified" 2 in 650..999) that master's earlier landings (land68 Dive/SUBSTITUTE_FADE) made reachable.
  Magnitude 222 cleared 21 (300..649) + 9 (650..999) commands, Speed Boost (`stat animation 0` / `3`) 6, CASTFORM_CHANGE 1.
- **Speed Boost** now carries argument 17 (`STAT_ANIM_PLUS1 + STAT_SPEED`, battle_util.c:2646-2647). Seed 927 (Ninjask, streak 9 = census battle 277
  of 650..999): STATS_CHANGE arguments were `0,0,...,16,...,43,...,3` before and `17` for every Speed Boost activation after
  (`tools/integration/fold71Parity.ts`). Scene ON == OFF (rules context, RNG, boundary; hitMarker differs only by the scene bit) and the
  boundary digest (animArg1 excluded) is identical between base and final.
- **animArg1 readers** (grep of `src`): the only reader of `rulesContext.animArg1` is `battleScriptStatbuffchangeOpcode.ts` (`readsAnimArg1`
  operands of `playanimation`, the `STATS_CHANGE` / `LEECH_SEED_DRAIN` event arguments). Writers: statbuffchange (`animArg1`), hit chain
  (`effectByte`), end-turn Leech Seed / stat-up tick, and now the Speed Boost tick. Gameplay state is untouched.

## Changes

1. Step 1 (`9d33e860d`): `plans69/temp-patch.diff` re-applied by hand onto master (the table, host and test hunks had drifted past prep61 / prep64):
   `plans69/plan-rows.json` appended in the generator and the table regenerated (bodies 543 -> 550, plans 221 -> 222), key `20222` for Magnitude
   when `power > 99` in `liveSpriteOrderHost.ts` `orderEventOf`; the same key in the three tooling mirrors (replays derive the branch from the
   body's allocation count, the route scan from the request); pins in `tests/spriteOrderEventTransform.test.ts`; new `tests/spriteOrderPlans69.test.ts`.
2. Step 2: the Speed Boost tick's `animArg1` + a Tier-1 test in `tests/battleEndTurnAbilities.test.ts`
   (fails without the fix: arguments `["0"]`).

## Rerun

```
# census (from a git-archive tree of each commit, three ranges in parallel)
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=<range> --out=<json> --commands=<jsonl>
python3 tools/integration/prep43CensusDelta.py base.json base.jsonl final.json final.jsonl delta.json
node --experimental-strip-types --no-warnings tools/integration/fold71Parity.ts 927 9
```
