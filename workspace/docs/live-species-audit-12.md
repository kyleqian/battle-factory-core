# Live adapter species audit 12 (S10A side lane, 2026-10-07): Substitute 164 body, Skill Swap 285, Flatter 260, Eruption 284

This audit uses the method of `docs/live-species-audit-11.md`, `-10.md` and `-9.md`. Each row swaps the species in an accepted s10a-live scenario, then compares the production live view against fresh direct mGBA. The verifier uses display names.
The window, HP, gender, personality, status, preceding bodies, the Flatter activation gRng2Value (the D3 presentation words are pinned at each swapped scenario's own activation value, as the s10a-live fixtures pin them) and the Skill Swap optional-lag phase all come from the swapped scenario's **own** two fresh `prep22Probe.py` runs. Those runs must agree (`speciesAudit12Fixtures.py`). The check is `d4aTimingCheck.ts` (via `speciesAudit9Run.sh`).
Master was 5e3f82dc9 (production src tree 7d28da92). All runs used direct mGBA only. No shared oracle was touched. Source patches were applied by `issue151Patch.sh` and always reverted, and `git status src` was clean at every commit.
Evidence is in `tools/integration/fixtures/species-audit-12/`: `receipts/` (182 compact receipts), `run.log`, `coverage-grid.txt`, `residuals.tsv`, `derive.txt`, `derived/`, `scenarios/`, `list-*.tsv`, `counters.txt`, `patch-receipts/{p-shiny,p-nidoran,gate-lift,p-flshadow}/` (each with `summary.txt`), and the patches `subst-shiny-palette-env.diff`, `nidoran-gender-symbol-env.diff`, `gate-lift-env.diff` and `flatter-elevated-shadow-env.diff`.

**182 rows. Every receipt is `identical true` over 2 fresh mGBA runs (0 non-identical).**
- 144 rows are 0 px.
- 4 rows are a SPECIES-DEFECT, **all proven 0 px by a reverted patch**:
  - Substitute with a shiny attacker ×2: the adapter has no shiny gate.
  - Flatter with a NIDORAN♀ attacker ×2: the shared healthbox draws a gender symbol that the ROM omits.
- 12 rows are TIMING-PHASE (Skill Swap, no-event phase, residual only on the documented ages 177..192). They are backed by counters.
- 0 rows are a LAG FRAME.
- 20 rows are declines:
  - 6 are shiny declines. 4 were lifted and are **confirmed**. The 2 opponent-side Flatter / Eruption rows share the same gate and were not lifted.
  - 2 are Eruption idle-rest declines, **confirmed**.
  - 8 are Flatter elevated-opponent declines. They are **confirmed** as production stands: lifted alone, the engaged view misses row 0.
  - 4 are Skill Swap idle-rest declines that are **not confirmed**. With the gate lifted the engaged view is 0 px.
  - So two gates are **over-conservative**, and a patch proves the engaged view is 0 px. Flatter's elevated-opponent gate is 0 px under the #142 row-0 hook (8 rows). Skill Swap's zero-idle-rest gate is 0 px with the gate lifted (4 rows).
- 2 rows are UNRESOLVED (TYRANITAR + Flatter, 2 px and 96 px).

## 1. Results first

### Defect table

| Move | Side / species | px before -> after patch (2 fresh runs, identical) | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| Substitute 164 body | **shiny STEELIX attacker**, both sides (`shinysteelixA-substitute-{player,opponent}-golem-*-onix`) | player 12,471 -> **0**; opponent 13,778 -> **0** (ages 0..10 only, max 1,846 / 1,970 px/row). Controls under the patch: the non-shiny STEELIX attacker and the accepted GOLEM -> ONIX stay 0 | The Substitute body is the only audited adapter **without a shiny gate**. The live renderer composes the battlers from `liveSceneOnBattlerArt`, which uses the normal palette (`liveMovePaletteComposite.ts:7`: "Shiny battlers have no repo palette ... callers gate on `liveBattlerIsShiny`"). The attacker is visible on ages 0..10, before the doll replaces it, so those rows draw shiny STEELIX in its normal colours. `subst-shiny-palette-env.diff` (`S12_SHINY=STEELIX`) gives `liveSceneOnBattlerArt` STEELIX's ROM `shiny.pal` (5-bit scaled), and the rows go to 0 px, so the palette is the whole residual | `src/engine/liveMoveAnimation.ts:1739` (`case 164: config = { move: "SUBSTITUTE", ... }`: no gate); `src/engine/battleScene.ts:14880` (`liveSceneOnBattlerArt`, normal palette only) | Add the shared gate `if (liveBattlerIsShiny(field.player.personality) \|\| liveBattlerIsShiny(field.opponent.personality)) return null;` to `case 164`, as on Skill Swap `:3461`, Flatter `:3428` and Eruption `:3642`. Alternatively, give the live art shiny palettes (the patch's route) | **SPECIES-DEFECT, proven 0 px** (2 rows) |
| Flatter 260 (any live move: the defect is in the shared healthbox) | **NIDORAN♀ attacker** (a legal Factory Flatter user), both sides (`nidoranfA-flatter-{player,opponent}-*`) | 7,008 -> **0** on both sides (32 px on **every** row 0..218). Controls under the patch: NIDORINO, NIDORINA (accepted) and the opponent-side row are 0 px. With `S12_NIDORAN=0` it is still 7,008 | The ROM's `UpdateNickInHealthbox` suppresses the gender symbol when the species is NIDORAN♀ / NIDORAN♂ and the nickname equals the species name (`gender = 100`). The live healthbox always appends ♀ / ♂ when the gender is not `"none"`. The extra glyph is 32 px per frame. `nidoran-gender-symbol-env.diff` (`S12_NIDORAN=1`) skips the symbol for names starting `NIDORAN` and gives 0 px | `src/engine/healthboxAssembly.ts:483` (`nameGlyphRun`: `if (gender !== "none")`) | In `nameGlyphRun` (or in its callers' field-gender input), drop the gender symbol when the species is NIDORAN_F / NIDORAN_M and the displayed name is the default species name. Factory mons are never nicknamed, so the species test is enough there. This is not Flatter-specific: every live view with a NIDORAN♀ / ♂ healthbox is affected. Check the canonical Scene ON healthbox path too (not audited here) | **SPECIES-DEFECT, proven 0 px** (2 rows) |

### TIMING-PHASE table

| Move | Rows | Parameter, measured / policy | Counter evidence (`counters.txt`, `issue151Counters.sh`, 2 fresh runs, identical digests) | Residual |
|---|---|---|---|---|
| Skill Swap 285 | 12 rows, all **195-row** windows. Nine are target swaps with the GIRAFARIG opponent attacker (FLYGON, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX as the player target). The other three are TYRANITAR target with the player attacker, ALAKAZAM opponent attacker (legal) and TYRANITAR player attacker | optional-lag-age **no-event** (195 rows) / policy event (196 rows). palette-transfer-row was recorded at the policy no-event value (restore row 175, `restoreRowSource: "assumed-policy"`). No row has a residual on 175..177, so it needed no separate probe | The no-event rows ALAKAZAM (opponent), TYRANITAR target (player attacker), FLYGON target (opponent), TYRANITAR attacker (player) and WAILORD target (opponent) have **lag ages []**. The 196-row WEEZING target (player) and the accepted GIRAFARIG -> SHUCKLE player lag at **[175]**, which is the policy lag (counter-age convention). The accepted opponent GIRAFARIG -> SHUCKLE (the documented other-phase window) has lag ages [], like the swapped opponent rows | ages **177..192 only** (16 rows, = `alternatePhaseResidual.ages`), 268,784..300,448 px. Max px/row is 16,799..18,778. **Note:** the ALAKAZAM opponent row's 18,778 and the WAILORD target row's 18,523 are near or above the documented `maxPixelsPerRow` 18,649 (from the accepted windows). The fade-out covers the displayed sprites, so the per-row count depends on the species. `d4aTimingCheck` checks the ages, not this bound |

### LAG FRAME
None. Every counter probe agreed with its accepted control (Skill Swap above; Flatter TYRANITAR rows lag at [65, 66, 67], the same as the accepted NIDORINA -> ONIX).

### Non-defect / decline table
Declines are the production fallback, so the residual covers the whole window. `gate-lift-env.diff` (`S12_LIFT=1`, reverted) removes:
- the shiny gates of Skill Swap (`:3461`), Flatter (`:3428`) and Eruption (`:3642`);
- Skill Swap's zero-idle-rest gate (`:3469`);
- Flatter's elevated-opponent gate (`:3429`);
- Eruption's attacker idle-rest gate (`:3643`).

Receipts are in `patch-receipts/gate-lift/` (`summary.txt`). Controls under the lift: the accepted Skill Swap GIRAFARIG -> SHUCKLE player, Flatter NIDORINA -> ONIX player and Eruption BARBOACH -> ONIX player are all 0 px. Read each cell as fallback px -> engaged (lifted) px.

| Row(s) | Fallback -> lifted px | Gate | Verdict |
|---|---|---|---|
| Shiny STEELIX attacker: Skill Swap, Flatter, Eruption, both sides (6 rows) | Skill Swap 3,788,658 -> 357,832 (player) / 3,793,857 -> 385,151 (opponent); Flatter 5,381,397 -> 402,414 (player); Eruption 7,582,911 -> 801,830 (player). Every lifted row is wrong on every age (1,846 / 1,970 px/row = the STEELIX palette) | shiny gates `liveMoveAnimation.ts:3461 / :3428 / :3642` | **DECLINE CONFIRMED.** The Flatter / Eruption opponent shiny rows (5,296,571 / 7,931,709 px) were not lifted; they have the same gate |
| Eruption idle rest: ONIX / RATTATA opponent attackers (2 rows) | 7,766,725 -> 23,976 (22 rows, 1,091 px/row from age 0) / 7,517,902 -> 9,005 (22 rows, 410 px/row) | `liveMoveAnimation.ts:3643` (prep36 s1.4: "an idle-rest attacker misses rows 0-20 / one launch row") | **DECLINE CONFIRMED** (the engaged view is not exact, on the documented rows) |
| Flatter elevated opponent: FLYGON, GOLBAT, SHEDINJA, WEEZING as the opponent target (player NIDORINA attacker) and as the opponent attacker (8 rows) | about 5.2M -> (lifted alone) 200 / 195 px on **age 0 only** (FLYGON target / WEEZING attacker) -> **0 px** under `flatter-elevated-shadow-env.diff` on all 8 rows. That patch (`S12_FL=1`) lifts the gate and registers 260 at row 0 in `LIVE_MOVE_OPPONENT_SHADOW_ROW` (the #142 hook, as Skill Swap 285 / Eruption 284). Controls under it: the accepted NIDORINA <-> ONIX both sides, HYPNO -> GOLEM opponent and STEELIX target are 0 px | `liveMoveAnimation.ts:3429` (gate comment: "its row-0 shadow ... is unmeasured for Flatter (prep35 s4)") | The decline is confirmed for production as it stands, since the lifted view misses row 0. The gate is **over-conservative**: with the hook the 8 rows are exact. **Coverage fix** (not a defect): add 260 to the row-0 list at `liveMoveAnimation.ts:~500` and drop the `:3429` gate. Receipts: `patch-receipts/p-flshadow/` |
| Skill Swap idle rest: ONIX / RATTATA as the opponent target (player attacker) and as the opponent attacker (4 rows) | 3,614,284 / 3,697,615 / 3,717,091 / 3,800,107 -> **0 / 0 / 0 / 0** | `liveMoveAnimation.ts:3469` (`zeroRest(attacker) && zeroRest(target)`) | **DECLINE NOT CONFIRMED: the gate is over-conservative.** With it lifted, all 4 rest rows are exact (196 rows, the event phase as measured). **Coverage fix:** drop the zero-rest requirement, or relax it to the measured cases. Only ONIX / RATTATA rests were tested |
| Immune / failing rows not staged | — | Substitute with a SHEDINJA attacker (1 HP <= maxHP/4: Substitute fails, no body); Skill Swap with SHEDINJA in either role (Wonder Guard: fails) | correct ROM behaviour |

The Substitute idle-rest attackers named in the brief as unproven are now **proven 0 px**: ONIX and RATTATA as the opponent attacker (non-zero idle rest) and as the player attacker. The doll at the attacker corner is exact for both.
Eruption's length-from-attacker-y rule also covers two lengths that no accepted window measured: FLYGON opponent attacker **488 rows** and WAILORD player attacker **470 rows**. Both are 0 px (`derive.txt` flags them `UNEXPECTED-ROWS` only against the s10a-live set {476, 482, 494, 500}).

### UNRESOLVED (a counter probe ran but found no explaining lag; label only)
| Row | Residual | Probe |
|---|---|---|
| Flatter, TYRANITAR target (NIDORINA player attacker) | 2 px, ages 70..71 | lags [65, 66, 67] = the accepted NIDORINA -> ONIX |
| Flatter, TYRANITAR player attacker (ONIX target) | 96 px, ages 69..98 (max 5 px/row) | lags [65, 66, 67] = the accepted |

These are the same TYRANITAR pattern as audit 11 (Sand Stream sets a sandstorm at battle entry). It is unprobed beyond the counters.

## 2. Coverage (`coverage-grid.txt`; "ok" = 0 px, 2 fresh runs identical)
Accepted pairs, both orientations: Substitute GOLEM <-> ONIX, Skill Swap GIRAFARIG <-> SHUCKLE, Flatter NIDORINA <-> ONIX, Eruption BARBOACH <-> ONIX. Legal users come from `src/data/gen/battle-frontier-mons.json`. Substitute: ARTICUNO, BLISSEY, CRADILY, GOLEM, JYNX, MACHAMP, MEGANIUM, RAIKOU, REGISTEEL, SHUCKLE, ZAPDOS. Skill Swap: ALAKAZAM, DUSKULL, GENGAR, GIRAFARIG, KECLEON, VENOMOTH, VENONAT. Flatter: NIDORAN♀, NIDORINA, NIDORINO. Eruption: CAMERUPT.

| Move | Target swaps | Attacker swaps |
|---|---|---|
| Substitute 164 (50) | FLYGON, SHEDINJA, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA: ok in both orientations | legal ARTICUNO, ZAPDOS, SHUCKLE, BLISSEY, MACHAMP, JYNX, plus FLYGON, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX: ok in both. Shiny STEELIX: **defect, 0 px under the patch** |
| Skill Swap 285 (47) | Player attacker: FLYGON, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU ok; TYRANITAR TP; ONIX / RATTATA decline (over-conservative, 0 px lifted). Opponent attacker: all 9 TP (no-event, like the accepted opponent window) | legal ALAKAZAM, GENGAR, VENOMOTH, DUSKULL, KECLEON, plus FLYGON, GOLBAT, WEEZING, STEELIX, WAILORD, PICHU: ok in both (ALAKAZAM opponent: TP). ONIX / RATTATA: ok (player); decline (opponent, over-conservative). TYRANITAR: TP (player); opponent **not reached** (the swapped scenario produced no bodies). Shiny: decline (confirmed) |
| Flatter 260 (43) | Player attacker: PICHU, RATTATA, STEELIX, WAILORD ok; FLYGON / GOLBAT / SHEDINJA / WEEZING decline (elevated, 0 px under the hook patch); TYRANITAR UNRESOLVED 2 px. Opponent attacker: all 9 ok (an elevated *player* target does not gate) | legal NIDORINO ok in both; legal NIDORAN♀ **defect (healthbox), 0 px under the patch** in both. FLYGON, GOLBAT, SHEDINJA, WEEZING: ok (player); decline (opponent, elevated; 0 px under the hook patch). STEELIX, WAILORD, PICHU, RATTATA, ONIX: ok in both. TYRANITAR: UNRESOLVED 96 px (player); opponent **not reached** (no bodies). Shiny: decline (confirmed) |
| Eruption 284 (42) | FLYGON, SHEDINJA, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA: ok in both | legal CAMERUPT, plus FLYGON (488 rows opponent), SHEDINJA, GOLBAT, WEEZING, STEELIX, TYRANITAR, WAILORD (470 rows player), PICHU: ok in both. ONIX / RATTATA: ok (player); decline (opponent, confirmed). Shiny: decline (confirmed) |

**Not reached:**
- TYRANITAR as the opponent attacker for Skill Swap and Flatter. Both swapped probes recorded no bodies (`derive.txt` BODY-MISSING). The scenario was not re-staged.
- The opponent-side shiny gate lift for Flatter / Eruption. A target-personality shiny probe was not run (a harness limit, as in audits 10 / 11).
- The mechanism of the TYRANITAR Flatter residuals.
- Skill Swap rest swaps beyond ONIX / RATTATA.
- A Skill Swap palette-transfer-row (restore row) pixel fit on the swapped windows. No residual sat on rows 175..177, so the policy value was not contradicted.

## 3. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-12
bash tools/integration/speciesAudit12Stage.sh $W                                  # list-<move>.tsv + scenarios/ (gender fix: genderless / female-only / male-only)
JOBS=14 sh tools/integration/speciesAudit9Probes.sh /tmp/s12/probes $W/list-*.tsv   # 2 fresh prep22Probe runs per swapped scenario (~2 min)
python3 tools/integration/speciesAudit12Fixtures.py /tmp/s12/probes $W/derived $W/list-*.tsv > $W/derive.txt
sh tools/integration/speciesAudit12Run.sh /tmp/s12/receipts 14 '*-substitute-*' '*-skill-swap-*'   # receipts -> the given dir (~1.5 min)
sh tools/integration/speciesAudit12Run.sh /tmp/s12/receipts 15 '*-flatter-*' '*-eruption-*'        # (~1.5 min)
python3 tools/integration/speciesAudit10Summary.py /tmp/s12/receipts > grid.txt 2> residuals.tsv
D=$W/derived   # patch proofs: ONE job per stem per receipt dir (receipts overwrite by stem); zsh: build the job list in J and pass ${=J}
sh tools/integration/issue151Patch.sh $PWD/$W/subst-shiny-palette-env.diff /tmp/s12/p-shiny S12_SHINY=STEELIX:$D/shinysteelixA-substitute-player-golem-opponent-onix.json \
  S12_SHINY=STEELIX:$D/shinysteelixA-substitute-opponent-golem-player-onix.json S12_SHINY=none:tools/integration/fixtures/s10a-live/substitute-player-golem-opponent-onix.json
sh tools/integration/issue151Patch.sh $PWD/$W/nidoran-gender-symbol-env.diff /tmp/s12/p-nidoran S12_NIDORAN=1:$D/nidoranfA-flatter-player-nidorina-opponent-onix.json \
  S12_NIDORAN=1:$D/nidoranfA-flatter-opponent-nidorina-player-onix.json
sh tools/integration/issue151Patch.sh $PWD/$W/gate-lift-env.diff /tmp/s12/p-lift S12_LIFT=1:$D/onixA-skill-swap-opponent-girafarig-player-shuckle.json   # full list: patch-receipts/gate-lift/summary.txt
sh tools/integration/issue151Patch.sh $PWD/$W/flatter-elevated-shadow-env.diff /tmp/s12/p-fl S12_FL=1:$D/weezingA-flatter-opponent-nidorina-player-onix.json  # full list: patch-receipts/p-flshadow/summary.txt
sh tools/integration/issue151Counters.sh /tmp/s12/counters 10 $D/alakazamA-skill-swap-opponent-girafarig-player-shuckle.json \
  tools/integration/fixtures/s10a-live/skill-swap-player-girafarig-opponent-shuckle.json         # full list: counters.txt
```

## 4. Gates
`npm test` passed on 5b9e65274: 1562 files passed / 44 skipped, 12,815 tests passed / 223 skipped, 410.9 s. `npm run build` passed. `git diff --check 5e3f82dc9..HEAD` is clean. The commit range adds new files only, and `git status src` was clean at every commit.
