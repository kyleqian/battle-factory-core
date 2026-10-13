import { describe, expect, it } from "vitest";
import c1 from "../tools/probe/receipts/rcp154-c1-dragged-in-before-acting-off.json" with { type: "json" };

/**
 * STEP rcp154 -- stock-ROM receipts for two action-time move choices the
 * rng146 fix (ISSUES #140, F3) exposed. Hermetic: these assertions read only
 * the committed JSON; `tools/probe/verify-rcp154.ts` is the live port-vs-ROM
 * comparison. See docs/rcp154-action-time-receipts.md.
 */
type Draw = Readonly<{ reason: string; rngBefore: number; value: number }>;
type RomDraw = Readonly<{ frame: number; caller: string; callerFunction: string; rngBefore: number; value: number }>;
type Action = Readonly<{
  attacker: number; activeSpecies: number; currentMove: number; currMovePos: number;
  chosenMoveByBattler: number; slotMoveAtCurrMovePos: number;
}>;
type Receipt = typeof c1;

const LCG = (value: number) => (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
const SPECIES = { RHYHORN: 111, ZIGZAGOON: 288, POOCHYENA: 286, PIDGEOT: 18 } as const;
const MOVE = { WHIRLWIND: 18, TACKLE: 33, ROAR: 46 } as const;

function expectProvenance(receipt: Receipt) {
  expect(receipt.schema).toBe("rcp154-action-time-receipt/v1");
  expect(receipt.oracleProfile).toBe("battle-scene-off");
  expect(receipt.byteIdenticalAcrossRuns).toBe(true);
  expect(receipt.probeOutputSha256).toBe(receipt.probeOutputSha256Rerun);
  expect(receipt.drawCountCrossChecked).toBe(true);
  expect(receipt.attributionReconciled).toBe(true);
  for (const turn of receipt.rom.turns) {
    expect(turn.drawCount).toBe(turn.draws.length);
    expect(turn.aiSelectionDrawCount).toBe(turn.aiSelectionDraws.length);
    expect(turn.draws.at(-1)?.callerFunction).toBe("BattleTurnPassed");
    for (const draw of turn.draws as readonly RomDraw[]) expect(draw.value).toBe(LCG(draw.rngBefore) >>> 16);
  }
}

function expectPredictionIsRom(receipt: Receipt) {
  expect(receipt.predictedPostFix.turns.map((turn) => turn.draws.map((draw: Draw) => draw.rngBefore)))
    .toEqual(receipt.rom.turns.map((turn) => turn.draws.map((draw) => draw.rngBefore)));
  expect(receipt.predictedPostFix.turns.map((turn) => turn.moveDispatches))
    .toEqual(receipt.rom.turns.map((turn) => turn.actions.length));
  expect(receipt.predictedPostFix.turns.flatMap((turn) => turn.draws.map((draw: Draw) => draw.reason)))
    .not.toContain(expect.stringMatching(/^UNMAPPED/));
}

const messageTexts = (turn: Receipt["rom"]["turns"][number]) => turn.messages.map((message) => message.text);

describe("rcp154 C1 -- a battler dragged in by Whirlwind before acting does not act", () => {
  const [turn1, , , , turn5] = c1.rom.turns;

  it("is a reproducible, cross-checked stock-ROM receipt with legal staged parties", () => {
    expectProvenance(c1);
    expect(c1.parties.player.map((mon) => [mon.species, mon.moves])).toEqual([
      [SPECIES.RHYHORN, [MOVE.ROAR, 30, 23, 39]],
      [SPECIES.ZIGZAGOON, [MOVE.TACKLE, 45, 39, 29]],
      [SPECIES.POOCHYENA, [MOVE.TACKLE, 336, 28, 44]],
    ]);
    expect(c1.parties.opponent[0]).toMatchObject({ species: SPECIES.PIDGEOT, moves: [18, 18, 18, 18] });
    expect(c1.parties.opponent[0].stats.speed).toBeGreaterThan(c1.parties.player[0].stats.speed);
    expect(c1.inputSubstitutions).toEqual([]);
  });

  it("turn 1: only PIDGEOT's Whirlwind dispatches; dragged-in ZIGZAGOON neither uses banked ROAR nor its slot-0 TACKLE", () => {
    expect(turn1.actions as readonly Action[]).toEqual([
      expect.objectContaining({ attacker: 1, activeSpecies: SPECIES.PIDGEOT, currentMove: MOVE.WHIRLWIND }),
    ]);
    expect(turn1.draws.map((draw) => draw.callerFunction))
      .toEqual(["Cmd_accuracycheck", "Cmd_forcerandomswitch", "BattleTurnPassed"]);
    expect(messageTexts(turn1)).toEqual(expect.arrayContaining(["Foe PIDGEOT used\nWHIRLWIND!", "ZIGZAGOON was\ndragged out!\n"]));
    expect(messageTexts(turn1).filter((text) => text.startsWith("ZIGZAGOON used"))).toEqual([]);
    // HandleAction_ActionFinished loaded gActionsByTurnOrder[1] == 12 (B_ACTION_CANCEL_PARTNER ==
    // B_ACTION_FINISHED, written by switchineffects), so the next frame finished slot 1 without a dispatch.
    expect(turn1.actionCursor).toEqual([
      { frame: 256, turnActionNumber: 1, actionFuncId: 12 },
      { frame: 257, turnActionNumber: 2, actionFuncId: 0 },
    ]);
  });

  it("repeats on turn 5 (RHYHORN banked ROAR again, dragged out, POOCHYENA dragged in and skipped)", () => {
    expect(turn5.actions.map((action) => [action.attacker, action.currentMove])).toEqual([[1, MOVE.WHIRLWIND]]);
    expect(messageTexts(turn5)).toEqual(expect.arrayContaining(["POOCHYENA was\ndragged out!\n"]));
  });

  it("the dragged-in mon acts normally on the NEXT turn with its own selection", () => {
    const turn2 = c1.rom.turns[1];
    expect(turn2.actions[0]).toMatchObject({
      attacker: 0, activeSpecies: SPECIES.ZIGZAGOON, currentMove: MOVE.TACKLE, currMovePos: 0, chosenMoveByBattler: MOVE.TACKLE,
    });
  });

  it("port at HEAD FAILs at turn 1 index 2: it runs GetMoveTarget + TACKLE for the dragged-in mon", () => {
    expect(c1.comparison.verdictToday).toBe("FAIL");
    expect(c1.comparison.firstDivergence).toMatchObject({
      turn: 1, index: 2,
      rom: { reason: "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)" },
      port: { reason: "GetMoveTarget(MOVE_TARGET_SELECTED)" },
    });
    expect(c1.comparison.romMoveDispatches[0]).toBe(1);
    expect(c1.comparison.portUsedMoveMessages[0]).toBe(2);
    expect(c1.port.turns[0].draws.map((draw) => draw.reason)).toEqual([
      "accuracycheck", "forcerandomswitch:pick", "GetMoveTarget(MOVE_TARGET_SELECTED)",
      "accuracycheck", "critcalc", "adjustnormaldamage", "seteffectwithchance",
      "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
    ]);
  });

  it("predicts the ROM sequence post-fix", () => {
    expectPredictionIsRom(c1);
    expect(c1.predictedPostFix.turns[0].draws.map((draw) => draw.reason)).toEqual([
      "accuracycheck", "forcerandomswitch:pick", "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
    ]);
  });
});
