# iu120 (S10A timeline fidelity, Scene ON): idle98's universal pre / post rows, landed

Base master `9d23a17c4` (production src `530600bb1`). Production change: `src/engine/battleResolutionPresentationRender.ts` only
(the live move command's duration / age seam). Folded by hand from `tools/integration/fixtures/idle98/idle98-universal-rows.diff`
(cut before land97) per idle98 s3.2: one hold of **P + N + D + T** rows, effect age **clamp(elapsed - P - N, 0, D - 1)**, N =
land97's `liveMoveIdleLeadRows`. Presentation only: gameplay, RNG, damage, turn order and facility state are untouched.

## Results

| Check | Result |
|---|---|
| Fold | `liveMoveUniversalRows` (P = 3 except idle98's 13 masked moves; T = 2 on its 257 trail -1 sides) + `liveMoveUniversalRowAge` (pre + lead hold at age 0, post hold at D - 1); `battleResolutionCommandDuration` = P + N + D + T; the render effect's age seam. Typecheck green |
| Post-idle98 bodies | **Struggle 165** (stl109 / sdl119, incl. its doll-defender and doll-attacker cells): live only after idle98's evidence (base 3dd2b74b9), lead / trail never measured -> **P = 0 / T = 0** (`LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS`; not measured here). **Fury Cutter 210 counters 2..5** (fury99): a new body class of a move idle98's masks cover; kept the move-side rule (P 3, T 0): fury99's 40 / 40 windows start at activation (lead 0) and idle98 measured P = 3 on a later multi-hit body (Double Kick hit 2). **Focus Punch 264** (fp100 D4) keeps T = 2: its window still ends on the first inactive row (trail -1). **Shadow Punch 325** (sp103 D4): P 3 + N 8, T 0. Recover 105 / GrassWhistle 320 swap cells: swaps keep 0 / 0 |
| Composition | **land97 N**: pre rows come first, then the N lead rows, one hold (no double count: N is read once, from `liveMoveIdleLeadRows`). **shp116 row-0 shadow**: `preActivationRow` now covers elapsed 0..P (the pre rows show the activation row's image, idle98: F_att..A-1 == row A), so the elevated-opponent shadow is drawn on P + 1 rows; the body's own rows are unchanged. **Substitute swap / declined body**: 0 / 0 (composite duration unchanged). **D4** (fp100 / sp103 / d4later): D is the body-class duration (`liveMoveTimingBodyOf`), the post hold clamps to its D - 1. **stats-change**: a separate command after the body; its duration is unchanged (sc106 routes: 90 / 76), only its start frame moves with the bodies before it |
| Render re-proof (idle98's 14 routes, `iu120RenderCheck.py`) | **14 / 14 pass, r1 == r2 in both trees** (base 9d23a17c4 vs the fold): pre rows == base row 0 (sha, age 0, live), body rows unchanged, post rows == base last row, next command's first row equal. Water Pulse x2 / Double Kick: Random2 words differ only from age 91 (>= 86) / 11 (>= 10), as in idle98. Plus shp116 routes b38 Bite (opponent) / Sludge Bomb (player): pre rows == base row 0 incl. `preActivationRow`, body rows unchanged. `fixtures/iu120/receipts/render-check.json` |
| Pins (full suite, two shards, before any move) | **283 tests in 68 files, all timing** (267 row / age sequences, 4 durations / counts, 5 sc106 anchor frames, 7 row counts). `fixtures/iu120/pins.json` (`iu120Pins.py`). Moved by exactly P + T per live body via `tests/helpers/iu120Rows.ts` (`iu120Ages` phaseElapsed, `iu120EffectAges` effect ages, `iu120Extra`). Two route totals carry harness dismissal parity (sc106 seed 0: - 2; idle94Route ON: +1 on a message span), documented at the pin |
| Scene parity (`iu120SceneParity.py`, idle94Route b154 / b268) | **OFF: frames 8,470 / 13,876 identical, every command row identical.** ON: same command key sequence; +56 / +156 frames = the sum of the per-command moves (each live move command +3 or +5) |
| New test | `tests/iu120UniversalRows.test.ts` (10): P / T per class, the masks (13 / 130 / 257 / [165]), production == test-side masks on every id x side, P + N + D + T (Bulk Up 113, Bite 39), Struggle / swap / declined 0 / 0, 3 routes vs committed base rows (Bulk Up, Karate Chop, shp116 Bite) |
| Revert experiments (archive copy) | rows stubbed to 0 / 0: **6 / 10 fail** (the 4 passing are the test-side mask constants and the three 0 / 0 cases). Struggle exclusion removed + `preActivationRow` back to elapsed 0 only: **3 / 10 fail** (mask equality, Struggle, shp116 composition) |
| Differential (`--base 9d23a17c4`) | `fight-submenu` 235 / 235 and `battle1-postwin-next-prompt` 216 / 216 byte-identical. `presentation-rng-playable-live-bodies-seeded-on` 53 / 173 identical: its capture frames are each body's activation and last frame on the base timeline; every body after the first now starts P + T (+ the earlier bodies' rows) later and lasts P + T longer, so the fixed frames land on other rows (and Random2 words move with the host). **Regenerate its capture frames with `tools/integration/presentationRngTraces.ts`** (not done here) |

| Census 0..999 (10 `--index-from` shards per tree, `hist73Merge.py`, `iu120CensusDelta.py`) | **0 status changes, 0 per-command mismatches.** 27,427 commands both trees (live 27,140 both). **23,870 commands moved by exactly P + T of their side** (23,779 live + 91 presentation-stage fallbacks); 135 Substitute swaps and every Struggle command kept +0. **+95,148 frames** (4,065,771 -> 4,160,919). Command KEY sequence identical on 10 / 10 shards; `battleDigestExcludingFrames` identical on 9 / 10: shard 4's seed 434 (streak 21) is the census FRAME_BUDGET stall idle98 also hit; it stalls in both trees and the final tree is cut one turn earlier (289 vs 290 turns), with the same command keys. `fixtures/iu120/census-delta.json` |
| Gates (final code) | typecheck green; smoke 8 files / 448 tests; the 70 gate files green (60 + the 10 Random2-route files rerun after the effect-age fix); **full suite on `03bb26521`: shard 1 819 files / 7,035 tests passed (22 / 119 skipped), shard 2 818 / 6,468 (22 / 104), 0 failed**; `npm run build` green; `git diff --check` clean |

Receipt: `tools/integration/fixtures/iu120-live-receipt.json`.

## Reproduce (from workspace/)

```
sh tools/integration/iu120Run.sh .integration/validation/<fresh>             # render routes x2 x2, Scene parity
sh tools/integration/iu120Run.sh .integration/validation/<fresh> --census    # + census 0..999 both trees, iu120CensusDelta.py
npm test -- tests/iu120UniversalRows.test.ts
python3 tools/integration/iu120Pins.py <out.json> <shard-1.log> <shard-2.log>   # pin enumeration from npm test shard logs
```
