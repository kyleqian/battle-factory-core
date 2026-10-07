# Faithful-timing policy module (D4a)

Implements the accounting and policy of `docs/faithful-timing.md` (D4, approved 2026-10-07). Module:
`src/engine/liveMoveTimingPolicy.ts`, version `live-move-timing.v1.dominant-measured-phase.tie-no-optional-event`.

## Rule

- Each permitted CPU-phase parameter (kind `optional-lag-age`, `bg-write-row`, `palette-transfer-row`, ...) has its measured
  alternatives, the number of banked measurements per alternative, the chosen phase and the evidence cite.
- **Dominant** = the most frequent phase across ALL banked measurements of that parameter (every source together).
- **Tie rule**: a tie selects the phase WITHOUT the optional event (the source main-loop iteration count + the fixed lags).
- The table is fixed and global: no gameplay state, no RNG, no capture/corpus row, no species. Rendering is pure and replay/reset
  cannot select a different phase, so the version lives in evidence and docs; the session export is unchanged (purely global
  constant, nothing per battle/session to persist; adding a field would only change export bytes).

## Table

| Move | Parameter | Fixed lags | Iterations | Alternatives (rows: measured) | Chosen | Tie rule |
|---|---|---|---:|---|---|---|
| MACH_PUNCH 183 | optional lag at age 91 | 71, 72 | 107 | lag 110: 5, no lag 109: 3 | lag (110 rows) | no |
| NIGHTMARE 171 | optional lag at age 149 | 21, 129, 130 | 164 | lag 168: 5, no lag 167: 3 | lag (168 rows) | no |

Measurements: `tools/integration/fixtures/prep25/lag-frames.json` (2 of 4 each, a tie) + the D4a tie-break
`tools/integration/fixtures/d4a/lag-frames-tiebreak.json` (4 more scenarios per move by the same method, 3 of 4 with the lag each).
Tie-break scenarios: `tools/integration/d4aScenarios.py` (HITMONCHAN/SNORLAX + BRELOOM/GOLBAT for Mach Punch, HAUNTER/SNORLAX +
GENGAR/GOLBAT for Nightmare, both orientations, chosen before probing).

```
python3 tools/integration/d4aScenarios.py
sh -c 'K=$(ls tools/battle-lab/d4a-*.json | xargs -n1 basename | sed s/.json//); JOBS=8 sh tools/integration/prep14Probes.sh /tmp/d4a/r2 $K; JOBS=8 sh tools/integration/prep22Probes.sh /tmp/d4a/state 2 $K'
python3 tools/integration/prep25LagFrames.py /tmp/d4a/state /tmp/d4a/r2 /tmp/d4a/lag-frames.json "d4a-{mv}-extra-"
```

## Accounting

`docs/animation-integration-live-status.json` `faithfulTimingAdapters` / `faithfulTimingCount` / `faithfulTimingClaim`: a third disjoint
bucket beside `implementedAdapters` (scoped exact) and `faithfulRandomAdapters` (D3). An adapter using both D3 and D4 is listed once, in
faithful timing, with `d3: true`. `tools/integration/remainingAdaptersCensus.mjs` asserts exact + faithful random + faithful timing +
in flight + remaining = 276; `tools/integration/start-local-preview.sh` stamps the three counts separately.
