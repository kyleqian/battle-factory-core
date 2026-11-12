# land82 — 13 Substitute-doll (move, side) cells live (doll81 patch landed)

Integration lane, base master `f49b7d03f` (production src tree `4c4fe4c7`). Presentation only: no gameplay, RNG, damage, turn order or
facility state changed.

## Results first

- **Landed**: `doll81-cells.diff` via `patch -p1` (3 files, no .orig / .rej). Attacker-doll swap bodies Dream Eater 138 opponent,
  GrassWhistle 320 player, SolarBeam 76 both (charge turn only), Lovely Kiss 142 both, Sing 47 player, Sunny Day 241 both (self-target id
  set `{241}`); defender-doll cells Leaf Blade 348 both, ThunderPunch 9 both.
- **Evidence reproduced on this base** (`tools/integration/land82Run.sh`, BASE=f49b7d03f): 60 / 60 scenarios r1 == r2 byte-identical;
  `summary.tsv`, `summary-explore.tsv` and `pins.txt` are byte-identical to the doll81 receipts (patched 0 px on the 13 cells; the
  explore residuals unchanged). Receipts: `tools/integration/fixtures/land82/{attdoll,dolldef}-live-receipt.json`.
- **Re-rendered through the FINAL worktree code** (two fresh runs each, == the summary): Sunny Day player (PERSIAN, frame 1767, 243 rows,
  0 / 0 px), Sunny Day opponent (GOLBAT, 1738, 239 rows, 0 / 0), Lovely Kiss player GENGAR (1772 and 5168, 238 rows, 0 / 0 on both),
  Leaf Blade player (1741..1964, 224 rows, 0 / 0), Leaf Blade opponent (1745..1968, 224 rows, 0 / 0), ThunderPunch opponent GOLBAT
  (1748..1883, 136 rows, 200 / 200 = the doll-free control's own row-0 elevated-attacker shadow, as documented in doll81).
- **Census 0..999** (10 `--index-from` shards, merged with hist73Merge.py), base `f49b7d03f` vs final: live **25,809 -> 25,886 (+77
  commands)**, live frames **3,848,512 -> 3,867,171 (+18,659)**; 93.80 / 97.38 % -> 94.08 / 97.85 % (count / base-frame terms
  as `doll81CensusCheck` prints). **0 live -> fallback**, render throws 0. Doll declines 255 / 8,160 frames -> 178 / 5,696. The per-cell
  gains are exactly doll81's (138 opp 17 / 5,916; 348 opp 15 / 3,360; 47 player 7 / 2,317; 142 opp 9 / 2,106; 9 opp 13 / 1,352;
  241 opp 5 / 1,195; 241 player 4 / 972; 76 player 5 / 965; 142 player 2 / 476). The +77 / +18,659 deltas are identical to doll81's
  on `e6c51fec4`; land79 / ret80 did not touch these cells.
- **Command KEY sequence identical** except seed 881's tail: stall-battle 881 (a Struggle loop) is cut 2 commands earlier by the census's
  200,000-frame budget (295 -> 293, both dropped keys `165 opponent SHUCKLE -> CRADILY`); seeds 434 / 796 stall in both with identical
  commands. The shared prefix (all other battles in full, battle 881's first 293) is key-identical. Per-shard
  `battleDigestExcludingFrames` differs only in shard 8 (seed 881's turn count 268 -> 267). Total commands 27,518 -> 27,516.
- **Scene ON / OFF parity** (`tools/integration/land82Parity.ts`): seed 564 (Leaf Blade opp, ThunderPunch opp, Sing player cells all
  requested; 33 boundaries) and seed 587 (Sunny Day opp, stalls at the same rejection prompt in both): boundaries (rules with the scene
  hit-marker masked, RNG, boundary), RNG cursor, rules outcome, facility state and prompt are equal. Scene OFF emits no move-animation
  requests by design, so "command keys" are the logical boundaries. Plus the CRADILY route (SolarBeam charge turn behind the doll) in
  `tests/substituteDollAdapterDecline.test.ts` keeps its ON/OFF `expectParity`.

## Pins moved

`substituteDollDefenderLive` (+348 / 9 both sides, 41 entries), `substituteSwapAttdollCells` (+47 / 142 / 320 framing rows; the
doll-free adapter figure is asserted only for framed sides: Sing opponent's doll-free body is 248, not 245),
`substituteDollAdapterDecline` (CRADILY route re-pointed to: SolarBeam charge turn (193 live frames) is presented, the fire turn (32-frame
fallback) still declines). New `tests/land82DollCells.test.ts` pins sides, the three framings, the self-target set `{241}` (Double Team 104
/ Recover 105 still decline), the SolarBeam turn gate and the defender cells; each was verified by a revert experiment (self-set widened,
gate removed, framing off by one, Sing sides widened, Leaf Blade cell removed: all fail). No `SolarBeam fire turn` census reason was added
(fire turns stay under the generic swap-body-cell-unproven reason).

## Reproduce

```
sh tools/integration/land82Run.sh <fresh-dir>
python3 tools/integration/hist73Merge.py <dir> out.json out.jsonl
python3 tools/integration/land82CensusCheck.py <base-dir> base.json base.jsonl <final-dir> final.json final.jsonl delta.json
node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts 564 32 348:opponent 9:opponent 47:player
```

`land82CensusCheck.py` restores `config`, `battles.stalls` and the per-shard `battleDigestExcludingFrames` that hist73Merge drops, then runs
`doll81CensusCheck.py`. Receipts: `tools/integration/fixtures/land82-live-receipt.json`, `tools/integration/fixtures/land82/`.
