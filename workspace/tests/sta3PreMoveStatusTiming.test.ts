// sta3: a pre-move print (confusion / sleep) after an action. ROM milestones come from tests/fixtures/sta3-rom-windows.json (step-mode
// gBattlescriptCurrInstr, tools/audio/sta3RomWindow.py); the engine side is the production command timeline of the aud242f / aud242g windows.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS, WAITMESSAGE_LONG_HOLD_FRAMES } from "../src/engine/battleResolutionPresentation.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
interface Window { anchorPrint: number; moveEnd: number; print: number; waitDone: number; launch: number }
const windows = JSON.parse(readFileSync(new URL("./fixtures/sta3-rom-windows.json", import.meta.url), "utf8")).windows as Record<string, Window>;

interface Row { frame: number; type: string; hold: number | undefined; animation?: string }
// Every command the presentation shows, with the frame it starts on (Scene ON).
function commandStarts(name: string): Row[] {
  const rom = JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8"));
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: "on" });
  if (rom.trace.appStage !== undefined && rom.trace.appStage.frame === 0) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const rows: Row[] = [];
  let last = "";
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    state = tick(state, advance.buttons);
    const presentation = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = presentation?.segments?.[presentation.segmentIndex]?.commands?.[presentation.commandIndex];
    if (command === undefined || presentation.lifecycle.phase !== "presenting") continue;
    const key = `${presentation.segmentIndex}:${presentation.commandIndex}`;
    if (key === last) continue;
    last = key;
    rows.push({ frame: state.frame, type: command.type, hold: command.timing?.holdFrames, animation: command.animation });
  }
  return rows;
}

describe("sta3: pre-move print -> status animation timing against the ROM step-mode windows", () => {
  it("the pre-move message holds the 64-row waitmessage plus the 3 launch rows (both scenes' shared print)", () => {
    expect(PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS).toBe(3);
    for (const [name, window] of Object.entries(windows)) {
      const rows = commandStarts(name);
      const second = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.type === "status-animation").at(-1)!;
      const message = rows[second.i - 1]!;
      expect(message.type, name).toBe("message");
      expect(message.hold, name).toBe(WAITMESSAGE_LONG_HOLD_FRAMES + PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS);
      // print exec row -> status2animation exec row: the same rows in the engine (message start -> status-animation start).
      expect(second.r.frame - message.frame, name).toBe(window.launch - window.print);
      // The action transition: the previous print's exec row -> this print's exec row is the ROM's, less the 1 row of the message-start convention.
      const anchorMessage = rows.slice(0, second.i - 1).filter((r) => r.type === "message").at(-1)!;
      expect(message.frame - anchorMessage.frame, name).toBe(window.print - window.anchorPrint - 1);
    }
  });
});
