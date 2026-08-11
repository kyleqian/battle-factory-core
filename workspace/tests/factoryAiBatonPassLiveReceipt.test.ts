import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_BatonPass receipt rows from the Battle Scene OFF oracle
// (docs/factory-ai-cv-live-receipts-batonpass.md). The hardware fixture uses
// real Seismic Toss x2 to reach Aipom 30/130, then one real Swagger (reach:
// Aipom Attack 8 only) or Confuse Ray (control: all stages neutral).
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

const MOVE_BATON_PASS = 226;
const MOVE_SCRATCH = 10;
const MOVE_SEISMIC_TOSS = 69;
const MOVE_SWAGGER = 207;
const MOVE_CONFUSE_RAY = 109;

function batonPassView(role: "reach" | "control", targetHp: number): FactoryAiScoredView {
  const statusMove = role === "reach" ? MOVE_SWAGGER : MOVE_CONFUSE_RAY;
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
    moves: [MOVE_BATON_PASS, MOVE_SCRATCH, MOVE_SCRATCH, MOVE_SCRATCH] as const,
    attacker: Object.freeze({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      attack: 90,
      defense: 75,
      spAttack: 60,
      spDefense: 75,
      speed: 105,
      level: 50,
      statStages: role === "reach" ? { ...neutralStages, atk: 8 } : neutralStages,
      isFirstTurn: 2,
      hp: 30,
      maxHp: 130,
      ability: "ABILITY_RUN_AWAY",
      usablePartyMons: 1,
      isConfused: true,
    }),
    target: Object.freeze({
      species: 67, // Machoke: 65 speed, so Aipom is faster.
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 120,
      defense: 90,
      spAttack: 70,
      spDefense: 80,
      speed: 65,
      level: 50,
      statStages: neutralStages,
      isFirstTurn: 0,
      hp: targetHp,
      maxHp: 155,
      ability: "ABILITY_GUTS",
      knownAbility: null,
      knownMoveIds: [MOVE_SEISMIC_TOSS, statusMove],
      lastUsedMoveId: statusMove,
      usablePartyMons: 2,
    }),
  });
}

describe("AI_CV_BatonPass live receipt (docs/factory-ai-cv-live-receipts-batonpass.md)", () => {
  it.each([
    // seed, twin, ROM pre-decision target HP/RNG, ROM PP slot/RNG endpoint
    [3, "reach", 79, 1_069_702_854, 0, 2_570_591_876, [0, 0, 0, 0], [100, 99, 99, 100]],
    [3, "control", 79, 1_069_702_854, 3, 2_570_591_876, [-2, 0, 0, 0], [98, 99, 99, 100]],
    [23, "reach", 75, 4_216_318_620, 0, 2_924_665_770, [0, 0, 0, 0], [100, 99, 99, 100]],
    [23, "control", 75, 4_216_318_620, 3, 2_924_665_770, [-2, 0, 0, 0], [98, 99, 99, 100]],
  ] as const)("seed %i %s: engine reproduces the ROM's Baton Pass receipt", (
    _seed,
    role,
    targetHp,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCv,
    expectedScores,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: batonPassView(role, targetHp),
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
    expect(result.trace.slotScores.map((slot) => slot.checkBadMoveDelta)).toEqual([0, 0, 0, 0]);
    expect(result.trace.slotScores.map((slot) => slot.tryToFaintDelta)).toEqual([0, -1, -1, 0]);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta)).toEqual(expectedCv);
    expect(result.trace.slotScores.map((slot) => slot.finalScore)).toEqual(expectedScores);
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: expectedSlot });
    expect(result.rng.value).toBe(expectedRng);
  });

  it("pins the stage-8 boundary: Baton Pass is neutral at +2, but -2 with no stage above 7", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: batonPassView("reach", 79),
      request,
      rng: { value: 1_069_702_854, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    const control = chooseFactoryAiScoredDecision({
      view: batonPassView("control", 79),
      request,
      rng: { value: 1_069_702_854, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -2, finalScore: 98 });
    expect(reach.trace.bestMoveSlots).toEqual([0, 3]);
    expect(control.trace.bestMoveSlots).toEqual([3]);
    expect(reach.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: 0 });
    expect(control.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: 3 });
  });
});
