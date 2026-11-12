# Live adapter species audit 5 (S10A side lane, 2026-10-06): the oam1 hardware-OAM first-body adapters (Will-O-Wisp 261, Pursuit 228, Fury Cutter 210)

Method of `docs/live-species-audit-3.md` / `-4.md`: swap the species in a copy of the accepted oam1 lab scenario; window and healthbox HP / gender / attacker personality
come from the swapped scenario's OWN ROM state (prep14Probe `atActivation`, activation frame + accepted offset 0; never live output); production live view vs fresh
direct-mGBA frames; **2 fresh runs, identical digests for every row** (`identical true` in all 90 receipts). Every kept row is a FIRST body (`bodyIndex 0`).
None of the three moves uses a pinned Random2 (the probe `gRng2` is recorded in `derive.txt` only). Evidence: `tools/integration/fixtures/species-audit-5/`
(receipts/, patch-receipts/, patches/, counters/, derived/, scenarios/, derive.txt).

## 1. Results first

90 swapped rows run: **64 exact (0 px), 26 residual**. **No SPECIES-DEFECT found** in the three adapters (anchors, orb/fire/impact/slice origins, palettes).
The 26 residuals = 12 documented idle-rest DECLINES (RATTATA/ONIX, front sprite on either side), 12 shiny DECLINES, **2 LAG FRAMEs** (Pursuit, player-side TYRANITAR).

### Defect table

| Move | Side / species | px before -> after patch | Mechanism | File:line | Fix shape | Patch proof |
|---|---|---|---|---|---|---|
| (none) | - | - | - | - | - | - |

### Non-defect table

| Row(s) | Result | Verdict |
|---|---|---|
| **Pursuit, player-side TYRANITAR** (attacker swap `tyranitarA-pursuit-player-beedrill-opponent-shuckle`; target swap `tyranitar-pursuit-opponent-beedrill-player-shuckle`) | 86/102; ages 84-99 only, 17,798 / 17,283 px per age (field, whole-BG brightness: `6d6c6f<-5d5c5f`, `706f6f<-605f5f`, `535244<-47463a`, bbox x0-239 y0-111) | **LAG FRAME (species-keyed emulator main-loop overrun; not a defect).** Counters (2 fresh runs identical, `counters/tyranitar-pursuit-lag.txt`): the accepted BEEDRILL/SHUCKLE ROM runs have lag frames (main-loop pass delta 0) at ages 60, 61, **82**; the opponent-side TYRANITAR control (exact) also 60, 61, 82; both player-side TYRANITAR runs have only 60, 61 (no age-82 lag) and the swapped body is 1 frame shorter (101 vs 102). ROM-frame-offset test: live(age) == ROM frame `first+age-1` at **0 px for every sampled age 84-99**, offset 0 = 17,798 px (ages 83 and 100 exact either way: static). Note: the live timeline matches the original only because it is lag-schedule dependent (fade step after the age-82 lag); it does not model per-species lag |
| Will-O-Wisp / Pursuit / Fury Cutter, opponent **RATTATA** or **ONIX** TARGET (front sprite, idle rest x2 = 1 / non-zero) | WoW 24/214 (143,936 / 276,664 px); Pursuit 3/103 (1.75 M / 1.67 M); Fury Cutter 11/43 (12,648 / 31,105) | **DECLINE confirmed** (`liveOamMoves.ts:91-92`, `:201-202`, `:294-295`: `target.frontIdleRest.x2/y2 != 0`). With the gates lifted (`patches/lift-idle-rest-gates.diff`, in place, 2 fresh runs identical, reverted) the rows only drop to 68,205 / 186,972 (WoW), 39,311 / 104,631 (Pursuit), 7,380 / 19,638 (Fury Cutter): the inputs do not model the target idle x2/y2, so declining is correct |
| Same three moves, opponent-side **RATTATA / ONIX ATTACKER** (`rattataA-*`, `onixA-*` opponent orientation) | 0 exact rows (WoW 163,388 / 305,626; Pursuit 1.83 M / 1.78 M; Fury Cutter 25,336 / 54,619) | **DECLINE confirmed** (same gate on `attacker.frontIdleRest`). **Over-conservative: with ONLY the gates lifted all six rows are 0 px (213/213, 103/103, 43/43; `patch-receipts/idle-gates-lifted/`)**, so the attacker-side idle-rest decline can be dropped for these three moves (keep the target-side one). Coverage opportunity, not a defect; first-body RATTATA/ONIX attacker only, not checked with a different attacker anchor |
| **Shiny** STEELIX attacker (both sides) and shiny STEELIX target (both sides), all three moves (12 rows) | 0 exact, 78k-1.83 M px (fallback path) | **DECLINE confirmed.** Personalities shiny by `liveBattlerIsShiny` (e.g. 0xc0d0b180 -> 6, 0x5fd62e80 -> 0). Attacker: gate lifted (`patches/lift-shiny-gate.diff`) -> engaged, residual 202,910 / 84,710 / ... (shiny palette missing), proves the gate (not another decline) rejects it. Target: stock harness only carries `attackerPersonality`, so the `shinysteelix-*` target receipts in `receipts/` ran with the target seen as non-shiny (adapter engaged, 190k-407k px). With `patches/harness-target-personality.diff` + `targetPersonality` in the fixture: gate on -> 460k / 487k (WoW), 1.77 M / 1.78 M (Pursuit), 83k / 91k (FC) = decline; gate lifted -> 407k / 380k, 203k / 190k, 85k / 79k (`patch-receipts/shiny-target-*`). FYI: production must always supply the TARGET side's `field.<side>.personality` (the gates read both) |

All other 64 rows are **EXACT twice fresh**: STEELIX, TYRANITAR, PICHU, FLYGON (enemy elevation 7), SHEDINJA (elevation 8, genderless, WoW + Pursuit) targets on both sides; STEELIX, PICHU, FLYGON, TYRANITAR(opponent-side
attacker except the lag rows), ONIX / RATTATA PLAYER-side (back sprite, rest 0) attackers and targets; WAILORD target for Pursuit and Fury Cutter (both sides).

Elevation: GOLBAT 8 (audit 3), SHEDINJA 8, FLYGON 7 (`enemy_mon_elevation.h`); the other swapped species are 0. FLYGON / SHEDINJA exact with the elevation as the opponent target (WoW fire origin = target pic point, Pursuit impact, Fury Cutter slice anchor) and as the opponent attacker (WoW orb origin = static sBattlerCoords). No elevation literal found.

## 2. Coverage (exact twice unless noted)

Generated from `receipts/` (ok = 0 px twice fresh, X = residual; "attacker side player" = the target is the opponent-side front sprite, "attacker side opponent" = the target is the player-side back sprite;
species missing from a line = not staged):

| Move | Swap | Attacker side | Rows |
|---|---|---|---|
| Will-O-Wisp 261 | target | player | flygon ok, onix X (decline), pichu ok, rattata X (decline), shedinja ok, steelix ok, tyranitar ok |
| Will-O-Wisp 261 | target | opponent | flygon, onix, pichu, rattata, shedinja, steelix, tyranitar: all ok |
| Will-O-Wisp 261 | attacker | player | flygon, onix, pichu, rattata, steelix, tyranitar: all ok |
| Will-O-Wisp 261 | attacker | opponent | flygon ok, onix X (decline), pichu ok, rattata X (decline), steelix ok |
| Pursuit 228 | target | player | flygon ok, onix X (decline), pichu ok, rattata X (decline), shedinja ok, steelix ok, tyranitar ok, wailord ok |
| Pursuit 228 | target | opponent | flygon, onix, pichu, rattata, shedinja, steelix, wailord ok; **tyranitar X (LAG FRAME)** |
| Pursuit 228 | attacker | player | flygon, onix, pichu, rattata, steelix ok; **tyranitar X (LAG FRAME)** |
| Pursuit 228 | attacker | opponent | flygon ok, onix X (decline), pichu ok, rattata X (decline), steelix ok |
| Fury Cutter 210 | target | player | flygon ok, onix X (decline), pichu ok, rattata X (decline), steelix ok, tyranitar ok, wailord ok |
| Fury Cutter 210 | target | opponent | flygon, onix, pichu, rattata, steelix, tyranitar, wailord: all ok |
| Fury Cutter 210 | attacker | player | flygon, onix, pichu, rattata, steelix, tyranitar: all ok |
| Fury Cutter 210 | attacker | opponent | flygon ok, onix X (decline), pichu ok, rattata X (decline), steelix ok, tyranitar ok |

(See `derive.txt` and `receipts/<tag>-<fixture>.json`; the row name is `<species>[A]-<oam1 fixture stem>`, `A` = attacker swap.) Shiny: STEELIX target + attacker on both sides, all three moves (decline table above).

**Not staged** (swapped battle never reaches the first body; harness/staging limit, not production): WAILORD as the Will-O-Wisp target (both sides; the swapped battle shows
no body 261, probable Water Veil immunity, not probed); SHEDINJA as the Fury Cutter target (both sides; body missing, 1 HP / Wonder Guard staging, not probed);
TYRANITAR as the opponent-side attacker for Will-O-Wisp and Pursuit; the opponent-side attacker lists above omit it (the swapped mon never acts first, even at 252 speed EV). Not reached: WAILORD / SHEDINJA as attackers,
other elevated species (only FLYGON 7 / SHEDINJA 8 beyond GOLBAT), Unown-class forms, Spinda, alt-pair fixtures (`will-o-wisp-alt*`, `pursuit-alt*`, `fury-cutter-counter1-alt*`)
as the base pair, and the non-normal Pursuit body (`request.turn & 1`) / Fury Cutter counters 2-5, which decline by design.
Staging fix: genderless species (SHEDINJA) need `gender: genderless` (the lab rejects `male`; `--genderless`); a target swap boosts the non-swapped attacker's speed EV to 252 so it stays the first body.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py
W=tools/integration/fixtures/species-audit-5
tools/integration/speciesAudit5Stage.sh                                  # list.tsv listA.tsv listC.tsv listD.tsv + scenarios/
cat $W/list*.tsv > /tmp/s5all.tsv; JOBS=10 tools/integration/speciesAudit5Probes.sh /tmp/s5all.tsv /tmp/s5/probes   # prep14Probe segfaults at exit are harmless (outputs are written)
python3 tools/integration/speciesAudit5Derive.py /tmp/s5all.tsv /tmp/s5/probes $W/derived     # NO-PROBE / BODY-MISSING rows are not staged (see derive.txt)
python3 tools/integration/speciesAudit5ShinyTarget.py /tmp/s5/probes $W/derived               # adds targetPersonality to the shiny target rows
tools/integration/speciesAudit5Dense.sh /tmp/s5/dense 10 '*-will-o-wisp-*'                    # also '*-pursuit-*' '*-fury-cutter-*'; 2 fresh runs per row (~2.5 min / 22 rows at 10 parallel)
tools/integration/speciesAudit5Patch.sh $W/patches/lift-idle-rest-gates.diff /tmp/s5/idle <stem>...   # applies, runs, ALWAYS reverts
# lag: speciesAudit2Counters.py <scenario> out.json (x2), speciesAudit3Lag.py out.json first last, speciesAudit5Run.ts (retain frames) + speciesAudit3LagShift.ts / speciesAudit5Diff.ts
# shiny-target proof: git apply $W/patches/harness-target-personality.diff (then optionally lift-shiny-gate.diff), speciesAuditDense.ts on shinysteelix-*, git apply -R both
```
PAPERCUTS: stock `liveView` ignores the target's personality (shiny target untestable without a harness patch), ~10 min; `date` clock in this sandbox runs fast/odd vs wall time, ~0 min.
