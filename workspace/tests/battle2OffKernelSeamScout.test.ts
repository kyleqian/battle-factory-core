import { describe, expect, it } from "vitest";
import {
  parseBattleState,
  serializeBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const CONFIG = {
  requestId: 1,
  rngSeed: 3530724670,
  player: {
    species: 95,
    moveId: 157,
    moves: [157, 20, 225, 201],
    pp: [10, 20, 20, 10],
    ability: 5,
    item: 142,
    friendship: 0,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    speed: 76,
    hp: 117,
    maxHp: 117,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
  },
  trainer: {
    species: 140,
    moveId: 72,
    moves: [72, 246, 28, 182],
    pp: [10, 5, 15, 10],
    ability: 4,
    item: 142,
    friendship: 0,
    attack: 118,
    defense: 96,
    spAttack: 93,
    spDefense: 51,
    speed: 61,
    hp: 91,
    maxHp: 91,
    types: ["TYPE_ROCK", "TYPE_WATER"],
  },
} as const satisfies FactoryFullTurnConfig;

const PLAYER_ROCK_SLIDE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_SAND_ATTACK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 2 as const,
  targetBattler: 0 as const,
});

function runCanonicalBattle2Turn() {
  const afterPlayer = submitFactoryFullTurnDecision(
    createFactoryFullTurnBattleState(CONFIG),
    {
      requestId: 1,
      side: "player",
      decision: PLAYER_ROCK_SLIDE,
    },
  );
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("Battle 2 scout expected the trainer command boundary");
  }
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: TRAINER_SAND_ATTACK,
  });
  if (result.kind !== "decision-required") {
    throw new Error("Battle 2 scout expected the next player command boundary");
  }
  return { afterPlayer, result };
}

describe("Battle 2 OFF real-kernel seam scout", () => {
  it("constructs the canonical battlers directly through the public config", () => {
    const initial = createFactoryFullTurnBattleState(CONFIG);
    expect(initial.boundary).toMatchObject({
      request: {
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 1 },
          { kind: "use-move", moveSlot: 1, targetBattler: 1 },
          { kind: "use-move", moveSlot: 2, targetBattler: 1 },
          { kind: "use-move", moveSlot: 3, targetBattler: 0 },
        ],
      },
    });
    const [onix, kabuto] = initial.rules.rulesContext.battlers;
    expect(onix).toMatchObject({
      ability: 5,
      item: 142,
      pp: [10, 20, 20, 10],
      friendship: 0,
    });
    expect(kabuto).toMatchObject({
      ability: 4,
      item: 142,
      pp: [10, 5, 15, 10],
      friendship: 0,
    });
    const serialized = serializeBattleState(initial);
    const parsed = parseBattleState(serialized) as BattleState<
      FactoryFullTurnDecisionRules
    >;
    expect(serializeBattleState(parsed)).toBe(serialized);
    expect(parsed).toEqual(initial);
  });

  it("reaches request 3 with exact HP, selected-slot PP, stat, four hit-chain draws, and one boundary draw", () => {
    const { afterPlayer, result } = runCanonicalBattle2Turn();
    expect(afterPlayer.events).toEqual([]);
    expect(afterPlayer.state.rng).toEqual({ value: 3530724670, calls: 0 });
    expect(afterPlayer.nextRequest).toEqual({
      kind: "command",
      requestId: 2,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 0 },
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "use-move", moveSlot: 2, targetBattler: 0 },
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    });
    expect(result.nextRequest).toEqual({
      kind: "command",
      requestId: 3,
      side: "player",
      battler: 0,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        { kind: "use-move", moveSlot: 1, targetBattler: 1 },
        { kind: "use-move", moveSlot: 2, targetBattler: 1 },
        { kind: "use-move", moveSlot: 3, targetBattler: 0 },
      ],
    });

    const [onix, kabuto] = result.state.rules.rulesContext.battlers;
    expect(result.state.rules.rulesContext).toMatchObject({
      currentMove: 0,
      currentMovePosition: 2,
      battleMoveDamage: 0,
      moveResultFlags: 0,
      dynamicMoveType: 0,
      dynamicBasePower: 0,
      moveendState: 0,
      multiHitEffect: 0,
    });
    expect(onix).toMatchObject({
      hp: 117,
      moves: [157, 20, 225, 201],
      pp: [9, 20, 20, 10],
      statStages: [6, 6, 6, 6, 6, 6, 5, 6],
      ability: 5,
      item: 142,
    });
    expect(kabuto).toMatchObject({
      hp: 63,
      moves: [72, 246, 28, 182],
      pp: [10, 5, 14, 10],
      ability: 4,
      item: 142,
    });

    let rng: number = CONFIG.rngSeed;
    const actionValues = Array.from({ length: 4 }, () => {
      rng = advanceRngValue(rng);
      return rng;
    });
    expect(actionValues).toEqual([
      2956382169,
      2508258776,
      575948139,
      650807554,
    ]);
    expect(result.state.rng).toEqual({ value: 3011990093, calls: 5 });

    const usedMoveMessages = result.events.filter(({ payload }) =>
      payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE"
    );
    expect(usedMoveMessages).toHaveLength(2);
    expect(result.events.filter(({ payload }) =>
      payload.kind === "set-battler-pp-data"
    ).map(({ payload }) => payload)).toEqual([
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 9 },
      { kind: "set-battler-pp-data", battler: 1, movePosition: 2, pp: 14 },
    ]);
    const sandAttackAnimation = result.events.find(({ payload }) =>
      payload.kind === "animation"
      && payload.animationId === "MOVE_ANIMATION"
      && payload.arguments[0] === "28"
    );
    expect(sandAttackAnimation?.payload).toMatchObject({
      arguments: ["28", "0", "0", "0", "0", "0"],
    });
    expect(result.events.map((event) => ({
      kind: event.payload.kind,
      sourceLabel: event.provenance?.sourceLabel,
      opcodeName: event.provenance?.opcodeName,
    }))).toEqual([
      { kind: "message", sourceLabel: "BattleScript_HitFromAtkString", opcodeName: "B_SCR_OP_ATTACKSTRING" },
      { kind: "set-battler-pp-data", sourceLabel: "BattleScript_HitFromAtkString", opcodeName: "B_SCR_OP_PPREDUCE" },
      { kind: "animation", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_ATTACKANIMATION" },
      { kind: "play-se", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_EFFECTIVENESSSOUND" },
      { kind: "animation", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_HITANIMATION" },
      { kind: "health-bar-update", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_HEALTHBARUPDATE" },
      { kind: "hp-change", sourceLabel: "BattleScript_HitFromAtkAnimation", opcodeName: "B_SCR_OP_DATAHPUPDATE" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
      { kind: "message", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_ATTACKSTRING" },
      { kind: "set-battler-pp-data", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_PPREDUCE" },
      { kind: "stat-stage-change", sourceLabel: "BattleScript_EffectStatDown", opcodeName: "B_SCR_OP_STATBUFFCHANGE" },
      { kind: "animation", sourceLabel: "BattleScript_StatDownDoAnim", opcodeName: "B_SCR_OP_ATTACKANIMATION" },
      { kind: "animation", sourceLabel: "BattleScript_StatDownDoAnim", opcodeName: "B_SCR_OP_PLAYANIMATION" },
      { kind: "message", sourceLabel: "BattleScript_StatDownPrintString", opcodeName: "B_SCR_OP_PRINTFROMTABLE" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
      { kind: "set-battler-sprite-visibility", sourceLabel: "BattleScript_MoveEnd", opcodeName: "B_SCR_OP_MOVEEND" },
    ]);
    expect(result.events.every((event) =>
      Object.isFrozen(event.provenance)
    )).toBe(true);
  });
});
