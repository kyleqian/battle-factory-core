# land97 (S10A timing fidelity): the banked idle94 lead rows, landed

Base `64f0ae997` (production src `72e4e0ab`). Production change: `tools/integration/fixtures/idle94/idle94-lead-rows.diff` applied with
`patch -p1` (clean, no `.orig` / `.rej`): `liveMoveIdleLeadRows` + `LIVE_MOVE_IDLE_LEAD_ROWS` (40 ids) in
`src/engine/battleResolutionPresentationRender.ts`. Scene ON presentation only: a live move-animation command lasts D + N and its effect
age is `max(0, elapsed - N)`; a Substitute-swap composite keeps 0.

## Results

| Check | Result |
|---|---|
| Runner (`tools/integration/land97Run.sh <dir> --census`, = idle94Run.sh with base 64f0ae997) | SAME: 20 scenarios, scenario index, 98 lead-scan scenarios, probes r1 == r2 (40 / 40 + 98 / 98), probe sha256 138 / 138, compare-r1, lead-scan check, render-check (**8 / 8 routes**) |
| Runner DIFF (all explained) | `table.tsv` lead column: FOCUS_PUNCH (264) status label `implemented` -> `faithfulTiming` on the newer base (lead 0 unchanged). `table.tsv` with census and `census-delta.json`: the census columns move with the base (27,515 commands, not 27,516) |
| Census 0..999 (10 `--index-from` shards per tree, hist73Merge) | 27,515 commands both trees. Command KEY sequence and `battleDigestExcludingFrames` identical. **0 status changes.** **3,842 commands moved by exactly +N** (3,835 live + 7 presentation-stage fallbacks), 1 Substitute-swap command stays +0, **+20,853 frames** (3,965,676 -> 3,986,505). `frameDeltaMismatches` 1: battle 881 (seed 881, streak 38) is a Struggle-vs-Struggle battle that STALLS in both trees at the census 200,000-frame budget; its last command is cut by the budget (STRUGGLE 25 -> 1 frame). A harness cut, not a lead id |
| Scene OFF unchanged | idle94Route.ts battles 154 (Bulk Up) and 3 (Swagger): **OFF frames 7,608 / 9,832 identical, every command row identical**; ON +12 and +40 frames, same command key sequence |
| Pins moved | 30 tests in 16 files, each by exactly +N for its lead id (same 30 as idle94 section 4); nothing else moved. Shared helper `tests/helpers/land97LeadAges.ts` |
| New test | `tests/land97IdleLeadRows.test.ts` (4): the 40-id set, D + N (Bulk Up 104 + 4, Swagger 161 + 7, Taunt 125 + 10, Scary Face 190 + 4, both sides), swap composite keeps 0, route b154 Bulk Up: rows 0..N-1 == age-0 frame, row N+k == unpatched row k (committed base rows `fixtures/land97/base-b154-339-player.json`). Reverting the production change fails 3 of 4 (the swap test passes trivially when the function is a stub returning 0) |

Receipt: `tools/integration/fixtures/land97-live-receipt.json`. Census delta: `fixtures/land97/census-delta.json`.

Not touched (out of scope): the universal pre (+3) / post (+2) rows, STATS_CHANGE's 75-frame gap, the Scene OFF status pause.

## Reproduce (from workspace/)

```
sh tools/integration/land97Run.sh .integration/validation/<fresh> --census        # ~9 min
npm test -- tests/land97IdleLeadRows.test.ts
```
