import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_ChargeUpMove receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-chargeup.md). Each row was observed
// directly on the Battle Scene OFF oracle: the ROM's PP-selected move slot
// and its exact decision-window RNG endpoint, reproduced by the engine from
// the ROM-observed start RNG on the same scored view. The fixture pair is
// tools/battle-lab/mechanic-factory-ai-cv-chargeup-{reach,control}-off.json;
// `verify-factory-ai-chargeup-live.ts` prints these numbers live.
//
// Scenario shape: the AI user is Venusaur (a genuine Level-50 Solar Beam
// carrier) with [Solar Beam, Splash, Splash, Splash]; a level-5 Magikarp
// relay is KO'd by the player's Vital Throw, then Venusaur switches in and
// picks its first move. AI_CV_ChargeUpMove
// (`data/battle_ai_scripts.s:2184-2195`, one handler for EFFECT_SOLAR_BEAM /
// EFFECT_RAZOR_WIND / EFFECT_SKY_ATTACK / EFFECT_SKULL_BASH) is a pure
// deterministic gate with zero draws: target 0.25x/0.5x effectiveness or a
// Protect-using target scores -2, own HP <= 38% scores -1, else 0. The pair
// differs only in the target species' real typing -- Vaporeon (Water) takes
// Solar Beam at 2x, Ninetales (Fire) at 0.5x -- so both scenarios consume
// exactly setup 4 + tie 1 = 5 draws and the whole observable difference is
// the CV delta: -2 on the resisting target (the AI shuns Solar Beam and
// picks a Splash) vs a 4-way tie at 100 on the neutral target.
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

const MOVE_SOLAR_BEAM = 76; // EFFECT_SOLAR_BEAM -- AI_CV_ChargeUpMove
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM/CV table entry

function chargeUpView(role: "reach" | "control"): FactoryAiScoredView {
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
    moves: [MOVE_SOLAR_BEAM, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze({
      types: ["TYPE_GRASS", "TYPE_POISON"] as const,
      attack: 102, defense: 103, spAttack: 120, spDefense: 120, speed: 100, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 155, maxHp: 155,
      ability: "ABILITY_OVERGROW",
    }),
    target: Object.freeze({
      species: role === "reach" ? 38 : 134,
      types: role === "reach"
        ? ["TYPE_FIRE", "TYPE_FIRE"] as const
        : ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: role === "reach" ? 96 : 85,
      defense: role === "reach" ? 95 : 80,
      spAttack: role === "reach" ? 101 : 130,
      spDefense: role === "reach" ? 120 : 115,
      speed: role === "reach" ? 120 : 85,
      level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: role === "reach" ? 148 : 205,
      maxHp: role === "reach" ? 148 : 205,
      ability: role === "reach" ? "ABILITY_FLASH_FIRE" : "ABILITY_WATER_ABSORB",
      knownAbility: null,
      lastUsedMoveId: 233, // the target's turn-1 Vital Throw
      knownMoveIds: [233],
    }),
  });
}

describe("AI_CV_ChargeUpMove live receipt (docs/factory-ai-cv-live-receipts-chargeup.md)", () => {
  it.each([
    // [seed, role, rngStart, expectedSlot, expectedRng, cvDelta]
    [1, "control", 3_917_320_632, 1, 249_678_687, 0],
    [1, "reach", 3_894_234_654, 3, 3_323_223_981, -2],
    [99, "control", 3_126_163_249, 2, 4_009_132_340, 0],
    [99, "reach", 1_656_372_911, 3, 2_270_394_938, -2],
  ] as const)("seed %i %s: engine reproduces the ROM's chosen slot and exact RNG endpoint", (
    _seed,
    role,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCvDelta,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: chargeUpView(role),
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

  it("the reach/control split is the gate: a Grass-resisting target scores Solar Beam -2, a neutral target ties with Splash", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: chargeUpView("reach"),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    const control = chooseFactoryAiScoredDecision({
      view: chargeUpView("control"),
      request,
      rng: { value: 3_917_320_632, calls: 0 },
    });
    expect(reach.trace.bestMoveSlots).toEqual([1, 2, 3]);
    expect(control.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -2, finalScore: 98 });
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
  });
});
