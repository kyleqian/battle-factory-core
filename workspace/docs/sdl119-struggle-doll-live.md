# sdl119 — Struggle on a Substitute doll, live (S10A)

## Results

- **Landed** the banked stf115 diff (`tools/integration/fixtures/stf115/stf115-struggle-doll.diff`, 3 regions, presentation only):
  `battleScene.ts` STRUGGLE branch `artFor` -> `liveSceneOnBattlerArt`; `liveMoveAnimation.ts` case 165 `composeLiveFieldPalettes` +
  `[165, both]` in `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS`; `liveSubstituteSwap.ts` `[165, BOTH]` in `LIVE_SUBSTITUTE_SWAP_BODY_CELLS`.
- **Re-proved from this checkout** (`sh tools/integration/sdl119Run.sh <fresh-dir>`, a git-archive copy of the checked-in tree, direct mGBA,
  r1 == r2 everywhere): 66 / 66 windows r1 == r2, lend == ROM 66 / 66; 59 live windows all **0 px** = the 54 doll-free live windows
  (rung 1, unchanged) + the **5 defender-doll** windows; **6 / 6 attacker-doll** swap composites (197 player / 193 opponent rows) 0 px on
  every row (+ k+1, k+2). `derive.txt`, `rung2-windows-patched.txt`, `rung2-attdoll.txt` byte-identical to `fixtures/stf115/`;
  receipt `tools/integration/fixtures/sdl119-live-receipt.json`. The lends file differs from stf115's only in the 5 defender-doll
  lines (now `live:true`); reference `fixtures/sdl119/lends.jsonl`.
- **Census 0..999**, base `76c33f4bc` vs final (src `377ed0c48`), `ret88Census.sh shards` x 2 + `land82CensusCheck.py` +
  `stg107CensusSummary.py`: live by count 98.80 % -> **98.95 %** (27,097 -> 27,140), by frames 99.27 % -> **99.31 %** (supervisor correction: 99.44 % divided by the base arm's frame total; see docs/live-share-census.md); Struggle
  declines 149 -> **106** (+43: 36 opponent / 7 player; `attacker doll` 24 and `defender doll` 19 -> 0), 0 non-Struggle status changes,
  command keys identical outside the stalled tails, `battleDigestExcludingFrames` identical, played / terminal / stalled 1000 / 997 /
  3 both arms, live -> non-live 0. The two fewer commands (27,429 -> 27,427) are the budget-cut tail of stalemate seed 881 (live Struggle
  is 112 rows, so the 200,000-frame budget ends it earlier). Receipts `fixtures/sdl119/census-summary.json`, `census-check.json`.
  The arm equals stf115's patched arm on the same classes (Struggle 106 lend declines remain: Odor Sleuth / Hyper Beam hosts).
- Tests: `tests/sdl119StruggleDoll.test.ts` (new), pins moved in `tests/stl109Struggle.test.ts` ("a Substitute doll is live on either
  side") and `tests/substituteDollDefenderLive.test.ts` (allowlist += `165:opponent`, `165:player`).
- No accounting change: Struggle was already the one additional required body (`docs/stl109-struggle-live.md`).

## Revert experiments (each fails a named test)

| revert | fails |
|---|---|
| case 165 back to `composeLiveArtPalettes` | `sdl119StruggleDoll` "the palette rule" (+ the receipt pin, while the receipt is absent) |
| drop `[165, …]` from `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS` | "165 is in both cell maps", "a Substitute doll is live on either side", "the palette rule" |
| drop `[165, BOTH]` from `LIVE_SUBSTITUTE_SWAP_BODY_CELLS` | "165 is in both cell maps", "a Substitute doll is live on either side" |
| `artFor` back to the species maps | **no unit test** (needs a Struggle renderer view); caught by `sdl119Run.sh` (defender-doll windows px > 0) — pinned through the receipt text |

## Reproduce

```
sh tools/integration/sdl119Run.sh .integration/validation/<fresh>      # ~7 min; `same` lines vs fixtures
sh tools/integration/ret88Census.sh shards <dir-base> 76c33f4bc; sh tools/integration/ret88Census.sh shards <dir-final> <final>
python3 tools/integration/stg107CensusSummary.py <dir-base> <dir-final> out.json; python3 tools/integration/land82CensusCheck.py …
```
