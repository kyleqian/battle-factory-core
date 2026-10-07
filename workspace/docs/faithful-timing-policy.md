# Faithful-timing policy module (D4a)

Implements the accounting and policy of `docs/faithful-timing.md` (D4, approved 2026-10-07). Module:
`src/engine/liveMoveTimingPolicy.ts`, version `live-move-timing.v1.dominant-measured-phase.tie-no-optional-event`.

## Rule

- Each permitted CPU-phase parameter (kind `optional-lag-age`, `bg-write-row`, `palette-transfer-row`, ...) has its measured
  alternatives, the number of banked measurements per alternative, the chosen phase and the evidence cite.
- **Dominant** = the most frequent phase across ALL banked measurements of that parameter (every source together).
- **Tie rule**: a tie selects the phase WITHOUT the optional event (the source main-loop iteration count + the fixed lags).
- Phase per kind: `optional-lag-age` "event" = the optional lag frame at `age` is present; `bg-write-row` "event" = the LATER of the
  two write rows (`age`, the slower-CPU phase), "no-event" = the earlier row (`age - 1`), so a tie selects the earlier row;
  `palette-transfer-row` "event" = the later transfer row.
- The table is fixed and global: no gameplay state, no RNG, no capture/corpus row, no species. Rendering is pure and replay/reset
  cannot select a different phase, so the version lives in evidence and docs; the session export is unchanged (purely global
  constant, nothing per battle/session to persist; adding a field would only change export bytes).

## Table

| Move | Parameter | Fixed lags | Iterations | Alternatives (rows: measured) | Chosen | Tie rule |
|---|---|---|---:|---|---|---|
| MACH_PUNCH 183 | optional lag at age 91 | 71, 72 | 107 | lag 110: 5, no lag 109: 3 | lag (110 rows) | no |
| NIGHTMARE 171 | optional lag at age 149 | 21, 129, 130 | 164 | lag 168: 5, no lag 167: 3 | lag (168 rows) | no |
| MEGAHORN 224 | optional lag before the LoadDefaultBg row 156 (final restorebg fade one row late) | - | 176 | late 177: 9, early 176: 1 | late (177 rows) | no |
| MEGAHORN 224 | bg-write-row: monbg BGnCNT write row 8 / 7 | - | 176 | row 8: 7, row 7: 3 | row 8 (pixel-neutral) | no (prep24 alone was 3:3) |
| REVENGE 279 | bg-write-row: monbg BGnCNT write row 5 / 4 | - | 145 | row 5: 5, row 4: 1 | row 5 (pixel-neutral) | no |
| METEOR_MASH 309 | optional lag at row 195 (restorebg LoadDefaultBg overrun) | - | 214 | lag 215: 5, no lag 214: 2 | lag (215 rows) | no |

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

## Consumers (D4a)

| Move | Status | Proof |
|---|---|---|
| MACH_PUNCH 183 | **faithful timing** (first body; `liveQ2Moves.ts` `liveMachPunchInputs`, the reducer's `optionalLateLag` input set from the policy, duration `liveMoveTimingBodyRows(183)` = 110) | `tools/integration/fixtures/d4a-live-receipt.json`: 8 dense windows x 2 fresh runs; 5 policy-phase windows 0 px; 3 other-phase windows differ only on ages 92..107 (the restore fade one row later), max 18252 px/row; routes seed 48 streak 7 / 14 (HITMONCHAN) Scene ON/OFF parity |
| NIGHTMARE 171 | policy entry only (chosen 168 rows = the reducer's fixed `NIGHTMARE_FIRST_INACTIVE_AGE`); **no live consumer yet** | the accepted reducer reads caller-owned per-age state that the corpus verifier feeds row by row: hardware palettes (ghost BG palette in BG bank 2 at ages 22..149, the target's palette in BG banks 8/9 from age 40), BG1/BG2 HOFS/VOFS (monbg scroll at 41, the shake toggling every 2 rows 46..120, cleared at 131), the painter order (re-sorted at ages 43/45/124). A production builder needs that per-age host model plus a known lend after Hypnosis + the SLP status units |

| MEGAHORN 224 | **faithful timing** (D4b; any known lend, also after a Tackle; `liveOamMoves.ts` `liveMegahornInputs` = the prep24 source model ported 1:1 in `liveMegahornInputs.ts` + `liveMoveOamAssembler.ts` `liveMegahornHardwareOamRows`; duration `liveMoveTimingBodyRows(224)` = 177 both sides) | `tools/integration/fixtures/d4b-live-receipt.json`: 10 dense windows x 2 fresh; 6 policy-phase windows 0 px; 3 row-7 windows 0 px (the monbg BGnCNT row is not read by the renderer); the early-fade accepted opponent window differs only on ages 158..173, max 17211 px/row; route seed 5 streak 35 (RHYDON) Scene ON/OFF parity; #142 shadow row 0 (elevated GOLBAT target) |
| REVENGE 279 | **faithful timing** (D4b; any known lend: first bodies and after a Tackle; `liveOamMoves.ts` `liveRevengeInputs` = the prep26 source model ported 1:1 in `liveRevengeInputs.ts` + `liveMoveOamAssembler.ts` `liveRevengeHardwareOamRows`; 145 rows both sides) | `tools/integration/fixtures/d4b-live-receipt.json`: 6 dense windows x 2 fresh, all 0 px (5 policy-phase windows + the row-4 accepted opponent window: the target OBJ still covers row 4); ordinary route Scene ON/OFF parity; #142 shadow row 0 (elevated GOLBAT target) |
| METEOR_MASH 309 | **faithful timing, d3** (D4b; Random2 twinkles from the presentation host, plan `LIVE_MOVE_RANDOM2_PLANS[309]`, excluded from the faithful-random list; the reducer's side rule `terminalAge = player target ? 214 : 213` is now the explicit `restoreLagRows` input (absent = the accepted corpora's phases, so the accepted player METANG -> ONIX proof is the L = 0 pin); live config passes the policy L = 1; the renderer branch draws any species pair from the live battler art) | `tools/integration/fixtures/d4b-live-receipt.json`: 5 dense windows x 2 fresh (host pinned to each activation gRng2Value); 3 policy-phase windows 0 px; the 2 no-lag windows differ only on ages 196..211, max 18589 px/row; route seed 15 streak 21 (METAGROSS) with presentation seeds 0x1234abcd / 0xfeed0042: identical gameplay/RNG/facility, Scene OFF parity, same seed -> identical frames |

Megahorn tie-break (D4b): prep24's six windows tie the monbg write row 3:3. Four more windows chosen before probing
(`d4aScenarios.py`: RHYDON -> GOLBAT, NIDOKING -> SNORLAX, both orientations) measured by the prep22 probe (`d4aFixtures.py` reads the
monbg BGnCNT write row from `regEvents`, cross-checked on the six prep24 windows) are all row 8 and late: row 8 in 7 of 10, late in 9 of 10.

Mach Punch trace palette: OBJ bank 9's unfaded contents at a first body are the known-entry healthbar palette
(`live-animation-palette-resources.json` `initial.healthbar`, tag 55044), equal in all 8 Mach Punch and 8 Nightmare D4a/prep25 state probes
(two trainers, any species); the attacker's battler palette is NOT what the trace shows.
