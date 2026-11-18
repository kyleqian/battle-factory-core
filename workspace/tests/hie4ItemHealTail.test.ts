// hie4 (ISSUES #220 post-heal tail, docs/hie2-held-item-render.md "hie4"): the HP command and turn-end after an item heal, from the staged labs
// tools/battle-lab/hie1-*.json (ROM windows tools/compare/traces/hie1-*.json, measured at the lab's pre-segment offset).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { battleHealthBarAnimationFrames } from "../src/engine/healthboxAssembly.ts";
import type { BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function tailOf(id: string): { commands: readonly BattleResolutionPresentationCommand[] } {
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
    if (resolution !== undefined && resolution !== null && resolution.segments[0] !== undefined && commands.length === 0) {
      commands = resolution.segments[0].commands;
    }
  }
  return { commands };
}

describe("item heal post-print tail (hie4)", () => {
  for (const scene of ["off", "on"] as const) {
    // Leftovers: a 6 HP heal is a 6-row bar + 1, no 28-row floor (that floor belongs to the ordinary hit), then the usual 8-row turn-end.
    it(`Scene ${scene.toUpperCase()} Leftovers: hp command has no floor, turn-end 8`, () => {
      const { commands } = tailOf(`hie1-leftovers-${scene}`);
      expect(commands.at(-2)).toMatchObject({ type: "hp", from: 65, to: 71, timing: { minimumFrames: 0 } });
      expect((commands.at(-2) as { timing: { tailFrames?: number } }).timing.tailFrames).toBeUndefined();
      expect(commands.at(-1)).toMatchObject({ type: "turn-end", timing: { minimumFrames: 8 } });
    });
    // Shell Bell: a continuation of the move script (call out of moveend): +3 rows after the bar, turn-end 9.
    it(`Scene ${scene.toUpperCase()} Shell Bell: hp tail 3, turn-end 9`, () => {
      const { commands } = tailOf(`hie1-shellbell-${scene}`);
      expect(commands.at(-2)).toMatchObject({ type: "hp", from: 36, to: 41, timing: { minimumFrames: 0, tailFrames: 3 } });
      expect(commands.at(-1)).toMatchObject({ type: "turn-end", timing: { minimumFrames: 9 } });
    });
  }

  // Sitrus (RemoveItem) heals 30: the bar is longer than the old floor, so the floor change cannot move it.
  it("Sitrus keeps its long bar and turn-end 8 (both scenes)", () => {
    for (const scene of ["off", "on"] as const) {
      const { commands } = tailOf(`hie1-sitrus-${scene}`);
      expect(commands.at(-2)).toMatchObject({ type: "hp", from: 17, to: 47 });
      expect(battleHealthBarAnimationFrames({ maxHp: 105, from: 17, to: 47 }) + 1).toBeGreaterThan(28);
      expect(commands.at(-1)).toMatchObject({ type: "turn-end", timing: { minimumFrames: 8 } });
    }
  });

  // hpd1 (docs/hpd1-hp-hold.md): a foe hit followed only by the turn end has no 28-row floor, the ROM's hold after the bar is the measured rows to the MoveEnd receipt.
  it("the ordinary foe hit's HP command is floor-free with the measured MoveEnd tail", () => {
    const { commands } = tailOf("hie1-leftovers-off");
    const hit = commands.find((command) => command.type === "hp");
    expect(hit).toMatchObject({ type: "hp", timing: { minimumFrames: 0 } });
    expect((hit as { timing: { tailFrames?: number } }).timing.tailFrames).toBeGreaterThan(0);
  });
});
