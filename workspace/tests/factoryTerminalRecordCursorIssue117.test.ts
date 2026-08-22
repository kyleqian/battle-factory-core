import { describe, expect, it } from "vitest";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
} from "../src/engine/factoryTerminalPresentation.ts";
import { renderFactoryTerminalPresentation } from "../src/engine/factoryTerminalRender.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";

// ---------------------------------------------------------------------------
// ISSUES #117: the record-prompt YES/NO multichoice cursor arrow's drawn row
// lags `recordMenuCursor`'s own reducer update by exactly one tick -- the
// press-processed tick must flip `recordMenuCursor` immediately (the confirm
// choice reads it that same tick), but the real ROM's arrow sprite redraw
// stays at the OLD row through that tick, only showing the new row starting
// the tick after. Measured via
// `tools/compare/traces/loss-terminal-record-cursor-off.json` (frames
// 4539/4561: app moved the arrow a tick early; real ROM held the old row
// through the press-processed tick), 80/80 after the fix.
// ---------------------------------------------------------------------------

const LOSS_COMMAND = { type: "roundLost", commandId: 1, battleIndex: 0 } as const;

function advanceTo(
  state: ReturnType<typeof createFactoryTerminalLossPresentation>,
  age: number,
) {
  while (state.age < age) {
    state = advanceFactoryTerminalPresentation(state, {});
  }
  return state;
}

function terminalThroughPages() {
  let terminal = createFactoryTerminalLossPresentation(LOSS_COMMAND);
  terminal = advanceTo(terminal, 301);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  terminal = advanceTo(terminal, 602);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  terminal = advanceTo(terminal, 904);
  terminal = advanceFactoryTerminalPresentation(terminal, { pressedA: true });
  expect(terminal.recordPromptReleaseAge).toBe(905);
  return terminal;
}

function arrowRow(fb: Uint8Array): "yes" | "no" | null {
  const darkAt = (x: number, y: number) =>
    fb[(y * 240 + x) * 4]! < 200 &&
    fb[(y * 240 + x) * 4 + 1]! < 200 &&
    fb[(y * 240 + x) * 4 + 2]! < 200;
  const yesRow = darkAt(169, 79) || darkAt(169, 80);
  const noRow = darkAt(169, 95) || darkAt(169, 96);
  if (yesRow && !noRow) return "yes";
  if (noRow && !yesRow) return "no";
  return null;
}

describe("ISSUES #117: record-menu cursor arrow redraw lags the reducer's flip by one tick", () => {
  it("UP at the input-ready gate: recordMenuCursor flips immediately, but the drawn arrow stays on NO through that tick", () => {
    let terminal = terminalThroughPages();
    terminal = advanceTo(terminal, 930);
    const pressed = advanceFactoryTerminalPresentation(terminal, { pressedUp: true });
    expect(pressed).toMatchObject({
      age: 931,
      recordMenuCursor: 0,
      recordMenuCursorChangedAge: 931,
    });

    const atPressTick = renderFactoryTerminalPresentation(pressed, () => createFramebuffer());
    expect(arrowRow(atPressTick)).toBe("no");

    const nextTick = advanceFactoryTerminalPresentation(pressed, {});
    expect(nextTick.recordMenuCursor).toBe(0);
    const atNextTick = renderFactoryTerminalPresentation(nextTick, () => createFramebuffer());
    expect(arrowRow(atNextTick)).toBe("yes");
  });

  it("DOWN back onto NO shows the same one-tick-late redraw symmetrically", () => {
    let terminal = terminalThroughPages();
    terminal = advanceTo(terminal, 930);
    terminal = advanceFactoryTerminalPresentation(terminal, { pressedUp: true });
    terminal = advanceTo(terminal, 950);
    const pressed = advanceFactoryTerminalPresentation(terminal, { pressedDown: true });
    expect(pressed).toMatchObject({
      recordMenuCursor: 1,
      recordMenuCursorChangedAge: pressed.age,
    });

    const atPressTick = renderFactoryTerminalPresentation(pressed, () => createFramebuffer());
    expect(arrowRow(atPressTick)).toBe("yes");

    const nextTick = advanceFactoryTerminalPresentation(pressed, {});
    const atNextTick = renderFactoryTerminalPresentation(nextTick, () => createFramebuffer());
    expect(arrowRow(atNextTick)).toBe("no");
  });
});
