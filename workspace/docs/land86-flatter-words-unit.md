# land86: Flatter 260 as a words-order unit (lands the flat84 patch)

## Results

- Production: the flat84 patch landed on master `005101dfc` (src `9f3b877d`) by `patch -p1` (all hunks landed, one offset in
  `liveMoveAnimation.ts`; no .orig/.rej kept): `wordsOrderUnits.ts` (260 joins `WORDS_ORDER_UNIT_MOVE_IDS`), `liveSpriteOrderHost.ts`
  (marker records the body species), `liveMoveAnimation.ts` (`liveFlatterWordsPostFree` + the deferred carry).
- Test `tests/land86FlatterWordsUnit.test.ts` (4 tests): membership; plan == ROM on the 47 flat84 vectors via the production functions;
  marker species + species-free decline; the 9 KO-chain consumers after a Flatter marker resolve to the ROM activation order.
  Revert experiment (all three src hunks reverted): 4 / 4 fail (`fixtures/land86/test-and-revert.txt`).
- Re-render (final worktree code, `flat84Check.ts`, two fresh direct-mGBA probes per scenario): 8 scenarios, 32 windows (Flatter first / later
  bodies, Mega Drain, Water Pulse, Spark consumers, both sides): all live, 0 px on every row, r1 == r2, check JSON byte-identical to
  `fixtures/flat84/check/`, summary lines == flat84's (`fixtures/land86/rerender-summary.txt`, `check/`).
- Census seeds 0..999 (base `005101dfc` vs final, 10 shards each): live commands 25,886 -> 25,930 (**+44**), live frames 3,867,171 ->
  3,873,572 (**+6,401**), live -> non-live 0, command key sequence + battleDigestExcludingFrames identical, stalls (434, 796, 881) identical
  both sides. Exactly flat84's expectation. (`fixtures/land86/census-check.txt`, `census-delta.json`.)
- ON / OFF parity `flat77Parity.ts` seed 735 streak 0 and seed 936 streak 6: byte-identical to flat84's `parity-*.json`.

Presentation only: no gameplay, RNG, damage, turn-order or facility-state change. A live adapter is not whole-playable arbitrary-history exactness.

## Rerun

```
npm test -- tests/land86FlatterWordsUnit.test.ts
printf '%s\n' ff-nidorina-nidorino-opp ff-nidorina-nidorino-ply c-mega-drain-opp c-mega-drain-ply c-water-pulse-opp c-water-pulse-ply c-spark-opp c-spark-ply | \
  xargs -n 1 -P 4 sh -c 'node --experimental-strip-types --no-warnings tools/integration/flat84Check.ts tools/integration/fixtures/flat84/fixtures "$0" <out>/check-$0.json'
# census: base = git archive 005101dfc:workspace; per shard k=0..9:
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=${k}00..${k}99 --index-from=${k}00 --out=r$k.json --commands=r$k.jsonl
python3 tools/integration/hist73Merge.py <shards> m.json m.jsonl
python3 tools/integration/land82CensusCheck.py <base-shards> <base.json> <base.jsonl> <final-shards> <final.json> <final.jsonl> delta.json
node --experimental-strip-types --no-warnings tools/integration/flat77Parity.ts --seed=735 --streak=0   # and --seed=936 --streak=6
```
