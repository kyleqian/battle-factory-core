# Live adapter species audit 10 (S10A side lane, 2026-10-07): Shock Wave 351, Superpower 276, Psywave 149, Extrasensory 326, Nightmare 171, Spit Up 255

This audit uses the method of `docs/live-species-audit-9.md`. Each row swaps the species in an accepted lab scenario, then compares the production live view against fresh direct mGBA. The verifier uses display names.
The window, HP, gender, personality, status, preceding bodies and the measured optional-lag phase all come from the swapped scenario's **own** two fresh `prep22Probe.py` runs, and those runs must agree (`speciesAudit10Fixtures.py`).
The check is `d4aTimingCheck.ts` (via `speciesAudit9Run.sh`). In the policy phase it requires 0 px and the full duration. In the other phase it allows residuals only on the documented `alternatePhaseResidual` ages. Shock Wave and Spit Up have no CPU phase, so every row must be 0 px.
All runs used direct mGBA only. No shared oracle was touched. Source patches were applied by `issue151Patch.sh` and always reverted, and `git status src` was clean at every commit.
Evidence is in `tools/integration/fixtures/species-audit-10/`: `receipts/` (208 compact receipts), `coverage-grid.txt`, `residuals.tsv`, `derive.txt`, `derived/`, `scenarios/`, `list-*.tsv`, `patch-receipts/{gate-lift,extrasensory-clone-rest}/`, `gate-lift-env.diff` and `extrasensory-clone-rest-env.diff`.

**208 rows. Every receipt is `identical true` over 2 fresh mGBA runs (0 non-identical).**
- 156 rows are 0 px.
- 14 rows are TIMING-PHASE, with residuals only on the documented ages.
- 30 rows are declines, all confirmed by a gate lift.
- 2 rows are SPECIES-DEFECT, proven by a patch.
- 6 rows are UNRESOLVED.

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| Extrasensory 326 | **opponent-side ATTACKER with an idle x2 rest**: RATTATA (`rattataA-extrasensory-opponent-*`), ONIX (`onixA-…`) | RATTATA **8,009 -> 0** (ages 95..119; the residual per row is a symmetric 49 -> 595 -> 49 grow/shrink profile). ONIX **310,307 -> 293,216**, which is exactly the documented TP ages 143..158 (this window measured the lag "event" phase). Env-off control (`S10_XS_REST=0`): 8,009, the same as production | `AnimTask_TransparentCloneGrowAndShrink(ANIM_ATTACKER)` clones the attacker with `CloneBattlerSpriteWithBlend`, a full sprite-struct copy that includes `x2` = the idle rest. The live clone OAM rows are built from `attacker.spriteCenter` without the rest, so the clone is drawn 1 px off for its whole grow/shrink life. The battler itself is correct: `battlerObject` carries the rest. The adapter only gates on the **target** rest | `src/engine/liveOamMoves.ts:850` (`attackerPosition: attacker.spriteCenter`) and `:847` (the cache key has no rest) | Pass `spriteCenter + frontIdleRest` as `attackerPosition` and add the rest to the cache key (`extrasensory-clone-rest-env.diff`, using its defaults). Regressions unchanged: accepted NUZLEAF -> SHUCKLE in both orientations (0 px), alt ESPEON -> CROBAT opponent (0 px), alt ESPEON -> CROBAT player (306,721 px, equal to its receipt), FLYGON opponent attacker (0 px), ONIX player attacker (293,586 px, unchanged) | **SPECIES-DEFECT, proven 0 px** (the RATTATA no-lag window; the ONIX lag window is left with its documented TP rows only) |

There is one more over-broad gate. It is a coverage issue, not a correctness defect: the **Spit Up 255 attacker idle-rest gate** (`src/engine/liveSpitUpInputs.ts:136`). Lifting it gives **0 px** for ONIX and RATTATA as opponent-side attackers (counter 1: 168,172 -> 0 and 60,826 -> 0). The accepted `spit-up-opponent-1` stays 0 px under the lift. The target-rest half of the same gate is justified (RATTATA target 164,894 -> 36,443 engaged). Fix shape: gate on the target rest only, as audit 9 recommended for Revenge.

### TIMING-PHASE table
Counter evidence: each row's own body length (rows) from 2 fresh `prep22Probe.py` runs, as recorded in `derive.txt` and in the `speciesAudit10` block of each fixture. The other phase is measured and the residual lies only on the documented ages (violations = 0).

| Move | Parameter, measured / policy | Rows (`coverage-grid.txt` TP cells) | Residual |
|---|---|---|---|
| Psywave 149 | optional-lag-age no-event (204 rows) / event (205) | attackers CHIMECHO (legal), SPOINK (legal), FLYGON, RATTATA, WAILORD (opponent side); ONIX (player side); targets PICHU, RATTATA, WAILORD (opponent attacker fixture) (9) | ages **186..201 only**, 17,251-19,120 px/row |
| Nightmare 171 | optional-lag-age no-event (167) / event (168) | HYPNO (legal) attacker, both sides; ONIX attacker (player); WAILORD target (player attacker) (4) | ages **150..165 only**, 17,108-18,414 px/row |
| Extrasensory 326 | optional-lag-age event (162) / no-event (161) | STANTLER (legal) attacker, opponent side (1) | ages **143..158 only**, 18,662 px/row |

Some rows exceed the documented `maxPixelsPerRow`. Psywave reaches 19,120 against 18,618 documented, which is the same BG-area effect as audit 9 section 1. The check gates on ages only. No LAG FRAME was found: every residual on a non-shiny, non-rest row is either on the documented ages or listed under UNRESOLVED below.

### Non-defect / decline table
`gate-lift-env.diff` (`S10_LIFT=1`) removes the shiny gate of all six adapters and the idle-rest gates of Shock Wave, Nightmare, Superpower, Spit Up and Extrasensory (target). It was reverted after the runs. Receipts are in `patch-receipts/gate-lift/` and `summary.txt`. Controls under the lift: the accepted Shock Wave FLAAFFY -> CORSOLA player, Superpower NIDOQUEEN player and Spit Up opponent counter 1 windows are all 0 px. Read each cell below as fallback px -> engaged (lifted) px.

| Row(s) | Fallback -> lifted | Verdict |
|---|---|---|
| **Shock Wave** idle rest: ONIX / RATTATA opponent attacker; RATTATA opponent target (zeroRest gate, `liveMoveAnimation.ts:3141`) | 3,796,456 -> 264,350; 3,855,887 -> 99,378; 3,835,621 -> 26,670 | **DECLINE CONFIRMED** (the engaged view is not exact for either rest role) |
| **Superpower** idle rest: ONIX / RATTATA target and attacker (`liveSuperpowerInputs.ts:123`) | 1,173,030 -> 223,798; 1,002,726 -> 84,126; 1,079,612 -> 238,222; 927,548 -> 93,560 | **DECLINE CONFIRMED** |
| **Nightmare** idle rest: ONIX / RATTATA opponent attacker; RATTATA target (`liveMoveAnimation.ts:3173`) | 2,992,642 -> 451,765 (a no-lag window: 16 TP rows plus about 160k); 3,120,787 -> 68,880; 3,116,090 -> 40,896 | **DECLINE CONFIRMED** |
| **Spit Up** idle rest, target RATTATA (counter 1) | 164,894 -> 36,443 | **DECLINE CONFIRMED**. The attacker half is over-broad, see above. Counter-3 rows (ONIX / RATTATA attacker 171,774 / 62,643; RATTATA target 168,357) were run in production only, not lifted |
| **Extrasensory** RATTATA target (target-rest gate, `liveOamMoves.ts:841`) | 3,079,241 -> 34,440 | **DECLINE CONFIRMED** |
| **Shiny STEELIX attacker**, all six moves (12 rows) | Shock Wave 4,020,447 -> 488,414 (player) / 3,950,441 -> 513,775 (opponent); Superpower 1,176,926 -> 437,749 / 1,180,968 -> 448,974; Nightmare 3,273,564 -> 310,128; Spit Up 275,528 -> 196,536 / 304,887 -> 212,735; Extrasensory 3,147,978 -> 330,504; Psywave 3,855,668 -> 403,763 | **DECLINE CONFIRMED for all six**. The residual left in the engaged view is the missing shiny palette. Unlike audit 9, these gates test **both** `field.player` and `field.opponent` personality. The harness still feeds only `attackerPersonality`, so a shiny **target** was not staged |
| Immune targets: Shock Wave FLYGON / STEELIX / ONIX (Ground) and SHEDINJA (Wonder Guard); Superpower SHEDINJA (Ghost) | no ROM body | Correct ROM behaviour. These rows were not staged |

### UNRESOLVED (no counter probe; label only)

| Rows | Residual | Note |
|---|---|---|
| Extrasensory, **opponent-side TARGET** FLYGON / GOLBAT / WAILORD (NUZLEAF player attacker; no-lag window = policy phase) | 18,345 / 8,318 / 162 px on ages 43..117 (max 812 / 414 / 32 px/row) | Same ages and shape as the documented scanline-split residual of `extrasensory-alt-player-espeon-crobat` (an elevated / tall opponent target whose top lines sit above the beam when the distortion task rewrites the buffers). The fixtures record `scanline-split-line` as the policy "no-event" (`scanlineSplitSource: assumed-policy`), because prep22Probe cannot measure the split line; that needs a prep30 dense split fit (`prep30ExtrasensoryPixels.ts --split`). Suspected **TIMING-PHASE (scanline-split-line other phase)**, but it is not labelled without the probe |
| Extrasensory, **player-side ATTACKER** FLYGON / ONIX / STANTLER (lag "event" windows, SHUCKLE target) | 16 documented TP rows 143..158 **plus age 98 and one of 99 / 101 / 107** (288,274 / 293,586 / 299,554 px) | The 2 extra rows lie within the scanline-split ages of `extrasensory-alt-player-alakazam-golem`. Same missing split-line probe |

## 2. Coverage (`coverage-grid.txt`)
Accepted pairs in both orientations: Shock Wave FLAAFFY -> CORSOLA, Superpower NIDOQUEEN -> SHUCKLE / SEVIPER -> SHUCKLE, Psywave LUVDISC / SWABLU -> ONIX, Extrasensory NUZLEAF -> SHUCKLE, Nightmare HAUNTER -> SHUCKLE, and Spit Up SWALOT counters 1 and 3. "ok" = 0 px.

| Move | Target swaps | Attacker swaps |
|---|---|---|
| Shock Wave 351 (46) | GOLBAT, WEEZING, MAGNETON, CASTFORM (levitating / elevated), TYRANITAR, WAILORD, PICHU: ok in both orientations. RATTATA: ok as player target; decline as opponent target | legal MAGNETON, MAGNEMITE, CASTFORM, NOSEPASS, PICHU, plus FLYGON, GOLBAT, WEEZING, SHEDINJA, STEELIX, TYRANITAR, WAILORD: ok in both orientations. ONIX / RATTATA: ok on the player side; decline on the opponent side. Shiny: decline |
| Superpower 276 (44) | FLYGON, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU: ok in both. TYRANITAR: ok as player target. ONIX / RATTATA: ok as player target; decline as opponent target | legal REGIROCK, REGISTEEL, NIDOQUEEN (opponent side), plus FLYGON, GOLBAT, WEEZING, SHEDINJA, STEELIX, TYRANITAR, WAILORD, PICHU: ok in both. ONIX / RATTATA: ok on the player side; decline on the opponent side. Shiny: decline |
| Psywave 149 (24) | FLYGON, GOLBAT: ok. PICHU / RATTATA / WAILORD: ok (player attacker); TP (opponent attacker) | CHIMECHO, SPOINK, FLYGON, RATTATA, WAILORD: ok on the player side; TP on the opponent side. ONIX: TP (player); ok (opponent). STEELIX: ok (opponent). Shiny: decline |
| Extrasensory 326 (26) | PICHU: ok in both. FLYGON / GOLBAT / WAILORD: ok (opponent attacker); UNRESOLVED (player attacker). RATTATA: ok (player target); decline (opponent target) | EXPLOUD, STEELIX, WAILORD: ok in both. RATTATA: ok (player); **defect** (opponent). FLYGON: ok (opponent); UNRESOLVED (player). ONIX: UNRESOLVED (player); **defect** plus TP (opponent). STANTLER: TP (opponent); UNRESOLVED (player). Shiny: decline |
| Nightmare 171 (24) | FLYGON, GOLBAT, PICHU: ok in both. WAILORD: ok (opponent attacker); TP (player attacker). RATTATA: ok (player target); decline (opponent target) | FLYGON, STEELIX, WAILORD: ok in both. HYPNO: TP in both. ONIX: TP (player); decline (opponent). RATTATA: ok (player); decline (opponent). Shiny: decline |
| Spit Up 255 (44; counters 1 and 3) | FLYGON, GOLBAT, PICHU, WAILORD: ok in both. RATTATA: ok (player target); decline (opponent target) | FLYGON, STEELIX, WAILORD: ok in both. ONIX / RATTATA: ok (player); decline (opponent; over-broad). Shiny: decline |

**Not reached:**
- Superpower with a TYRANITAR player-side target. The lab route never reaches the action menu (`battle lab route did not reach the player action menu`), presumably because the Sand Stream intro is not handled by the route.
- Psywave with a STEELIX player-side attacker (normal and shiny): BODY-MISSING, because the swapped run records only the opponent's Tackle.
- Spit Up counter 2 (counters 1 and 3 bracket it).
- A target-personality shiny probe (harness limit).
- A measurement of the Superpower monbg row. The fixtures assume the per-side policy row (`monbgRowSource: assumed-policy`). This is harmless here: the documented other-phase residual is empty and every non-gated row is 0 px.
- Extrasensory and Nightmare used only a reduced species set (5 targets and 6-7 attackers each), by the usage-weight priority.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-10
bash tools/integration/speciesAudit10Stage.sh                                  # list-<move>.tsv + scenarios/ (fixes the gender papercut)
JOBS=14 sh tools/integration/speciesAudit9Probes.sh /tmp/s10/probes $W/list-*.tsv           # 2 fresh prep22Probe runs per swapped scenario (~3.5 min)
python3 tools/integration/speciesAudit10Fixtures.py /tmp/s10/probes $W/derived $W/list-*.tsv > $W/derive.txt
sh tools/integration/speciesAudit10Run.sh /tmp/s10/receipts 14 '*-shock-wave-*' '*-superpower-*'   # receipts -> the given dir (~1.5 min per 46 rows)
sh tools/integration/speciesAudit10Run.sh /tmp/s10/receipts 14 '*-psywave-*' '*-extrasensory-*' '*-nightmare-*' '*-spit-up-*'
python3 tools/integration/speciesAudit10Summary.py /tmp/s10/receipts > grid.txt 2> residuals.tsv
D=$W/derived   # patch proofs: one job per stem per receipt dir (two jobs with the same stem overwrite each other's receipt)
sh tools/integration/issue151Patch.sh $PWD/$W/extrasensory-clone-rest-env.diff /tmp/s10/p-xs -:$D/rattataA-extrasensory-opponent-nuzleaf-player-shuckle.json \
  -:$D/onixA-extrasensory-opponent-nuzleaf-player-shuckle.json -:tools/integration/fixtures/d4a-live/extrasensory-opponent-nuzleaf-player-shuckle.json
sh tools/integration/issue151Patch.sh $PWD/$W/extrasensory-clone-rest-env.diff /tmp/s10/p-xs-off S10_XS_REST=0:$D/rattataA-extrasensory-opponent-nuzleaf-player-shuckle.json
sh tools/integration/issue151Patch.sh $PWD/$W/gate-lift-env.diff /tmp/s10/p-gl S10_LIFT=1:$D/onixA-spit-up-opponent-1.json S10_LIFT=1:$D/rattataA-spit-up-opponent-1.json  # full job list: patch-receipts/gate-lift/summary.txt
```
In zsh, build a multi-job list in a variable and pass it as `${=J}`.
