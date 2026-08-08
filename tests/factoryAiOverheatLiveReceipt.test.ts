import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_Overheat receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-overheat.md). Each row was observed
// directly on the Battle Scene OFF oracle: the ROM's PP-selected move slot
// and its exact decision-window RNG endpoint, reproduced by the engine from
// the ROM-observed start RNG on the same scored view. The fixture pair is
// tools/battle-lab/mechanic-factory-ai-cv-overheat-{reach,control}-off.json;
// `verify-factory-ai-overheat-live.ts` prints these numbers live.
//
// Scenario shape: the AI user is Flareon with [Overheat, Splash, Splash,
// Splash]; the target is Chansey (control -- Normal takes Fire at 1x, so
// AI_CV_Overheat's two `if_type_effectiveness x0.25/x0.5` checks fall
// through) or Vaporeon (reach -- Water takes Fire at 0.5x, so the first
// check jumps straight to ScoreDown1). Both are fed by a level-5 Magikarp
// Splash relay KO'd by the player's Vital Throw (priority -1). AI_CV_Overheat
// (`data/battle_ai_scripts.s:2572-2583`) draws no RNG of its own: the
// effectiveness gate (reach) and the HP>60/HP>80 exits (control, full HP)
// are pure reads, so the whole observable difference is the CV delta (-1
// reach / 0 control) and the draw count, which differs because the control
// target Chansey has TWO possible abilities (Natural Cure/Serene Grace), so
// AI_CheckBadMove's per-slot `get_ability` soundproof guess consumes one
// draw per slot (9 total: 4 setup + 4 get-ability + 1 tie) while the
// single-ability Vaporeon target draws none (5 total: 4 setup + 1 tie).
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

const MOVE_OVERHEAT = 315; // EFFECT_OVERHEAT -- AI_CV_Overheat's type-effectiveness gate
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM/CV table entry

function overheatView(reach: boolean): FactoryAiScoredView {
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
    moves: [MOVE_OVERHEAT, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze({
      types: ["TYPE_FIRE", "TYPE_FIRE"] as const,
      attack: 150, defense: 80, spAttack: 115, spDefense: 130, speed: 85, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 140, maxHp: 140,
      ability: "ABILITY_FLASH_FIRE",
    }),
    target: Object.freeze({
      species: reach ? 134 : 113,
      types: reach ? ["TYPE_WATER", "TYPE_WATER"] as const : ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      attack: reach ? 85 : 25,
      defense: reach ? 80 : 25,
      spAttack: reach ? 130 : 55,
      spDefense: reach ? 115 : 125,
      speed: reach ? 85 : 70,
      level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: reach ? 205 : 325,
      maxHp: reach ? 205 : 325,
      ability: reach ? "ABILITY_WATER_ABSORB" : "ABILITY_NATURAL_CURE",
      knownAbility: null,
      lastUsedMoveId: 233, // the target's Vital Throw
      knownMoveIds: [233],
    }),
  });
}

describe("AI_CV_Overheat live receipt (docs/factory-ai-cv-live-receipts-overheat.md)", () => {
  it.each([
    // [seed, reach, rngStart, expectedSlot, expectedRng, cvDelta, draws]
    [1, false, 3_726_110_690, 0, 724_352_597, 0, 9],
    [1, true, 3_894_234_654, 3, 3_323_223_981, -1, 5],
    [99, false, 1_329_715_331, 0, 4_213_767_554, 0, 9],
    [99, true, 1_656_372_911, 3, 2_270_394_938, -1, 5],
  ] as const)("seed %i %s: engine reproduces the ROM's chosen slot and exact RNG endpoint", (
    _seed,
    reach,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCvDelta,
    expectedDraws,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: overheatView(reach),
      request,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(expectedDraws);
    const kinds = result.trace.draws.map((draw) => draw.kind);
    expect(kinds).toEqual(reach
      ? [
        "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
        "best-move-tie",
      ]
      : [
        "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
        "get-ability", "get-ability", "get-ability", "get-ability",
        "best-move-tie",
      ]);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta))
      .toEqual([expectedCvDelta, 0, 0, 0]);
    expect(result.trace.slotScores.map((slot) => slot.finalScore))
      .toEqual([100 + expectedCvDelta, 100, 100, 100]);
    expect(result.trace.tie.chosenDecision).toMatchObject({
      kind: "use-move",
      moveSlot: expectedSlot,
    });
    expect(result.rng.value).toBe(expectedRng);
  });

  it("the reach/control split is the gate: a Fire-resistant target scores Overheat -1, a neutral target ties with Splash", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: overheatView(true),
      request,
      rng: { value: 3_726_110_690, calls: 0 },
    });
    const control = chooseFactoryAiScoredDecision({
      view: overheatView(false),
      request,
      rng: { value: 3_726_110_690, calls: 0 },
    });
    expect(reach.trace.bestMoveSlots).toEqual([1, 2, 3]);
    expect(control.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -1, finalScore: 99 });
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
    expect(reach.trace.draws).toHaveLength(5);
    expect(control.trace.draws).toHaveLength(9);
  });
});
