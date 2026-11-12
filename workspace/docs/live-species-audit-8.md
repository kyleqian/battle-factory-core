# Live adapter species audit 8 (S10A side lane, 2026-10-07): Baton Pass 226 body, Endeavor 283, Fire Punch 7 opponent attackers

Method of `docs/live-species-audit-6.md` / `-7.md` (swap species in the accepted lab scenario; window, HP, gender, personality, rng2 derived from the swapped scenario's OWN ROM probe; production live view vs fresh direct mGBA; display names in the verifier). Direct mGBA only, no shared oracle touched.
Evidence: `tools/integration/fixtures/species-audit-8/` (`receipts/` 141 compact receipts, `coverage-grid.txt`, `derived/`, `derive*.txt`, `list*.tsv`, `power-variants/` + `power-receipts/`, `shiny-personality/` + `shiny-personality-receipts/`, `shiny-gate-lift-receipts/`, `patches/`).
**141 rows run, every receipt `identical true` over 2 fresh mGBA runs (0 non-identical); 135 exact (0 px); the 6 residuals are all shiny (below).** No SPECIES-DEFECT found for Baton Pass 226, Endeavor 283 or Fire Punch 7, so there is no defect patch to prove (the only patches here are the shiny gate lift and the Endeavor power sweep, both reverted; `git status src` clean).

## 1. Results first

### Defect table
None. Every non-shiny species swap is 0 px on every row (incl. the elevated opponents FLYGON / GOLBAT, SHEDINJA, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX, whose idle x2 / rest values the adapters already take from the hardware OAM provider).

### Non-defect / decline table

| Row(s) | Result | Verdict / evidence |
|---|---|---|
| Baton Pass 226, shiny FLYGON **attacker** (`shinyflygonA-baton-accepted-{opponent,player}-aipom-onix`) | harness without personality: 43/53 exact, 5,196 / 4,467 px (rows 0-9 only, 837 -> 101 px/row, the visible attacker before it leaves) | **Adapter engaged with the non-shiny palette** because this harness feeds a personality for the attacker only when the fixture has `attackerPersonality` (`tools/integration/liveAdapterFramebuffer.ts:253`) and the gate `liveBattlerIsShiny(undefined) = false`. Residual = missing shiny repo palette (`liveMovePaletteComposite.ts:7`). |
| same rows, `attackerPersonality` = the ROM personality (shiny under the Factory OT: values 5 / 3 < 8) | **0/53, 775,195 / 819,402 px** (fallback view) | **DECLINE CONFIRMED** (`liveMoveAnimation.ts:1258`, the `case 226` shiny gate). With `speciesAudit6/lift-shiny-gate.diff` (gate off, personality kept, reverted) the same rows return to **5,196 / 4,467 px**, i.e. the gate flips engaged-vs-fallback and the engaged view's only error is the shiny palette (`shiny-personality-receipts/`, `shiny-gate-lift-receipts/`). |
| Baton Pass / Endeavor, shiny STEELIX **target** (`shinysteelixT-*`: 97,838 / 104,410 Baton, 123,068 / 131,302 Endeavor px) | 0 exact | The harness cannot supply a **target** personality (only `attackerPersonality` exists), so the gate (`:1247` Endeavor, `:1258` Baton) never sees it: the adapter is **engaged**, and the residual is the whole shiny STEELIX sprite in the non-shiny palette. Gate-lift (`patches/shiny-gate-lift-env.diff`, `S8_LIFT=1`) gives the **identical** px, consistent with that. **Target-side decline NOT confirmed** (needs a harness that passes the target personality; shiny-target production behaviour would be fallback, unproven here). |
| Endeavor 283 stale power (`power-variants/`, `power-receipts/`; derived fixtures use the ROM's `gAnimMovePower`) | The ROM's stale power is **40 (player-side fixtures; last write before the body, `gBattleMovePower == gAnimMovePower == 40`) and 0 (opponent-side, first action)**, identical for every swapped species (probe `powerChanges`). Exact at 40 / 0. Forced wrong values: **opponent fixture** p40 17,468, p75 27,468, p120 38,148, p250 47,748 px (FLYGON swap 26,596 / 41,392 / 52,644 / 62,880); **player fixture** p0 27,228, p75 31,884, p120 48,120, p250 57,824 px (FLYGON p0 28,280, p75 33,304, p120 50,600, p250 61,276); every wrong value is 40/68 rows exact | The shake amplitude depends on the value (as expected; it is the only input varied), `request.power` is therefore load-bearing: the adapter is correct **iff the engine's `battleMovePower` register equals the ROM's `gAnimMovePower` at the body**. The audit feeds the fixture value; it does not run the damage calc. Not a species issue (the value is species-independent in all 24 probed swaps). |
| Endeavor / Baton, W3 decline (`staleMovePowerUnknown`, `liveMoveAnimation.ts:1246`) | not exercised | The flag is an engine-side input, not reachable from these fixtures. |
| Fire Punch 7, opponent-side attacker swaps FLYGON (1), GOLBAT (1), ONIX (2), RATTATA (2), PICHU (2) | **8/8 exact** | New coverage (audit 6 had target swaps + other attackers). |

### Coverage grid (`coverage-grid.txt`; fixtures = accepted + prep27 + s10a pairs of `baton-endeavor-live-receipt.json`)

| Move | Swap | Species 0 px (both orientations unless noted) |
|---|---|---|
| Baton Pass 226 | target | FLYGON, GOLBAT, SHEDINJA, STEELIX, TYRANITAR, WAILORD, PICHU, RATTATA, ONIX (accepted, prep27 ninjask-golem and s10a jolteon-golbat fixtures: 43 target-swap rows) |
| Baton Pass 226 | attacker | FLYGON, GOLBAT, ONIX, PICHU, RATTATA, SHEDINJA, STEELIX (player/opponent where the order held), WAILORD, TYRANITAR (player fixture) |
| Endeavor 283 | target | FLYGON, GOLBAT, ONIX, RATTATA, STEELIX, WAILORD (both), PICHU, TYRANITAR (opponent fixture) |
| Endeavor 283 | attacker | FLYGON (both), RATTATA (both), GOLBAT / PICHU / SHEDINJA (opponent fixture); staged with target HP EV 252 (`speciesAudit8EndeavorHp.py`, Endeavor needs attacker HP < target HP) |
| Fire Punch 7 | opponent attacker | FLYGON, GOLBAT, ONIX, RATTATA, PICHU |

**Not reached** (dropped by the derive step, not run): Baton Pass attacker swaps whose swapped mon changes the turn order (STEELIX opponent/player, TYRANITAR opponent: BODY-MISSING; shiny STEELIX attacker; a `--boost target` retry still reordered, `derive8.txt`); Endeavor attacker swaps STEELIX, TYRANITAR, WAILORD (both), GOLBAT / PICHU / SHEDINJA player (body missing: Endeavor fails when attacker HP >= target HP even with the HP-EV workaround, or the order changed); Endeavor target SHEDINJA (body missing), PICHU / TYRANITAR player fixtures (body missing / reordered); Fire Punch SHEDINJA and FLYGON `fp-o-snorlax-golem` (reordered); Baton Pass `s10a-opponent-onix-golbat` ONIX swaps (skip-same); a target-personality gate probe; LAG FRAME / ARTIFACT labels were not needed (no unexplained residual: all 6 residuals are the shiny palette, above).

CPU-timing class: none observed in these two moves (no residual row on any non-shiny swap, so no counter probe was warranted).

## 2. Reproduce (workspace root; direct mGBA only; use bash for the stage scripts: zsh does not word-split `set -- $sp`)
```sh
export PYTHONPATH=../../vendor/libmgba-py; W=tools/integration/fixtures/species-audit-8
tools/integration/speciesAudit8Stage.sh                                  # list1/3/6/8.tsv + scenarios/
python3 tools/integration/speciesAudit8EndeavorHp.py $W $W/list1.tsv > $W/list4.tsv
tools/integration/speciesAudit8FirePunch.sh                              # list7.tsv
cat $W/list[1-8].tsv > /tmp/s8all.tsv; JOBS=10 tools/integration/speciesAudit5Probes.sh /tmp/s8all.tsv /tmp/s8/probes
for l in 1 3 4 6 7; do python3 tools/integration/speciesAudit6Derive.py $W/list$l.tsv /tmp/s8/probes $W/derived; done   # delete REORDERED rows' fixtures
tools/integration/speciesAudit8Run.sh /tmp/s8/receipts 12 '*'            # 2 fresh runs per row; receipts -> the given dir
python3 tools/integration/speciesAudit8Summary.py /tmp/s8/receipts
# shiny decline: derived/ + attackerPersonality (shiny-personality/), with and without the gate lift
DERIVED=$W/shiny-personality tools/integration/speciesAudit8Run.sh /tmp/s8/sp 4 'shinyflygonA-*'
tools/integration/issue151Patch.sh $PWD/tools/integration/fixtures/species-audit-6/lift-shiny-gate.diff /tmp/s8/sp-lift -:$W/shiny-personality/shinyflygonA-baton-accepted-opponent-aipom-onix.json
# Endeavor power sweep
DERIVED=$W/power-variants tools/integration/speciesAudit8Run.sh /tmp/s8/pv 12 '*'
```
PAPERCUTS: zsh does not word-split `set -- $sp` / `$globs` (my Fire Punch loop silently staged only SHEDINJA; the run script saw one giant argument), ~6 min; the harness supplies only `attackerPersonality`, so a shiny TARGET can never reach the decline gate and the `S8_LIFT` env patch proved nothing until I found that, ~8 min; `speciesAudit6Stage.py` has no level/HP knob, so Endeavor attacker swaps need a HP-EV workaround and still lose 11 rows, ~10 min; `prep14Probe.py` segfault-at-exit noise floods the output (~80 lines per probe batch), ~2 min.
