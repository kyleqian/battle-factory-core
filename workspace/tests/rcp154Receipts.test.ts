import { describe, expect, it } from "vitest";
import c1 from "../tools/probe/receipts/rcp154-c1-dragged-in-before-acting-off.json" with { type: "json" };
import c2 from "../tools/probe/receipts/rcp154-c2-encored-mid-turn-selected-off.json" with { type: "json" };
import c2u from "../tools/probe/receipts/rcp154-c2u-encored-mid-turn-user-target-off.json" with { type: "json" };

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
type Receipt = typeof c1 | typeof c2 | typeof c2u;

const LCG = (value: number) => (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
const SPECIES = { RHYHORN: 111, ZIGZAGOON: 288, POOCHYENA: 286, PIDGEOT: 18, SNORLAX: 143, PLUSLE: 353 } as const;
const MOVE = { WHIRLWIND: 18, TACKLE: 33, ROAR: 46, DEFENSE_CURL: 111, AMNESIA: 133, HEADBUTT: 29, ENCORE: 227 } as const;

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

describe("rcp154 C2 -- a battler Encored mid-turn before acting uses the encored move that turn", () => {
  const [turn1, turn2, turn3] = c2.rom.turns;

  it("is a reproducible, cross-checked stock-ROM receipt; turn 2 selects slot 1 via one RIGHT press", () => {
    expectProvenance(c2);
    expect(c2.parties.player[0]).toMatchObject({
      species: SPECIES.SNORLAX, moves: [MOVE.TACKLE, MOVE.DEFENSE_CURL, MOVE.AMNESIA, MOVE.HEADBUTT],
    });
    expect(c2.parties.opponent[0]).toMatchObject({ species: SPECIES.PLUSLE, moves: [227, 227, 227, 227] });
    expect(c2.parties.opponent[0].stats.speed).toBeGreaterThan(c2.parties.player[0].stats.speed);
    expect(c2.slotPlan).toEqual([0, 1]);
    expect(c2.inputSubstitutions).toEqual([expect.objectContaining({ menuEntry: 2, cursor: 0, plannedSlot: 1, buttons: ["RIGHT"] })]);
  });

  it("turn 1: Encore fails (no last move), SNORLAX's TACKLE becomes gLastMoves", () => {
    expect(messageTexts(turn1)).toEqual(expect.arrayContaining(["Foe PLUSLE used\nENCORE!", "But it failed!", "SNORLAX used\nTACKLE!"]));
    expect(turn1.actions.map((action) => [action.attacker, action.currentMove])).toEqual([[1, MOVE.ENCORE], [0, MOVE.TACKLE]]);
  });

  it("turn 2: SNORLAX banked DEFENSE CURL, was Encored first, and ran TACKLE from the encored slot with a GetMoveTarget draw", () => {
    expect(turn2.actions[1]).toMatchObject({
      attacker: 0, activeSpecies: SPECIES.SNORLAX,
      chosenMoveByBattler: MOVE.DEFENSE_CURL, // selection-time bank (battle_main.c:4399)
      currentMove: MOVE.TACKLE, currMovePos: 0, // :111-117 Encore arm at action time
      encore: [MOVE.TACKLE, 0, 4],
    });
    expect(messageTexts(turn2)).toEqual(expect.arrayContaining(["SNORLAX got\nan ENCORE!", "SNORLAX used\nTACKLE!"]));
    expect(turn2.draws.map((draw) => draw.callerFunction)).toEqual([
      "Cmd_accuracycheck", "Cmd_trysetencore", "GetMoveTarget",
      "Cmd_accuracycheck", "Cmd_critcalc", "Cmd_adjustnormaldamage", "Cmd_seteffectwithchance", "BattleTurnPassed",
    ]);
    expect(turn2.draws[2]).toMatchObject({ caller: "GetMoveTarget+0x18e", attacker: 0, currentMove: MOVE.TACKLE });
  });

  it("turn 3: an ordinary encored turn re-runs GetMoveTarget's do/while until it leaves the attacker", () => {
    const targets = turn3.draws.filter((draw) => draw.callerFunction === "GetMoveTarget");
    expect(targets.length).toBe(7);
    expect(targets.slice(0, -1).every((draw) => draw.value % 2 === 0)).toBe(true);
    expect(targets.at(-1)!.value % 2).toBe(1);
  });

  it("port at HEAD FAILs at turn 2 index 2: it runs the turn-start DEFENSE CURL (no GetMoveTarget, no TACKLE)", () => {
    expect(c2.comparison.verdictToday).toBe("FAIL");
    expect(c2.comparison.firstDivergence).toMatchObject({
      turn: 2, index: 2,
      rom: { reason: "GetMoveTarget(MOVE_TARGET_SELECTED)" },
      port: { reason: "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)" },
    });
    expect(c2.port.turns[1].events).toContain("message:STRINGID_DEFENDERSSTATROSE");
    expect(c2.comparison.portActiveHp[1]).toEqual(c2.comparison.portActiveHp[0]);
    // Turn 1 matches draw for draw.
    expect(c2.port.turns[0].draws.map((draw) => draw.rngBefore)).toEqual(c2.rom.turns[0].draws.map((draw) => draw.rngBefore));
  });

  it("predicts the ROM sequence post-fix", () => {
    expectPredictionIsRom(c2);
  });
});

describe("rcp154 C2u -- control: the encored move is user-targeted (DEFENSE CURL), the selected one is TACKLE", () => {
  const turn2 = c2u.rom.turns[1];

  it("is a reproducible, cross-checked stock-ROM receipt on the C2 card with the opposite slot plan", () => {
    expectProvenance(c2u);
    expect(c2u.card).toBe(c2.card);
    expect(c2u.parties).toEqual(c2.parties);
    expect(c2u.slotPlan).toEqual([1, 0]);
    expect(c2u.inputSubstitutions.map((step) => [step.menuEntry, step.buttons])).toEqual([[1, ["RIGHT"]], [2, ["LEFT"]]]);
  });

  it("turn 2: SNORLAX banked TACKLE, was Encored first, ran DEFENSE CURL from slot 1 and drew nothing itself", () => {
    expect(turn2.actions[1]).toMatchObject({
      attacker: 0, chosenMoveByBattler: MOVE.TACKLE, currentMove: MOVE.DEFENSE_CURL, currMovePos: 1,
      encore: [MOVE.DEFENSE_CURL, 1, expect.any(Number)],
    });
    expect(messageTexts(turn2)).toEqual(expect.arrayContaining(["SNORLAX got\nan ENCORE!", "SNORLAX used\nDEFENSE CURL!"]));
    // GetMoveTarget(MOVE_TARGET_USER) runs (battle_util.c:117) but draws nothing.
    expect(turn2.draws.map((draw) => draw.callerFunction)).toEqual(["Cmd_accuracycheck", "Cmd_trysetencore", "BattleTurnPassed"]);
  });

  it("port at HEAD FAILs at turn 2 index 2: it runs the turn-start TACKLE's hit chain", () => {
    expect(c2u.comparison.verdictToday).toBe("FAIL");
    expect(c2u.comparison.firstDivergence).toMatchObject({
      turn: 2, index: 2,
      rom: { reason: "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)" },
      port: { reason: "accuracycheck" },
    });
    expect(c2u.comparison.romActiveHp[1]).toEqual(c2u.comparison.romActiveHp[0]);
    expect(c2u.comparison.portActiveHp[1][1]).toBeLessThan(c2u.comparison.portActiveHp[0][1]);
  });

  it("predicts the ROM sequence post-fix", () => {
    expectPredictionIsRom(c2u);
  });
});
