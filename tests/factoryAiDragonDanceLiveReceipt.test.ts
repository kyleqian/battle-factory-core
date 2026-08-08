import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_DragonDance receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-dragondance.md). Each row was observed
// directly on the Battle Scene OFF oracle: the ROM's PP-selected move slot
// and its exact decision-window RNG endpoint, reproduced by the engine from
// the ROM-observed start RNG on the same scored view. The fixture pair is
// tools/battle-lab/mechanic-factory-ai-cv-dragondance-{reach,control}-off.json;
// `verify-factory-ai-dragondance-live.ts` prints these numbers live.
//
// Scenario shape: the AI user is Gyarados with [DragonDance, Splash, Splash,
// Splash], fed by a level-5 Magikarp Splash relay KO'd by the player's Vital
// Throw (priority -1). AI_CV_DragonDance (`data/battle_ai_scripts.s:2603-2614`)
// discriminates on `if_target_faster`: the reach target Crobat (Speed 150)
// outspends Gyarados (101), so the handler jumps to AI_CV_DragonDance2's
// single `if_random_less_than 128` roll (6 draws: setup 4 + roll 1 + tie 1);
// the control target Shuckle (Speed 25) is outsped, so the full-HP
// `if_hp_more_than AI_USER, 50` exit fires with zero rolls (5 draws: setup 4
// + tie 1). Both targets are single-ability species, so AI_CheckBadMove's
// per-slot `get_ability` soundproof guess never draws. The pair differs only
// in the target's Speed -- no staged transient state at all.
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

const MOVE_DRAGON_DANCE = 349; // EFFECT_DRAGON_DANCE -- AI_CV_DragonDance's target-faster gate
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM/CV table entry

function dragonDanceView(reach: boolean): FactoryAiScoredView {
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
    moves: [MOVE_DRAGON_DANCE, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze({
      types: ["TYPE_WATER", "TYPE_FLYING"] as const,
      attack: 145, defense: 99, spAttack: 80, spDefense: 120, speed: 101, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 170, maxHp: 170,
      ability: "ABILITY_INTIMIDATE",
    }),
    target: Object.freeze({
      species: reach ? 169 : 213,
      types: reach ? ["TYPE_POISON", "TYPE_FLYING"] as const : ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: reach ? 110 : 30,
      defense: reach ? 100 : 250,
      spAttack: reach ? 90 : 30,
      spDefense: reach ? 100 : 250,
      speed: reach ? 150 : 25,
      level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: reach ? 160 : 95,
      maxHp: reach ? 160 : 95,
      ability: reach ? "ABILITY_INNER_FOCUS" : "ABILITY_STURDY",
      knownAbility: null,
      lastUsedMoveId: 233, // the target's Vital Throw
      knownMoveIds: [233],
    }),
  });
}

describe("AI_CV_DragonDance live receipt (docs/factory-ai-cv-live-receipts-dragondance.md)", () => {
  it.each([
    // [seed, reach, rngStart, expectedSlot, expectedRng, cvDelta, draws, rollValue]
    [1, false, 3_894_234_654, 0, 3_323_223_981, 0, 5, null],
    [1, true, 3_894_234_654, 1, 2_023_871_260, 0, 6, 20],
    [2, false, 3_652_931_064, 1, 3_469_321_887, 0, 5, null],
    [2, true, 3_652_931_064, 0, 3_130_704_934, 1, 6, 201],
    [99, false, 1_656_372_911, 3, 2_270_394_938, 0, 5, null],
    [99, true, 1_656_372_911, 1, 1_352_996_645, 0, 6, 83],
  ] as const)("seed %i %s: engine reproduces the ROM's chosen slot and exact RNG endpoint", (
    _seed,
    reach,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCvDelta,
    expectedDraws,
    rollValue,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: dragonDanceView(reach),
      request,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(expectedDraws);
    const kinds = result.trace.draws.map((draw) => draw.kind);
    expect(kinds).toEqual(reach
      ? [
        "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
        "dragon-dance-roll-2",
        "best-move-tie",
      ]
      : [
        "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
        "best-move-tie",
      ]);
    expect(result.trace.slotScores.map((slot) => slot.checkViabilityDelta))
      .toEqual([expectedCvDelta, 0, 0, 0]);
    expect(result.trace.slotScores.map((slot) => slot.finalScore))
      .toEqual([100 + expectedCvDelta, 100, 100, 100]);
    if (reach) {
      const rollDraw = result.trace.draws[4] as { randomValue: number; succeeded: boolean };
      expect(rollDraw.randomValue % 256).toBe(rollValue);
      expect(rollDraw.succeeded).toBe((rollValue ?? 0) >= 128);
    }
    expect(result.trace.tie.chosenDecision).toMatchObject({
      kind: "use-move",
      moveSlot: expectedSlot,
    });
    expect(result.rng.value).toBe(expectedRng);
  });

  it("the reach/control split is the target-faster gate: the fast target draws the <128 roll, the slow target's full-HP exit draws nothing", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: dragonDanceView(true),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    const control = chooseFactoryAiScoredDecision({
      view: dragonDanceView(false),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    // Same start RNG: the reach decision burns one extra draw (the handler's
    // <128 roll) before the unconditional tie draw.
    expect(control.trace.draws.map((draw) => draw.kind))
      .toEqual(["setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "best-move-tie"]);
    expect(reach.trace.draws.map((draw) => draw.kind))
      .toEqual(["setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "dragon-dance-roll-2", "best-move-tie"]);
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
    expect(control.trace.draws).toHaveLength(5);
    expect(reach.trace.draws).toHaveLength(6);
    // The control target is outsped (Shuckle 25 < Gyarados 101), so the
    // handler's first branch exits at full HP; the reach target outspends
    // (Crobat 150 > 101) and takes the roll. Both keep the 4-way tie.
    expect(control.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
    expect(reach.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
  });
});
