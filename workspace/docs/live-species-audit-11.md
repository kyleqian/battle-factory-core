# Live adapter species audit 11 (S10A side lane, 2026-10-07): Dive 291 setup, Extreme Speed 245, Ice Ball 301 counter 0, Memento 262

This audit uses the method of `docs/live-species-audit-10.md` and `-9.md`. Each row swaps the species in an accepted s10a-live scenario, then compares the production live view against fresh direct mGBA. The verifier uses display names.
The window, HP, gender, personality, status, preceding bodies, the activation gRng2Value (D3 presentation words; Dive `messageLines` pinned to the s10a-live `["", ""]`, Ice Ball `requestFields` `{turn 0, power 30, rolloutCounter 1}`) and the measured optional-lag phase all come from the swapped scenario's **own** two fresh `prep22Probe.py` runs, and those runs must agree (`speciesAudit11Fixtures.py`). The check is `d4aTimingCheck.ts` (via `speciesAudit9Run.sh`).
Skill Swap 285 and Flatter 260 were **not on master** at the start (no `sf-live-receipt.json`; master 9e4eecfe6), so they are not audited.
All runs used direct mGBA only. No shared oracle was touched. Source patches were applied by `issue151Patch.sh` and always reverted, and `git status src` was clean at every commit.
Evidence is in `tools/integration/fixtures/species-audit-11/`: `receipts/` (176 compact receipts), `run.log`, `coverage-grid.txt`, `residuals.tsv`, `derive.txt`, `derived/`, `derived-measured/` + `receipts-measured/`, `scenarios/`, `list-*.tsv`, `counters.txt`, `patch-receipts/{p-dive,p-dive2,p-dive3,p-row68,gate-lift}/` (each with `summary.txt`), and the patches `dive-setup-length.diff`, `dive-setup-length-words.diff`, `dive-setup-length-words-row68.diff` (the full fix) `dive-row68-source-env.diff` (the phase probe) and `gate-lift-env.diff`.

**176 rows. Every receipt is `identical true` over 2 fresh mGBA runs (0 non-identical).**
- 139 rows are 0 px.
- 14 rows are a SPECIES-DEFECT (Dive setup length). 12 are proven 0 px by a reverted patch. TYRANITAR is reduced from 25,738 px to 9 px; the 9 px left are UNRESOLVED. CLAMPERL is also a LAG FRAME, see below.
- 3 rows are a LAG FRAME, backed by counters: Extreme Speed ×2 and the CLAMPERL Dive opponent row.
- 1 row is TIMING-PHASE, backed by a row-68 phase fit: Dive with a TYRANITAR target and a player attacker.
- 16 rows are declines, **all confirmed by a gate lift** (`gate-lift-env.diff`, `S11_LIFT=1`): shiny ×8, idle rest ×8.
- 5 rows are UNRESOLVED. They are all TYRANITAR rows with small residuals (Dive 4 px, Ice Ball 16 / 63 px, Memento 2,537 px, and the 9 px left after the Dive patch). These counts overlap with the defect rows.

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| Dive 291 (setup) | **ATTACKER swaps**, opponent side: CLOYSTER, POLITOED, SUICUNE, SHEDINJA, WEEZING, STEELIX, ONIX (113 rows); FLYGON, GOLBAT (112 rows) | CLOYSTER 24,351 -> **0**; POLITOED 23,215 -> **0**; SUICUNE 23,849 -> **0**; SHEDINJA 24,429 -> **0**; WEEZING 23,927 -> **0**; STEELIX 25,074 -> **0**; ONIX 23,318 -> **0**; FLYGON 26,995 -> **0**; GOLBAT 26,955 -> **0**. TYRANITAR 25,738 -> 9 (the 9 px on ages 63..64 are UNRESOLVED, see below) | The ROM setup length depends on the attacker species. AnimDiveBall starts at the attacker's Y_PIC_OFFSET y and runs 13 delay callbacks. It then rises (`v += 336; y2 -= v >> 8`) until `y + y2 <= -32`, pauses 22 hidden callbacks, and falls at its final speed until `y2 >= 0`. The splash is born 1 row later and the body ends 50 rows after that. The rule reproduces all 18 measured attacker species on both sides. Opponent: y 50..64 -> 115 rows, y 36..46 -> 113, y 34..35 -> 112. Player: y 88..99 -> 118, y 100..104 -> 119. Production hard-codes 117 / 114 first inactive. **Three** places depend on it: (1) the body length, (2) the droplets' Random2 draw age (the setup plan draws at a fixed age 67 / 64, so a shorter or longer ball flight shifts the words: rows that share an activation gRng2Value fail only when their length differs), and (3) the player row-68 reused-affine rule (it sits at the splash birth + 1, not at absolute age 68) | `src/engine/liveMoveAnimation.ts:136` (`liveDiveSetupFirstInactive` constant), `:866` (duration), `:3414` (profile); `src/engine/liveMovePresentationRng.ts:82` (`LIVE_DIVE_RANDOM2_PLANS.setup` ageOffset 67 / 64); `src/engine/battleScene.ts:40131` (`diveState.age === 68 ? 66`) | Derive the first inactive age from the ball rule and the attacker's `picOffsetPoint.y`, defined only with the displayed field (the Water Spout / Shock Wave precedent). Key the setup Random2 plan on the same splash birth (`firstInactive - 50`), which production's activation tick must get from the field. Place the reused-affine source at `firstInactive - 49` (source age - 2). Patch: `dive-setup-length-words-row68.diff` (v2 = length + words for the opponent rows; v3 adds the row-68 rule). **Regressions unchanged:** accepted CHINCHOU <-> ONIX both sides, LANTURN -> GOLEM both sides, CHINCHOU -> GOLEM (prep11) / SHUCKLE / GOLEM (opponent) are 0 px. The documented no-event windows CHINCHOU -> GOLBAT / GOLEM keep exactly their documented 284 px on row 68. LUVDISC / FLYGON / STEELIX swaps stay 0 px | **SPECIES-DEFECT, proven 0 px** (12 rows) |
| Dive 291 (setup) | **ATTACKER swaps**, player side: CLAMPERL, RATTATA, WAILORD (y 101 / 101 / 104 -> 119 rows) | CLAMPERL 23,197 -> **0**; RATTATA 22,013 -> **0**; WAILORD 21,999 -> **0** (v3). The length + words patch alone (v2) leaves 1,240 / 1,240 / 1,226 px on ages 68 + 69, which is the row-68 rule at the wrong age | Same mechanism. These are the three 119-row windows | the three sites above | the same patch (v3) | **SPECIES-DEFECT, proven 0 px** |

`p-dive/` (v1, length only) shows that the duration violation goes away but about 7–16k px stay on the splash / droplet ages. That localises the second input, the Random2 draw age. `p-dive2/` is v2 and `p-dive3/` is v3.

### TIMING-PHASE table

| Move | Row | Parameter, measured / policy | Counter / phase evidence | Residual |
|---|---|---|---|---|
| Dive 291 | TYRANITAR target, CHINCHOU player attacker (`tyranitar-dive-player-chinchou-opponent-onix`) | oam-transfer-row **no-event** / event | This is the row-68 pixel fit that `s10aDiveFixtures.py` ROW68_SOURCE was measured with. Under `dive-row68-source-env.diff` (`S11_ROW68=0`, live row 68 from source 67) the window is **0 px**. Under the policy source 66 it is 284 px. Controls: the accepted event window and FLYGON go 0 -> 284 under the flip, and the documented no-event CHINCHOU -> GOLBAT goes 284 -> 0. The lag counter does not separate this phase: every player window, event or no-event, lags at age 67 (`counters.txt`) | age **68 only**, 284 px (= the documented `maxPixelsPerRow`). Relabelled fixture `derived-measured/` -> `receipts-measured/`: `violations []` |

### LAG FRAME (a CPU phase NOT in the policy: new D4 cases)

| Move | Rows | Counter evidence (`counters.txt`, `issue151Counters.sh`, 2 fresh runs, identical digests) | Residual |
|---|---|---|---|
| **Extreme Speed 245** (scoped exact, no policy entry; production duration constant 321, `liveMoveAnimation.ts:675` `case 245: return 321`) | TYRANITAR target and ARCANINE attacker (legal), both with SMEARGLE -> GOLEM player-attacker fixtures; both own bodies are **320 rows** | 320-row windows lag at ages **[312, 313]**. Every 321-row control lags at **[292, 313, 314]**: the FLYGON target swap, the accepted SMEARGLE -> GOLEM and the accepted ARCANINE -> DUGTRIO. The accepted windows measured an optional lag at age 292 that these windows do not have | ages **294..309 only** (16 rows: the closing fade one row early), 273,504 / 272,816 px (max 17,094 px/row). New D4 case: optional-lag-age 292, event 321 rows (accepted) / no-event 320 |
| **Dive 291** (opponent setup; the policy has only the player row-68 parameter) | CLAMPERL opponent attacker after a Tackle (`clamperlA-dive-opponent-chinchou-player-onix`, A = 187, 115 rows) | a lag at **age 64** (the splash birth = the droplets' Random2 draw age). The opponent controls have no lag: the accepted CHINCHOU after a Tackle, CHINCHOU -> GOLEM, and LUVDISC with the same 115-row length | ages **66..95 only** (the splash / droplet lifetime), 16,525 px. The species patch does not change it (16,525 under v1 / v2). New D4 case: Dive opponent setup optional lag at the splash birth |

### Non-defect / decline table
These rows are the production fallback: the residual covers the whole window. `gate-lift-env.diff` (`S11_LIFT=1`, reverted) removes the shiny gates of all four adapters and the idle-rest gates of Extreme Speed and Ice Ball. Receipts are in `patch-receipts/gate-lift/` and `summary.txt`. Controls under the lift: the accepted Extreme Speed SMEARGLE -> GOLEM player and Ice Ball SPHEAL -> REGISTEEL player are 0 px. Read each cell as fallback px -> engaged (lifted) px.

| Row(s) | Fallback -> lifted px | Gate | Verdict |
|---|---|---|---|
| Shiny STEELIX attacker, all four moves, both sides (8 rows) | Dive 393,042 -> 38,823 (player) / 273,827 -> 46,744 (opponent; the lifted duration is also off, 115 vs 113: the STEELIX length defect); Extreme Speed 5,631,954 -> 374,595 / 5,716,008 -> 402,021; Ice Ball 166,912 -> 140,298 / 170,955 -> 148,331; Memento 569,685 -> 326,742 / 426,209 -> 346,720 | shiny gates: Dive `liveMoveAnimation.ts:3397`, Extreme Speed `:2084`, Ice Ball `:3423`, Memento `:2074` (all test both field personalities) | **DECLINE CONFIRMED** (the engaged view is not exact) |
| Extreme Speed idle rest: ONIX / RATTATA as opponent attacker; ONIX / RATTATA as opponent target (4 rows) | 5,603,374 -> 224,080 / 5,711,211 -> 84,047; 5,420,429 -> 747,769 / 5,699,527 -> 694,830 (these two are also the 320-row lag phase) | `liveMoveAnimation.ts:2086` (attacker or target rest), documented in scope ("no rest window was measured") | **DECLINE CONFIRMED** (the engaged view is not exact) |
| Ice Ball idle rest: ONIX / RATTATA as opponent attacker; ONIX / RATTATA as opponent target (4 rows) | 105,250 -> 82,621 / 53,800 -> 31,108; 68,833 -> 57,738 / 34,464 -> 21,650 | `src/engine/liveIceBallInputs.ts:142` (scope: "zero idle rests") | **DECLINE CONFIRMED** (the engaged view is not exact) |
| Immune targets: Extreme Speed SHEDINJA (Ghost); Ice Ball SHEDINJA (Wonder Guard) | no ROM body | correct ROM behaviour; not staged | — |

Dive and Memento handle idle rests. RATTATA as the Dive opponent attacker, and ONIX / RATTATA as the Memento opponent attacker, are 0 px. ONIX as the Dive opponent attacker is a length defect and is 0 px under the patch.

### UNRESOLVED (a counter probe ran but found no explaining lag; label only)
All of these involve TYRANITAR. Its Sand Stream sets a sandstorm at battle entry, so a pre-body weather animation is a candidate cause. It is unprobed.

| Row | Residual | Probe |
|---|---|---|
| Dive, TYRANITAR target, CHINCHOU opponent attacker | 4 px, age 65 | no lag (`counters.txt`) |
| Dive, TYRANITAR opponent attacker (after the species patch) | 9 px, ages 63..64 | no lag |
| Ice Ball, TYRANITAR target (SPHEAL player attacker) | 16 px, age 39 (next to the policy optional-lag age 38) | no lag; length 76 (no-event, as policy) |
| Ice Ball, TYRANITAR player attacker (REGISTEEL target) | 63 px, ages 40..43 | no lag; length 76 |
| Memento, TYRANITAR target (WEEZING player attacker) | 2,537 px, age 140 only | lags [72, 73, 170, 171] = the accepted WEEZING -> ONIX; length 178 = the live duration |

## 2. Coverage (`coverage-grid.txt`)
Accepted pairs, both orientations: Dive CHINCHOU <-> ONIX, Extreme Speed SMEARGLE <-> GOLEM (the ARCANINE <-> DUGTRIO scenarios stage set IDs, not parties, so `speciesAudit6Stage.py` cannot swap them), Ice Ball SPHEAL <-> REGISTEEL, Memento WEEZING <-> ONIX. "ok" = 0 px.

| Move | Target swaps | Attacker swaps |
|---|---|---|
| Dive 291 (52) | FLYGON, SHEDINJA, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU, RATTATA: ok in both orientations. TYRANITAR: TP (player attacker), UNRESOLVED 4 px (opponent attacker) | legal LUVDISC, SEEL, plus PICHU, RATTATA, WAILORD: ok (opponent). Legal CLOYSTER, POLITOED, SUICUNE, LUVDISC, SEEL, plus FLYGON, GOLBAT, SHEDINJA, WEEZING, STEELIX, TYRANITAR, ONIX, PICHU: ok (player). **Defect, 0 px under the patch**: CLOYSTER, POLITOED, SUICUNE, FLYGON, GOLBAT, SHEDINJA, WEEZING, STEELIX, ONIX (opponent); CLAMPERL, RATTATA, WAILORD (player). TYRANITAR (opponent): defect plus 9 px unresolved. CLAMPERL (opponent): LAG FRAME. Shiny: decline (confirmed) |
| Extreme Speed 245 (42) | FLYGON, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU: ok in both. ONIX / RATTATA: ok (opponent attacker); decline (player attacker: opponent-side rest). TYRANITAR: ok (opponent attacker); LAG FRAME (player attacker) | legal ARCANINE: ok (opponent); LAG FRAME (player). FLYGON, GOLBAT, SHEDINJA, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU: ok in both. ONIX / RATTATA: ok (player); decline (opponent). Shiny: decline (confirmed) |
| Ice Ball 301 (44) | FLYGON, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU: ok in both. ONIX / RATTATA: ok (opponent attacker); decline (player attacker). TYRANITAR: ok (opponent attacker); UNRESOLVED 16 px (player attacker) | legal SEALEO, DELIBIRD, plus FLYGON, GOLBAT, SHEDINJA, WEEZING, STEELIX, WAILORD, PICHU: ok in both. TYRANITAR: ok (opponent); UNRESOLVED 63 px (player). ONIX / RATTATA: ok (player); decline (opponent). Shiny: decline (confirmed) |
| Memento 262 (38) | FLYGON, SHEDINJA, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU, RATTATA: ok in both. TYRANITAR: ok (opponent attacker); UNRESOLVED 2,537 px (player attacker) | (WEEZING is the only legal Factory user) FLYGON, GOLBAT, SHEDINJA, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX: ok in both. Shiny: decline (confirmed) |

Every Ice Ball row measured counter 0 at 76 rows, the policy no-event phase. No 77-row window appeared, so the Ice Ball other phase was not exercised. The Memento lengths (176..178) all matched the live reducer's shadow-geometry duration.

**Not reached:**
- Skill Swap 285 and Flatter 260 (not merged).
- A target-personality shiny probe (harness limit, as in audit 10).
- The mechanism of the TYRANITAR rows (the weather intro is the hypothesis).
- Extreme Speed swaps on the ARCANINE <-> DUGTRIO pair (set-ID scenarios).
- Dive legal users SEEL / LUVDISC on the player side are ok, but legal CLAMPERL's opponent-side lag row was not re-staged without the preceding Tackle.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-11
bash tools/integration/speciesAudit11Stage.sh                                   # list-<move>.tsv + scenarios/ (genderless fix for SHEDINJA / SUICUNE)
JOBS=14 sh tools/integration/speciesAudit9Probes.sh /tmp/s11/probes $W/list-*.tsv   # 2 fresh prep22Probe runs per swapped scenario (~3 min)
python3 tools/integration/speciesAudit11Fixtures.py /tmp/s11/probes $W/derived $W/list-*.tsv > $W/derive.txt
sh tools/integration/speciesAudit11Run.sh /tmp/s11/receipts 14 '*-dive-*'          # receipts -> the given dir (~1.5 min)
sh tools/integration/speciesAudit11Run.sh /tmp/s11/receipts 14 '*-extreme-speed-*' '*-ice-ball-*' '*-memento-*'   # (~4 min)
python3 tools/integration/speciesAudit10Summary.py /tmp/s11/receipts > grid.txt 2> residuals.tsv
D=$W/derived   # patch proof (one job per stem per receipt dir); zsh: build the job list in J and pass ${=J}
sh tools/integration/issue151Patch.sh $PWD/$W/dive-setup-length-words-row68.diff /tmp/s11/p-dive3 -:$D/clamperlA-dive-player-chinchou-opponent-onix.json \
  -:$D/golbatA-dive-opponent-chinchou-player-onix.json -:tools/integration/fixtures/s10a-live/dive-player-chinchou-opponent-onix.json   # full job lists: patch-receipts/*/summary.txt
sh tools/integration/issue151Patch.sh $PWD/$W/dive-row68-source-env.diff /tmp/s11/p-row68 S11_ROW68=0:$D/tyranitar-dive-player-chinchou-opponent-onix.json
sh tools/integration/issue151Counters.sh /tmp/s11/counters 14 $D/tyranitar-extreme-speed-alt-player-smeargle-golem.json \
  tools/integration/fixtures/s10a-live/extreme-speed-alt-player-smeargle-golem.json          # full list: counters.txt
sh tools/integration/issue151Patch.sh $PWD/$W/gate-lift-env.diff /tmp/s11/p-lift S11_LIFT=1:$D/shinysteelixA-memento-player-weezing-opponent-onix.json   # full list: patch-receipts/gate-lift/summary.txt
DERIVED=$W/derived-measured sh tools/integration/speciesAudit11Run.sh /tmp/s11/measured 1 'tyranitar-dive-player-*'
```
