# Live adapter species audit 6 (S10A side lane, 2026-10-07): Fire Punch, Curse (non-Ghost), Signal Beam, Lovely Kiss, Spikes, Octazooka, Psych Up (opponent attacker)

Method of `docs/live-species-audit-5.md` / `-4.md`: swap the species in a copy of the accepted lab scenario; window, healthbox HP / gender / attacker personality come from the swapped
scenario's OWN ROM state (prep14Probe `atActivation`, activation frame + accepted offset; never live output); production live view vs fresh direct-mGBA frames; **2 fresh runs with identical
digests for every row** (`identical true` in all 140 receipts; `speciesAudit6Summary.py` reports 0 non-identical). Swaps that changed the turn order (91 of 243 staged; `REORDERED` in `derive.txt`)
were dropped, not run. Lovely Kiss derive keeps the accepted `presentationRngActivation` and re-pins it to the swapped scenario's activation `gRng2`. Evidence:
`tools/integration/fixtures/species-audit-6/` (receipts/, patch-receipts/, patches `*.diff`, derived/, derive.txt, coverage-grid.txt).

## 1. Results first

### MR_MIME -> MAGNETON Psych Up opponent attacker: **VERIFIER ARTIFACT, not a production defect**

Reproduced exactly (0/179, 537 px/row = field 189 + chrome 348, constant from age 0). The residual is only the TEXT "MR. MIME": the healthbox name (field, bbox y21-28) and the
"Foe MR. MIME used" message line (chrome, y124-133). Colour pairs (ROM<-live, age 90): `6b5a73<-ffffff` 67, `6ba5a5<-6b5a73` 65, `ffffff<-6ba5a5` 61, `6b5a73<-6ba5a5` 57 (glyph pixels of the
missing "." and the shifted letters). Cause: the live-adapter test harness builds the battler `name` and the message line from the raw species constant
(`tools/integration/liveAdapterFramebuffer.ts:251` `name: mon.species`, `:281` `${f.attacker.species} used`), i.e. `MR_MIME` -> underscore glyph dropped (healthbox "MRMIME", message "MR MIME"), where the ROM
shows `MR. MIME` (`src/data/gen/species-names.json`). Production reads the display names from `species-names.json`. **Proof**: `species-audit-6/harness-display-name.diff` (harness-only, look up the display
name) -> **179/179, 0 px twice fresh** (`patch-receipts/mrmime-magneton-pua-displayname.json`); reverted. The same artifact applies to any punctuated name (HO_OH "HO-OH", NIDORAN, FARFETCHD, MR_MIME) in
every verifier fixture; none of the species swapped below has punctuation. Control: the original HYPNO->GOLBAT fixture through the same derive = 179/179. The fixture is now committed
(`derived/mrmime-magneton-pua.json`, scenario `tools/battle-lab/r2g-pua-mrmime-magneton.json`); with the harness fix it can be added to the accepted set.

### Summary

140 swapped rows run: **no exactness SPECIES-DEFECT** in the six first/later-body adapters except **one found and proven**: Signal Beam with an idle-rest species (RATTATA). Counts (140 receipts incl. the HYPNO control and the MR_MIME row): 122 exact, 18 residual
(2 Signal Beam defect rows, 1 MR_MIME artifact, 4 Curse/Psych Up documented idle-rest declines, 11 shiny: Fire Punch 4, Curse 2, Signal Beam 2, Octazooka 2, Psych Up 1).

### Defect table

| Move | Side / species | px before -> after patch | Mechanism | File:line | Fix shape | Patch proof |
|---|---|---|---|---|---|---|
| Signal Beam 324 | opponent-side RATTATA TARGET (`rattata-signal-beam-player-ariados-opponent-chansey`; rows 37-144 of 145, 410 px/row field, bbox x166-193 y41-71) | 41,134 -> **0** (145/145) | ROM: from the target-shake task start (reducer age 36, display age 37) `AnimTask_ShakeMon_Step` writes the sprite's x2 absolutely (0 / 3 alternating, then **stays 0** to the end of the body): the front-idle rest x2 (RATTATA 1) is gone for the rest of the body (probe `battlerSeries`: opp x2 = 1 until age 36, then 0/3, 0 at age 84). Live draws `rest x2 + shake x` = 1/4 -> sprite 1 px right of the ROM for every later row. Accepted Chansey/ONIX-free rows never exposed it (rest 0) | `src/engine/battleScene.ts:27296` (Signal Beam branch: `input.targetSprite.x2 + targetShake.x`; attacker twin `input.attackerSprite.x2 + attackerShake.x` at `:27286`) | once the shake task's local age >= 1 (target: age - 36, attacker: age - 10) use `0` instead of `sprite.x2` (the shake overwrites x2 and never restores the rest) | `signal-beam-shake-drops-idle-x2.diff` (2 values), applied in place, 2 fresh runs identical, reverted (`git status src` clean); `patch-receipts/rattata-signal-beam-*.json` |
| Signal Beam 324 | opponent-side RATTATA ATTACKER (`rattataA-signal-beam-opponent-ariados-player-chansey`; rows 11-143 of 144, 410 px/row) | 54,510 -> **0** (144/144) | same: the attacker's shake task (start age 10) overwrites x2 (opp x2 = 1 until age 1, 0 from age 10) | same patch (attacker line) | same | same patch |
| Fire Punch 7 (and consistency) | shiny attacker (player STEELIX and opponent STEELIX, 4 rows) | 186,446 / 198,970 px, **identical with the shiny gate lifted and with personalities supplied** | The `case 7` live config (`liveMoveAnimation.ts:1861`) has **no `liveBattlerIsShiny` gate** (the other live adapters decline, e.g. `:2403`, `:2426`): a shiny battler engages the adapter with the non-shiny palette (colour pairs `bd9c5a<-849cad` 706, `8c6b52<-4a5a7b` 462, `e7c673<-bdcec6` 462: shiny gold vs normal grey-blue, field only, constant 1,846 px/row from age 0). No shiny palette exists (docs/live-species-audit-5.md), so exactness is unreachable; the defect is only the missing decline (wrong colours instead of the fallback) | `src/engine/liveMoveAnimation.ts:1861` (before `config = { move: "FIRE_PUNCH"`) | add `if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;` | `fire-punch-shiny-gate.diff`: the rows go to the (non-exact) fallback, 319,593 / 362,616 px, 2 fresh identical (`patch-receipts/fpgate/`); not an exactness fix |

### Non-defect table

| Row(s) | Result | Verdict |
|---|---|---|
| Curse 174, opponent-side RATTATA / ONIX TARGET (`{rattata,onix}-stats-player-snorlax-opponent-magikarp`) | 0/176, 226,725 / 346,581 px (410 / 1,091 px per row from age 0) | **DECLINE confirmed** (`liveOamMoves.ts:394-396`, non-zero idle rest of attacker or target). **Over-conservative for the TARGET**: with the gate removed (`lift-idle-rest-gates.diff`, in place, 2 fresh identical, reverted) both are **176/176, 0 px** (`patch-receipts/idle-gates-lifted/`). Attacker-side RATTATA/ONIX Curse rows were not reachable (swapped mon moves first -> reordered), so the attacker half of the gate is unproven |
| Psych Up 244, opponent attacker RATTATA / ONIX | 5/179, 2.95 M / 2.90 M px | **DECLINE confirmed** (`liveBgSnapshotMoves.ts:202`, opponent attacker non-zero rest). With both PU idle gates lifted: 171/179, 3,280 / 8,728 px (not exact): the decline is correct (the attacker's rest/sway is not modeled) |
| Shiny STEELIX attacker, Curse (2), Signal Beam (2), Octazooka (2), Psych Up (1), Lovely Kiss / Spikes (not run: reordered/missing body) | 0 exact, 146k-446k px | **DECLINE confirmed**: with `lift-shiny-gate.diff` (`liveBattlerIsShiny -> false`, harness supplies `attackerPersonality`): Curse gate on 375,983 / 418,547 -> off 324,896 / 346,720 (engaged, shiny palette missing); Signal Beam 446,471 / 411,770 -> 281,280 / 266,545; Octazooka 166,346 / 237,779 -> 155,605 / 145,834; Psych Up 3.00 M -> 364,110. The gate (not another decline) rejects it. Fire Punch: no gate (defect table) |

### Coverage grid (`coverage-grid.txt`; ok = 0 px twice fresh, X = residual; "attacker opponent" = target is the player-side back sprite)

| Move (grid key) | Swap | Orientation | Species |
|---|---|---|---|
| fp | attacker | attacker opponent | pichu ok, shinysteelix X, steelix ok, tyranitar ok, wailord ok |
| fp | attacker | attacker player | flygon ok, golbat ok, onix ok, pichu ok, rattata ok, shinysteelix X, steelix ok, tyranitar ok, wailord ok |
| fp | target | attacker opponent | flygon ok, golbat ok, onix ok, pichu ok, rattata ok, tyranitar ok, wailord ok |
| fp | target | attacker player | flygon ok, golbat ok, onix ok, pichu ok, rattata ok, tyranitar ok, wailord ok |
| lovely-kiss | attacker | attacker opponent | flygon ok, pichu ok, rattata ok, tyranitar ok, wailord ok |
| lovely-kiss | attacker | attacker player | pichu ok, tyranitar ok |
| lovely-kiss | target | attacker opponent | flygon ok, pichu ok, rattata ok, shedinja ok, steelix ok, tyranitar ok, wailord ok |
| lovely-kiss | target | attacker player | flygon ok, pichu ok, rattata ok, shedinja ok, steelix ok, tyranitar ok, wailord ok |
| octazooka | attacker | attacker opponent | shinysteelix X, steelix ok |
| octazooka | attacker | attacker player | shinysteelix X, steelix ok |
| octazooka | target | attacker opponent | flygon ok |
| octazooka | target | attacker player | flygon ok |
| pua | attacker | attacker opponent | flygon ok, golbat ok, onix X, pichu ok, rattata X, shedinja ok, shinysteelix X, steelix ok, tyranitar ok, wailord ok |
| pua | target | attacker opponent | flygon ok |
| signal-beam | attacker | attacker opponent | flygon ok, pichu ok, rattata X, shinysteelix X, steelix ok, tyranitar ok, wailord ok |
| signal-beam | attacker | attacker player | flygon ok, pichu ok, rattata ok, shinysteelix X, steelix ok, tyranitar ok, wailord ok |
| signal-beam | target | attacker opponent | pichu ok, rattata ok, steelix ok, tyranitar ok, wailord ok |
| signal-beam | target | attacker player | pichu ok, rattata X, steelix ok, tyranitar ok, wailord ok |
| spikes | attacker | attacker opponent | flygon ok, pichu ok, rattata ok, tyranitar ok, wailord ok |
| spikes | attacker | attacker player | flygon ok, pichu ok, rattata ok, tyranitar ok, wailord ok |
| spikes | target | attacker opponent | flygon ok, pichu ok, rattata ok, shedinja ok, steelix ok, tyranitar ok, wailord ok |
| spikes | target | attacker player | flygon ok, pichu ok, rattata ok, shedinja ok, steelix ok, tyranitar ok, wailord ok |
| stats | attacker | attacker opponent | shinysteelix X, steelix ok |
| stats | attacker | attacker player | shinysteelix X, steelix ok |
| stats | target | attacker opponent | flygon ok, golbat ok, onix ok, rattata ok |
| stats | target | attacker player | flygon ok, golbat ok, onix X, rattata X |
non-identical receipts: 0

Not reached (staged but turn order changed or body missing -> dropped, see `derive.txt`): Octazooka target swaps except FLYGON (the swapped target moves first), STEELIX / PICHU / RATTATA / WAILORD / TYRANITAR; Lovely Kiss player STEELIX / FLYGON / RATTATA / WAILORD attacker
(body missing: sleep immunity / reorder); SHEDINJA as Signal Beam / Octazooka target and as Curse / Fire Punch swap (reordered or no body end); WAILORD / TYRANITAR / PICHU / ONIX as Curse swaps (reordered);
Psych Up target swaps except FLYGON; Fire Punch ONIX/RATTATA pairs where both turn orders held. Not staged: ONIX swaps for Signal Beam / Lovely Kiss / Spikes / Octazooka (accepted targets already ONIX), Fire Punch staged-script fixtures, `-alt`/`-extra` pairs, SHEDINJA attacker, GOLBAT for the four low-weight moves.
Elevated opponents FLYGON (7) exact as target and attacker for Fire Punch, Curse, Psych Up, Lovely Kiss, Spikes, Signal Beam, Octazooka (where staged); GOLBAT (8) exact for Fire Punch / Curse / Psych Up; SHEDINJA (8) exact for Lovely Kiss and Spikes targets and Psych Up attacker (genderless).

## 2. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py
W=tools/integration/fixtures/species-audit-6
tools/integration/speciesAudit6Stage.sh                       # list*.tsv + scenarios/   (reuses speciesAudit5Probes.sh)
cat $W/list1.tsv $W/list2.tsv $W/list3.tsv > /tmp/s6all.tsv; JOBS=10 tools/integration/speciesAudit5Probes.sh /tmp/s6all.tsv /tmp/s6/probes
python3 tools/integration/speciesAudit6Derive.py /tmp/s6all.tsv /tmp/s6/probes $W/derived > $W/derive.txt   # delete REORDERED / BODY-* rows' fixtures (not first/known bodies)
tools/integration/speciesAudit6Run.sh /tmp/s6/receipts 12 'steelix-*' 'pichu-*'   # run script: receipts to the given dir, 2 fresh runs per row
python3 tools/integration/speciesAudit6Summary.py /tmp/s6/receipts
tools/integration/speciesAudit6Patch.sh $W/signal-beam-shake-drops-idle-x2.diff /tmp/s6/p rattata-signal-beam-player-ariados-opponent-chansey   # applies, runs, ALWAYS reverts
git apply $W/harness-display-name.diff; OUT_DIR=/tmp/s6/h npx vite-node tools/integration/speciesAuditDense.ts $W/derived/mrmime-magneton-pua.json; git apply -R $W/harness-display-name.diff
# diagnosis: speciesAudit6Map.ts (ROM/live/diff PPM + row histogram), speciesAudit6Shift.ts (best integer shift), speciesAudit5Run.ts / speciesAudit5Diff.ts (colour pairs)
```
PAPERCUTS: harness names battlers by species constant (every punctuated name wrong), ~10 min; derive's `bodyIndex` / `precedingBodies` for fixtures with preceding bodies had to keep the accepted lists (statAnimation keys), ~5 min; `prep14Probe` bodies with no end (`end: None`) crash the derive, ~2 min; the date clock in this sandbox is unreliable.
