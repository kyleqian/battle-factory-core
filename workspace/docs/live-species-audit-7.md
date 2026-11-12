# Live adapter species audit 7 (S10A side lane, 2026-10-07): Return 216, Sheer Cold 329, Hyper Voice 304, Smog 123, Sand Tomb 328, Sky Attack 143 charge, Will-O-Wisp 261 later bodies

Method of `docs/live-species-audit-6.md` (swap species in the accepted lab scenario; window / HP / personality from the swapped scenario's OWN ROM probe; production live view vs fresh direct mGBA; display names in the verifier).
Reuses `speciesAudit5Probes.sh`, `speciesAudit6Stage.py`, `speciesAudit6Derive.py`, `speciesAuditDense.ts`; new: `speciesAudit7Stage.sh`, `speciesAudit7Run.sh <receiptDir> <parallel> <glob>...`, `speciesAudit7Summary.py`.
Evidence: `tools/integration/fixtures/species-audit-7/` (`receipts/` 204 compact receipts, `residuals.tsv`, `coverage-grid.txt`, `derive.txt`, `derived/`, `patch-receipts/`, `*.diff`).
**204 rows run, every receipt `identical true` over 2 fresh mGBA runs (0 non-identical); 162 exact (0 px), 42 residual.** Swaps that changed the turn order (24) or lost the body (BODY-MISSING: Sheer Cold target swaps with FLYGON/GOLBAT/TYRANITAR/PICHU/WAILORD/ONIX/SHEDINJA as opposing-side where the swapped mon moved first, Return/Sand Tomb SHEDINJA/TYRANITAR cases) were dropped, not run.
**Time-boxed (55 min cap, shared host load): the root-cause work below is incomplete; every unproven item is UNRESOLVED, not asserted. No SPECIES-DEFECT was proven to 0 px by a patch in this session.**

## 1. Results first

### Defect table (none proven; candidates carry mechanism evidence and are classed UNRESOLVED-DEFECT-CANDIDATE)

| Move | Side / species | px (2 fresh runs) | Evidence | Status |
|---|---|---|---|---|
| Sheer Cold 329 | target RATTATA (opp `rattata-sheer-cold-player-dewgong-opponent-chansey`; 0/191) and attacker RATTATA (opp `rattataA-...`; 0/190) | 78,310 / 77,900 = **410 px/row constant from age 0** | 410 px/row = the 1-px column of RATTATA's idle x2 (same signature as audit-6 Signal Beam RATTATA before fix #150). The adapter is engaged (a decline would be 100k+ px/row fallback, cf. Curse 226k). `liveSheerColdInputs` (`src/engine/liveProfileMoves.ts:174`) already adds `frontIdleRest` to the BG scroll / target centre. Patch attempt `sheer-cold-target-rest-dropped.diff` (drop the rest from `tx,ty`) -> **78,310 / 77,900 px, unchanged** (receipts `patch-receipts/`), so that input is not the cause; the live view must apply the rest x2 elsewhere (battler draw / hidden-sprite compose) | **UNRESOLVED** (not proven; reverted, `git status src` clean). `liveQ2Moves.ts:112,139` already models target rest for the Q2 moves |
| Sheer Cold 329 | ONIX target (`onix-...player-dewgong-opponent-chansey`, 0/191) and attacker (`onixA-...opponent-...`, 0/190) | 208,381 / 481,962 = **1,091 px/row constant from age 0** | Same pattern with ONIX (idle rest 1) | UNRESOLVED (same cause as RATTATA presumed, unprobed) |
| Sky Attack 143 charge | opponent-side target RATTATA (`rattata-sky-attack-player-fearow-opponent-shuckle-charge`, 20/148, 52,119 px; first bad row age 1, 49 px, then 410/row) ; attacker RATTATA (`rattataA-sky-attack-opponent-...`, 108/148, 16,400 px, rows age 45 and 109-147, 410/row) | as listed | Residual only on the rows where the rested sprite is drawn by the base view; matches the Signal Beam "shake task / hidden sprite drops x2" family | UNRESOLVED |
| Sand Tomb 328 | attacker RATTATA (`rattataA-sand-tomb-opponent-dugtrio-player-onix`, 0/123) | 50,430 = 410 px/row from age 0 | like Sheer Cold RATTATA | UNRESOLVED |
| Sheer Cold 329 | **elevated opponent target** FLYGON / GOLBAT (`flygon-`/`golbat-sheer-cold-player-dewgong-opponent-chansey`, 190/191) | **200 px, age 0 only (field)**; every other row exact | This is the known #142 elevated-opponent age-0 shadow gap: Return renders it (`return-live-adapter-receipt.json`: "RETURN renderer age-0 enemy shadow for an elevated opponent target", Return FLYGON/GOLBAT targets here are 0 px) and Sheer Cold has no such row. Same 200 px signature as the Return fix | **Defect (strong, one-row)**; fix shape: add the age-0 enemy shadow row to the Sheer Cold renderer, as Return; **not patch-proven here** (UNRESOLVED until the 0 px patch) |
| Sheer Cold 329 | **elevated opponent ATTACKER** FLYGON / GOLBAT (`flygonA-`/`golbatA-sheer-cold-opponent-dewgong-player-chansey`, 173/190) | 275,592 / 284,776 px: age 0 = 200 px (same shadow) + **ages 173-189 ~17.2k / 17.8k px per row** | Two separate gaps: (a) age-0 shadow as above; (b) the final 17 rows (173-189): PICHU attacker shows the same rows (18.6k px, ages 173-189, both orientations: 297,760 / 292,288 px), so it is **not elevation-specific**: any swapped attacker (not the ROM DEWGONG) leaves a large block in the tail, i.e. the cube-melt / attacker return tail uses an attacker-size-dependent region (or a DEWGONG-keyed constant). Not probed further | (b) UNRESOLVED; broad: Sheer Cold attacker swaps FLYGON/GOLBAT/PICHU/TYRANITAR(?) all residual (see residuals.tsv), STEELIX / WAILORD exact |
| Hyper Voice 304 | attacker FLYGON / GOLBAT (229 px, field), PICHU (3,818-3,840), RATTATA (3,818-3,840) | **single row (age 59), both orientations for PICHU/RATTATA** | Single-frame residual: LAG FRAME candidate (neighbouring rows 0 px) but **no counter probe was run -> UNRESOLVED**, not labeled LAG FRAME. Size-dependent magnitude (small attackers 3.8k, bird 229) points at the attacker sprite at the ring-start frame | UNRESOLVED |

### Non-defect / decline table

| Row(s) | Result | Verdict |
|---|---|---|
| Shiny STEELIX attacker, every adapter (Return 4 fixtures, Sheer Cold, Hyper Voice, Smog, Sky Attack, Wisp 4: 15 rows) | 0 exact, 503k-5.1M px | **decline (fallback) observed** (huge px = fallback view); the gate lift probe was NOT run this session (not confirmed by gate-lift) |
| Shiny STEELIX TARGET (`shinysteelixT-*`: Return 4, Sheer Cold 2) | 0 exact, 350k-556k px | decline observed, gate-lift not run |
| Return 216, every swap in the grid (8 species, both orientations, accepted + alt fixtures) | **57/57 non-shiny rows exact**: FLYGON, GOLBAT, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX as attacker and target, both orientations | exact (highest weight: no Return defect found); RATTATA / ONIX handled by the hardware-OAM provider's `targetIdle` / `attackerIdleY2` |
| Smog 123: 22/24 exact (FLYGON/GOLBAT/PICHU/RATTATA/STEELIX/WAILORD both swap roles); Sand Tomb 328: 17/18; Sky Attack 143: 22/26 (non-shiny failures only RATTATA); Hyper Voice 304: 18/26; Wisp later bodies 261: 16/20 (non-shiny all exact: FLYGON, GOLBAT, RATTATA, STEELIX attackers, o/p tackle/psychic) | | exact apart from the table above |
| Sheer Cold 329 STEELIX / WAILORD / PICHU target and STEELIX / WAILORD attacker | exact | non-elevated tall and small mons are fine |

Per move (rows/exact): return 65/57, hyper-voice 26/18, sheer-cold 25/10, sky-attack 26/22, smog 24/22, sand-tomb 18/17, wisp 20/16 (every non-exact Return/Wisp/Smog row is a shiny decline).

### Coverage
Every row in `receipts/` (stem `<species>[A|T]-<fixture>`: `A` = attacker swap, `T` = shiny target swap, no letter = target swap). Species: FLYGON, GOLBAT, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX (+ SHEDINJA staged, every row dropped: reordered / body missing), shiny STEELIX. Both orientations (the `-opponent-`/`-player-` stem). `coverage-grid.txt` lists residual rows.
**Not reached**: SHEDINJA (all rows dropped), Hyper Voice / Smog / Sand Tomb / Sky Attack ONIX and TYRANITAR swaps (not staged), Sheer Cold target swaps whose swapped mon moves first (dropped: FLYGON/GOLBAT/TYRANITAR/PICHU/WAILORD opposing-side), second Return/Sheer Cold fixtures of other pairings, a gate-lift proof for shiny, every patch proof other than the one negative result above, any LAG FRAME / ARTIFACT counter probe.

## 2. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-7
tools/integration/speciesAudit7Stage.sh                                    # list*.tsv + scenarios/
cat $W/list*.tsv > /tmp/s7all.tsv; JOBS=10 tools/integration/speciesAudit5Probes.sh /tmp/s7all.tsv /tmp/s7/probes
python3 tools/integration/speciesAudit6Derive.py /tmp/s7all.tsv /tmp/s7/probes $W/derived > $W/derive.txt   # delete REORDERED rows' fixtures
tools/integration/speciesAudit7Run.sh /tmp/s7/receipts 12 '*'              # 2 fresh runs per row (~25 min under load; use globs, tool timeouts <= 600 s)
python3 tools/integration/speciesAudit7Summary.py /tmp/s7/receipts
```
PAPERCUTS: no `timeout(1)` on this macOS (a wrapped xargs run silently did nothing for 8 min), ~8 min; a backgrounded foreground run is killed at 10 min and leaves half-written receipts (11 had to be rerun), ~6 min; `prep14Probe.py` segfaults at exit under parallel load but still writes the probe, ~2 min; the `Summary.py` from audit 6 is copied unchanged.
