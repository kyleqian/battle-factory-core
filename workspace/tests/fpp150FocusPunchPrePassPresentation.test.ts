/**
 * fpp150 (ISSUES #139, docs/fpp150-focus-punch-prepass.md): the Focus Punch pre-pass through production's presentation
 * (projectBattleResolutionCommands + battleResolutionCommandDuration + advanceBattleResolutionConfirmHandoff) on rcp143's R4
 * card, both scenes, against the committed ROM receipt's print rows (first glyph = print row + 1). Hermetic: the kernel runs
 * from the receipt's parties and gRngValue, no oracle.
 */
import { describe, expect, it } from "vitest";
import { fpp150Arm } from "../tools/integration/fpp150Anchors.ts";
import {
  FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES,
  FOCUS_PUNCH_SETUP_COMMAND_FRAMES,
} from "../src/engine/battleResolutionPresentation.ts";
import { FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_ROWS, FOCUS_PUNCH_SETUP_ROWS } from "../src/animation/focusPunchSetUp.ts";

describe("fpp150 -- Focus Punch pre-pass presentation anchors (rcp143 R4, both scenes)", () => {
  const arms = Object.fromEntries(["off-focus-punch", "off-control", "on-focus-punch", "on-control"].map((name) => [name, fpp150Arm(name)]));

  it("calibration: each control arm's first command is the ROM first glyph of Jolteon's print (46), handoff 7 frames", () => {
    for (const name of ["off-control", "on-control"]) {
      expect(arms[name]!.handoffFrames).toBe(7);
      expect(arms[name]!.anchors[0]).toMatchObject({ romFirstGlyph: 46, production: 46 });
    }
  });

  it("Scene OFF: empty box 72, focus print glyph 109, the foe's print glyph 215 == ROM (pre-pass 137 frames)", () => {
    const arm = arms["off-focus-punch"]!;
    expect(arm.handoffFrames).toBe(1);
    expect(arm.generalAnimation).toBeNull();
    expect(arm.anchors.slice(0, 3).map((x) => [x.romFirstGlyph, x.production])).toEqual([[72, 72], [109, 109], [215, 215]]);
    expect(arm.rows.slice(0, 2).map((row) => [row.type, row.frames])).toEqual([["message", 37], ["message", 106]]);
    expect(arm.pass).toBe(true);
  });

  it("Scene ON: empty box 72, general animation X + 1 .. X + 124 (75 .. 198), focus glyph 199, the foe's 305 == ROM", () => {
    const arm = arms["on-focus-punch"]!;
    expect(arm.anchors.slice(0, 3).map((x) => [x.romFirstGlyph, x.production])).toEqual([[72, 72], [199, 199], [305, 305]]);
    expect(arm.rows.slice(0, 3).map((row) => [row.type, row.frames])).toEqual([
      ["message", 3], ["general-animation", FOCUS_PUNCH_SETUP_COMMAND_FRAMES], ["message", 106],
    ]);
    // fps147's rows: X = R - 2 = 74 on R4 (R = 76), the command's age a = row X + 1 + a, the focus glyph at X + 125.
    const x = 76 + FOCUS_PUNCH_SETUP_ROWS.playanimationRow;
    expect(arm.generalAnimation).toMatchObject({ start: x + 1, frames: FOCUS_PUNCH_SETUP_ROWS.focusFirstGlyphDisplay + 1 });
    expect(arm.pass).toBe(true);
  });

  it("the post-pre-pass residuals are the control arms' own (pre-existing, identical shape)", () => {
    for (const scene of ["off", "on"]) {
      const focus = arms[`${scene}-focus-punch`]!.anchors[3]!;
      const control = arms[`${scene}-control`]!.anchors[1]!;
      expect(focus.production - focus.romFirstGlyph).toBe(control.production - control.romFirstGlyph);
    }
  });

  it("behind a Substitute the command is the rows to the focus glyph (fps147 §1d: X + 1 .. X + 3)", () => {
    expect(FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES).toBe(FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_ROWS.focusFirstGlyphDisplay + 1);
  });
});
