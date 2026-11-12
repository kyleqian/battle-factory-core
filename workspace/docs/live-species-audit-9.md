# Live adapter species audit 9 (S10A side lane, 2026-10-07): D4 faithful-timing adapters Megahorn 224, Revenge 279, Mach Punch 183, Meteor Mash 309

This uses the method of `docs/live-species-audit-6.md`, `-7.md` and `-8.md`: swap the species in the accepted lab scenario, then compare the production live view against fresh direct mGBA. The verifier uses display names.
The D4 recipe is `tools/integration/d4aFixtures.py`. Each swapped scenario's window, measured CPU phase, HP, gender, personality, preceding bodies and the Meteor Mash D3 rng2 come from that scenario's **own** two fresh `prep22Probe.py` runs, which must agree. The check is `d4aTimingCheck.ts`: the policy phase must be 0 px, and the other phase may differ only on the documented `alternatePhaseResidual.ages`.
All runs used direct mGBA only. No shared oracle was touched. Source patches were applied by `issue151Patch.sh` and always reverted, and `git status src` was clean at every commit.
Evidence is in `tools/integration/fixtures/species-audit-9/`: `receipts/` (153 compact `d4aTimingCheck` receipts), `coverage-grid.txt`, `residuals.tsv`, `derive.txt`, `derived/`, `scenarios/`, `list-*.tsv`, `patch-receipts/{mach-punch-idle-rest,gate-lift}/`, `mach-punch-idle-rest-env.diff` and `gate-lift.diff`.
**154 rows were run (153 plus the METAGROSS restage). Every receipt is `identical true` over 2 fresh mGBA runs (0 non-identical).** Results: 99 rows are 0 px, of which 8 were measured in the other phase but are still 0 px. 30 rows are TIMING-PHASE with residuals on the documented rows only. 25 rows have other residuals, classified below.

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| Mach Punch 183 | **opponent-side ATTACKER with an idle x2 rest**: ONIX (`onixA-mach-punch-opponent-*`), RATTATA (`rattataA-…`) | **86,089 -> 0** and **36,222 -> 0** (ages 51..109, policy phase) | `AnimTask_AttackerPunchWithTrace` (`battle_anim_mons.c:2408-2466`) moves the battler's x2 **relative** to its current value, which includes the idle rest (`x2 -= spriteId; x2 += speed`). The trace clones copy that x2, and the task ends with an **absolute** `x2 = 0`. The renderer uses absolute tables without the rest for ages 50..57 and for the traces, then returns the rest again after 57. | `src/animation/machPunch.ts:325-330` (`attackerPunchOffset`), `:412` (trace x2) | Add `attackerSprite.x2` (the tracked rest) to the punch table from age 50 and to every trace x2, and return 0 after age 57. Patch: `mach-punch-idle-rest-env.diff`, using its defaults. Regressions unchanged: all 8 accepted d4a Mach Punch windows (0 px in the policy phase; the 2 other-phase windows keep exactly their receipt px on ages 92..107), plus FLYGON / ONIX player attacker and PICHU opponent attacker at 0 px | **SPECIES-DEFECT, proven 0 px** |
| Mach Punch 183 | **opponent-side TARGET with an idle rest**: ONIX (`onix-mach-punch-player-*`), RATTATA (`rattata-…`, a no-event window) | ONIX **64,369 -> 866**, ages 0..58 at 1,091 px/row -> **age 60 only**. RATTATA 330,716 -> 306,683, which is age 60 (139 px) plus the documented TP rows 92..107 | Before `AnimTask_ShakeMon` sets x2 absolutely, the target keeps its idle rest. `targetShakeAtAge` returns 0 for age < 58 (`machPunch.ts:317-318`). The same patch keeps the rest through age 58. | `src/animation/machPunch.ts:317-323, :347` | Same patch, target branch. **Age 60 is still unexplained**: forcing the target x2 at state age 59, 60 or 61 to any of 0/1/3/4 never clears displayed age 60 (bbox x149-204 y12-71, ONIX colours) | **UNRESOLVED** for the target side (two rows / 1,005 px left). The interim fix is to decline Mach Punch when the **target** has a non-zero tracked rest, as Overheat (`liveBgSnapshotMoves.ts:63`) and Revenge do |

### TIMING-PHASE table
Each row is the other measured phase. The evidence is the swapped scenario's own body length and monbg row from 2 fresh `prep22Probe.py` runs (`derive.txt`, `speciesAudit9` block of each fixture). The residual must lie only on the documented ages.

| Move | Parameter, measured / policy | Rows (`coverage-grid.txt` TP cells) | Residual |
|---|---|---|---|
| Megahorn 224 | optional-lag-age no-event (176 rows) / event | FLYGON target (player attacker); FLYGON and GOLBAT attackers, both sides (5) | ages **158..173 only**, 17,085-17,931 px/row |
| Mach Punch 183 | optional-lag-age no-event (109) / event | 19 rows: target GOLBAT / ONIX / PICHU / RATTATA / STEELIX / WAILORD / WEEZING (opponent attacker), PICHU / STEELIX / TYRANITAR (player attacker); attackers BRELOOM, FLYGON, GOLBAT, PICHU, STEELIX, WAILORD, WEEZING (player side), HITMONLEE, SHEDINJA (opponent side) | ages **92..107 only**, 17,170-19,175 px/row |
| Meteor Mash 309 | optional-lag-age no-event (214) / event | targets FLYGON, TYRANITAR (player attacker), GOLBAT (opponent attacker); attackers SHEDINJA, STEELIX, TYRANITAR (player side) (6) | ages **196..211 only**, 16,867-17,675 px/row |
| Megahorn 224 | bg-write-row no-event (row 7) | GOLBAT target, ONIX and RATTATA attackers (opponent attacker fixture) (3) | **0 px**, as documented (the renderer branch never reads that row) |
| Revenge 279 | bg-write-row no-event (row 4) | ONIX, TYRANITAR, WAILORD, WEEZING targets; TYRANITAR attacker (opponent attacker fixture) (5) | **0 px**, as documented |

Note for the ledger: the documented `alternatePhaseResidual.maxPixelsPerRow` (Mach Punch 18,252, Megahorn 17,211, Meteor Mash 18,589) is per fixture. With swapped species the same fade rows reach **19,175** (Mach Punch PICHU target) and **17,931** (Megahorn GOLBAT attacker), because the px per row is the BG area not covered by the two battlers (same finding as `issue151-diagnosis.md` section 2). The check gates on ages only, so these rows pass. No LAG FRAME (an undocumented CPU phase) was found: every residual on a non-shiny, non-rest row is on the documented ages.

### Non-defect / decline table

| Row(s) | Result | Verdict / evidence |
|---|---|---|
| Revenge 279, **opponent-side attacker** ONIX / RATTATA (`onixA-` / `rattataA-revenge-opponent-*`) | 246,670 / 105,150 px (fallback) | The `liveRevengeInputs` idle-rest gate (`src/engine/liveOamMoves.ts:677`) declines. With `gate-lift.diff` (reverted) the engaged view gives **0 px / 0 px** (`patch-receipts/gate-lift/`). **DECLINE CONFIRMED, and the gate is over-broad for the attacker rest.** Fix shape (coverage, not correctness): gate on the target rest only. The accepted `revenge-player-machamp-opponent-shuckle` stays 0 px under the lift |
| Revenge 279, **opponent-side target** ONIX / RATTATA (`onix-` / `rattata-revenge-player-*`) | 274,449 / 190,485 px (fallback) | Same gate. Lifted, the engaged view is **99,435 / 37,733 px** (50/145 rows exact), so the gate flips engaged vs fallback and is **justified for the target rest**. **DECLINE CONFIRMED** |
| **Shiny STEELIX attacker**, all four moves (8 rows) | 0 exact; 329k-3.97M px | The shiny gates (`liveMoveAnimation.ts:2628` Mach Punch, `:3014` Megahorn, `:3032` Revenge, `:3054` Meteor Mash) see the attacker personality (`attackerPersonality`, shiny under the Factory OT). Lifted (`gate-lift.diff`): Megahorn 3,247,407 -> 326,742; Mach Punch 1,815,244 -> 216,549; Meteor Mash 3,867,267 -> 422,342; Revenge 329,189 -> 266,331. The residual left in the engaged view is the missing shiny palette. **DECLINE CONFIRMED for all four** |
| Shiny STEELIX **target** (7 rows) | 263k-490k px | As in audit 8, the harness feeds only `attackerPersonality`, so the gate never sees a shiny target: the adapter is **engaged** with the normal palette. Gate lift gives an identical result (Megahorn 348,317 -> 348,317). **Target-side decline not confirmed** (harness limit) |
| Mach Punch, SHEDINJA **attacker**, player side (`shedinjaA-mach-punch-player-*`) | 1,739,244 px, every row (fallback magnitude) | The swapped ROM run has a **non-move body (move 0, opponent side, frames 85..113)** before Mach Punch, so `precedingBodies` is non-empty and the `firstBody` gate (`liveMoveAnimation.ts:2627`) applies. This was not probed with a lift, so it is **UNRESOLVED as a label** (expected decline). The fixture's `statusAnimation: "SLP"` guess (d4aFixtures recipe) is unverified for this body |
| Meteor Mash, FLYGON **player-side target**, opponent METANG attacker (`flygon-meteor-mash-opponent-*`, no-event) | 289,856 px: documented rows 196..211 (17,347/row) **plus ages 49..189 at 5-159 px/row** | Twinkling-star pixels (`000842<-ffde8c` / `ffc621`, bbox x14-168 y18-111) differ across the star period. The rng2 seed agrees between the two probe runs, and the GOLBAT target in the same fixture has only TP rows. Not a lag (no residual outside the stars). **UNRESOLVED**: suspected star visibility or priority against the large back sprite, or the D3 words; not probed further |
| Wonder Guard / Ghost immunity: SHEDINJA **target** for all four moves | body missing in the ROM (no animation) | Correct ROM behaviour (Bug Megahorn and Steel Meteor Mash are not super-effective; Fighting does not affect Ghost). Not runnable |
| Megahorn ONIX / RATTATA attackers and targets; Meteor Mash ONIX / RATTATA (player attacker) | 0 px | The idle rest is handled: Megahorn models target rest (`liveOamMoves.ts:615-623`), and the opponent attackers' rest was reset by the preceding Tackle (tracked rest) |

### Coverage grid (`coverage-grid.txt`)
Cell legend: `ok` = 0 px; `TP(16r,max)` = other phase, documented rows only; `X(px,ages)` = see the tables above. The fixtures are the accepted d4a-live pairs in both orientations.

| Move | Target swaps, 0 px (both orientations unless noted) | Attacker swaps, 0 px |
|---|---|---|
| Megahorn 224 (40 rows) | FLYGON (opponent attacker; player: TP), GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA | NIDOKING, RHYDON (legal), ONIX, RATTATA, STEELIX, WAILORD, PICHU (player), SHEDINJA / TYRANITAR / WEEZING (opponent); FLYGON / GOLBAT TP |
| Revenge 279 (44) | FLYGON, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, ONIX / RATTATA (opponent attacker; player: decline) | HITMONLEE, HITMONTOP (legal, player), FLYGON, GOLBAT, WEEZING, SHEDINJA, STEELIX, TYRANITAR, WAILORD, PICHU, ONIX / RATTATA (player; opponent: decline) |
| Mach Punch 183 (45) | FLYGON (both), TYRANITAR (opponent attacker), GOLBAT / WAILORD / WEEZING (player attacker); the rest TP; ONIX / RATTATA player-attacker defect | BRELOOM (opponent), HITMONLEE (player), FLYGON, GOLBAT, PICHU, STEELIX, WAILORD, WEEZING (opponent), ONIX, RATTATA, TYRANITAR (player); ONIX / RATTATA opponent defect |
| Meteor Mash 309 (25) | player attacker: GOLBAT, PICHU, RATTATA, STEELIX, WAILORD, WEEZING (FLYGON / TYRANITAR TP); opponent attacker: GOLBAT TP, FLYGON unresolved | player attacker: **METAGROSS** (legal; genderless restage `list-meteor-mash-metagross.tsv`), FLYGON, GOLBAT, ONIX, PICHU, RATTATA, WAILORD, WEEZING (SHEDINJA / STEELIX / TYRANITAR TP); opponent attacker: STEELIX |

**Not reached** (dropped by the derive step, `derive.txt`):
- Meteor Mash, opponent-attacker orientation: 14 swaps show BODY-MISSING. The swapped run ends after the opponent's Tackle and no Meteor Mash body is recorded.
- Mach Punch: TYRANITAR opponent attacker (no bodies).
- Megahorn: WEEZING / TYRANITAR / SHEDINJA player attackers, PICHU opponent attacker (BODY-MISSING).
- METAGROSS: the first stage failed the probe (gender). The `--genderless` restage ran the player side at 0 px; the opponent side shows BODY-MISSING, like the other opponent-side Meteor Mash swaps.
- HITMONLEE / HITMONTOP (Revenge, opponent side): the probe failed, probably gender validation (both species are male-only).
- SHEDINJA targets for all four moves (immune).
- A target-personality shiny probe (harness limit).

## 2. Reproduce (workspace root; direct mGBA only; run the stage script with bash)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-9
bash tools/integration/speciesAudit9Stage.sh                               # list-<move>.tsv + scenarios/
JOBS=12 sh tools/integration/speciesAudit9Probes.sh /tmp/s9/probes $W/list-*.tsv            # 2 fresh prep22Probe runs per swapped scenario (~2.5 min)
python3 tools/integration/speciesAudit9Fixtures.py /tmp/s9/probes $W/derived $W/list-*.tsv > $W/derive.txt
sh tools/integration/speciesAudit9Run.sh /tmp/s9/receipts 12 '*-megahorn-*'        # d4aTimingCheck per row, receipts -> the given dir (~1 min per move)
sh tools/integration/speciesAudit9Run.sh /tmp/s9/receipts 12 '*-revenge-*' '*-mach-punch-*' '*-meteor-mash-*'
python3 tools/integration/speciesAudit9Summary.py /tmp/s9/receipts > grid.txt 2> residuals.tsv
D=$W/derived; A=tools/integration/fixtures/d4a-live
sh tools/integration/issue151Patch.sh $PWD/$W/mach-punch-idle-rest-env.diff /tmp/s9/p-mp -:$D/onixA-mach-punch-opponent-hitmonchan-player-chansey.json \
  -:$D/rattataA-mach-punch-opponent-hitmonchan-player-chansey.json -:$D/onix-mach-punch-player-hitmonchan-opponent-chansey.json -:$A/mach-punch-player-hitmonchan-opponent-chansey.json
sh tools/integration/issue151Patch.sh $PWD/$W/gate-lift.diff /tmp/s9/p-gl -:$D/onixA-revenge-opponent-qwilfish-player-shuckle.json -:$D/shinysteelixA-megahorn-player-seaking-opponent-onix.json
```
The full job lists are in `patch-receipts/*/` (one directory per row; the receipt `fixture` field). The env knobs of `mach-punch-idle-rest-env.diff` are `S9_MP_END_REST`, `S9_MP_TRACE_REST`, `S9_MP_BATTLER_FROM` and `S9_MP_TAGE` / `S9_MP_T60`. Their defaults are the proven fix; pass **one** variable per job, because zsh does not word-split `"A=1 B=2"`.
