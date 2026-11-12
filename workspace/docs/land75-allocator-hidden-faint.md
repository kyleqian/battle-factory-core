# S10A land75: hist73 folded (allocator history for 37 bodies, a hidden battler's faint / reshow)

Integration lane. Base master `ce51c7444` (src `e6f98bf9`). Tested code `c472ed58b` (src `8e543d91`, unchanged since `aa2f21f4a`).
Receipt: `tools/integration/fixtures/land75-live-receipt.json`. Evidence: `docs/next-adapters-hist73.md` (direct-mGBA probes, folded here).

## 1. Results

| | live by count | live by frames | gain |
|---|---|---|---|
| master `ce51c7444` | 25,784 / 27,518 = **93.70 %** | 3,859,021 / 3,952,274 = **97.64 %** | |
| + Part A (`4b2e0fe17`) | 25,903 = **94.13 %** | 3,871,271 = **97.95 %** | **+119 / +12,250** |
| + Part B (`aa2f21f4a`, final) | 25,938 = **94.26 %** | 3,876,277 = **98.08 %** | **+154 / +17,256** |

Census: seeds 0..999, 10 `--index-from` shards (they concatenate to one `--seeds=0..999` run; `hist73LiveShareCensus.ts` =
`liveShareCensus.ts` + `--index-from`). Both deltas: same command count, KEY sequence (battle, kind, moveId, side, attacker, target),
frames per command, battle digest `11b30db7a344` and KEY digest; **0 live -> fallback regressions** (`census/keycheck-*.txt`).
The final gain equals hist73's measurement on `a7904fcc0` exactly. hist73's chain predictor, re-run on `ce51c7444` (179 allocator
declines / 18,144 frames; ice72 cleared one chain since `a7904fcc0`), predicts Part A at 119 / 12,250 = measured. Part B adds 35 / 5,006:
the 26 / 4,010 faint-of-hidden bodies and the 4 / 616 reshow-with-hidden bodies, 3 / 228 allocator declines in battle 713 (the forced
switch-in reseeds), and 2 / 152 bodies where the Part B reseed keeps the allocator known into bodies that the Part A ids no longer
invalidate. Residual: allocator history unknown 55 / 5,514 (hist73's post-KO order-host reseed blockers, out of scope).

- **Part A** (`src/engine/liveMoveSpriteAllocator.ts`): hist73's 37 audited NET-ZERO move ids join
  `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` (doc comment: five receipts).
- **Part B** (`src/engine/liveSpriteOrderHost.ts`): a hidden (semi-invulnerable) battler's `faint-animation` is the shown faint plan and
  clears its hidden flag. A reshow with a hidden OPPONENT is the normal `battle-reshow`, with `hidden` kept (the ROM re-creates the sprite
  invisible). A hidden PLAYER at a reshow still invalidates, and so does a hidden battler's switch-in.
- **hide66 doc corrected** (dated note in `docs/hide66-hidden-battler.md`): `battlerData[].invisible` IS set in Scene ON
  (`CopyAllBattleSpritesInvisibilities`, `battle_controller_opponent.c:1513` / `battle_controller_player.c:2534`).

### Routes dense-checked against the ROM (Part A turns them exact)

The routes' body histories are staged in the Scene ON lab with the routes' species (`land75Stage.py`; lab seed pinned) and
rendered through the production live renderer by `audit18Check.ts`. The production hosts are fed as the orchestrator feeds them, with
two fresh direct-mGBA probe processes per scenario. A second fresh `land75Run.sh` pass reproduced every receipt byte for byte.

| route | ROM history (lab) | windows | rows | px | r1 == r2 | hide == ROM |
|---|---|---|---|---|---|---|
| wall seed 10 (Barrier 112) | YANMA Signal Beam 324 -> DROWZEE Barrier, route orientation + swapped sides (+ a 2nd-turn Barrier) | 3 | 76 each | **0** | yes | yes |
| wall seed 260 (Magic Coat 277) | SPOINK Psywave 149 -> CLAMPERL Dive 291 setup -> Magic Coat at the HIDDEN diver (lab seed 1 = the route's exact history; seed 8 a longer one) | 5 | 76 each | **0** | yes | yes |
| Light Screen seed 84 [3, 3] | BEAUTIFLY Silver Wind 318 -> EXEGGCUTE Light Screen | 1 | 86 | **0** | yes | yes |

On the wall-260 scenarios the checker runs with `AUDIT18_NO_MISS_RULE=1`. Audit 18's per-turn "missed strike" inference cannot see
that Magic Coat's +4 priority puts it before the diver's strike in the same turn (the fixture's turn ends at the consumer), so it
wrongly shows the diver (130,720 px, `hideAgree` false). With the inference off, the hide equals the ROM's own invisible flags.
`land75RouteCheck.ts` runs the PRODUCTION orchestrator on the three routes. Every wall row is live with the allocator known and
an order lend (76 / 76 / 88 rows), and the diver is hidden on route 260 at every Magic Coat row.

Scene ON/OFF logical parity (`land75Parity.ts`, the census controller): battle 533 (64 action-menu arrivals) and 713 (23). RNG, rules
and boundaries are equal. In Scene ON, 533 gains 41 bodies with the order and allocator known after the airborne Fly charger's Toxic KO
(the next opponent's Dig x20, Double Team x6, ...); 713 gains 19 after the reshow with the opponent mid-Bounce. Neither route has a
hidden-battler order stop left. No body that 713 newly unlocks is cast while a battler is hidden.

### Pins moved

hist73's measured pin list: `liveSpriteAllocator` (union pin with the hist73 receipt; 116 / 339 leave the stay-out list; the
non-audited example is now Karate Chop 4), `voluntaryLend` (`light-screen-player.json@3153` true), `liveWallMoveAdapters` (seeds 10 / 260
exact, `firstIndex` exceptions), `spriteOrderFly63` (faint of a hidden battler == the shown faint), `liveSpriteOrderHost` (hidden opponent
at a reshow == the shown reshow; hidden player still invalid). **Not in hist73's list:** `playableAnimationIntegration`'s Light Screen
route seed 84 `[3, 3]`, which flips to exact (Silver Wind 318) and is dense-checked above. New: `tests/land75WallRoutes.test.ts`, and
`tests/land75HiddenBattler.test.ts` (`hidden-battler-audit.json` `allSame` / `allIdenticalAB`; battles 533 / 713 route pins with parity).

Gates on `c472ed58b`: hist73 related sets (A: 35 files / 485 on the Part A code; B + land75: 65 / 701), inventory + playable + land75
15 / 15, typecheck, smoke 448, full suite as two shards **1,609 files / 13,231 tests**, build, differential 624 / 624 byte-identical vs
`ce51c7444`, `git diff --check`.

## 2. Reproduction (from workspace/)

```
sh tools/integration/land75Run.sh <fresh-dir>      # restage, probe, re-derive, audit18Check x5 (2 fresh probes each), route check; same / DIFF
node --experimental-strip-types --no-warnings tools/integration/land75Parity.ts --seed=533 --streak=32   # and --seed=713 --streak=3
# census: 10 shards per tree (base = git archive ce51c7444), then
#   hist73Merge.py <shard-dir> <out.json> <out.jsonl>; hist73KeyCheck.py / prep43CensusDelta.py <base.json> <base.jsonl> <after.json> <after.jsonl>
#   predictor: hist73AllocatorCensus.ts shards on the base -> hist73Merge.py -> hist73Chains.py <jsonl> <out> --cleared <the 37 ids>
python3 tools/integration/land75Receipt.py <tested-commit> <src-tree> [gates.json]
```
