# Live audit 21 (S10A side lane, 2026-10-10): the live claims of land82 (doll cells), cast83 (Castform forms), and flat84's Quick Attack residual

**One DEFECT: player Quick Attack 98.** `src/animation/quickAttack.ts:145-148` sets `targetBaseX2 = -1` (the target 1 px left) for a player
attacker from reducer age 58 (live age 14). That constant was fitted on prep7's one accepted pair, PIDGEOTTO -> ONIX at its first body.
- Every other measured player Quick Attack shows the ROM's target at x2 0: 14,223..18,704 px at ages 14..32 on **16 / 18** windows.
  The targets are NIDORINO, SNORLAX, CROBAT, and ONIX after its first body.
- flat84's named residual is this defect. It is not specific to NIDORINO.
- Temp patch `patches/audit21-quick-attack-target-base-x2.diff` (`targetBaseX2: 0`): those 16 go to **0 px**. The 2 ONIX first-body windows
  regress 0 -> 18,724 px.
- Section 1.2 has the fix shapes.

**The priority Castform check is an ARTIFACT, not a defect.** cast83's normal-form residuals are the checker's window alignment:
- Ember 11.6k, Flamethrower 189k..252k, Scary Face 1.37M..1.46M px.
- The production adapters' accepted windows start at the ROM activation + 4. cast83Check started them at the activation, as audit 20's
  Toxic did.
- Aligned, **every** Ember / Flamethrower / Scary Face window is 0 px:
  - Castform normal form vs SNORLAX / AZURILL / cast83's own species, both sides;
  - the non-Castform HOPPIP control;
  - cast83's sun / hail form windows under a temp patch that lifts those keys.
- One exception: a single Scary Face row at age 129, 2,420 px, one blend step.
- Icy Wind in rain is a TIMING-PHASE (lag-frame) residual. It is independent of rain and of Castform.

**land82's doll cells hold for the other species.** Every landed cell is 0 px where the harness lends an order:
- the swap composites;
- the defender dolls, including the hit that breaks the doll and a re-subbed doll's hit;
- Sunny Day under sandstorm.

Method:
- Base: master `5af9bdb51` (production src `e7a4775e`), unpatched. No shared oracle was touched; direct mGBA only.
- Castform / Quick Attack / form-change families: live audits 18 / 19 / 20's method (`audit21Check.ts` = `cast83Check.ts` = `audit19Check.ts`
  + the slot form).
  - Battle-lab scenarios with the explicit lab seed 305420349 (ISSUES #154).
  - One probe derives the consumer fixtures.
  - The check replays the history through the production hosts as the orchestrator does: order host + plans + words lends, allocator,
    the hide, the presentation-only Castform form.
  - It renders the production live view (CHAIN and ENTRY lends) against two more fresh direct-mGBA probe processes, with r1 == r2.
  - New: an **aligned** window (`audit21Align.py`: `bodyStartFrame` / `bodyEndFrame` name the probe body; `startFrame` / `endFrame` /
    `ageOffset` are the production adapter's accepted window).
- Doll family: doll81's harness, run unchanged on THIS tree's production code (land82 landed the cells; no patch).
  - `speciesAudit14SwapCheck.ts` -> `attdollLiveCheck.ts` for attacker composites, with the k+1 / k+2 tail rows.
  - `prep38Check.ts` for defender dolls (control calibrated, test at its shift).
  - Lab seed 305419897, two fresh probe runs per scenario, r1 == r2.
- No existing tracked file was edited. Evidence: `tools/integration/fixtures/audit-21/`.

## 1. Results

### 1.1 Defect table

| Unit / window | Verdict | px before -> after (patch) | Evidence |
|---|---|---|---|
| **Player Quick Attack 98**, any first or later body whose target the ROM leaves at x2 0 (NIDORINO, SNORLAX, CROBAT; ONIX after its first body) | **DEFECT** (production) | **14,223 / 14,229 / 14,957 / 18,704 -> 0** on 16 / 18 windows (CHAIN and ENTRY) | `receipts/check/check-a21-qa-*.json` (before), `receipts/qa-patched/` (after), `patches/audit21-quick-attack-target-base-x2.diff`. Mechanism in 1.2 |
| Player Quick Attack, ONIX first body (prep7's pair PIDGEOTTO -> ONIX, and NIDORINA -> ONIX) | **EXACT** today; the patch regresses it | 0 -> 18,724 (2 windows) | The ROM shows ONIX 1 px left here only (ROM `bdb5b5` where the patched view draws background) |
| cast83 normal-form Ember 52 / Flamethrower 53 / Scary Face 184 "residuals" (by / at Castform) | **ARTIFACT** (checker window alignment) | 11,453..12,312 / 188,146..243,584 / 1,410,488..1,462,068 -> **0** | Ablation `receipts/aligned/` (`audit21Align.py`). The accepted windows: Ember altspecies9 activation + 4 (63 rows); Flamethrower activation + 4 with ageOffset -11 (126 rows); Scary Face `next-scary-face-*` activation + 4 (`shadowRow -4`, 190 rows). The non-Castform HOPPIP control has the same raw px and the same 0 aligned |
| cast83 keys 52:by:1, 53:by:1, 184:at:3 (sun Ember / Flamethrower, hail Scary Face), today declined as "measured residual" | **ARTIFACT** -> liftable | fallback (declined) -> **live 0 px** on 14 / 14 windows | `receipts/c83-aligned/` (before: `live=False`, the decline reason) vs `receipts/c83-aligned-lifted/` (patch `audit21-castform-residual-keys-lift.diff` on a git-archive copy) |
| Icy Wind 196 "in rain" (cast83: 332k..337k px, unexplained) | **TIMING-PHASE** (D4 class) | 337,665..342,816 px on ages 263..285 | `receipts/lag.txt`: the residual windows have lag ages `[241, 242]` (286 rows). The 0 px windows also have the lag at **261** (287 rows). This shows with **normal-form** Castform (3 / 12 windows) and with **no Castform in rain** (HOPPIP, 1 / 8). Not rain, not the form. Lifted, cast83's rain windows stay 2 / 8 exact |
| Scary Face at a player Castform, AZURILL's third body (`a21-cn-scary-face-at-cfply-azurill-c2`, aligned) | one-row residual, **unclassified** (cast83's hail-form and ctl Scary Face windows are 0 aligned) | 2,420 px at age 129 only (one blend step `1e1800` vs `261e00`, x 23..120) | Lag ages are identical to its 0 px comparators (`[59, 60, 138..141]`), and ENTRY = CHAIN. The other 9 / 10 Scary Face windows are 0 |

### 1.2 The Quick Attack defect

What production draws: `quickAttackAnimationAtAge` (`src/animation/quickAttack.ts:137-153`) returns `targetBaseX2: attackerSide === "player"
&& age >= QUICK_ATTACK_IMPACT_FIRST_AGE ? -1 : 0`. The live adapter (`liveMoveAnimation.ts` `case 98`, `animationAgeOffset` 44) maps live
age 14 to reducer age 58. From there to the end of the 33-row window, the opponent is drawn 1 px left of the ROM. The rows:
- ages 14..23: 636..639 px per row (the shake rows);
- ages 24..32: a constant 872 px (NIDORINO).

The ROM script (`Move_QUICK_ATTACK`) has no such offset: `AnimTask_ShakeMon(ANIM_TARGET, 5, 0, 6, 1)` ends with `x2 = 0`.

| Pair (player -> opponent), lab seed 305420349 | windows | before (CHAIN / ENTRY) | after `targetBaseX2: 0` |
|---|---|---|---|
| NIDORINA -> NIDORINO (flat84's) | 3 (first + 2 later) | 14,223 / 14,223 each | **0 / 0** |
| PERSIAN -> NIDORINO | 3 | 14,223 / 14,223 | **0 / 0** |
| NIDORINA -> SNORLAX | 3 | 14,229 / 14,229 | **0 / 0** |
| AZURILL -> CROBAT (elevated target) | 3 | 14,957 / 14,957 | **0 / 0** |
| PIDGEOTTO -> ONIX (prep7's accepted pair) | c0 first body | 0 / 0 | 18,724 / 18,724 |
| | c1, c2 (ONIX already acted) | 18,704 / 15,274 | **0** / 33,998 |
| NIDORINA -> ONIX | same as PIDGEOTTO -> ONIX | same | same |

The ONIX first body is the only window where the ROM shifts the target. Its cause is not found in the time box. The candidate is a
pre-first-body sprite state of the big ONIX sprite (it is not HP: the target is at full HP at c0 in every pair). The ENTRY lend diverges
from CHAIN only on ONIX's later bodies, so production's Quick Attack also has an order input there.

Fix shapes (production, not applied):
1. **(measured)** `targetBaseX2: 0`. Gives 16 / 18 -> 0 px; ONIX's first body regresses (2 windows, 18,724 px).
2. **(fail-closed narrowing)** keep -1 only for what was measured (the target's first body with ONIX) and decline the player Quick
   Attack elsewhere. That needs the first-body condition, and it trades a 1-px shift for a 33-frame fallback.

The resume input is the ROM condition for ONIX's c0 shift: the opponent sprite's `x` / `x2` at activation, before vs after its first body.
Quick Attack is live on both sides today. The opponent side was 0 px in flat84; its audit-21 control probe crashed (exit 139, no output)
twice and was dropped.

### 1.3 Coverage (`receipts/summary-*.txt`, `receipts/doll/summary.tsv`)

All counts are windows; r1 == r2 holds on every one.

| Family | windows | live | 0 px | verdicts |
|---|---|---|---|---|
| cn: Castform NORMAL form, Ember / Flamethrower by it, Scary Face at it, vs SNORLAX / AZURILL, both sides (12 scenarios) | 34 | 34 | raw 0; **aligned 33** | ARTIFACT 33 (alignment); 1 one-row Scary Face (1.1) |
| cx: HOPPIP (non-Castform, elevated small) in Castform's place, cast83's species (6) | 17 | 17 | raw 0; **aligned 17** | ARTIFACT 17 |
| c83: cast83's own ctl + sun / hail form windows (aligned), and rain Icy Wind (16 scenarios) | 39 | before 17 (the ctl), after the lift 39 | before 17; after 39 live, **33 0 px** | ARTIFACT 31 (ctl 17 + lifted sun Ember 6 / Flamethrower 6 / hail Scary Face 2); TIMING-PHASE 6 + 2 exact (rain Icy Wind, lifted) |
| iw: Icy Wind normal-form control (Castform normal) and rain with HOPPIP (8) | 20 | 20 | 16 | TIMING-PHASE 4 (lag phase, `lag.txt`) |
| qa: player Quick Attack, 6 pairs (6) | 18 | 18 | 2 before; **16 after patch** | DEFECT 16; EXACT 2 (ONIX first body) |
| cf: form CHANGES mid-battle, opponent Castform's AI alternates sun / rain (3) | 17 | CHAIN 5, ENTRY 17 | CHAIN 5 / 5 live, ENTRY 17 / 17 | EXACT (form tracking through up to 4 changes: ENTRY live 0 px on every window). 12 CHAIN windows decline on Shock Wave's pre-existing case-local gate (fail-closed, as cast83 recorded) |
| doll att: swap composites of the landed cells, SNORLAX / AZURILL / CROBAT pairs (22 att / self scenarios) | 33 cell composites | 33 presented (1 SolarBeam fire turn declines by design) | 22 (every order-known composite) | EXACT 22; ORDER-UNKNOWN 10 (Dream Eater later windows: doll81's documented semantics; Sunny Day after the defender's RAIN_DANCE: the harness lends no order after a Rain Dance words unit, see Not reached); SolarBeam t1 1 (declined, the doll-free control's own residual) |
| doll def: Leaf Blade / ThunderPunch on the doll, first + LATER bodies, incl. the doll-BREAKING hit and a re-subbed doll's hit (12 scenarios) | 12 first + 44 later | all | 53 | EXACT 53; 3 + 6 CROBAT ThunderPunch windows = 200 px row 0 (its control's own elevated-attacker shadow, doll81's documented class) |
| doll81 GENGAR -> GOLBAT re-run (k+1 tail control, 3) | 7 | 7 | 7 | the k+1 tail row's 200 px recurs with doll81's own pair (below) |

Doll notes:
- **The doll that breaks.** With the player attacker and the opponent's doll, the doll's subHP goes 39 -> 10 -> 0. Windows:
  - `test2` is the body that breaks it: General_SubstituteFade follows at frame 4278.
  - `test3` is the hit on the re-subbed doll.
  - Both are 0 px for Leaf Blade and ThunderPunch (`receipts/doll/later/`).
  - The `-break` scenarios (attack IV 31 + 252 Atk EVs) give the same trajectory as the plain ones; the lab did not change the damage
    there. The break was reached through the 3rd hit instead.
- **Sunny Day with weather active.**
  - Under SANDSTORM (both sides): order known, 0 px, 4 / 4 composites.
  - Under RAIN (both sides): the harness lends `order none`, because `fixtureSpriteOrder` has no plan unit for Rain Dance (a words unit).
    Production then presents the swaps, and the body rows fall to the static field: 766,746 / 851,601 px. This is doll81's
    order-unknown semantics.
  - Whether production's own host (words lend) knows the order there is not reproduced by this harness. Not reached.
- **The k+1 tail row:** 200 px whenever the opponent is elevated (CROBAT here; GOLBAT in doll81's own GENGAR pair, re-run here). This is
  the next command's first row: the opponent shadow's latch. It is pre-existing and outside the composite window. It is not new to land82.

### Not reached

- **Census routes 564 / 587** (Factory battles). land82 measured them with `land82Parity.ts` (ON / OFF parity); no ROM-pixel route harness
  was built here.
- **Castform** switching out and back in while in a form, fainting in a form, and the weather ENDING (the revert to normal).
  `audit21Fixtures.py` derives the form from the latest weather move, so a weather end needs the RAM `gBattleMonForms` first.
- Scene OFF / fallback frames with a form (the cf CHAIN declines render the fallback, but the form is not separable from those px).
- A shiny-free elevated ATTACKER behind a doll for Lovely Kiss / Sunny Day is covered by CROBAT. An idle-rest species was not chosen
  deliberately.
- The opponent-side Quick Attack control (probe crash, above).

## 2. Reproducibility

- `audit21Run.sh` run B (fresh dirs, 22:00..22:10) produced the committed `receipts/`. Every per-scenario receipt from the earlier run A
  (Castform; 21:39..21:43) and the doll exploration is **byte-identical** in run B. Only the aggregate files grew, by the new windows:
  0 lines removed.
- **Run C** (fresh dirs, 22:10..22:21, concurrent with `npm test`): staged scenarios, derived fixtures, aligned fixtures and doll
  scenarios == committed, and **receipts == committed (byte-identical)**: every check JSON, summary, `lag.txt` and doll receipt.
- No ROM drift was seen. One probe process (`a21-qa-opp-nidorino-nidorina`) crashed with exit 139 and no output, twice; the scenario was
  dropped.

Gates (evidence only):
- `npm test`: 1,616 files / 13,272 tests passed, 44 files / 223 tests skipped, 0 failed (concurrent with run C);
- `npm run build`: green;
- `git diff --check 5af9bdb51..HEAD`: clean;
- every change since `5af9bdb51` is an added file in the audit21 set; no existing tracked file is modified.

## 3. Reproduction (from workspace/; direct mGBA only; production src is never patched)

```
sh tools/integration/audit21Run.sh <fresh-receipt-dir> <fresh-scratch-dir>     # ~10 min alone: stage == committed -> probe -> derive == committed
    # -> align == committed -> checks (unpatched check/ aligned/ c83-aligned/; patched copies c83-aligned-lifted/ qa-patched/)
    # -> lag.txt -> doll family (probes twice, att / def / later checks) -> diff -r vs receipts/
node --experimental-strip-types --no-warnings tools/integration/audit21Check.ts tools/integration/fixtures/audit-21/aligned a21-cn-ember-by-cfopp-snorlax <out.json>
node --experimental-strip-types --no-warnings tools/integration/audit21Check.ts tools/integration/fixtures/audit-21/fixtures a21-qa-ply-nidorina-nidorino <out.json>
# a patch on a copy: mkdir t && git archive HEAD | tar -x -C t && ln -s $PWD/node_modules t/node_modules
#   && patch -p1 -d t < tools/integration/fixtures/audit-21/patches/audit21-quick-attack-target-base-x2.diff
#   && node --experimental-strip-types --no-warnings t/tools/integration/audit21Check.ts tools/integration/fixtures/audit-21/fixtures a21-qa-ply-nidorina-nidorino <out.json>
```

Tools:
- Castform / Quick Attack / form changes: `audit21Stage.py`, `audit21Fixtures.py`, `audit21Align.py`, `audit21Check.ts`, `audit21Summary.py`.
- Doll family: `audit21DollStage.py`, `audit21DollProbes.sh`, `audit21DollDefFixtures.py`, `audit21DollLater.py`, `audit21DollSummary.py`.
- Runner: `audit21Run.sh`.

Fixtures (`tools/integration/fixtures/audit-21/`):
- `scenarios/` (35), `fixtures/` (106), `aligned/` (106), `c83-aligned/` (39 copies of cast83 windows);
- `doll/scenarios/` (34 + list.tsv);
- `patches/` (2 `.diff`, `.gitattributes` `*.diff -whitespace`);
- `receipts/` (check JSONs, summaries, `lag.txt`, `doll/`). No RGB dumps.
