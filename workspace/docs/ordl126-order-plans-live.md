# ordl126 (S10A side lane, 2026-10-12): the banked ord124 order plans for Odor Sleuth 316 + False Swipe 206 are LIVE

Base: master `cfe4e26ca` (production src `b4befa039`). Production change: the generated `src/engine/spriteOrderProductionPlans.ts`
(+3 plans, +4 keys) via the one fixture line added to `tools/integration/spriteOrderProductionTable.ts`, plus the table-length pins in
`tests/spriteOrderEventTransform.test.ts`. Presentation only. Evidence and method: `docs/ord124-order-plans.md`.

## Results

| Check | Result |
|---|---|
| Generated hunk == banked hunk | The regenerated table's changed lines equal the `src/engine/spriteOrderProductionPlans.ts` hunk of `ord124-order-plans.diff` exactly (2 changed lines, 3 plans appended). The runner also checks that the diff applies to the base arm and that the table regenerates byte-identically. |
| ROM units (committed receipts, plans69 + ord124) | `316:player` 29 / 29, `316:opponent` 22 / 22, `206:player` 9 / 9, `206:opponent` 9 / 9 exact per allocation window. |
| Revert experiment (static `D0,1`, no `/P552,552` / `/P542,542` words) | Fails **exactly the 21** `[4, 3, ...]` lend-class instances (13 player + 8 opponent) and passes the 30 `[3, 4, ...]` ones. Recorded as a test. |
| Windows after the bodies (landed tree, direct mGBA, two fresh probe batches) | 12 windows: CHAIN lend == ROM `sSpriteOrder` **12 / 12**, r1 == r2 **12 / 12**, **10 / 10 after-body windows live at 0 px** on every row (Harden 101 / 101 rows, Mega Punch 160 / 160). The other 2 are the pre-existing Golbat Mega Punch first windows (17,984 px / 287,402 px class in ord124 §3 FINDING; unchanged, not this landing). |
| Census 0..999 (`stg107Census.sh` x2, `hist73Merge.py`; percentages from the merged reports) | base `cfe4e26ca`: 27,139 / 27,426 live (**98.95 %**), 4,132,330 / 4,160,787 frames (**99.32 %**). Landed: 27,245 / 27,426 (**99.34 %**), 4,144,162 / 4,160,787 (**99.60 %**). **+106 commands / +11,832 frames**, all battle 705 (Struggle `165:player` 83, `165:opponent` 18, Swallow `254:opponent` 5). 0 other status changes; KEY sequence, per-command frames, `battleDigest`, `commandKeyDigest` and shard digests identical; `land82CensusCheck`: 0 pairing mismatches, 0 regressions. |
| Lend unknown | 125 / 15,490 -> **19 / 3,658** commands / frames (`ord124Attribution.py` on the landed merged jsonl, byte-identical to ord124's patched attribution). |

Receipt: `tools/integration/fixtures/ordl126-live-receipt.json`. Tests: `tests/ordl126OrderPlans.test.ts`.

## Reproduce (from `workspace/`; direct mGBA only, ~8 min)

```
sh tools/integration/ordl126Run.sh .integration/validation/<fresh>
```

The landed tree is a `git archive HEAD` copy; the base arm is the same copy with `ord124-order-plans.diff` reversed (so the runner needs no
history, and works in a fresh archive copy after `git init` + one commit). It prints `same` / `DIFF` against the committed receipts
(`ord124-check.json`, `ord124-rung3-windows-patched.txt`, `ordl126-live-receipt.json`). Tools: `ordl126Run.sh`, `ordl126Receipt.py`; reused
`ord124Check.ts`, `ord124Stage.py`, `ord124CensusPair.py`, `ord124Attribution.py`, `stg107Census.sh`, `land82CensusCheck.py`,
`audit20*`, `aud110Align.py`, `stf115Check.sh`, `stf115Summary.py`.

## Residual (unchanged by this landing)

- Hyper Beam `63:player`, 12 / 2,229: RANDOM2 orb words + geometry.
- Astonish `310:player`, 5 / 912: plans69's small words law (4 words -> `D1,2` / `D2,1`).
- Next-mon summary while the opponent battler is tracked, 2 / 517 (battle 355).
- Later-body: the Extrasensory 326 player scanout split, 23 / 3,772 (not an order-plan problem).
