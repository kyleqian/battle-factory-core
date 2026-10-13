import { describe, expect, it } from "vitest";
import r1 from "../tools/probe/receipts/rcp143-r1-thrash-lockin-off.json" with { type: "json" };
import r2 from "../tools/probe/receipts/rcp143-r2-covet-stickyhold-off.json" with { type: "json" };
import r3 from "../tools/probe/receipts/rcp143-r3-getmovetarget-133-off.json" with { type: "json" };
import r3Control from "../tools/probe/receipts/rcp143-r3-control-transform-off.json" with { type: "json" };
import r4 from "../tools/probe/receipts/rcp143-r4-focuspunch-prepass.json" with { type: "json" };

/**
 * STEP rcp143 -- stock-ROM receipts for the next engine fixes (ISSUES #141 /
 * #140 / #139), banked BEFORE the fixes land. Hermetic: these assertions read
 * only the committed JSON; `tools/probe/verify-rcp143.ts` is the live
 * port-vs-ROM comparison (it FAILs until #141 is fixed, then must PASS).
 * See docs/rcp143-engine-fix-receipts.md.
 */
type Draw = Readonly<{ reason: string; rngBefore: number; value: number }>;
type RomDraw = Readonly<{ frame: number; caller: string; callerFunction: string; rngBefore: number; value: number; script: string }>;

const LCG = (value: number) => (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;

function expectProvenance(receipt: typeof r1 | typeof r2 | typeof r3 | typeof r3Control) {
  expect(receipt.schema).toBe("rcp143-engine-fix-receipt/v1");
  expect(receipt.oracleProfile).toBe("battle-scene-off");
  expect(receipt.byteIdenticalAcrossRuns).toBe(true);
  expect(receipt.probeOutputSha256).toBe(receipt.probeOutputSha256Rerun);
  expect(receipt.drawCountCrossChecked).toBe(true);
  expect(receipt.attributionReconciled).toBe(true);
  for (const turn of receipt.rom.turns) {
    expect(turn.drawCount).toBe(turn.draws.length);
    expect(turn.aiSelectionDrawCount).toBe(turn.aiSelectionDraws.length);
    // Every turn ends on BattleTurnPassed's gRandomTurnNumber draw.
    expect(turn.draws.at(-1)?.callerFunction).toBe("BattleTurnPassed");
    for (const draw of turn.draws as readonly RomDraw[]) {
      // The recorded u16 is the LCG step of the recorded pre-draw state.
      expect(draw.value).toBe(LCG(draw.rngBefore) >>> 16);
    }
  }
}

/** The ROM's turn-execution draws in the port's vocabulary must be what the fixed kernel emits. */
function expectPredictionIsRom(receipt: typeof r1 | typeof r2 | typeof r3 | typeof r3Control) {
  expect(receipt.predictedPostFix.turns.map((turn) => turn.draws.map((draw: Draw) => draw.rngBefore)))
    .toEqual(receipt.rom.turns.map((turn) => turn.draws.map((draw) => draw.rngBefore)));
  expect(receipt.predictedPostFix.turns.map((turn) => turn.activeHpAtTurnEnd))
    .toEqual(receipt.rom.turns.map((turn) => turn.activeHpAtTurnEnd));
  expect(receipt.predictedPostFix.turns.flatMap((turn) => turn.draws.map((draw: Draw) => draw.reason)))
    .not.toContain(expect.stringMatching(/^UNMAPPED/));
}

describe("rcp143 R1 -- THRASH lock-in re-runs seteffectwithchance (ISSUES #141a)", () => {
  const lockInTurns = r1.rom.turns.filter((turn) =>
    turn.draws.some((draw) => draw.caller === "SetMoveEffect+0x113c"));

  it("is a reproducible, cross-checked stock-ROM receipt", () => {
    expectProvenance(r1);
    expect(r1.parties.player[0]).toMatchObject({ species: 128, ability: 22, moves: [37, 33, 30, 39] });
    expect(r1.parties.opponent[0]).toMatchObject({ species: 208, moves: [33, 33, 33, 33] });
  });

  it("spends chance roll, (Random() & 1) + 2 duration, then a SECOND chance roll on every lock-in", () => {
    // Turn 1 (first selection) and turn 3 (re-selected after the fatigue confusion) both lock in.
    expect(lockInTurns.map((turn) => turn.turn)).toEqual([1, 3]);
    for (const turn of lockInTurns) {
      const at = turn.draws.findIndex((draw) => draw.caller === "SetMoveEffect+0x113c");
      const [roll, duration, wasted] = turn.draws.slice(at - 1, at + 2);
      expect([roll.callerFunction, duration.callerFunction, wasted.callerFunction])
        .toEqual(["Cmd_seteffectwithchance", "SetMoveEffect", "Cmd_seteffectwithchance"]);
      // Same opcode, re-executed on the very next frame (one opcode per frame).
      expect(roll.frame).toBe(duration.frame);
      expect(wasted.frame).toBe(duration.frame + 1);
      expect(wasted.script).toBe(roll.script);
    }
    // Lock duration (value & 1) + 2 = 2 on turn 1: the fatigue confusion lands at the end of turn 2.
    const turn1Duration = lockInTurns[0].draws.find((draw) => draw.caller === "SetMoveEffect+0x113c");
    expect(((turn1Duration?.value ?? 1) & 1) + 2).toBe(2);
    expect(r1.rom.turns[1].draws.map((draw) => draw.caller)).toContain("SetMoveEffect+0x92e");
    expect(r1.rom.messages.map((message) => message.text)).toContain("TAUROS became\nconfused due to fatigue!");
  });

  it("records the port at HEAD exactly one draw short at the first lock-in (expected FAIL today)", () => {
    expect(r1.comparison.verdictToday).toBe("FAIL");
    const romTurn1 = r1.predictedPostFix.turns[0].draws;
    const portTurn1 = r1.port.turns[0].draws;
    // Identical through the duration draw ...
    expect(portTurn1.slice(0, 5)).toEqual(romTurn1.slice(0, 5));
    // ... then the port spends the ROM's wasted roll on Steelix's accuracy check.
    expect(r1.comparison.firstDivergence).toMatchObject({
      turn: 1,
      index: 5,
      rom: { reason: "seteffectwithchance", rngBefore: romTurn1[5].rngBefore },
      port: { reason: "accuracycheck", rngBefore: romTurn1[5].rngBefore },
    });
    // Observable consequence: the ROM's Steelix misses (Tauros untouched), the port's hits.
    expect(r1.rom.turns[0].activeHpAtTurnEnd).toEqual([150, 168]);
    expect(r1.port.turns[0].activeHpAtTurnEnd).toEqual([140, 168]);
    // Next turn's Thrash damage roll: ROM vs port.
    const damage = (draws: readonly Draw[]) => draws.find((draw) => draw.reason === "adjustnormaldamage")?.value;
    expect(damage(r1.predictedPostFix.turns[1].draws)).toBe(20000);
    expect(damage(r1.port.turns[1].draws)).toBe(7952);
  });

  it("pins the predicted post-fix port sequence to the ROM's own", () => {
    expectPredictionIsRom(r1);
    expect(r1.predictedPostFix.turns.map((turn) => turn.draws.length)).toEqual([8, 10, 12]);
  });
});

describe("rcp143 R2 -- Covet into Sticky Hold returns onto seteffectwithchance (ISSUES #141b)", () => {
  it("is a reproducible, cross-checked stock-ROM receipt with Sticky Hold active", () => {
    expectProvenance(r2);
    expect(r2.parties.player[0]).toMatchObject({ species: 289, item: 0, moves: [343, 29, 28, 33] });
    // GULPIN abilitySlot 1 == ABILITY_STICKY_HOLD (60), holding SOOTHE_BELL (184).
    expect(r2.parties.opponent[0]).toMatchObject({ species: 367, abilitySlot: 1, ability: 60, item: 184 });
    expect(r2.rom.messages.filter((message) => message.text === "Foe GULPIN’s STICKY HOLD\nmade COVET ineffective!"))
      .toHaveLength(3);
  });

  it("re-runs seteffectwithchance after BattleScript_NoItemSteal returns, every Covet turn", () => {
    for (const turn of r2.rom.turns) {
      const rolls = turn.draws.filter((draw) => draw.callerFunction === "Cmd_seteffectwithchance" && draw.currentMove === 343);
      expect(rolls).toHaveLength(2);
      const [chance, wasted] = rolls;
      expect(turn.draws.indexOf(wasted)).toBe(turn.draws.indexOf(chance) + 1);
      expect(wasted.frame).toBeGreaterThan(chance.frame);
    }
  });

  it("records the fixed port (rng146 F2) matching the ROM: two chance rolls per Covet turn", () => {
    expect(r2.comparison.verdictToday).toBe("PASS");
    expect(r2.comparison.romDrawCounts).toEqual([10, 10, 10]);
    expect(r2.comparison.portDrawCounts).toEqual([10, 10, 10]);
    expect(r2.comparison.firstDivergence).toBeNull();
    expect(r2.port.turns.map((turn) => turn.draws)).toEqual(r2.predictedPostFix.turns.map((turn) => turn.draws));
    // Turn-2 consequence: the port's Covet no longer crits off an offset stream.
    expect(r2.port.turns.map((turn) => turn.activeHpAtTurnEnd)).toEqual([[139, 141], [126, 104], [114, 70]]);
    for (const turn of r2.port.turns) {
      expect(turn.draws.map((draw) => draw.reason).slice(3, 5)).toEqual(["seteffectwithchance", "seteffectwithchance"]);
    }
  });

  it("pins the predicted post-fix port sequence to the ROM's own", () => {
    expectPredictionIsRom(r2);
  });
});

describe("rcp143 R3 -- HandleAction_UseMove:133 reached in singles without Mimic/Transform (ISSUES #140 remainder)", () => {
  const getMoveTargetTurns = r3.rom.turns.filter((turn) => turn.draws.some((draw) => draw.callerFunction === "GetMoveTarget"));

  it("is a reproducible, cross-checked stock-ROM receipt with legal sets", () => {
    expectProvenance(r3);
    // SNORLAX (Solar Beam by TM22) slower than PARASECT (Spore, level 27 level-up).
    expect(r3.parties.player[0]).toMatchObject({ species: 143, moves: [76, 34, 156, 173] });
    expect(r3.parties.opponent[0]).toMatchObject({ species: 47, moves: [147, 147, 147, 147] });
    expect(r3.parties.player[0].stats.speed).toBeLessThan(r3.parties.opponent[0].stats.speed);
  });

  it("spends GetMoveTarget draws when the foe's Spore cancels the charging Solar Beam before Snorlax acts", () => {
    expect(getMoveTargetTurns.map((turn) => turn.turn)).toEqual([4, 8]);
    for (const turn of getMoveTargetTurns) {
      const callers = turn.draws.map((draw) => draw.callerFunction);
      // Parasect's Spore (accuracy, sleep duration) lands first, then Snorlax's prologue loop.
      expect(callers.slice(0, 2)).toEqual(["Cmd_accuracycheck", "SetMoveEffect"]);
      const loop = turn.draws.filter((draw) => draw.callerFunction === "GetMoveTarget");
      for (const draw of loop) {
        expect(draw).toMatchObject({ attacker: 0, currentMove: 76 });
      }
    }
    // Geometric(1/2) with two battlers: 1 draw, then 2.
    expect(getMoveTargetTurns.map((turn) => turn.draws.filter((draw) => draw.callerFunction === "GetMoveTarget").length))
      .toEqual([1, 2]);
    const texts = r3.rom.messages.map((message) => message.text);
    expect(texts).toContain("SNORLAX took\nin sunlight!");
    expect(texts.filter((text) => text === "SNORLAX\nfell asleep!")).toHaveLength(3);
  });

  it("records the fixed port (rng146 F3) running the :133 draw loop like the ROM", () => {
    expect(r3.comparison.verdictToday).toBe("PASS");
    expect(r3.comparison.firstDivergence).toBeNull();
    expect(r3.port.turns).toEqual(r3.predictedPostFix.turns.map((turn) => ({
      turn: turn.turn,
      draws: turn.draws,
      activeHpAtTurnEnd: turn.activeHpAtTurnEnd,
    })));
    expect(r3.port.turns[3].draws[2]).toMatchObject({ reason: "GetMoveTarget(MOVE_TARGET_SELECTED)", value: 35099 });
  });

  it("pins the predicted post-fix port sequence to the ROM's own", () => {
    expectPredictionIsRom(r3);
  });
});

describe("rcp143 R3 control -- Transform's overwritten slot used on a LATER turn does not take :133", () => {
  it("draws no GetMoveTarget on any Ditto action after Transform, and the port already agrees", () => {
    expectProvenance(r3Control);
    expect(r3Control.parties.player[0]).toMatchObject({ species: 132, moves: [144, 0, 0, 0] });
    const texts = r3Control.rom.messages.map((message) => message.text);
    expect(texts).toContain("DITTO transformed\ninto SNORLAX!");
    expect(texts.filter((text) => text === "DITTO used\nTACKLE!").length).toBeGreaterThanOrEqual(3);
    const callers = r3Control.rom.turns.flatMap((turn) => turn.draws.map((draw) => draw.callerFunction));
    expect(callers).not.toContain("GetMoveTarget");
    expect(r3Control.comparison.verdictToday).toBe("PASS");
    expect(r3Control.comparison.firstDivergence).toBeNull();
    expectPredictionIsRom(r3Control);
  });
});

describe("rcp143 R4 -- Focus Punch pre-pass before ANY action, no RNG (ISSUES #139)", () => {
  const arm = (name: string) => {
    const found = r4.arms.find((candidate) => candidate.arm === name);
    if (!found) throw new Error(`receipt has no arm ${name}`);
    return found;
  };

  it("banks four byte-identical arms (Scene OFF and ON, Focus Punch and control), each run twice fresh", () => {
    expect(r4.arms.map((candidate) => [candidate.arm, candidate.oracleProfile])).toEqual([
      ["off-focus-punch", "battle-scene-off"],
      ["off-control", "battle-scene-off"],
      ["on-focus-punch", "battle-scene-on"],
      ["on-control", "battle-scene-on"],
    ]);
    for (const candidate of r4.arms) {
      expect(candidate.runs).toBe(2);
      expect(candidate.byteIdenticalAcrossRuns).toBe(true);
      expect(candidate.attributionReconciled).toBe(true);
      expect(candidate.densePngFrames).toEqual([1, 766]);
      // BRELOOM (Speed 90) is slower than JOLTEON (Speed 150).
      expect(candidate.parties.player[0].stats.speed).toBeLessThan(candidate.parties.opponent[0].stats.speed);
    }
  });

  it("prints the empty box then 'tightening its focus' before the faster foe's move, spending no Random()", () => {
    for (const name of ["off-focus-punch", "on-focus-punch"]) {
      const focus = arm(name);
      expect(focus.prePass).toMatchObject({ script: "BattleScript_FocusPunchSetUp", randomDraws: 0 });
      expect(focus.drawsBetweenTurnOrderAndFirstAction).toBe(0);
      expect(focus.messages.slice(0, 3).map((message) => message.text)).toEqual([
        "",
        "BRELOOM is tightening\nits focus!",
        "Foe JOLTEON used\nSAND-ATTACK!",
      ]);
      // Both pre-pass boxes are written inside the pre-pass script, before action 1 starts.
      expect(focus.messages[1].frame).toBeLessThan(focus.prePass?.scriptEndFrame ?? 0);
      expect(focus.messages[2].frame).toBeGreaterThan(focus.runTurnActionsFrame);
    }
    for (const name of ["off-control", "on-control"]) {
      const control = arm(name);
      expect(control.prePass).toBeNull();
      // Turn order -> pre-pass check -> actions on consecutive frames.
      expect([control.checkFocusPunchFrame, control.runTurnActionsFrame])
        .toEqual([control.turnOrderFrame + 1, control.turnOrderFrame + 2]);
      expect(control.messages[0].text).toBe("Foe JOLTEON used\nSAND-ATTACK!");
    }
  });

  it("pins the frame timings the Scene ON presentation step will need", () => {
    const off = arm("off-focus-punch");
    const on = arm("on-focus-punch");
    expect([off.turnOrderFrame, off.checkFocusPunchFrame, off.prePass?.scriptStartFrame, off.prePass?.scriptEndFrame, off.runTurnActionsFrame])
      .toEqual([68, 69, 70, 206, 207]);
    expect(off.messages.slice(0, 3).map((message) => message.frame)).toEqual([71, 108, 214]);
    // Scene OFF has no FOCUS_PUNCH_SETUP animation (BattleScript_Pausex20 stands in).
    expect(off.animSpans.map((span) => span.script)).not.toContain("General_FocusPunchSetUp");
    expect([on.prePass?.scriptStartFrame, on.prePass?.scriptEndFrame, on.runTurnActionsFrame]).toEqual([70, 296, 297]);
    expect(on.messages.slice(0, 3).map((message) => message.frame)).toEqual([71, 198, 304]);
    expect(on.animSpans[0]).toMatchObject({
      script: "General_FocusPunchSetUp",
      firstActiveFrame: 76,
      lastActiveFrame: 195,
      frames: 120,
    });
  });

  it("records the port at HEAD skipping the pre-pass (expected FAIL today) with the RNG already in step", () => {
    expect(r4.comparison.verdictToday).toBe("FAIL");
    const [focus, control] = r4.comparison.arms;
    expect(focus).toMatchObject({ arm: "off-focus-punch", messagesMatch: false, drawsMatch: true });
    expect(control).toMatchObject({ arm: "off-control", messagesMatch: true, drawsMatch: true });
    expect(r4.port.arms[0].portMessageIds[0]).toBe("STRINGID_USEDMOVE");
    expect(r4.predictedPostFix.arms[0].events.slice(0, 4)).toEqual([
      { kind: "message", id: "STRINGID_EMPTYSTRING3" },
      { kind: "animation", id: "FOCUS_PUNCH_SETUP" },
      { kind: "message", id: "STRINGID_PKMNTIGHTENINGFOCUS" },
      { kind: "message", id: "STRINGID_USEDMOVE" },
    ]);
    expect(r4.predictedPostFix.arms[1].events).toEqual(r4.port.arms[1].portEventsToday);
  });
});
