import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_PsychUp receipt rows from the Battle Scene OFF oracle
// (docs/factory-ai-cv-live-receipts-psychup.md). The hardware verifier stages
// the target with two real Swords Dances in reach and two real Focus Energies
// in control, then matches the carrier's PP-selected slot and exact endpoint
// from the RNG cursor before BattleTurnPassed's owned draw.
const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: ([0, 1, 2, 3] as const).map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot,
    targetBattler: 0,
  })),
});
const neutralStages = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
  speed: DEFAULT_STAT_STAGE,
  acc: DEFAULT_STAT_STAGE,
  evasion: DEFAULT_STAT_STAGE,
});

const MOVE_PSYCH_UP = 244;
const MOVE_SCRATCH = 10;

function psychUpView(reach: boolean): FactoryAiScoredView {
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
    moves: [MOVE_PSYCH_UP, MOVE_SCRATCH, MOVE_SCRATCH, MOVE_SCRATCH] as const,
    attacker: Object.freeze({
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: 102,
      defense: 98,
      spAttack: 115,
      spDefense: 100,
      speed: 105,
      level: 50,
      statStages: neutralStages,
      isFirstTurn: 2,
      hp: 155,
      maxHp: 155,
      ability: "ABILITY_DAMP",
    }),
    target: Object.freeze({
      species: 212, // Scizor
      types: ["TYPE_BUG", "TYPE_STEEL"] as const,
      attack: 150,
      defense: 120,
      spAttack: 75,
      spDefense: 100,
      speed: 85,
      level: 50,
      statStages: reach ? { ...neutralStages, atk: 10 } : neutralStages,
      isFirstTurn: 0,
      hp: 145,
      maxHp: 145,
      ability: "ABILITY_SWARM",
      knownAbility: null,
      lastUsedMoveId: 163, // Slash, the real relay KO move
      knownMoveIds: [163],
    }),
  });
}

describe("AI_CV_PsychUp live receipt (docs/factory-ai-cv-live-receipts-psychup.md)", () => {
  it.each([
    // [seed, reach, rngStart, expectedSlot, expectedRng, CV vector, scores]
    [1, false, 3_070_328_874, 2, 669_553_864, [-2, 0, 0, 0], [88, 100, 100, 100]],
    [1, true, 3_070_328_874, 0, 669_553_864, [1, 0, 0, 0], [101, 100, 100, 100]],
    [2, false, 3_735_443_684, 1, 1_254_004_658, [-2, 0, 0, 0], [88, 100, 99, 100]],
    [2, true, 3_735_443_684, 0, 1_254_004_658, [1, 0, 0, 0], [101, 100, 99, 100]],
  ] as const)("seed %i %s: engine reproduces the ROM's Psych Up receipt", (
    _seed,
    reach,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCv,
    expectedScores,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: psychUpView(reach),
      request,
      rng: { value: rngStart, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    expect(result.trace.turnStartRandomNumber).toEqual({ owner: "decision", value: expect.any(Number) });
    expect(result.trace.draws).toHaveLength(6);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "turn-start-random-number",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "best-move-tie",
    ]);
    expect(result.trace.draws.some((draw) => draw.kind.includes("psych-up"))).toBe(false);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta)).toEqual(expectedCv);
    expect(result.trace.slotScores.map((slot) => slot.finalScore)).toEqual(expectedScores);
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: expectedSlot });
    expect(result.rng.value).toBe(expectedRng);
  });

  it("keeps the source gate visible: only a real raised target reaches +1", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: psychUpView(true),
      request,
      rng: { value: 3_070_328_874, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    const control = chooseFactoryAiScoredDecision({
      view: psychUpView(false),
      request,
      rng: { value: 3_070_328_874, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1, finalScore: 101 });
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -2, finalScore: 88 });
    expect(reach.trace.draws).toHaveLength(6);
    expect(control.trace.draws).toHaveLength(6);
    expect(reach.trace.bestMoveSlots).toEqual([0]);
    expect(control.trace.bestMoveSlots).toEqual([1, 2, 3]);
  });
});
