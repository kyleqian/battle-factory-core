import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Live-verified AI_CV_Curse receipt banked from the real ROM
// (docs/factory-ai-cv-live-receipts-curse.md). Each row was observed directly
// on the Battle Scene OFF oracle: the ROM's PP-selected move slot and its
// exact decision-window RNG endpoint, reproduced by the engine from the
// ROM-observed start RNG on the same scored view. The fixture pair is
// tools/battle-lab/mechanic-factory-ai-cv-curse-{reach,control}-off.json;
// `verify-factory-ai-curse-live.ts` prints these numbers live.
//
// Scenario shape: the AI user carries [Curse, Splash, Splash, Splash]; a
// level-5 Magikarp relay is KO'd by the player's Vital Throw, then the AI
// user switches in and picks its first move. AI_CV_Curse
// (`data/battle_ai_scripts.s:1870-1892`, EFFECT_CURSE) splits on the AI
// user's OWN type:
//   - control: Snorlax (pure Normal, FRONTIER_MON_SNORLAX_2). At default DEF
//     stage all three DEF-band `if_stat_level_more_than` gates fall through,
//     so all three `if_random_less_than 128` sites are reached -- exactly 3
//     CV draws, +1 per roll >= 128. Decision = setup 4 + curse 3 + tie 1 = 8
//     draws. The banked seeds both rolled +2 (rolls {20,161,225} and
//     {83,165,246}), so Curse scored 102 and won.
//   - reach: Dusclops (pure Ghost, FRONTIER_MON_DUSCLOPS_4). Jumps straight to
//     Curse4 -- zero CV draws, 0 at full HP (`if_hp_more_than 80` exits).
//     Decision = setup 4 + tie 1 = 5 draws. Seed 1's tie broke onto Curse
//     (slot 0), seed 99's onto Splash (slot 3).
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

const MOVE_CURSE = 174; // EFFECT_CURSE -- AI_CV_Curse
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM/CV table entry

function curseView(role: "reach" | "control"): FactoryAiScoredView {
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
    moves: [MOVE_CURSE, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze(
      role === "reach"
        ? { // Dusclops (pure Ghost)
          types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
          attack: 90, defense: 150, spAttack: 80, spDefense: 150, speed: 45, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 115, maxHp: 115,
          ability: "ABILITY_PRESSURE",
        }
        : { // Snorlax (pure Normal)
          types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
          attack: 130, defense: 85, spAttack: 85, spDefense: 130, speed: 50, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 2,
          hp: 235, maxHp: 235,
          ability: "ABILITY_IMMUNITY",
        },
    ),
    target: Object.freeze({
      species: 134, // Vaporeon
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: 85, defense: 80, spAttack: 130, spDefense: 115, speed: 85, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 205, maxHp: 205,
      ability: "ABILITY_WATER_ABSORB",
      knownAbility: null,
      lastUsedMoveId: 233, // the target's Vital Throw
      knownMoveIds: [233],
    }),
  });
}

describe("AI_CV_Curse live receipt (docs/factory-ai-cv-live-receipts-curse.md)", () => {
  it.each([
    // [seed, role, rngStart, expectedSlot, expectedRng, curseCvDelta, expectedRolls]
    [1, "control", 3_894_234_654, 0, 2_358_569_446, 2, 3],
    [1, "reach", 3_894_234_654, 0, 3_323_223_981, 0, 0],
    [99, "control", 1_656_372_911, 0, 4_236_983_191, 2, 3],
    [99, "reach", 1_656_372_911, 3, 2_270_394_938, 0, 0],
  ] as const)("seed %i %s: engine reproduces the ROM's chosen slot and exact RNG endpoint", (
    _seed,
    role,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedCvDelta,
    expectedRolls,
  ) => {
    const result = chooseFactoryAiScoredDecision({
      view: curseView(role),
      request,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.draws).toHaveLength(expectedRolls + 5);
    const rollKinds = result.trace.draws
      .map((draw) => draw.kind)
      .filter((kind) => typeof kind === "string" && kind.startsWith("curse-roll"));
    expect(rollKinds).toHaveLength(expectedRolls);
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

  it("the reach/control split is the type gate: a Ghost user draws 0 rolls and scores 0, a Normal user draws 3 rolls and scores +1..+3", () => {
    const reach = chooseFactoryAiScoredDecision({
      view: curseView("reach"),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    const control = chooseFactoryAiScoredDecision({
      view: curseView("control"),
      request,
      rng: { value: 3_894_234_654, calls: 0 },
    });
    const controlRolls = control.trace.draws
      .filter((draw) => typeof draw.kind === "string" && draw.kind.startsWith("curse-roll"));
    const reachRolls = reach.trace.draws
      .filter((draw) => typeof draw.kind === "string" && draw.kind.startsWith("curse-roll"));
    expect(control.trace.draws).toHaveLength(8);
    expect(reach.trace.draws).toHaveLength(5);
    expect(controlRolls).toHaveLength(3);
    expect(reachRolls).toHaveLength(0);
    expect(control.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 2, finalScore: 102 });
    expect(reach.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0, finalScore: 100 });
    expect(reach.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
  });
});
