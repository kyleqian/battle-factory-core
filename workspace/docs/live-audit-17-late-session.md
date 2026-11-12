# Live audit 17 (S10A side lane, 2026-10-09): routes made live LATE this session (fly63, dt60) that audit 16 did not reach

Method = audit 16's (docs/live-audit-16-session-chains.md): battle-lab scenarios with an explicit lab seed (305420349, ISSUES #154), one
probe to derive the consumer fixtures, then `audit17Check.ts` per scenario replays the history through the production hosts as the
orchestrator does today (order host + geometry plans, allocator) and renders `liveAdapterFramebuffer.ts`'s `liveView` with the CHAIN lend
and the ENTRY lend (body alone), against **two more fresh direct-mGBA probe processes** (r1 == r2 per-row digests). Master `6e533d4b6`
(src `d7f24b03`). No shared oracle was touched. Evidence: `tools/integration/fixtures/audit-17/`.

**Totals.** 104 consumer windows (88 fly63 + 16 dt60), all live, all with the order lend KNOWN, every window r1 == r2 (chain and
entry). A from-scratch reproduction (`audit17Run.sh`: stage == committed, derive == committed, two more fresh runs per window) gave
**104 / 104 windows byte-identical digests / px / rows** (`receipts/repro/compare.txt`), plus the identical dt60 table and ablation.
- **67 / 104 windows are 0 px** (51 / 88 fly63, 16 / 16 dt60).
- **One DEFECT (HISTORY):** a live body of the OTHER battler while a Fly / Bounce charger is hidden draws the hidden battler.
  20 windows (Heal Bell 10, Double Team 10; Fly and Bounce; both sides) -> **0 px** with a reverted in-place patch.
- Consumers right after a Fly / Bounce UNLEASH: **0 px, order KNOWN** (Thunderbolt 7, Ice Beam 7, Heal Bell / Double Team /
  Sky Uppercut after the strike: every one 0 px except the Sky Uppercut lag-frame phase below, which the no-unit control has too).
- dt60: **prediction == RAM `data[3]` 16 / 16** (8 Factory Double Team users outside dt60's grid, both classes, both sides), 16 / 16 0 px.

## 1. Results first

### Defect table

| Unit -> consumer | Side / species | px before -> after patch | Mechanism | file:line | Fix shape |
|---|---|---|---|---|---|
| Fly 19 / Bounce 340 CHARGE (attacker hidden) -> Heal Bell 215 / Double Team 104 of the other battler in the hidden span | SNORLAX hidden / CHANSEY consumer, both sides; Fly and Bounce | per window: Heal Bell ply 610,164 -> **0**, opp 420,471 -> **0**; Double Team ply 372,060 -> **0**, opp 256,149 -> **0** (20 windows; `receipts/main` -> `receipts/patch-hidden`, r1 == r2 both) | fly63 / prep27 keep a presentation-only hide (`applyLiveSemiInvulnerableCommand`, `battleResolutionPresentationRender.ts:1099`) and apply it ONLY as `view.visibility.<side>.sprite` (`:1529` / `:1552`). The live move path of `renderBattleResolutionLiveView` (`battleScene.ts:55196` ff., `renderSceneOnMovePresentation`) never reads `view.visibility`; every live adapter draws both battlers from `liveSceneOnBattlerArt` (`battleScene.ts:14895`). So the ROM's invisible charger (bbox x 144..207 y 19..71 / x 41..102 y 71..111, ROM BG f7f7ff vs live sprite) is drawn on every row. History-keyed, not species-keyed. | `src/engine/battleScene.ts:14895` (`liveSceneOnBattlerArt`), `:55196` (where `liveSubstituteDollSides` is set from the view) | `receipts/patch-hidden/audit17-hidden-sprite.patch` (git apply --unidiff-zero; reverted): a hidden-sides flag set from `view.visibility` next to `liveSubstituteDollSides`, and `liveSceneOnBattlerArt` returns a blank (index-0) tileset for a hidden side. Adapters with their own art lookup need the same (Sky Uppercut `artFor`, `battleScene.ts:36228`: `receipts/patch-hidden-sky-uppercut/`). Alternative: decline a live body while the other battler is hidden. Census impact NOT measured. |

The check's hide replay uses the production function itself, fed one `move-animation` command per MOVE_ANIMATION of the history. A
strike with NO body (it missed: CHANSEY's Double Team evasion, `fly-double-team-opp-c3`) gets the `sprite-visibility` command the
orchestrator receives from MOVEEND_ATTACKER_VISIBLE; the fixture history has no event for it, so `audit17Check.ts` infers it (the
hidden battler's opponent plays a second body before the hidden battler's next body). Without that rule c3 would be wrongly hidden
(256,149 px under the patch; 0 with it, and 0 in production, which never applies the hide to live bodies).

### TIMING-PHASE (counter evidence: `receipts/sky-uppercut-lag-counters.txt`, `issue151Counters.sh`, 2 fresh runs each, identical)

| Consumer | Windows | Residual | Counter evidence | Verdict |
|---|---|---|---|---|
| **Sky Uppercut 327 at a HIDDEN Fly / Bounce user** (the hit lands on the semi-invulnerable target) | 10 (ply 3, opp 7; Fly 6, Bounce 4); ROM window **187 / 186 rows** (production 188) | Production: 832,606 / 975,284 px (848,739 / 989,702 for the 186-row ones): the hidden-sprite DEFECT on every row + the end fade. With the hidden-sprite patch extended to Sky Uppercut's own `artFor` (`receipts/patch-hidden-sky-uppercut/`, r1 == r2): **rows 0..149 exact**; ages 150..186 19,355 px each, the whole BG (x 0..239 y 0..111) fade: **the ROM runs ahead** (live age 152 == ROM age 150) | The 0-px 188-row windows (no-unit control opp, chains after the strike) have lag frames at ages **[148, 149]**; the hidden-target 187-row windows have only **[166]** and the 186-row one **none**: the ROM skips the 148 / 149 lag frames when the target is invisible, so it runs 2 frames ahead from age 150 (1 after its lag at 166). | **TIMING-PHASE** (lag-frame class; load-dependent) on top of the sprite DEFECT. Production renders the dominant [148, 149] phase. Not patched (a hidden-target lag profile would be a new timing policy) |
| **Sky Uppercut 327, ROM window 189 rows** | 6: no-unit control `ctl-sky-uppercut-ply-c0`, `fly-sky-uppercut-ply-c1 / c3`, `fly-sky-uppercut-opp-c3 / c5`, `bounce-sky-uppercut-opp-c1` | 268,240 (ply) / 283,904 (opp) px on ages 170..185 only (BG fade, live one frame AHEAD of the ROM) | Lag ages **[148, 149, 168]**: one extra lag frame at 168 (the 188-row windows: [148, 149]). The no-unit control (first body, no unit) has the identical 268,240 px; the entry lend equals the chain lend in all 6 (lend not involved). prep11 open point 1 already records a Sky Uppercut script that ends one frame later | **TIMING-PHASE** (lag frame at 168), the consumer's own phase (not chain-related; not a fly63 regression) |

### Non-defect table

| Row(s) | Residual | Evidence | Verdict |
|---|---|---|---|
| **Heal Bell 215 by a paralysed user** (`bounce-heal-bell-ply-c1`, and the extra 48,024 px of `bounce-heal-bell-opp-c3`) | 116 / 184 px per row on every row, the user's healthbox status-icon area (ply bbox x 142..161 y 96..103, ROM ded6b5 vs live ffffde) | The fixture reads `displayedStatus` from gBattleMons at activation, but `healpartystatus` clears status1 BEFORE `attackanimation` and `updatestatusicon` runs after it, so the ROM still shows PAR. Ablation (`fixtures/audit-17/ablation/`, user = paralysis): ply-c1 30,276 -> **0**; opp-c3 468,495 -> 420,471 (= the hidden-sprite DEFECT value exactly; under the patch the icon part alone was 48,024) | **ARTIFACT** (fixture `displayedStatus`); production's HUD keeps the icon until the status-icon event |
| Thunderbolt / Ice Beam right after a Fly / Bounce UNLEASH (incl. after a Bounce PRZ + Status_Paralysis) | 0 px, 14 windows, both sides | order KNOWN, live; entry lend also 0 | **EXACT** |
| Heal Bell / Double Team / Sky Uppercut after the strike (the charger visible again) | 0 px (Sky Uppercut: the 188-row ones) | same | **EXACT** |

## 2. Coverage (`receipts/main/summary.txt`, `receipts/dt60/`)

SNORLAX (faster, the unit side, move x4) vs CHANSEY (the consumer side, move x4); no-unit control = SNORLAX Counter. "x / y" = 0-px
windows / windows.

| Unit | Consumer: ply / opp |
|---|---|
| Fly 19 | Thunderbolt 2/2, 2/2; Ice Beam 2/2, 2/2; Heal Bell 2/4, 2/5 (DEFECT 2 + 3); Double Team 2/4, 3/6 (DEFECT 2 + 3); Sky Uppercut 0/4, 1/7 (hidden target 2 + 4, +1 phase 2 + 2) |
| Bounce 340 (+ PRZ / Status_Paralysis) | Thunderbolt 2/2, 1/1; Ice Beam 2/2, 1/1; Heal Bell 1/4 (DEFECT 2, icon ARTIFACT 1), 2/5 (DEFECT 3); Double Team 2/4, 3/6 (DEFECT 2 + 3); Sky Uppercut 0/1, 2/6 (hidden target 1 + 3, +1 phase 1) |
| none (control) | Thunderbolt 2/2, 2/2; Ice Beam 2/2, 2/2; Heal Bell 2/2, 2/2; Double Team 2/2, 2/2; Sky Uppercut 0/1 (+1 phase), 1/1 |
| dt60 grid (Double Team, Counter opposite) | below |

### dt60 prediction (committed `c8927bf8d` before any probe) vs measurement

`audit17Dt60Predict.ts` ran production's `liveDoubleTeamAttackerStepCounter` (the generated `dt60-mon-anim-data3.json`) over all
117 Factory Double Team side / species / nature rows (96 outside dt60's grid) and picked 2 per class per side; `dt60Probe.py` read the
battler `data[3]` on the frame before each activation (`receipts/dt60/prediction-vs-measurement.txt`).

| Side | Species (nature) | predicted data[3] / class | RAM data[3] (c0, c1) | px c0 / c1 (r1 == r2) |
|---|---|---|---|---|
| opp | TYROGUE (DOCILE) | 0 zero | 0, 0 | 0 / 0 |
| opp | PIKACHU (DOCILE) | 0 zero | 0, 0 | 0 / 0 |
| opp | RALTS (DOCILE) | 124 one-call-ahead | 124, 124 | 0 / 0 |
| opp | TREECKO (LONELY) | 120 one-call-ahead | 120, 120 | 0 / 0 |
| ply | RALTS (DOCILE) | 0 zero | 0, 0 | 0 / 0 |
| ply | PARASECT (CALM) | 0 zero | 0, 0 | 0 / 0 |
| ply | TYROGUE (DOCILE) | 3 one-call-ahead | 3, 3 | 0 / 0 |
| ply | PIKACHU (DOCILE) | 1 one-call-ahead | 1, 1 | 0 / 0 |

16 / 16 match, 16 / 16 0 px. The player personality % 25 equals the set's nature in every staged lead (6 DOCILE, 20 CALM).

### Not reached (time-boxed)

- **Priority 3 (later58 after a SWITCH-IN):** not staged. `audit17Fixtures.py` (= audit 16's derivation) stops at any switch / send-out
  label (UNMODELLED); replaying a voluntary switch or a KO + send-out through the order host needs the switch-in / faint events and the
  send-out unit modelling that `audit16Check.ts` lacks.
- Fly / Bounce bodies themselves as consumers (their body-only profile has its own age offsets −8 / −11 / −7; not framed here).
- Surf on a hidden Dive user (Dive is not landed: prep65 is evidence only).
- VBlank (BLDALPHA IO vs buffer) counters for the Sky Uppercut fade; the census impact of the hidden-sprite DEFECT.
- `bounce-ice-beam-opp` / `bounce-thunderbolt-opp` stop at an AI `Move_RETURN` switch (UNMODELLED) after their first consumer.

## 3. Method / scripts

- `audit17Stage.py` (30 fly63 scenarios + the 8 dt60-grid ones from `dt60-grid.json`), `audit17Probes.py` (one prep48Probe per
  scenario; RGB in a per-job TemporaryDirectory), `audit17Fixtures.py` (audit16Fixtures + Fly / Bounce / Sky Uppercut, any species),
  `audit17Check.ts` (audit16Check + species ids from species-stats.json + the production semi-invulnerable hide in `view.visibility`;
  `AUDIT17_NO_HIDE=1` disables it), `audit17Dt60Predict.ts`, `audit17Dt60Measure.py`, `audit17Compare.py`, `audit17Run.sh`.
- The hide in `view.visibility` changes nothing in production renders (the live path ignores it): `receipts/main` was produced before
  the hide was added and `receipts/repro` after it, with identical digests on all 104 windows. Only under the patch does it matter.

## 4. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/audit17Run.sh <fresh-receipt-dir> <fresh-scratch-dir>     # ~3 min: stage == committed -> probe -> derive == committed -> check (2 fresh runs) -> dt60 RAM -> ablation -> compare
node --experimental-strip-types --no-warnings tools/integration/audit17Dt60Predict.ts <out.json>   # == fixtures/audit-17/dt60-grid.json
# DEFECT proof (revert afterwards with git checkout src/engine/battleScene.ts):
(cd .. && git apply --unidiff-zero workspace/tools/integration/fixtures/audit-17/receipts/patch-hidden/audit17-hidden-sprite.patch)
node --experimental-strip-types --no-warnings tools/integration/audit17Check.ts tools/integration/fixtures/audit-17/fixtures fly-heal-bell-ply <out.json>
```

Receipts: `scenarios/` (38), `fixtures/` (104), `ablation/` (2), `dt60-grid.json`, `receipts/{main,patch-hidden,patch-hidden-sky-uppercut,
ablation-heal-bell-icon,dt60,repro}/`, `receipts/derive.txt`, `receipts/sky-uppercut-lag-counters.txt`. No RGB dumps, no mGBA logs.

Lag counters: `sh tools/integration/issue151Counters.sh <fresh-dir> 12 tools/integration/fixtures/audit-17/fixtures/{ctl-sky-uppercut-opp-c0,ctl-sky-uppercut-ply-c0,fly-sky-uppercut-opp-c0,fly-sky-uppercut-opp-c1,fly-sky-uppercut-opp-c3,fly-sky-uppercut-opp-c4,fly-sky-uppercut-ply-c0,fly-sky-uppercut-ply-c1,ctl-thunderbolt-ply-c0}.json`
