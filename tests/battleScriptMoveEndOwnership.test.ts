import { describe, expect, it } from "vitest";
import {
  applyBattleScriptMoveEndChangedItemOwnership,
  applyBattleScriptMoveEndChoiceOwnership,
  applyBattleScriptMoveEndMirrorMoveOwnership,
  applyBattleScriptMoveEndUpdateLastMovesOwnership,
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET,
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
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

    const successfulBatonPass = createBattleScriptRulesContext(contextInput({
      chosenMove: 226,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      choicedMove: [BATTLE_SCRIPT_MOVE_UNAVAILABLE, 0, 0, 0],
    }));
    expect(applyBattleScriptMoveEndChoiceOwnership(successfulBatonPass))
      .toBe(successfulBatonPass);
    expect(successfulBatonPass.choicedMove[0]).toBe(BATTLE_SCRIPT_MOVE_UNAVAILABLE);

    const failedBatonPass = createBattleScriptRulesContext(contextInput({
      chosenMove: 226,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_FAILED,
      choicedMove: [BATTLE_SCRIPT_MOVE_UNAVAILABLE, 0, 0, 0],
    }));
    expect(applyBattleScriptMoveEndChoiceOwnership(failedBatonPass).choicedMove[0])
      .toBe(226);

    const stale = createBattleScriptRulesContext(contextInput({
      choicedMove: [0xabcd, 0, 0, 0],
    }));
    expect(applyBattleScriptMoveEndChoiceOwnership(stale).choicedMove[0]).toBe(0);

    const changed = createBattleScriptRulesContext(contextInput({
      changedItems: [0xbeef, 0xffff, 0xabcd, 0x1234],
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: 0,
        battlerPositions: [0, 1, 0xff, 0xff],
      },
    }));
    const transferred = applyBattleScriptMoveEndChangedItemOwnership(changed);
    expect(transferred.battlers.map(({ item }) => item))
      .toEqual([0xbeef, 0xffff, 0, 0]);
    expect(transferred.changedItems).toEqual([0, 0, 0xabcd, 0x1234]);
    expect(transferred.battlers[2]).toBe(changed.battlers[2]);
    expect(transferred.battlers[3]).toBe(changed.battlers[3]);
  });

  it("freezes-new-owners-recursively-and-preserves-them-by-identity-on-no-op", () => {
    const context = createBattleScriptRulesContext(contextInput());
    expect(Object.isFrozen(context.choicedMove)).toBe(true);
    expect(Object.isFrozen(context.changedItems)).toBe(true);
    expect(Object.isFrozen(context.enigmaBerryHoldEffects)).toBe(true);
    expect(applyBattleScriptMoveEndChoiceOwnership(context)).toBe(context);
    expect(applyBattleScriptMoveEndChangedItemOwnership(context)).toBe(context);
  });

  it("freezes-six-independent-history-arrays-and-exact-source-byte-buffers", () => {
    const context = createBattleScriptRulesContext(contextInput({
      moveHistory: {
        lastPrintedMoves: [1, 2, 3, 4],
        lastMoves: [5, 6, 7, 8],
        lastResultingMoves: [9, 10, 11, 12],
        lastLandedMoves: [13, 14, 15, 16],
        lastHitByType: [17, 18, 19, 20],
        lastHitBy: [0, 1, 2, 3],
        lastTakenMove: Array.from({ length: 16 }, (_, index) => index),
        lastTakenMoveFrom: Array.from({ length: 32 }, (_, index) => 0xff - index),
      },
    }));
    const history = context.moveHistory;
    expect(new Set([
      history.lastPrintedMoves,
      history.lastMoves,
      history.lastResultingMoves,
      history.lastLandedMoves,
      history.lastHitByType,
      history.lastHitBy,
    ]).size).toBe(6);
    for (const owner of Object.values(history)) expect(Object.isFrozen(owner)).toBe(true);
    expect(history.lastTakenMove).toHaveLength(16);
    expect(history.lastTakenMoveFrom).toHaveLength(32);
    expect(Object.isFrozen(history)).toBe(true);

    const replay = createBattleScriptRulesContext(
      JSON.parse(JSON.stringify(context)) as BattleScriptRulesContextInput,
    );
    expect(replay).toEqual(context);
    expect(replay.moveHistory.lastMoves).not.toBe(context.moveHistory.lastMoves);

    for (const invalid of [
      { lastPrintedMoves: [0, 0, 0] },
      { lastHitBy: [0, 0, 0, 0x100] },
      { lastTakenMove: new Array(15).fill(0) },
      { lastTakenMoveFrom: [...new Array(31).fill(0), -1] },
    ]) {
      expect(() => createBattleScriptRulesContext(contextInput({
        moveHistory: invalid,
      }))).toThrow();
    }
  });

  it("update-last-moves-swaps-before-indexed-history-writes-and-resolves-type", () => {
    const context = createBattleScriptRulesContext(contextInput({
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
      currentMove: 92,
      chosenMove: 92,
      dynamicMoveType: 0xca,
      moveendState: 14,
      hitMarker: BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET
        | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED
        | BATTLE_SCRIPT_HITMARKER_OBEYS,
      moveHistory: {
        lastPrintedMoves: [0x1000, 0x1001, 0x1002, 0x1003],
        lastMoves: [0x2000, 0x2001, 0x2002, 0x2003],
        lastResultingMoves: [0x3000, 0x3001, 0x3002, 0x3003],
        lastLandedMoves: [0x4000, 0x4001, 0x4002, 0x4003],
        lastHitByType: [0x5000, 0x5001, 0x5002, 0x5003],
        lastHitBy: [0, 1, 2, 3],
      },
    }));
    const next = applyBattleScriptMoveEndUpdateLastMovesOwnership(context);
    expect(next.selectorRoles).toEqual({ attacker: 1, target: 0, effectBattler: 1 });
    expect(next.hitMarker & BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET).toBe(0);
    expect(next.moveendState).toBe(15);
    expect(next.moveHistory).toMatchObject({
      lastPrintedMoves: [0x1000, 92, 0x1002, 0x1003],
      lastMoves: [0x2000, 92, 0x2002, 0x2003],
      lastResultingMoves: [0x3000, 92, 0x3002, 0x3003],
      lastLandedMoves: [92, 0x4001, 0x4002, 0x4003],
      lastHitByType: [10, 0x5001, 0x5002, 0x5003],
      lastHitBy: [1, 1, 2, 3],
    });
    expect(next.moveHistory.lastTakenMove).toBe(context.moveHistory.lastTakenMove);
    expect(next.moveHistory.lastTakenMoveFrom)
      .toBe(context.moveHistory.lastTakenMoveFrom);
  });

  it("update-last-moves-pins-both-absent-masks-and-hit-result-effect-gates", () => {
    const base = contextInput({
      chosenMove: 92,
      currentMove: 92,
      moveendState: 14,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      moveHistory: { lastMoves: [0xaaaa, 0, 0, 0] },
    });
    for (const absent of [
      { absentBattlerFlags: 1 },
      { battleStructAbsentBattlerFlags: 1 },
    ]) {
      const source = createBattleScriptRulesContext({ ...base, ...absent });
      const next = applyBattleScriptMoveEndUpdateLastMovesOwnership(source);
      expect(next.moveHistory).toBe(source.moveHistory);
      expect(next.moveendState).toBe(15);
    }

    const baton = createBattleScriptRulesContext({ ...base, chosenMove: 226 });
    expect(applyBattleScriptMoveEndUpdateLastMovesOwnership(baton).moveHistory)
      .toBe(baton.moveHistory);

    const failed = createBattleScriptRulesContext({
      ...base,
      moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
    });
    expect(applyBattleScriptMoveEndUpdateLastMovesOwnership(failed).moveHistory)
      .toMatchObject({ lastLandedMoves: [0, 0xffff, 0, 0] });

    const disobeyed = createBattleScriptRulesContext({ ...base, hitMarker: 0 });
    expect(applyBattleScriptMoveEndUpdateLastMovesOwnership(disobeyed).moveHistory)
      .toMatchObject({
        lastMoves: [0xffff, 0, 0, 0],
        lastResultingMoves: [0xffff, 0, 0, 0],
        lastLandedMoves: [0, 0xffff, 0, 0],
      });

    const fainted = createBattleScriptRulesContext({
      ...base,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS | (1 << 29),
      moveHistory: { lastHitBy: [0, 3, 0, 0] },
    });
    expect(
      applyBattleScriptMoveEndUpdateLastMovesOwnership(fainted).moveHistory.lastHitBy,
    ).toEqual([0, 3, 0, 0]);
  });

  it("normalizes-unavailable-original-move-without-resolving-an-invalid-id", () => {
    const context = createBattleScriptRulesContext(contextInput({
      chosenMove: BATTLE_SCRIPT_MOVE_UNAVAILABLE,
      currentMove: 92,
      moveendState: 14,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
    }));
    const next = applyBattleScriptMoveEndUpdateLastMovesOwnership(context);
    expect(next.moveHistory.lastMoves[0]).toBe(BATTLE_SCRIPT_MOVE_UNAVAILABLE);
    expect(next.moveHistory.lastLandedMoves[1]).toBe(BATTLE_SCRIPT_MOVE_UNAVAILABLE);
  });

  it("mirror-history-serializes-source-target-attacker-order", () => {
    const context = createBattleScriptRulesContext(contextInput({
      selectorRoles: { attacker: 2, target: 3, effectBattler: 3 },
      chosenMove: 92,
      moveendState: 15,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
      moveHistory: {
        lastTakenMove: new Array(16).fill(0xaa),
        lastTakenMoveFrom: new Array(32).fill(0xbb),
      },
    }));
    const next = applyBattleScriptMoveEndMirrorMoveOwnership(context);
    expect(next.moveendState).toBe(16);
    expect(next.moveHistory.lastTakenMove.slice(6, 8)).toEqual([0x5c, 0x00]);
    expect(next.moveHistory.lastTakenMoveFrom.slice(28, 30)).toEqual([0x5c, 0x00]);
    expect(next.moveHistory.lastTakenMove[4]).toBe(0xaa);
    expect(next.moveHistory.lastTakenMoveFrom[22]).toBe(0xbb);
    expect(next.moveHistory.lastMoves).toBe(context.moveHistory.lastMoves);
  });

  it("mirror-history-pins-both-absent-hit-result-effect-and-identity-gates", () => {
    const base = contextInput({
      chosenMove: 92,
      moveendState: 15,
      hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS,
    });
    const blocked = [
      { absentBattlerFlags: 1 },
      { battleStructAbsentBattlerFlags: 1 },
      { hitMarker: 0 },
      { hitMarker: BATTLE_SCRIPT_HITMARKER_OBEYS | (1 << 29) },
      { moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT },
      { chosenMove: 226 },
      { selectorRoles: { attacker: 0 as const, target: 0 as const, effectBattler: 0 as const } },
      { chosenMove: BATTLE_SCRIPT_MOVE_UNAVAILABLE },
    ];
    for (const gate of blocked) {
      const source = createBattleScriptRulesContext({ ...base, ...gate });
      const next = applyBattleScriptMoveEndMirrorMoveOwnership(source);
      expect(next.moveHistory).toBe(source.moveHistory);
      expect(next.moveendState).toBe(16);
    }
  });
});
