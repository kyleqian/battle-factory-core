// hie1 (ISSUES #220 step 1, docs/hie-scout.md): the held-item effect animation's presented frames, from the staged labs
// tools/battle-lab/hie1-*.json (ROM windows tools/compare/traces/hie1-*.json; the measurements are in PROGRESS.md / ISSUES #220).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import {
  HELD_ITEM_EFFECT_COMMAND_FRAMES,
  HELD_ITEM_EFFECT_CONTINUE_LEAD_FRAMES,
  HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES,
  type BattleResolutionPresentationCommand,
} from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function commandsOf(id: string): readonly BattleResolutionPresentationCommand[] {
  const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as {
    appRoute: "generated-orchestrator";
    oracleProfile: string;
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.oracleProfile === "battle-scene-on" ? "on" : "off" });
  state = APP_STAGES[id]!(state);
  let commands: readonly BattleResolutionPresentationCommand[] = [];
  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (resolution !== undefined && resolution !== null && resolution.segments[0] !== undefined) commands = resolution.segments[0].commands;
  }
  return commands;
}

describe("held-item effect presentation (hie1)", () => {
  it("pins the constants", () => {
    expect([HELD_ITEM_EFFECT_COMMAND_FRAMES, HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES, HELD_ITEM_EFFECT_CONTINUE_LEAD_FRAMES]).toEqual([214, 15, 9]);
  });

  // Scene ON: the animation command (restart items 214 + 15, continuations 214 + 9; the cure berry's preceding 32-frame status
  // command stands in for the first 32 and the ROM adds one more frame).
  for (const [site, frames] of [["leftovers", 229], ["sitrus", 229], ["shellbell", 223], ["cheri", 192]] as const) {
    it(`Scene ON ${site}: one HELD_ITEM_EFFECT general-animation of ${frames} frames before the print`, () => {
      const commands = commandsOf(`hie1-${site}-on`);
      const at = commands.findIndex((command) => command.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT");
      expect(at).toBeGreaterThan(0);
      expect(commands[at]).toMatchObject({ battler: 0, timing: { minimumFrames: frames } });
      expect(commands.filter((command) => command.type === "general-animation").length).toBe(1);
      expect(commands[at + 1]).toMatchObject({ type: "message" });
    });
  }

  // Scene OFF: Pausex20 as a presented hold (executions from the previous receipt + the lead; the cure berry's status command
  // already holds the executions, so only the lead remains).
  for (const [site, frames] of [["leftovers", 51], ["sitrus", 50], ["shellbell", 45], ["cheri", 9]] as const) {
    it(`Scene OFF ${site}: a ${frames}-frame hold before the print and no animation command`, () => {
      const commands = commandsOf(`hie1-${site}-off`);
      const print = commands.findIndex((command, index) => command.type === "message" && index > 0 && /BERRY|SHELL BELL|LEFTOVERS/.test(command.lines.join(" ")));
      expect(print).toBeGreaterThan(0);
      expect(commands[print - 1]).toMatchObject({ type: "move-animation", timing: { minimumFrames: frames } });
      expect(commands.some((command) => command.type === "general-animation")).toBe(false);
    });
  }
});
