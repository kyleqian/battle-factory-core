# aud137 — live audit 28 (S10A integration lane, 2026-10-12): tonight's Scene ON status-condition animations, timing and pixels

Base: the FIXED `dcf042dc7` (production src `f197670fd`). Evidence only, new files only, **no patch**. Every production read ran in a git-archive
copy of `dcf042dc7`. Direct mGBA only, with an explicit lab seed in every scenario. Every probe ran twice in fresh processes, and r1 == r2
byte for byte: 44 / 44 pixel probes, 54 / 54 timing probes, 4 / 4 next-body probes. The comparator ran twice, and r1 == r2.

Runner: `sh tools/integration/aud137Run.sh <fresh-out-dir-inside-the-repo>` (~10 min). It reproduces every committed receipt and ends
`aud137Run: ALL SAME`.

## Results

**No new DEFECT.** Every status-animation command row is **0 px** on **121 / 121** windows (9,511 command rows): all nine drawn
animations, new species pairs, both sides.
- **115 / 121 windows are 0 px on every row**, activation − 1 .. release + 2.
- **The other 6 are not new.** They are sae135's named, pre-existing ordinary-row residual (row 3 below). This audit observes it on
  CONFUSION too.
- **Timing: 0 residual.** 147 ROM status-animation receipts on 54 lab routes (26 on the 10 timing routes, 121 on the 44 pixel scenarios):
  - 140 OK: gate == the production rule, controller rows == gate + active rows + 1, and active rows + 1 == the production table;
  - 1 gated FRZ, in its known phase;
  - 6 correctly absent (Substitute, Dig, Fly).
- **x2:** the ONIX-rest class rows agree on 7 / 7 informative windows. After PSN, the next live body sits at the predicted x2 with
  **0 px, 2 / 2**.

| # | Windows | Verdict | Rows / px | Mechanism (source) |
|---|---|---|---|---|
| 1 | **Pixels, 9 animations x new pairs** (`aud137Stage.py`, 44 scenarios, 121 windows; table §1) | **OK 115 / 121** | 9,753 rows; every command row 0 px (121 / 121) | sar131 / sad133 / sae135's transplant through `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView` |
| 2 | **Castform in rain** (Forecast; PSN on the rainy CASTFORM, both sides; 4 windows after the ROM's `General_CastformChange`) | **OK 4 / 4** once the window carries production's live form input; **ARTIFACT** without it (54,358 / 64,603 px) | 74 rows each, 0 px | PSN blends the battler's palette, so the drawn battler must be the rainy form. With `liveCastformForms` = water (`withLiveCastformForms`), production draws the rainy pic: the P != R area == the ROM's changed area, 53..91 x 67..111 |
| 3 | **ONIX opponent at its +1 rest, keep class**: CONFUSION by HAUNTER (3), SLP by PARASECT (3) | **DEFECT, PRE-EXISTING and already named** (sae135 §1 "Residual"; sar131 §6). **Not re-banked** | command rows 0 px; **1,091 px on each of the 2 next-command rows** | The next command is an ordinary message row. Production's ordinary rows do not draw the opponent's tracked idle rest, while the ROM keeps the +1 (CONFUSION / SLP are `keep`). `--diag=ordinary-rest` (those rows drawn at the tracked rest) gives **0 px on all 6** (120 / 121: the one window it breaks is PSN on ONIX, which zeroes the rest, so production's plain rows are right there). New: CONFUSION is exposed too (sae135 saw SLP / INFATUATION) |
| 4 | Timing, **crit + hit secondary** (Zap Cannon -> SNORLAX, seed 12) | **OK** | gate 0 == rule 0; ctl 39 | "A critical hit!" + waitmessage drain the SE. Seed sweep 1..24, scratch (`seg127Rom.py --one`; the runner pins seed 12): 22 seeds carry the receipt, 6 crits all gate 0, 16 non-crits gate 6..10 == rule |
| 5 | Timing, **super-effective secondary** (Zap Cannon -> CROBAT, both sides) | **OK 2 / 2** | gate 0 == rule 0 | `resultmessage` "It's super effective!" drains the SE |
| 6 | Timing, **PSN tick right after a faint** (GOLEM Rock Slide KOs the Toxic CROBAT) | **OK** | gate 0 == rule 0; ctl 71 | ROM order: faint, replacement send-out (`se_ball_open`), then the tick |
| 7 | Timing, **Yawn after a hit** (both sides; CROBAT drowsy after its Tackle) | **OK 2 / 2** (+ 4 asleep turns) | gate 0 == rule 0; ctl 97 | `BattleScript_YawnMakesAsleep` |
| 8 | Timing, **behind a Substitute** (PSN tick, both sides) / **Dig** / **Fly** (PELIPPER) | **OK, none 6 / 6** | no controller emission | `Cmd_statusanimation` skips a semi-invulnerable battler, `substituteHP != 0`, or NO_ANIMATIONS. Production's kernel has the same three conditions, `kind: "suppress"` (`battleScriptRulesContext.ts:2915`) |
| 9 | Timing, all pixel scenarios (44): 121 receipts | **OK 120 / 121** + 1 gated FRZ | ROM E + 1 == `STATUS_ANIMATION_ADDED_ROWS[the window's animation]` on 121 / 121 dense windows (`timing.delta` 0) | One gated FRZ (Ice Beam -> SNORLAX, gate 8, act 115, ctl 124): seg127's FRZ 133 / 134 phase in the gated class (gaf140 territory; timing only, not re-reported). The ungated FRZ infliction on SKARMORY (resisted: gate 0) is act 116, ctl 117 == the table |
| 10 | **x2 / next body** on the ONIX +1 rest (4 routes, 12 windows; `aud137NextBodyX2.ts`) | **OK** | PSN zeroed 1 -> 0 (1); CONFUSION keep 1 -> 1 (3); SLP keep 1 -> 1 (3); the 5 others are uninformative (x2 0 before). **Next body after PSN: ROM x2 0 == predicted 0, 0 px in the battler rect, 2 / 2**; the old "status animation -> unknown" rule gives 1,091 px | `LIVE_BATTLER_X2_STATUS_ANIMATION` (sar131's rows) |

Not reached inside the cap: see §4.

## 1. Pixels (`aud137Compare.ts` over `aud137Probe.py` windows)

**Probe.** `aud137Probe.py` is stq132Probe.py, executed verbatim except for its label set: the nine `Status_*` scripts plus the three
`General_*` scripts that follow them within 0x40 bytes.
- **Why the extra labels.** A first run attributed the Castform form change to `Status_Nightmare` (ptrOffset 59). With the general
  labels added, the nearest-label rule attributes every rise to its own script.
- `aud137Receipt.py` (stq132Receipt.py with the nine-entry label map) drops the general windows.
- `aud137Forms.py` reads the Castform change from those general windows.

**Comparator.** `aud137Windows.ts` / `aud137Compare.ts` use sae135Windows.ts / sad133Windows.ts's construction unchanged, generalised to
all nine animations:
- the window is [print, (FRZ infliction: `status`), `status-animation`, print];
- x2 input = the ROM opponent x2 on rel −1. That x2 is the rest or 0 on 121 / 121 windows (none unexplained);
- the transplant C(a) = ROM(−1) except where P(a) != R(a);
- full screen, rows activation − 1 .. release + 2. On the next command's rows, the message band (y >= 112) is reported apart.

**Staging.** `aud137Stage.py` stages controlled lab variants of the landing proofs' accepted scenarios: only the named lead's species
changes (plus gender / moves where stated). Every species is in `battle_frontier_mons.h`. EV totals are <= 510, and each template's
explicit seed is kept.

| Animation | Side of the animated battler | Windows (0 px all rows) | New pairs (attacker -> animated battler) |
|---|---|---|---|
| PSN | opponent | 12 / 12 | PRIMEAPE -> NINJASK, FLYGON, CASTFORM (rain); **CROBAT -> ONIX** (+1 rest; PSN zeroes it) |
| PSN | player | 13 / 13 | PRIMEAPE -> NINJASK, FLYGON, CASTFORM (rain); CROBAT -> PRIMEAPE (the SLP + PSN route) |
| PRZ | opponent / player | 5 / 5, 4 / 4 | PRIMEAPE -> CROBAT, NINJASK (both sides); PRIMEAPE -> TAUROS |
| SLP | opponent | 18 / 21 | PRIMEAPE -> CROBAT, FLYGON; **PARASECT -> ONIX** (3 residual windows, row 3); GENGAR Hypnosis -> FLYGON, NINJASK; PRIMEAPE -> CROBAT (SLP + PSN) |
| SLP | player | 13 / 13 | PRIMEAPE -> CROBAT, FLYGON; GENGAR Hypnosis -> FLYGON, NINJASK |
| BRN | opponent / player | 9 / 9, 6 / 6 | PRIMEAPE -> NINJASK, CROBAT (both sides); HAUNTER -> ONIX (Will-O-Wisp zeroes the rest) |
| INFATUATION | opponent / player | 2 / 2, 2 / 2 | PRIMEAPE (male) -> FLYGON, CROBAT (female), both sides |
| CONFUSION | opponent | 4 / 7 | PRIMEAPE -> FLYGON, NINJASK; **HAUNTER -> ONIX** (+1 rest: 3 residual windows, row 3) |
| CONFUSION | player | 4 / 4 | PRIMEAPE -> FLYGON, NINJASK |
| CURSED | opponent / player | 4 / 4, 4 / 4 | GENGAR -> CROBAT, NINJASK, both sides |
| NIGHTMARE | opponent / player | 6 / 6, 5 / 5 | GENGAR -> FLYGON, NINJASK, both sides |
| FRZ | opponent | 4 / 4 | DELCATTY -> SKARMORY (infliction ungated, act 116, + frozen turn), SNORLAX (infliction gated, act 115, + frozen turn). Both thaw the next turn (`BattleScript_MoveUsedUnfroze`) |

**Shapes covered:**
- elevated opponents: CROBAT, NINJASK and FLYGON on every animation;
- big pictures: SNORLAX, SKARMORY;
- a status animation right after a live move body: every infliction window's rel −1 is the row after the body;
- **two status animations in one turn**: `aud137-slp-psn-ply-primeape-crobat`. The end-turn PSN tick on the player, then the
  opponent's SLP turn, then the next PSN tick: 0 px on all 7;
- a frozen turn followed by thaw;
- Castform in a weather form.

**Castform note (row 2).** The synthetic window first built the field without a form, giving 54,358 / 64,603 px. That is a
comparator ARTIFACT, not production: production's live field gets the form from `liveCastformFormsAt` / `withLiveCastformForms`.
- Given the ROM's form, the window is 0 px.
- Not audited here: whether production's own Forecast tracking yields water on these turns. That is cast83's seam.

## 2. Timing (ROM, `seg127Probe.py` + `seg127Rom.py` via `aud137Timing.py`)

The ROM gives each status-animation run its gate (the IsBattleSEPlaying TRUE polls) and its active / controller rows. Production
presents gate (`seg127StatusSeGate.ts`, rule clamp(L − age, 0, 29)) + `STATUS_ANIMATION_ADDED_ROWS`. sag130 / sa125 anchor that
through production ON − OFF, with the following print's first glyph on the ROM row.

**Totals over all 147 receipts:**
- rule residual **0**;
- ctl == gate + act + 1 on every emitted receipt;
- act + 1 == the table on every ungated receipt.

**The new routes (§ table rows 4..8), 10 routes:**
- the first staged crit (seg127 left it unstaged: "census 22");
- super-effective, both sides;
- PSN tick after a faint;
- Yawn after a hit, both sides;
- PSN tick behind a Substitute, both sides; Dig; Fly.

Plus the 44 pixel scenarios: infliction, turn-start, end-turn and two-per-turn paths.

**Limitation (stated, not hidden).** Production has no lab-scenario path; only census battles run through the orchestrator. On these
lab routes the production side is the rule + table: both are 0-residual against the ROM here. It is not a direct production replay of the
same battle. sag130's census anchors remain the direct production proof of the mechanism.

**Staging corrections, all recorded in `aud137TimingStage.py`:**
- Yawn on PRIMEAPE is blocked by Vital Spirit (first run: `PrintAbilityMadeIneffective`). The target became CROBAT.
- A FLYGON Fly outsped the Toxic and was never poisoned. It became PELIPPER.
- The faint route needed 4 more A presses after the KO.

## 3. x2 (`sar131Probes.sh` + `sar131Rom.py` + `aud137NextBodyX2.ts`)

ONIX is the only species with a non-zero ported front idle rest (+1; `speciesFrontIdleRestOffset` over species-stats). Four ONIX-opponent
routes with new attackers ran through sae135's next-body pipeline (direct mGBA r1 == r2 4 / 4; ROM receipts r1 == r2):
- **PSN (CROBAT Toxic): zeroed (1 -> 0) == the table.** The next ONIX Tackle body: ROM x2 0 == the tracker's prediction 0, 0 px in the
  battler rect, on both bodies (`aud137-psn-ply-crobat-onix` R 307 / 717).
- **CONFUSION (HAUNTER Confuse Ray), SLP (PARASECT Spore): keep (1 -> 1) == the table**, 3 + 3 windows. No later ONIX body in the trace:
  ONIX stays confused / asleep.
- BRN (HAUNTER Will-O-Wisp): Will-O-Wisp's body zeroes the rest first (0 -> 0). Uninformative.

## 4. Not reached inside the cap

Named precisely:
- **CONFUSION self-check then PRZ can't-move on one battler.** The TAUROS Thrash route (`aud137-prz-conf-ply-primeape-tauros`) was
  staged and probed. TAUROS fainted (frame 3295) before its Thrash fatigue confused it, so only its PRZ infliction window exists (0 px).
- **FRZ on the player side with new pairs.** The two opponent-attacker Ice Beam routes did not freeze at the template seed (no window).
  No seed sweep was run.
- **Next live body at a non-zero x2 for PRZ / CURSED / NIGHTMARE / INFATUATION / FRZ / BRN.** No staged route left ONIX at +1 before
  those windows.
- **Census 0..999 exposure of row 3** was not measured. It is the pre-existing residual sae135 already named, outside the
  status-animation command rows (the ordinary-row renderer). No patch was banked.

## 5. Files and gates

New files only:
- `tools/integration/aud137{Probe.py, Receipt.py, Job.sh, Stage.py, Windows.ts, Compare.ts, Forms.py, TimingStage.py, TimingJob.sh,
  Timing.py, NextBodyX2.ts, Run.sh}`;
- `tools/integration/fixtures/aud137/` (`scenarios/` 44, `timing-scenarios/` 10, the three indexes, `receipts/`);
- this doc.

Gates on the evidence tree (production files untouched, `git status` clean apart from scratch):
- `npm run typecheck`: green.
- The targeted vitest run passed **7 files / 105 tests**: animationBoundaryRatchet, factoryAnimationInventory, sae135 / sad133 / sar131
  StatusAnimationRender, stq132StatusConditionReducer, sa125StatusAnimationCommand.
- `npm run animation:coverage` and `npm run animation:audit`: exit 0.
- `git diff --check`: clean.
