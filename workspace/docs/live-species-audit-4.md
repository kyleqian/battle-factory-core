# Live adapter species audit 4 (S10A side lane, 2026-10-06): the P3 first-body adapters (Overheat, Silver Wind, Psych Up)

Method of `docs/live-species-audit.md` / `-2.md` / `-3.md`: swap the species in a copy of the accepted lab scenario; the window, healthbox HP / gender and
attacker personality come from the swapped scenario's OWN ROM state (prep14Probe `atActivation`, activation frame + accepted offset 0; never live output);
production live view vs fresh direct-mGBA frames; **2 fresh runs, identical digests for every row** (`identical true` in all 34 receipts). None of the three
moves is Random2 (no `presentationRngActivation` in the accepted fixtures; the probe's `gRng2` is recorded in `derive.txt` only). Every kept row is a FIRST body
(`bodyIndex 0`, no `precedingBodies`). Evidence: `tools/integration/fixtures/species-audit-4/` (receipts/, patch-receipts/, patches/, derived/, scenarios/, derive.txt).

## 1. Results first

34 swapped rows run: **29 exact (0 px), 5 residual, all 5 = the documented adapter DECLINES (not defects)**. **No SPECIES-DEFECT found** in the
Overheat / Silver Wind / Psych Up adapters, their palettes (`liveMovePaletteComposite.ts`) or inputs (`liveBgSnapshotMoves.ts`).

### Defect table

| Move | Side / species | px before -> after patch | Mechanism | File:line | Fix shape | Patch proof |
|---|---|---|---|---|---|---|
| (none) | - | - | - | - | - | - |

### Non-defect table

| Row | Result | Verdict |
|---|---|---|
| Overheat, player SOLROCK -> opponent **RATTATA** target | 7/230, 3,473,708 px | **DECLINE confirmed** (`liveOverheatInputs`, `liveBgSnapshotMoves.ts:65`: `target.frontIdleRest` non-zero; RATTATA rest x2 = 1 per audit 3). The live view falls back to the non-exact path |
| Overheat, player SOLROCK -> opponent **ONIX** target | 7/230, 3,354,623 px | **DECLINE confirmed** (same gate, ONIX has a non-zero idle rest) |
| Overheat, opponent attacker MAGCARGO -> **RATTATA** attacker | 7/230, 3,390,922 px | **DECLINE confirmed** (same gate on `attacker.frontIdleRest`) |
| Psych Up, player JUMPLUFF -> opponent **RATTATA** target | 0/179, 3,103,872 px | **DECLINE confirmed** (`liveBgSnapshotMoves.ts:199`) |
| Psych Up, player JUMPLUFF -> opponent **ONIX** target | 0/179, 3,013,559 px | **DECLINE confirmed** (same gate) |

Decline probe (`patches/lift-idle-rest-gates.diff`, applied in place, 2 fresh runs identical, reverted; `git status src` clean): with both gates lifted the rows go from
~3.0-3.5 M px to **73,390 / 195,289** (Psych Up RATTATA / ONIX), **44,253 / 117,739** (Overheat RATTATA / ONIX target) and **14,760** (Overheat RATTATA attacker, 194/230 exact),
i.e. the inputs do not model the idle x2/y2 offset, so declining is correct, and lifting the gate alone would not give exactness. FYI for a future lift: the residual is the
missing idle offset (same missing input as audits 1-3: `frontIdleRest` of the OBJ), not a palette literal.

Interesting non-declines: **Silver Wind has no idle-rest gate and is exact with RATTATA / ONIX / SHUCKLE / GOLEM / GOLBAT on both sides** (the monbg/spiral path takes the rest
offsets from the anchors). Overheat is exact with a RATTATA/SHUCKLE/GOLEM/GOLBAT/ONIX player-side (back sprite, rest 0) battler and with GOLEM/GOLBAT/SHUCKLE/ONIX attackers.

## 2. Coverage (everything exact twice unless noted)

| Move (id) | opponent target: GOLBAT / SHUCKLE / GOLEM / RATTATA / ONIX | player-side target (opponent attacker): GOLEM / RATTATA / SHUCKLE / ONIX | player attacker swap: GOLEM / GOLBAT / RATTATA / SHUCKLE | opponent attacker swap: GOLEM / GOLBAT / RATTATA / SHUCKLE |
|---|---|---|---|---|
| Overheat 315 (0.77%) | exact / (accepted) / exact / DECLINE / DECLINE | exact / exact / (accepted) / exact (ONIX) | exact x4 | exact / exact / DECLINE / exact |
| Silver Wind 318 (0.52%) | exact / exact / exact / exact / (accepted) | exact / exact / exact (SHUCKLE) / (accepted) | exact / exact / exact / not staged (reordered) | not staged (reordered) / exact / exact / not staged (reordered) |
| Psych Up 244 (0.37%, player only) | exact / (accepted) / exact / DECLINE / DECLINE | n/a (player only) | exact / exact / exact / not staged (reordered) | n/a |

**Not staged**: SHUCKLE (any side) and opponent GOLEM as Silver Wind / Psych Up attackers, and the SHUCKLE player Psych Up attacker: the swapped mon is slower, the
battle reorders (the attacker's body would be body 1/2, which the first-body adapters decline), even with the swapped mon at 252 speed EV. Harness limit (needs another
speed staging), not production. Not reached: the alt-pair fixtures (`overheat-alt-player-charizard-golem` etc.), Psych Up opponent attacker (documented unverified), and
elevation of the player-side attacker (no elevated back sprite exists). Turn order was kept at "attacker first" by raising the non-swapped attacker's speed EV to 252
for all target swaps (`--boost attacker`), and the swapped attacker's own speed EV to 252 for player attacker swaps. Staging fix: a genderless fixture party (SOLROCK) swapped to
a gendered species is set to `gender: male` (the lab otherwise rejects it).

## 3. Reproduce (workspace root; direct mGBA only)
```sh
export PYTHONPATH=../../vendor/libmgba-py
W=tools/integration/fixtures/species-audit-4
tools/integration/speciesAudit4Stage.sh          # list.tsv / listA.tsv / listB.tsv + scenarios/
cat $W/list*.tsv > /tmp/s4all.tsv; tools/integration/speciesAudit4Probes.sh /tmp/s4all.tsv /tmp/s4/probes
python3 tools/integration/speciesAudit4Derive.py /tmp/s4all.tsv /tmp/s4/probes $W/derived     # rows marked REORDERED in derive.txt were deleted (not first bodies)
tools/integration/speciesAudit4Dense.sh /tmp/s4/dense 6 '*'                                     # 2 fresh runs per row, ~5 min for 19 rows at 6 parallel
tools/integration/speciesAudit4Patch.sh $W/patches/lift-idle-rest-gates.diff /tmp/s4/patch <stem>...   # applies, runs, ALWAYS reverts
```
PAPERCUTS: swapped slower attackers reorder the turn (need an attacker-speed boost option, added as `--boost`), ~5 min; lab rejects genderless -> gendered species swaps, ~3 min.
