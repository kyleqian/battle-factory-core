import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_MirrorCoat receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-mirrorcoat.md). The live oracle work
// found and fixed a real hardware divergence: the port's `MOVE_COUNTER` was
// 243 (Mirror Coat's OWN id), so `AI_CV_MirrorCoat`'s `if_has_move AI_USER,
// MOVE_COUNTER` gate always took the Counter jump and could never model a
// Counter-less carrier. The real `#define MOVE_COUNTER` is 68
// (include/constants/moves.h:72). The fixture pair
// (tools/battle-lab/mechanic-factory-ai-cv-mirrorcoat-{reach,control}-off.json)
// is the opponent lead vs a single-ability Ground target (Donphan, no
// get-ability draws, no switch-check RNG): control = Corsola [Mirror Coat,
// Splash x3] (no Counter), reach = Wobbuffet [Mirror Coat, Counter, Splash,
// Splash].
//
// The turn-1 decision is drawn in the battle intro (invisible); the FIRST
// observable decision is turn 2 (target's last move = Splash, power 0 ->
// the power-0 path). seed 1 control fully matches the ROM: 7 draws (4 setup +
// roll-6 + roll-7 + tie) from 3644022420 -> 3323223981 choosing Mirror Coat
// slot 0. seed 1 reach matches draw count + endpoint RNG (7 draws,
// 3726110690) but the ROM's tie lands on Splash slot 3 while the engine picks
// Mirror Coat slot 0 -- the reach row's tie-slot divergence is the documented
// residual (see the doc's verdict).
const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});
const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
  speed: DEFAULT_STAT_STAGE,
  acc: DEFAULT_STAT_STAGE,
  evasion: DEFAULT_STAT_STAGE,
});

const MOVE_MIRROR_COAT = 243; // EFFECT_MIRROR_COAT -- dispatches AI_CV_MirrorCoat
const MOVE_COUNTER_REAL = 68; // the real move id (`#define MOVE_COUNTER 68`)
const MOVE_SPLASH = 150;

function mirrorCoatView(reach: boolean): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({
      levelMode: 0 as const,
      battleMode: 0 as const,
      factoryWinStreak: 28,
      trainerOpponentId: 222,
    }),
    moves: reach
      ? [MOVE_MIRROR_COAT, MOVE_COUNTER_REAL, MOVE_SPLASH, MOVE_SPLASH]
      : [MOVE_MIRROR_COAT, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH],
    attacker: Object.freeze(
      reach
        ? {
          // Wobbuffet (FRONTIER_MON_WOBBUFFET_2, set 290: Counter + Mirror Coat)
          types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
          attack: 53, defense: 78, spAttack: 53, spDefense: 78, speed: 53, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 265, maxHp: 265,
          ability: "ABILITY_SHADOW_TAG",
        }
        : {
          // Corsola (FRONTIER_MON_CORSOLA, set 151: Mirror Coat, no Counter)
          types: ["TYPE_WATER", "TYPE_ROCK"] as const,
          attack: 75, defense: 105, spAttack: 85, spDefense: 105, speed: 55, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 130, maxHp: 130,
          ability: "ABILITY_HUSTLE",
        },
    ),
    target: Object.freeze({
      species: 232, // Donphan -- single-ability Ground/Ground, no switch-check RNG
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 140, defense: 140, spAttack: 80, spDefense: 80, speed: 70, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 165, maxHp: 165,
      ability: "ABILITY_STURDY",
      knownAbility: null,
      lastUsedMoveId: MOVE_SPLASH, // target's turn-1 Splash (power 0 -> power-0 path)
      knownMoveIds: [MOVE_SPLASH],
    }),
  });
}

describe("AI_CV_MirrorCoat live receipt (docs/factory-ai-cv-live-receipts-mirrorcoat.md)", () => {
  it("control (no Counter): engine reproduces the ROM's 7 draws, endpoint RNG and Mirror Coat slot-0 choice (seed 1)", () => {
    const result = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(false),
      request,
      rng: { value: 3_644_022_420, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(7);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "mirror-coat-roll-6", "mirror-coat-roll-7", "best-move-tie",
    ]);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta)).toEqual([0, 0, 0, 0]);
    expect(result.trace.slotScores.map((slot) => slot.finalScore)).toEqual([100, 100, 100, 100]);
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: 0 });
    expect(result.rng.value).toBe(3_323_223_981); // ROM-observed post-decision RNG (7 steps from 3644022420)
  });

  it("reach (Counter in the set): the Counter-jump path draws roll-7 + counter-bonus-roll, matching the ROM's 7 draws and endpoint (slot divergence is the documented residual)", () => {
    const result = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(true),
      request,
      rng: { value: 3_560_934_917, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(7);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "mirror-coat-roll-7", "counter-bonus-roll", "best-move-tie",
    ]);
    // The ROM's turn-2 decision had the SAME 7 draws and endpoint 3726110690,
    // but its tie landed on Splash slot 3 (all four at 100, Random()%4) while
    // the engine's roll-7 fell through (+4 -> 104, best slot 0). The draw/endpoint
    // receipt is banked; the tie-slot outcome is the live-observed residual.
    expect(result.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 4, finalScore: 104 });
    expect(result.rng.value).toBe(3_726_110_690);
  });

  it("regression guard: MOVE_COUNTER is 68, not Mirror Coat's own id (243) -- a Counter-less set must NOT take the Counter jump", () => {
    // The shipped bug made `includes(243)` always true for any Mirror Coat
    // carrier, so the control set would draw only mirror-coat-roll-7 (6 draws)
    // and pick Splash slot 3. The fixed gate keys on 68: the control set draws
    // the power-0 control path (roll-6 + roll-7) and the reach set draws the
    // Counter jump (roll-7 + counter-bonus-roll).
    const control = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(false),
      request,
      rng: { value: 3_644_022_420, calls: 0 },
    });
    expect(control.trace.draws.map((draw) => draw.kind)).toContain("mirror-coat-roll-6");
    expect(control.trace.draws.map((draw) => draw.kind)).toContain("mirror-coat-roll-7");
    expect(control.trace.draws.map((draw) => draw.kind)).not.toContain("counter-bonus-roll");
    expect(control.trace.draws).toHaveLength(7);

    const reach = chooseFactoryAiScoredDecision({
      view: mirrorCoatView(true),
      request,
      rng: { value: 3_644_022_420, calls: 0 },
    });
    expect(reach.trace.draws.map((draw) => draw.kind)).toContain("mirror-coat-roll-7");
    expect(reach.trace.draws.map((draw) => draw.kind)).toContain("counter-bonus-roll");
    expect(reach.trace.draws.map((draw) => draw.kind)).not.toContain("mirror-coat-roll-6");
  });
});
