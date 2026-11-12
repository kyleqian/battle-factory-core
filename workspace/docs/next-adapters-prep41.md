# Next adapters prep 41: D4 widening readiness — Pursuit later bodies, Hidden Power GOLBAT lag, Ghost-type Curse (S10A, side lane)

Evidence only, **new files only**. Master `97be86427` (production src tree `4af0870a`). Every emulator number comes from an independent direct
mGBA run (shared HTTP oracles never contacted); every relied-on probe ran twice from fresh processes with identical output. The
temporary production patch `tools/integration/fixtures/prep41/prep41-d4-widening.diff` was applied for the live-renderer runs and
reverted (typecheck green with it applied). The D4 rule applied is `liveMoveTimingPolicy.ts`'s: dominant = most measured across all
banked measurements; a tie picks the phase without the optional event.

## 0. Results

| Move | Verdict | D4 parameter (kind, age) | Measured (event : no-event) | Chosen | Windows through the production live renderer (patched, 2 passes x 2 fresh) |
|---|---|---|---|---|---|
| **PURSUIT 228** (normal body), later bodies | **READY** | `optional-lag-age` 82, fixed lags 60, 61, 100 iterations | **24 : 9** (33 bodies) | event (lag, **103 rows** = today's duration) | 21 windows: **15 policy-phase 0 px** (6 first bodies, TYRANITAR-target control, **8 lb26 later bodies**); 6 other-phase residual **only ages 84..99** |
| **HIDDEN_POWER 237** (Unown) | **READY** (reclassification only; no renderer change) | `optional-lag-age` 64, fixed lag 118, 179 iterations | **1 : 9** (10 unique bodies) | no-event (**180 rows** = today's duration) | 10 windows: **9 policy-phase 0 px**; the UNOWN -> GOLBAT window residual **only ages 65..179** |
| **CURSE 174** Ghost branch (DUSCLOPS) | **BLOCKED (non-D4)**: D4 settled, but no production CurseGhost provider exists (the prep23 model is tools-only) | (1) `palette-upload-scanline` 26 (the row-26 palette CpuSet line, P1); (2) `bg-write-row` BG2 monbg write (R1, display-neutral) | P1 line 14 : other = **5 : 3** pixel-effective (6 : 2 by the probe's VCOUNT rule; all 4 new DUSCLOPS windows = 14); R1 model row : one row early = **6 : 2** | P1 line 14; R1 the model's row | model-level only (prep23 ghost model -> unchanged production renderer, line pinned to 14): 8 windows, **5 at 0 px** (HAUNTER opp + 4 DUSCLOPS), 3 residual **row 26 only** (15 px per scanline between 14 and the window's line) |

Hidden Power's non-Unown decline (the reducer's uninitialised eighth orb) is a separate source issue, §3.3; not attempted.

## 1. PURSUIT 228 — later bodies (READY)

### 1.1 Parameter and counts

Main-loop pass counters (`speciesAudit2Counters.py` via `issue151Counters.sh`; lag = `playTimeVBlanks` pass delta 0) on every banked
Pursuit scenario: `tools/integration/fixtures/prep41/pursuit-counters.json` (33 bodies, both fresh runs identical for all 21 scenarios).
Every body has the fixed lags at ages **60, 61**; the optional lag at age **82** (just before the restorebg fade back) is the only
difference. Body = activation .. first inactive (102 active frames + 1 with the lag; 101 + 1 without).

| Source | Bodies | lag at 82 (103 rows) | no lag (102 rows) |
|---|---:|---:|---:|
| oam1-live first bodies (BEEDRILL->SHUCKLE P/O, UMBREON->GOLEM P/O, SNEASEL->GOLBAT P, SNEASEL->SNORLAX O) | 6 | 6 | 0 |
| species-audit-5 TYRANITAR (target opp-side control / player target / player attacker) | 3 | 1 | 2 |
| lb26 first Pursuit body after Tackle / Splash / Psychic / Growl+stat / Swords Dance+stat / Surf (P and O) | 12 | 8 | 4 (p-growl, p-splash, p-swordsdance, o-swordsdance) |
| lb26 second Pursuit body (turn 2, after the own Pursuit + the foe's move again) — counter-only | 12 | 9 | 3 (o-growl, o-splash, o-tackle) |
| **total** | **33** | **24** | **9** |

Dominant: the lag (event), 103 rows — today's `PURSUIT_ROWS`. Not species-, side- or predecessor-keyed (p-growl lags 0 / o-growl body 1
lags, body 2 reversed): a CPU-load phase, the D4 class.

### 1.2 Live-renderer windows (patched production)

`tools/integration/fixtures/prep41/pursuit-check.json` (`prep41TimingCheck.ts`; each window = the scenario's OWN body 0 from the counter
run, one process per fixture, 2 fresh probe processes each, the whole check twice: all four renders identical per window, 0 violations):

| Window | Phase | Rows / live | px | Affected ages | max px/row |
|---|---|---|---:|---|---:|
| BEEDRILL->SHUCKLE P, O; UMBREON->GOLEM P, O; SNEASEL->GOLBAT P; SNEASEL->SNORLAX O (first bodies) | event | 103/103 | 0 | - | 0 |
| TYRANITAR target control (player attacker, first body) | event | 103/103 | 0 | - | 0 |
| lb26 o-growl, o-psychic, o-splash, o-surf, o-tackle, p-psychic, p-surf, p-tackle (later bodies) | event | 103/103 | 0 | - | 0 |
| lb26 p-growl / p-splash / p-swordsdance | no-event | 102/103 | 286,096 each | 84..99 (16) | 17,881 |
| lb26 o-swordsdance | no-event | 102/103 | 289,856 | 84..99 (16) | 18,116 |
| TYRANITAR player attacker | no-event | 102/103 | 284,768 | 84..99 (16) | 17,798 |
| TYRANITAR player-side target (opponent attacker) | no-event | 102/103 | 276,528 | 84..99 (16) | 17,283 |

Other-phase residual: ages 84..99 only (16 rows; ages 100, 101 and everything before 84 exact). Source cause: with no lag at 82 the
restorebg `Task_FadeToBg` fade back (BLDY 16 -> 0, `livePursuitInputs` `pursuitBldy` 64..100 with the peak held 81..84) and its palette
steps run one row earlier, so each of ages 84..99 shows the next BLDY step (whole-field brightness, ~17.3k-18.1k px). Exactly the banked
lb26 / audit-5 numbers.

### 1.3 Policy entry

```ts
228: { move: "MOVE_PURSUIT", parameters: [{
  kind: "optional-lag-age", age: 82, fixedLagAges: [60, 61], iterations: 100,
  alternatives: [{ phase: "event", bodyRows: 103, measured: 24 }, { phase: "no-event", bodyRows: 102, measured: 9 }],
  chosen: "event", tieRuleUsed: false,
  evidence: ["tools/integration/fixtures/prep41/pursuit-counters.json (lag at 82: 24 of 33)", "docs/next-adapters-prep41.md s1",
    "tools/integration/fixtures/species-audit-5/counters/tyranitar-pursuit-lag.txt", "docs/later-bodies-curse-oam.md (lb26: 8 of 12 103-row bodies)"] }] },
```

### 1.4 Patch shape (`prep41-d4-widening.diff`, against `97be86427`)

- `src/engine/liveMoveTimingPolicy.ts:138` — the entry above (before Megahorn); `:441` — append `228` to `LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS`.
- `src/engine/liveMoveAnimation.ts:239` — drop `228` from `LIVE_MOVE_ANIMATION_IDS` (`261, 210,`); `:110` — drop the now-unused
  `PURSUIT_ROWS` import; `:1174` — `case 228: return (request.turn & 1) === 0 ? liveMoveTimingBodyRows(228) : null;` (= 103);
  `:3301` — `if ((request.turn & 1) !== 0 || !spriteOrderInput?.known) return null;` (the `!spriteOrderInput.firstBody` gate lifted; the
  known-entry allocator IMPACT slot 3 / matrix 0 / tile 305 / palette slot 7 and the S0 BG state are proven after the six predecessor classes).
- Unchanged: shiny / non-zero idle-rest declines, the switch-interception body decline (out of scope).

### 1.5 Integration worker checklist

1. Apply the hunks; move the MOVE_PURSUIT record from `implementedAdapters` to `faithfulTimingAdapters` in
   `docs/animation-integration-live-status.json` with `timingParameters` = §1.3, `policyVersion`, `alternatePhaseResidual`
   `{ ages: [84..99], rows: 16, maxPixelsPerRow: 18116, cause: §1.2 }`.
2. Copy `tools/integration/fixtures/prep41/windows/pursuit-*` (21 wrappers, `timingPhase` labels from the counters) and run
   `d4aTimingCheck.ts` after adding `PURSUIT: 228` to its `IDS` (or rerun `prep41TimingCheck.ts`).
3. **Not proven through the renderer** (counter phase only): the turn-2 Pursuit body after its OWN earlier Pursuit body (12 counter-measured
   bodies, 9 : 3). The lifted gate admits it under any known lend; prove it with body-2 fixtures (`bodyWindows[1]`, precedingBodies =
   body 1's list + `{ moveId: 228 }` + the turn-2 predecessor units) or keep a narrower gate for an own-Pursuit predecessor.

## 2. HIDDEN_POWER 237 — the GOLBAT lag (READY: reclassification)

### 2.1 What the GOLBAT case is

`docs/live-species-audit-3.md` s1 / s2.4: UNOWN (player) -> GOLBAT, body 1 after the opponent's Tackle, 72,040 px (96/180) on ages 65..179;
counters showed a lag at age 64. It **is** a D4 case of the existing Unown-only adapter: the adapter already engages there (gate = Unown
attacker + known lend, no first-body gate), the source program is identical, and the only difference is an optional lag frame at age 64
(the later fixed lag then lands at 119 instead of 118). Fresh counters (`tools/integration/fixtures/prep41/hidden-power-counters.json`,
12 fixtures / 10 unique bodies — the audit-3 GOLEM swaps are byte-identical runs of the prep13 UNOWN -> GOLEM alternates, counted once):

| Bodies | fixed lag 118 | optional lag 64 | rows |
|---|---|---|---|
| accepted UNOWN_H P / UNOWN_E O -> ONIX, UNOWN -> GOLEM P / O, UNOWN_F / UNOWN_G seed P / O, audit-3 RATTATA P / O (after a Tackle), SHUCKLE P | 9 of 9 | 0 | 180 |
| audit-3 GOLBAT P (after a Tackle) | (at 119) | 1 | 181 |

Dominant: no lag, 180 rows = today's duration.

### 2.2 Live-renderer windows (`tools/integration/fixtures/prep41/hidden-power-check.json`)

9 policy-phase windows 180/180 rows 0 px; GOLBAT window (own body 231..411, 181 rows) **72,040 px on ages 65..179 only** (84 rows,
max 2,489 px/row; the static rows and the first inactive row 180 are exact). Cause: the orbiting / scatter orbs advance one row early
against the lagged ROM (live age a = ROM frame first + a + 1 from age 65, audit-3 lag-shift test). Both passes identical, 0 violations.

### 2.3 Policy entry and patch shape

```ts
237: { move: "MOVE_HIDDEN_POWER", parameters: [{
  kind: "optional-lag-age", age: 64, fixedLagAges: [118], iterations: 179,
  alternatives: [{ phase: "event", bodyRows: 181, measured: 1 }, { phase: "no-event", bodyRows: 180, measured: 9 }],
  chosen: "no-event", tieRuleUsed: false,
  evidence: ["tools/integration/fixtures/prep41/hidden-power-counters.json (lag at 64: 1 of 10)", "docs/next-adapters-prep41.md s2",
    "tools/integration/fixtures/species-audit-3/counters/hidden-power-lag.txt"] }] },
```

`liveMoveTimingPolicy.ts:154` (entry), `:444` (append `237` to the faithful-timing ids); `liveMoveAnimation.ts:330` drop `237` from
`LIVE_MOVE_ANIMATION_IDS`; `:1161` `case 237: return liveMoveTimingBodyRows(237);` (= 180). No adapter / renderer change. Live status:
move the MOVE_HIDDEN_POWER record to `faithfulTimingAdapters` with `alternatePhaseResidual { ages: [65..179], rows: 84, maxPixelsPerRow: 2489 }`.

### 2.4 The non-Unown decline (separate source issue, not attempted)

The reducer's eighth (scatter) orb reads state the Unown activation leaves initialised; prep13 GENGAR controls show it already
initialised from other history. Lifting it needs the source init of that orb sprite (`AnimOrbitScatter` / the eighth `CreateSprite` of
`Move_HIDDEN_POWER`) modelled from the activation instead of the Unown-specific constant, plus GENGAR-class dense proofs (the prep13
GENGAR fixtures exist: `tools/integration/fixtures/prep13-live/hidden-power-alt-*-gengar-*`). Practically moot for the Factory today:
FRONTIER_MON_UNOWN is the only Hidden Power user and is never a generated rental (prep13 s2).

## 4. CURSE 174 — Ghost branch (BLOCKED, non-D4)

### 4.1 Parameters and counts

Measurements: `tools/integration/fixtures/prep41/curse-p1.json` (cursePaletteTimingProbe.py + counters, 2 fresh runs each, identical),
`curse-ghost-check.json` (prep23 field check), `curse-pixels-s14.json`. Windows: the 4 banked (accepted HAUNTER -> MAGIKARP P / O,
GENGAR -> GOLEM P / O) + **4 new DUSCLOPS windows chosen before probing** (`tools/battle-lab/prep41-curse-ghost-{p,o}-dusclops-{golem,snorlax}.json`,
`prep41CurseScenarios.py`: speed EV 252 so the Curse body is the first body). All 8: body 373 rows, fixed lags 289, 290, 369, 370, the
first Step2 row = body row 26.

| Window | probe VCOUNT / HBlank | probe line | pixel-effective line (0 px) | R1 (BG2 write) |
|---|---|---:|---:|---|
| accepted HAUNTER P | 17 / yes | 18 | 18 | model row |
| accepted HAUNTER O | 14 / no | 14 | 14 | one row early (293) |
| GENGAR -> GOLEM P | 9 / no | 9 | 9 | one row early (7) |
| GENGAR -> GOLEM O | 14 / no | 14 | **15** | model row |
| DUSCLOPS -> GOLEM P, -> SNORLAX P, -> GOLEM O, -> SNORLAX O | 13 / yes | 14 | 14 | model row |

- **P1 kind**: `palette-upload-scanline` at age 26 (the Hyper Voice precedent: "event" = the dominant band, "no-event" aggregates the
  other measured depths). Dominant **line 14**: 5 of 8 pixel-effective (6 of 8 by the probe's `VCOUNT + HBlank` rule; GENGAR opponent's
  CpuSet starts mid-line 14 and the visible entries land after line 14 is drawn). A tie-free majority either way; all 4 DUSCLOPS = 14.
- **R1 kind**: `bg-write-row` (per side: the attacker monbg row 7/8 for a player attacker, the target monbg row 293/294 for an opponent
  attacker); model row in 6 of 8. Display-neutral: go / ga are 0 px except P1 row 26 (prep23 s0.1 and this check).

Policy entry (for the integration worker; not in the patch):

```ts
174: { move: "MOVE_CURSE", parameters: [{
  // Ghost branch only (request.turn & 1 = 0); the stats branch has no CPU-phase parameter.
  kind: "palette-upload-scanline", age: 26, fixedLagAges: [289, 290, 369, 370], iterations: 369,
  alternatives: [{ phase: "event", bodyRows: 373, measured: 5 }, { phase: "no-event", bodyRows: 373, measured: 3 }],
  chosen: "event", tieRuleUsed: false,   // event = first post-transfer scanline 14 (lines 0..13 keep the age-25 palette)
  evidence: ["tools/integration/fixtures/prep41/curse-p1.json", "tools/integration/fixtures/prep41/curse-pixels-s14.json", "docs/next-adapters-prep41.md s4"],
}] },
```

(R1 is display-neutral and the ported model keeps its row; record it like Megahorn's `bg-write-row` if the field checks need it.)

### 4.2 Model-level renderer check (`prep41CurseGhostPixels.ts --scanline=14`)

The prep23 ghost model (`prep23CurseGhost.ts` + its corpus-read known-entry block and lent order) fed to the **unchanged** production
renderer with ONE global transfer line 14: accepted HAUNTER O and all 4 DUSCLOPS **373/373 rows 0 px**; HAUNTER P 60 px (lines 14..17),
GENGAR P 75 px (lines 9..13), GENGAR O 15 px (line 14) — **row 26 only**, 15 px per line between 14 and the window's line (the ghost
BG palette entries on those lines). The DUSCLOPS windows are also field-exact (OAM 372/372, tasks / registers / battleBg / palette
373/373): the model generalises to the Factory's only Ghost-type Curse user.

### 4.3 Why BLOCKED and the port plan

The blocker is not D4: production has **no CurseGhost provider** (`liveMoveAnimation.ts:1184` / `:3271` decline `turn & 1 = 0`;
`curseModel.ts` is the stats body only; the ghost model lives in `tools/integration/prep23CurseGhost.ts`). One integration step:

1. Port `prep23CurseGhost.ts` (`shakeMon2`, `stretchWin`, `nailSim`, `ghostSim`, `curseGhostRow`) into `src/animation/curseModel.ts`
   (`curseGhost{Tasks,Registers,BattleBg,Palette,Sprites}At`), and a `liveCurseGhostInputs` provider in `src/engine/liveOamMoves.ts` built
   from production hosts instead of `prep23CurseGhostKnown.ts`'s corpus reads: battler attrs / x / y (`liveBattlerAnchors`, field art),
   nail anchor = attacker pic anchor, ghost anchor = target pic anchor, nail bank 7 tile 305 / ghost bank 8 tile 337 (known-entry
   allocator), the 9-entry healthbox block, the monbg hide windows `[9,288]` / `[295,368]`, the lent order carried through the body.
2. `paletteScanoutTransfer` at age 26 only: `{ vcount: 14, inHBlank: false, firstPostTransferScanline: 14, beforeHardware: paletteAt(25) }`
   from the policy (never the per-side fixture values 18 / 14).
3. `case 174` duration `(request.turn & 1) === 1 ? CURSE_STATS_ROWS : 373`; gate: Ghost-type attacker implied by `turn & 1 = 0`, first body /
   known lend as for the stats branch (the activation registers are first-body constants in the model; later Ghost bodies unmeasured).
4. Proofs: the 8 windows here through the live renderer (expected: 5 at 0 px, 3 row-26 only), both orientations, twice fresh.

## 5. Accounting consequences

Today: scoped exact 250 + faithful random 13 + faithful timing 13 = 276.

| Step | scoped exact | faithful timing | Notes |
|---|---:|---:|---|
| Pursuit reclassified (later bodies widened) | 249 | 14 | exact first-body fixtures stay valid in scope |
| Hidden Power reclassified (GOLBAT lag documented) | 248 | 15 | no renderer change; exact Unown fixtures stay valid in scope |
| (later) Curse Ghost branch ported | 247 | 16 | the whole MOVE_CURSE live claim moves (stats exact proofs retained) |

Changes for the first two: `implementedCount` 250 -> 248 (pinned at `tests/animation/factoryAnimationInventory.test.ts:70`),
`faithfulTimingCount` 13 -> 15, `faithfulTimingAdapters` + 2 records (D3 flag false for both), `implementedAdapters` - 2,
`tools/integration/remainingAdaptersCensus.mjs` sum unchanged (276), preview stamp counts via `start-local-preview.sh`. Faithful random and
the 276 Factory bodies are unchanged.

## 6. Files and reproduction

- Patch: `tools/integration/fixtures/prep41/prep41-d4-widening.diff` (+ `.gitattributes` `*.diff -whitespace`); file:line refs above are
  in the patched tree. After the committed runs two policy `evidence` strings were renumbered (`prep41.md s3` -> `s2`); no code change.
- Receipts (`tools/integration/fixtures/prep41/`): `pursuit-counters.json`, `hidden-power-counters.json`, `pursuit-check.json`,
  `hidden-power-check.json`, `curse-p1.json`, `curse-ghost-check.json`, `curse-pixels-s14.json`, `documented-residual.json`, `windows/` (31 wrappers).
- Scripts: `prep41Counters.py`, `prep41Windows.py`, `prep41TimingCheck.ts`, `prep41Dense.sh`, `prep41Summary.py`, `prep41CurseScenarios.py`,
  `prep41CurseProbes.sh`, `prep41CurseCounters.sh`, `prep41CurseDenseProbes.sh`, `prep41CurseSummary.py`, `prep41CurseGhostPixels.ts`,
  `prep41CurseRun.sh`, `prep41Run.sh`.

```
OUT=/tmp/p41 REC=/tmp/p41-rec sh tools/integration/prep41Run.sh   # ~10 min on 8 jobs; src must be clean (applies + reverts the patch)
```

The final lines print `MATCH <receipt>` for each of the 7 receipts (verified once from fresh dirs: all MATCH).
