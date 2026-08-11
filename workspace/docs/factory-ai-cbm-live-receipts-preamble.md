# AI_CheckBadMove preamble — live receipts against the real ROM (Battle Scene OFF)

2026-08-08, bounded MAIN-lane worker, Battle Scene OFF oracle at
`http://127.0.0.1:8014`. This is the first hardware receipt for
`AI_CheckBadMove`'s **universal preamble** — the highest-traffic code in the
module, which runs for *every* candidate move of *every* AI turn before any
`if_effect` dispatch. The move-scoring stack was completed today
(109/109 table effects + 122/122 CV), but until this session **zero** of its
handlers had been run against the real ROM. Seven `AI_CheckViability`
handlers were live-verified earlier; this session opens the other scorer.

The recipe is the established reach/control pair: a **control** scenario where
the gate does NOT fire and a **reach** scenario where it DOES, both staged
through `mechanicLab`'s `overrides.parties` so the stock ROM builds both real
parties and runs its own Factory AI; then the ROM's observed behaviour is
compared against `chooseFactoryAiScoredDecision`'s own output on the same
view. Follows the per-handler addendum structure of
`docs/factory-ai-checkviability-ground-truth.md` §14 onward, but lives in its
own file because the side lane is appending to the shared ground-truth doc
this round.

## 1. The preamble and the two build-time discriminators

`AI_CheckBadMove` (`reference/pokeemerald/data/battle_ai_scripts.s:51-104`):

```
AI_CheckBadMove:
    if_target_is_ally AI_Ret
    if_move MOVE_FISSURE,    AI_CBM_CheckIfNegatesType
    if_move MOVE_HORN_DRILL, AI_CBM_CheckIfNegatesType
    get_how_powerful_move_is
    if_equal MOVE_POWER_OTHER, AI_CheckBadMove_CheckSoundproof
AI_CBM_CheckIfNegatesType:
    if_type_effectiveness AI_EFFECTIVENESS_x0, Score_Minus10   <-- gate A
    get_ability AI_TARGET                                      <-- ability read #1
    ... (Volt Absorb / Water Absorb / Flash Fire / Wonder Guard / Levitate)
    goto AI_CheckBadMove_CheckSoundproof_
AI_CheckBadMove_CheckSoundproof:
    get_ability AI_TARGET                                      <-- ability read #2
    if_not_equal ABILITY_SOUNDPROOF, AI_CheckBadMove_CheckEffect
    ...
```

**Gate A — type immunity.** A damaging move that is **x0 immune** against the
target's typing jumps to `Score_Minus10` *before* ability read #1. A normally
effective move falls through to both ability reads.

**Gate B — the `get_ability` redraw quirk (the load-bearing roll-count claim).**
`Cmd_get_ability` (`battle_ai_script_commands.c:1350-1402`) draws **one
`Random()` per call** whenever the target's ability is unknown, the target is
not a trapper (Shadow Tag / Magnet Pull / Arena Trap), and the species has
**two distinct abilities** — and it never caches, because
`BATTLE_HISTORY->abilities[target]` is read but never written. So both
preamble call sites redraw fresh, even in the same slot's pass.

Prediction: a **two-distinct-ability** target costs **2 extra draws per scored
slot** in the control row; a **single-ability** target costs **0**.

## 2. Fixture design

Both fixtures stage the Factory trainer's scoring mon (Shuckle, 213) with
**TACKLE ×4** (`MOVE_TACKLE`, 33, Normal / `EFFECT_HIT`) behind a level-5
Magikarp lead (the counter fixture's exact switch-in structure, so the
observed decision is a turn-2 window bounded by the switch). The player target
is the discriminator; both species are from the committed Level-50 Frontier
corpus (`src/data/gen/battle-frontier-mons.json`), with types and ability
slots confirmed from `src/data/gen/species-types.json` /
`src/data/gen/species-stats.json`:

- **`mechanic-factory-ai-cbm-preamble-control-off.json`** — player
  **LUDICOLO (297)**, Water/Grass, `[ICE BEAM ×4]`. TACKLE is normally
  effective (no x0) → the preamble **falls through** gate A to both ability
  reads. LUDICOLO is a **two-distinct-ability** species (Swift Swim / Rain
  Dish), neither a trapper → **2 draws per scored slot × 4 = 8** CBM draws.
  This is the gate-B case.
- **`mechanic-factory-ai-cbm-preamble-reach-off.json`** — player
  **BANETTE (378)**, Ghost/Ghost, `[SHADOW BALL ×4]`. TACKLE is **x0 immune**
  vs Ghost → gate A jumps to `Score_Minus10` for all four slots, exiting
  **before** ability read #1 → **0** CBM draws. BANETTE is a single-ability
  species (Insomnia), so this row also independently shows a single-ability
  target costing 0 CBM draws (via the immune exit; the
  single-ability-fallthrough-0 branch is source-proven — `Cmd_get_ability`'s
  single-ability branch is a direct field read with no `Random()` — and is
  separately banked by the counter control fixture's receipt).
- Both: opponent `[Magikarp(129) lv5 SPLASH×4, Shuckle(213) TACKLE×4,
  Bulbasaur(1) TACKLE×4]`, `trainerId 222`, `challengeNum 7`, `battleNum 1`,
  the counter fixture's exact Factory context.

No transient battle state is injected: both gates are pure build-time
typing/ability-slot discriminators, exactly as the brief requires.

## 3. Live ledger (oracle-verified, both seeds, both reruns)

`tools/probe/verify-factory-ai-cbm-preamble-live.ts` replays each fixture
twice at seeds 1 and 2 (decision window rerun byte-identical), finds the
turn-2 decision as the RNG footprint **`1 + 13` (control) / `1 + 5` (reach)** —
the unmodeled pre-decision draw (the ordinary per-turn `gRandomTurnNumber`,
ISSUES #83, `battle_main.c:4013`) followed by `BattleAI_SetupAIData`'s 4 setup
draws, the CBM preamble's ability reads, and `ChooseMoveOrAction_Singles`'s
unconditional final tie — and compares the ROM's PP-selected slot and RNG
endpoint against `chooseFactoryAiScoredDecision` on the same captured view
(ROM-built level-50 Shuckle/Ludicolo or Shuckle/Banette, both at full HP —
the AI's TACKLE on turn 1 goes into the fainted Magikarp's slot and is not
observed).

| Seed | Fixture | Gate A | Target ability slots | ROM decision draws | Engine draws | CBM draws (per-slot) | ROM PP (start → turn 2) | Engine/ROM slot | ROM → engine end RNG | Verdict |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | control | falls through | **2 distinct** | 13 | 13 | **8 (2 ×4)** | `[35,35,35,35]→[35,35,35,34]` | slot 3 = slot 3 | `669553864` = `669553864` | **MATCH** |
| 1 | reach | x0 jump | 1 | 5 | 5 | **0 (0 ×4)** | `[35,35,35,35]→[35,34,35,35]` | slot 1 = slot 1 | `2023871260` = `2023871260` | **MATCH** |
| 2 | control | falls through | **2 distinct** | 13 | 13 | **8 (2 ×4)** | `[35,35,35,35]→[35,35,34,35]` | slot 2 = slot 2 | `1254004658` = `1254004658` | **MATCH** |
| 2 | reach | x0 jump | 1 | 5 | 5 | **0 (0 ×4)** | `[35,35,35,35]→[35,35,34,35]` | slot 2 = slot 2 | `3130704934` = `3130704934` | **MATCH** |

Verifier stdout (seeds 1 & 2, this session):

```
PASS control seed 1: gRTTN@653 -> seed 3323223981; engine 13 draws (setup4 + cbm8 + tie1) -> end 669553864; ROM decision block ends @665 (13 steps) at 669553864; chosen slot 3 (ROM pp 35,35,35,35 -> 35,35,35,34) = engine 3; scores 99,99,99,100; CBM deltas 0,0,0,0
PASS reach seed 1: gRTTN@552 -> seed 3413886777; engine 5 draws (setup4 + cbm0 + tie1) -> end 2023871260; ROM decision block ends @562 (5 steps) at 2023871260; chosen slot 1 (ROM pp 35,35,35,35 -> 35,34,35,35) = engine 1; scores 90,90,90,90; CBM deltas -10,-10,-10,-10
PASS control seed 2: gRTTN@653 -> seed 3469321887; engine 13 draws (setup4 + cbm8 + tie1) -> end 1254004658; ROM decision block ends @665 (13 steps) at 1254004658; chosen slot 2 (ROM pp 35,35,35,35 -> 35,35,34,35) = engine 2; scores 100,100,100,100; CBM deltas 0,0,0,0
PASS reach seed 2: gRTTN@552 -> seed 206709515; engine 5 draws (setup4 + cbm0 + tie1) -> end 3130704934; ROM decision block ends @562 (5 steps) at 3130704934; chosen slot 2 (ROM pp 35,35,35,35 -> 35,35,34,35) = engine 2; scores 90,90,90,90; CBM deltas -10,-10,-10,-10
```

Notes on the numbers:

- **The gate-B prediction is confirmed.** The control row (LUDICOLO, two
  distinct abilities) spends exactly **2 `get_ability` draws per scored slot**
  — 8 CBM draws across the four TACKLE slots — on top of the shared
  setup(4) + tie(1), for **13** total. The reach row (BANETTE, Ghost) exits at
  gate A with **0** CBM draws, for **5** total. The 8-draw spread is exactly
  the port's load-bearing `get_ability` redraw claim: both preamble call sites
  draw fresh, per slot, never cached.
- **Gate A's -10 is observable.** Every reach slot scores CBM **-10** (final
  90 = 100 − 10 + 0 + 0) and draws zero; every control slot scores **0**
  (final 100, or 99 where the TTF pass's most-powerful tie-break penalizes the
  not-most-powerful slot — same shape as the banked counter receipt).
- **The pre-decision `[1]` is the known seam, not a divergence.** It is the
  unmodeled per-turn `gRandomTurnNumber` draw (ISSUES #83, deliberately not
  ported into the scored-policy seam this round). The engine is seeded *after*
  it, exactly as every sibling verification script does, and its endpoint then
  lands on the ROM's post-decision value.

## 4. Verdict and pinned receipt

**MATCH — 4/4 scenarios.** No divergence from hardware: `AI_CheckBadMove`'s
universal preamble as ported (`src/engine/factoryAiCheckBadMove.ts`,
`runCheckBadMovePreamble` + `nextGetAbilityDraw`) reproduces the ROM's chosen
slot, decision-window draw count, and RNG endpoint on both seeds and both gate
states. The observed per-slot CBM draw count (2 for a two-ability target in
the control row, 0 for the immune/single-ability reach row) matches the
prediction derived from `Cmd_get_ability`'s source. The first `AI_CheckBadMove`
hardware receipt is banked.

The banked numbers are pinned by **`tests/factoryAiCbmPreambleLiveReceipt.test.ts`**
(6 tests: all four ROM rows — draw count, CBM-draw count, per-slot delta
vector, final score vector, chosen slot, endpoint RNG — plus the trace-shape
pins for both rows' exact draw-kind sequences), so a later port of the
preamble's ability-read machinery or a wiring regression breaks the suite
loudly. Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-cbm-preamble-live.ts
npx vitest run tests/factoryAiCbmPreambleLiveReceipt.test.ts
```
