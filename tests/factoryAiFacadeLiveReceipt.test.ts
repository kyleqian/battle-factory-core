import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_Facade receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-facade.md). Each row was observed
// directly on the Battle Scene OFF oracle: the ROM's PP-selected move slot
// and its exact decision-window RNG endpoint, reproduced by the engine from
// the ROM-observed start RNG on the same scored view. The fixture pair is
// tools/battle-lab/mechanic-factory-ai-cv-facade-{reach,control}-off.json;
// `verify-factory-ai-facade-live.ts` prints these numbers live.
//
// Scenario shape: the AI user is Metagross with [Facade, Splash, Splash,
// Splash]; the target is Vaporeon. The reach fixture's level-5 Magikarp
// relay inflicts real Thunder Wave paralysis on the target on turn 1 before
// it is KO'd by the player's Vital Throw (priority -1), so when Metagross
// comes in the target's STATUS1_PARALYSIS bit is live. AI_CV_Facade
// (`data/battle_ai_scripts.s:2279-2287`, non-BUGFIX AI_TARGET gate) then
// scores +1 (reach) or 0 (control, no draw -- it is a pure status gate, so
// both scenarios consume exactly setup 4 + tie 1 = 5 draws).
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

const MOVE_FACADE = 263; // EFFECT_FACADE -- AI_CV_Facade's target-status1 gate
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM/CV table entry

function facadeView(targetParalyzed: boolean): FactoryAiScoredView {
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
    moves: [MOVE_FACADE, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze({
      types: ["TYPE_STEEL", "TYPE_PSYCHIC"] as const,
      attack: 150, defense: 80, spAttack: 95, spDefense: 80, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 140, maxHp: 140,
      ability: "ABILITY_CLEAR_BODY",
    }),
    target: Object.freeze({
      species: 134,
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: 85, defense: 80, spAttack: 130, spDefense: 115, speed: 85, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 205, maxHp: 205,
      ability: "ABILITY_WATER_ABSORB",
      knownAbility: null,
      lastUsedMoveId: 233, // the target's turn-1 Vital Throw
      knownMoveIds: [233],
      ...(targetParalyzed ? { isParalyzed: true } : {}),
    }),
  });
}

describe("AI_CV_Facade live receipt (docs/factory-ai-cv-live-receipts-facade.md)", () => {
  it.each([
    // [seed, targetParalyzed, rngStart, expectedSlot, expectedRng, cvDelta]
    [1, false, 3_894_234_654, 0, 3_323_223_981, 0],
    [1, true, 2_023_871_260, 0, 1_221_427_251, 1],
    [99, false, 1_656_372_911, 3, 2_270_394_938, 0],
    [99, true, 1_352_996_645, 0, 3_110_092_376, 1],
  ] as const)("seed %i %s: engine reproduces the ROM's chosen slot and exact RNG endpoint", (
    _seed,
    targetParalyzed,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCvDelta,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: facadeView(targetParalyzed),
      request,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(5);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
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

  it("the reach/control split is the gate: a paralyzed target scores Facade +1, a clean target ties with Splash", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: facadeView(true),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    const control = chooseFactoryAiScoredDecision({
      view: facadeView(false),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    expect(reach.trace.bestMoveSlots).toEqual([0]);
    expect(control.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1, finalScore: 101 });
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
  });
});
