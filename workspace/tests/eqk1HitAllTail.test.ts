// eqk1: the hit-all loop's EMPTYSTRING3 box anchors the next mover's action transition (P = 5 + u rows, both scenes; ROM: eq-p / eq-imm labs
// of tools/integration/eqk1Labs.py, next-mover SE 8 frames early before), and a no-effect Earthquake's "It doesn't affect" print waits for the
// NO_EFFECT Pausex20 run in Scene ON (the used-move box holds 55 rows; eq-imm ON Drill Peck body -57 -> -2). No emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import type { BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (name: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => ReturnType<typeof createInitialState>;
};

function commandsOf(lab: string, scene: "on" | "off"): readonly BattleResolutionPresentationCommand[] {
  const request = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${lab}.json`, import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
  let state = labBackedStage(`${lab}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
  for (const advance of traceAdvances(request.trace.segments as never)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (resolution !== undefined && resolution !== null && resolution.segments.length > 0) return resolution.segments.flatMap((segment) => segment.commands);
  }
  return [];
}

const minimumFramesAfterBox = (commands: readonly BattleResolutionPresentationCommand[]): number | undefined => {
  const box = commands.findIndex((command, index) => index > 0 && command.type === "message" && command.timing.minimumFrames === 5);
  const next = commands[box + 1] as { timing?: { minimumFrames: number } } | undefined;
  return next?.timing?.minimumFrames;
};

describe("eqk1: hit-all tail", () => {
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: eq-p's next mover starts 5 + u = 8 rows after the box`, () => {
      expect(minimumFramesAfterBox(commandsOf("eqk1-eq-p", scene))).toBe(8);
    });
  }
  it("Scene ON: a no-effect Earthquake holds the used-move box for the Pausex20 run (55 rows) and the next mover starts 5 + u = 9 after the box", () => {
    const commands = commandsOf("eqk1-eq-imm", "on");
    expect((commands[0] as { timing: { holdFrames: number } }).timing.holdFrames).toBe(55);
    expect(minimumFramesAfterBox(commands)).toBe(9);
  });
  it("Scene OFF: Magnitude's pause / print / waitmessage rows are not counted again in the move command (first SE +100 -> 0, ROM 211)", () => {
    const move = commandsOf("eqk1-mag-p", "off").find((command) => command.type === "move-animation") as { timing: { minimumFrames: number } };
    expect(move.timing.minimumFrames).toBe(47);
  });
});
