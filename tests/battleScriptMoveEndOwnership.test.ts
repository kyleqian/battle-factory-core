import { describe, expect, it } from "vitest";
import {
  applyBattleScriptMoveEndChangedItemOwnership,
  applyBattleScriptMoveEndChoiceOwnership,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_MOVE_UNAVAILABLE,
  createBattleScriptRulesContext,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptMoveType,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";

const ZERO_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: 0 as const,
    ability: 0,
    hp: 100,
    item: 0,
    moves: Object.freeze([0, 0, 0, 0] as const),
    pp: Object.freeze([0, 0, 0, 0] as const),
    statStages: ZERO_STAGES,
    status1: 0,
    status2: 0,
    status3: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0 as const,
      physicalDmg: 0,
      specialDmg: 0,
    }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0 as const,
    rechargeTimer: 0,
    flinchImmobility: 0 as const,
    disabledMove: 0,
    usedDisabledMove: 0 as const,
    tauntTimer: 0,
    usedTauntedMove: 0 as const,
    usedImprisonedMove: 0 as const,
    chargingTurn: 0 as const,
    ...changes,
  });
}

function contextInput(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: [
      battler({ item: 186, moves: [92, 226, 165, 0] }),
      battler({ side: 1, item: 196 }),
      battler(),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 92,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    chosenMove: 0,
    choicedMove: [0, 0, 0, 0],
    changedItems: [0, 0, 0, 0],
    absentBattlerFlags: 0,
    battleStructAbsentBattlerFlags: 0,
    dynamicMoveType: 0,
    enigmaBerryHoldEffects: [0, 0, 0, 0],
    ...changes,
  };
}

describe("Cmd_moveend choice/change ownership dependency", () => {
  it("pins-u16-arrays-u8-resolution-data-and-both-independent-absent-masks", () => {
    // battle.h:354-448: u16 choice/change arrays, u8 dynamic/absent fields;
    // global.berry.h:54-59: BattleEnigmaBerry::holdEffect is u8.
    const context = createBattleScriptRulesContext(contextInput({
      chosenMove: 0xffff,
      choicedMove: [0, 1, 0xfffe, 0xffff],
      changedItems: [0xffff, 0xfffe, 1, 0],
      absentBattlerFlags: 0b0101,
      battleStructAbsentBattlerFlags: 0b1010,
      dynamicMoveType: 0xff,
      enigmaBerryHoldEffects: [0, 1, 0xfe, 0xff],
    }));
    expect(context).toMatchObject({
      chosenMove: 0xffff,
      choicedMove: [0, 1, 0xfffe, 0xffff],
      changedItems: [0xffff, 0xfffe, 1, 0],
      absentBattlerFlags: 0b0101,
      battleStructAbsentBattlerFlags: 0b1010,
      dynamicMoveType: 0xff,
      enigmaBerryHoldEffects: [0, 1, 0xfe, 0xff],
    });

    for (const invalid of [
      { chosenMove: -1 },
      { chosenMove: 0x1_0000 },
      { choicedMove: [0, 0, 0] },
      { choicedMove: [0, 0, 0, 0x1_0000] },
      { changedItems: [0, -1, 0, 0] },
      { battleStructAbsentBattlerFlags: 0x10 },
      { dynamicMoveType: 0x100 },
      { enigmaBerryHoldEffects: [0, 0, 0] },
      { enigmaBerryHoldEffects: [0, 0, 0, 0x100] },
    ]) {
      expect(() => createBattleScriptRulesContext(contextInput(invalid))).toThrow();
    }
  });

  it("resolves-GET_MOVE_TYPE-dynamic-normal-mask-and-generated-move-type", () => {
    // include/battle.h:458-464: any nonzero dynamic byte wins and masks 0x3f.
    expect(resolveBattleScriptMoveType(92, 0)).toBe(3); // TYPE_POISON
    expect(resolveBattleScriptMoveType(92, 0x80)).toBe(0); // dynamic TYPE_NORMAL
    expect(resolveBattleScriptMoveType(92, 0xca)).toBe(10); // TYPE_FIRE + flags
    expect(() => resolveBattleScriptMoveType(92, 0x100)).toThrow();
    expect(() => resolveBattleScriptMoveType(0xffff, 0)).toThrow();
  });

  it("resolves-normal-and-Enigma-held-effects-from-the-exact-source-owner", () => {
    // battle_script_commands.c:4228-4231 branches on ITEM_ENIGMA_BERRY (175).
    const context = createBattleScriptRulesContext(contextInput({
      battlers: [
        battler({ item: 186 }), // CHOICE_BAND
        battler({ side: 1, item: 196 }), // FOCUS_BAND
        battler({ item: 175 }), // ENIGMA_BERRY
        battler({ side: 1, item: 0 }),
      ],
      enigmaBerryHoldEffects: [1, 2, 0xfe, 4],
    }));
    expect(resolveBattleScriptBattlerHoldEffect(context, 0)).toBe(29);
    expect(resolveBattleScriptBattlerHoldEffect(context, 1)).toBe(39);
    expect(resolveBattleScriptBattlerHoldEffect(context, 2)).toBe(0xfe);
    expect(resolveBattleScriptBattlerHoldEffect(context, 3)).toBe(0);
    const invalidItem = createBattleScriptRulesContext(contextInput({
      battlers: [battler({ item: 0xffff }), battler({ side: 1 }), battler(), battler()],
    }));
    expect(() => resolveBattleScriptBattlerHoldEffect(invalidItem, 0)).toThrow(
      "outside the source gItems corpus",
    );
  });

  it("choice-and-changed-items-keep-u16-values-and-source-branch-order", () => {
    // battle_script_commands.c:4296-4329.
    const choice = createBattleScriptRulesContext(contextInput({
      chosenMove: 92,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      choicedMove: [BATTLE_SCRIPT_MOVE_UNAVAILABLE, 0xabcd, 0, 0],
    }));
    const chosen = applyBattleScriptMoveEndChoiceOwnership(choice);
    expect(chosen.choicedMove).toEqual([92, 0xabcd, 0, 0]);
    expect(chosen.battlers).toBe(choice.battlers);

    const failedBatonPass = createBattleScriptRulesContext(contextInput({
      chosenMove: 226,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_FAILED,
      choicedMove: [BATTLE_SCRIPT_MOVE_UNAVAILABLE, 0, 0, 0],
    }));
    expect(applyBattleScriptMoveEndChoiceOwnership(failedBatonPass))
      .toBe(failedBatonPass);

    const stale = createBattleScriptRulesContext(contextInput({
      choicedMove: [0xabcd, 0, 0, 0],
    }));
    expect(applyBattleScriptMoveEndChoiceOwnership(stale).choicedMove[0]).toBe(0);

    const changed = createBattleScriptRulesContext(contextInput({
      changedItems: [0xbeef, 0xffff, 0xabcd, 0x1234],
    }));
    const transferred = applyBattleScriptMoveEndChangedItemOwnership(changed, 3);
    expect(transferred.battlers.map(({ item }) => item))
      .toEqual([0xbeef, 0xffff, 0xabcd, 0]);
    expect(transferred.changedItems).toEqual([0, 0, 0, 0x1234]);
    expect(transferred.battlers[3]).toBe(changed.battlers[3]);
  });

  it("freezes-new-owners-recursively-and-preserves-them-by-identity-on-no-op", () => {
    const context = createBattleScriptRulesContext(contextInput());
    expect(Object.isFrozen(context.choicedMove)).toBe(true);
    expect(Object.isFrozen(context.changedItems)).toBe(true);
    expect(Object.isFrozen(context.enigmaBerryHoldEffects)).toBe(true);
    expect(applyBattleScriptMoveEndChoiceOwnership(context)).toBe(context);
    expect(applyBattleScriptMoveEndChangedItemOwnership(context, 2)).toBe(context);
  });
});
