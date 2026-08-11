# #62 — E-2/D-2 HP-bar-fraction family: discriminating state probe

**Scope.** Evidence only, per the supervisor's step brief and the routing
decision already recorded in ISSUES #62 (profile-less legacy inputs
correctly take the generated route). This document answers the one open
question the census (`docs/issue62-generated-route-residual-census.md`)
left unresolved for the E-2/D-2 HP-bar-fraction family (187 frames): does
the app's own kernel-tracked HP for the affected battler agree with the
oracle's real replay (a presentation-wiring bug), or does the app's kernel
genuinely track different HP than the real game (inherent route
divergence)? No production code is changed. No deleted trace is revived.

## Verdict

**(b) ROUTE DIVERGENCE.** In both fixtures, at every sampled frame, the
app's own kernel-tracked HP (`BattleScriptRulesContext.battlers[id].hp`,
the same field every other kernel reducer — damage, fainting, AI scoring —
reads and mutates) **does not match** the oracle's real `gBattleMons[]` HP.
The presentation pipeline (`resolutionField()` → `healthboxParams()`, and
the command-menu's equivalent) is not stale: it renders **exactly** what
the kernel believes, every time, with no discrepancy anywhere in the
chain. The 187-frame HP-bar gap is the visible edge of the two engines
already running genuinely different battle continuities by the time each
reproducer's captured window starts. **#62's remainder closes as
not-a-presentation-bug**; no follow-up rendering slice is warranted.

## Method and reproduction

```sh
npm run compare -- tools/compare/fixtures/issue62-turn2-endeavor.json --summary
npm run compare -- tools/compare/fixtures/issue62-turn2-dragonbreath.json --summary
```

reproduces the census's `0/77` and `0/237` counts exactly (re-verified
2026-08-02 on the current tree) and gives per-frame diff bboxes. Three new
read-only scratch tools (this step's only new files besides this document)
cross-validate three independent sources of truth per frame:

- `tools/compare/scratch/issue62-hpbar-pixelscan.mjs <runDir> <frame> <row> <xStart> <xEnd>`
  — samples a pixel row from the `npm run compare` output and prints
  color run-lengths, so the bar's filled/track pixel counts are read
  directly off the PNGs instead of eyeballed.
- `tools/compare/scratch/issue62-hpbar-state-dump.ts <fixture.json> <frame...>`
  — replays a fixture through the **exact same** `createInitialState`/
  `tick`/`traceAdvances` calls `tools/compare/appTrace.ts` uses (no
  production code touched, no new route), and at each requested frame
  prints the kernel's live `rulesContext.battlers[id].hp/maxHP` next to
  whichever presentation field is currently handing the renderer its
  numbers (`battleResolutionPresentation.field` mid-turn, or
  `battleCommandPresentation.field` at the action menu).
- `tools/probe/dump-issue62-hpbar-battlemons-off.py <fixture.json> <output.json> <tick,tick,...>`
  — a `battle-scene-off`-bootstrapped sibling of `dump-battler-snapshot.py`
  (that script defaults to the ON bootstrap and is not tick-comparable to
  these `"oracleProfile": "battle-scene-off"` fixtures); replays the
  fixture's own segments against `oracle/bootstrap/factory-battle-scene-
  off.json` and reads `gBattleMons[0..1]` hp/maxHP/species directly, run
  through the teardown-safe wrapper:
  `python3 tools/run-mgba-probe.py <fresh-output.json> -- tools/probe/dump-issue62-hpbar-battlemons-off.py <fixture> <fresh-output.json> <ticks>`.

All three agree to the pixel/HP in every case below.

## Endeavor fixture — GROVYLE (opponent)

First captured frame of the whole fixture is **2894** (E-1's own first
frame); the 30px opponent-bar signature the census calls E-2 is already
present there and stays bit-identical through frame 2999 (re-confirmed:
diff bbox `(85,33)-(99,34)`, exactly 30px, unchanged 2948–2970, embedded
inside every E-1/E-3 frame's larger bbox too).

| Frame | Source | ONIX (battler 0) hp/maxHP | ONIX bar px/48 | GROVYLE (battler 1) hp/maxHP | GROVYLE bar px/48 |
| --- | --- | --- | --- | --- | --- |
| 2894 | oracle RAM (`gBattleMons`) | 117/117 | 48 | **101/143** | **33** |
| 2894 | app kernel (`rulesContext`) | 117/117 | 48 | **143/143** | **48** |
| 2894 | app displayed field (`battleCommandPresentation.field`) | 117/117 | 48 | 143/143 | 48 |
| 2948/2971/2999 | all three sources | unchanged | unchanged | unchanged | unchanged |

Pixel cross-check (`issue62-hpbar-pixelscan.mjs`, row 33, GROVYLE's bar
spans x=52..99, 48px): app run `90,214,132×48` (fully filled) vs. oracle
run `90,214,132×33 | 74,66,90×15` (33 filled, 15 track) at every sampled
frame 2894–2999 — floor(101/143×48)=33 and floor(143/143×48)=48 exactly,
matching the RAM reads bit-for-bit.

**E-3 precedence check (method step 1).** E-3's visible move-choice fork
(`oracle: "Foe GROVYLE used ENDEAVOR!"` vs `app: "Foe GROVYLE used DOUBLE
TEAM!"`) first becomes legible at captured frame **2971**. E-2's HP-bar gap
is already fully formed **77 frames earlier**, at the fixture's very first
captured frame (2894) — before the "What will ONIX do?" menu for this turn
has even been dismissed, let alone before the AI has chosen this turn's
move. **E-2 strictly precedes E-3; E-3 cannot be E-2's cause.** The kernel
already disagreed with the oracle before this window starts, so the fork
that produced it must be an earlier turn (most plausibly turn 1, per the
census's own hypothesis) that this reproducer's capture range does not
reach.

## Dragon Breath fixture — GROVYLE and ONIX

First captured frame of the whole fixture is **3121** (D-1's own first
frame, "ONIX used DRAGONBREATH!" already on the oracle's screen while the
app shows a blank transitional message box).

| Frame | Source | ONIX hp/maxHP | ONIX bar px/48 | GROVYLE hp/maxHP | GROVYLE bar px/48 |
| --- | --- | --- | --- | --- | --- |
| 3121 | oracle RAM | **101/117** | **41** | 101/143 | 33 |
| 3121 | app kernel | 117/117 | 48 | 143/143 | 48 |
| 3239 (D-2's own isolated-baseline start) | oracle RAM | 101/117 | 41 | **88/143** | **29** |
| 3239 | app kernel | 117/117 | 48 | 143/143 | 48 |
| 3239 | app displayed field (`battleCommandPresentation.field`, app is on the next action menu here) | 117/117 | 48 | 143/143 | 48 |
| 3846 (D-2's window end) | oracle RAM | 101/117 | 41 | 88/143 | 29 |
| 3846 | app kernel + displayed field | 117/117 | 48 | 143/143 | 48 |

Pixel cross-check confirms every one of these: GROVYLE's row 33 run is
`90,214,132×48` (app) vs. `90,214,132×33|74,66,90×15` (oracle) at frame
3121, then vs. `90,214,132×29|74,66,90×19` (oracle) at frame 3239 — the
oracle's own bar keeps draining (33→29px, i.e. 101→88 real HP, a genuine
turn-3 hit landing in the oracle's own continuing real replay) while the
app's stays pinned at 48/48 the entire window. ONIX's row 92 run (its own
48px bar) is `115,255,173×48` (app) vs. `115,255,173×41|82,107,90×7`
(oracle) at every sampled frame — floor(101/117×48)=41 exactly.

**D-2 "present throughout" check (method step 1).** Re-running the compare
summary confirms the census's claim precisely: the diff stays flat at
exactly 98px (bbox `(81,33)-(99,34)` + `(191,92)-(221,104)`) across every
D-2 frame from 3239 through 3846, with only the six named, already-settled
D-3 idle-bounce spikes interrupting it — a genuine baseline, not a decaying
transient. And the underlying kernel/oracle HP gap **predates D-2's own
onset**: it is already fully formed at frame 3121, the earliest frame this
whole fixture captures — before D-1's "app already finished the turn and
reopened the menu" divergence even plays out on screen. Notably, GROVYLE's
numbers at frame 3121 (oracle 101/143, kernel 143/143) are **bit-identical**
to Endeavor's frame 2894 despite the two fixtures being independent
replays from the canonical snapshot with different button schedules — this
is exactly what a shared, common upstream fork (turn 1) predicts, and is
inconsistent with each fixture accumulating its own independent divergence
from scratch.

## Why this falsifies (a) and confirms (b)

`resolutionField()` (`src/engine/sceneOffPresentation.ts:210`) builds
`BattleResolutionDisplayedField.battler(id).hp` directly from
`input.before.battlers[id]!.hp`, where `input.before` is typed
`BattleScriptRulesContext` (`SceneOffKernelTurnProjectionInput.before`,
`sceneOffPresentation.ts:162`) — the live kernel state, not a copy.
`healthboxParams()` (`src/engine/battleResolutionPresentationRender.ts:313`,
and the structurally identical command-menu variant at
`src/engine/battleCommandPresentationRender.ts:80`) then computes
`hpFraction: battler.hp / battler.maxHP` with no intervening cache. The
kernel's own live rules context lives at
`state.factoryRoundBattleOrchestrator.battle.rules.rulesContext`
(`EngineState.factoryRoundBattleOrchestrator`, `src/engine/core.ts:463`;
`FactoryFullTurnDecisionRules.rulesContext`,
`src/engine/factoryBattleScriptFullTurnDecision.ts:314`) — the same
`BattleScriptRulesContext` every damage/faint/AI reducer in the engine
reads and writes (e.g. `src/engine/battleScriptHitChainOpcode.ts:2056-2057`,
`src/engine/battleEndTurnOrchestration.ts:2075`). There is architecturally
only one HP value in the app for a given battler at a given tick, and the
direct-state dumps above confirm it empirically: the displayed field's
hp/maxHP is bit-identical to the kernel rulesContext's hp/maxHP at **every**
sampled frame across both fixtures (9 samples total, 0 mismatches). Bar
rendering itself is exact too (`calcBarFilledPixels`,
`src/engine/healthboxAssembly.ts:251-273`, `HP_BAR_TOTAL_PIXELS = 48`,
`healthboxAssembly.ts:230`): every observed pixel run matches
`floor(hp/maxHP × 48)` on the app's own numbers precisely.

Hypothesis (a) required kernel HP to agree with the oracle while the
*render* diverged from the kernel. The opposite is what the data shows:
render agrees with kernel perfectly; **kernel disagrees with the oracle**.
That is exactly the shape of two independently-computed battle
continuities, not a stale-wiring defect — and it is already present at the
earliest frame either fixture captures, so no event inside either
reproducer's own window causes it.

## Disposition

Falsifies (a). Confirms (b). No `resolutionField()`/`healthboxParams()`
fix is coherent here — both are already exact functions of the kernel's
own (route-divergent) state. Per the census's leverage ranking and the
already-settled routing decision, ISSUES #62 has no remaining actionable
item; its remainder should close as inherent route divergence, evidenced
by this probe.
