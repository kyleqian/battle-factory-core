// wsh1 (ISSUES #219, docs/wsh1-general-anim-commands.md): Wish heal / Future Sight hit / Focus Band `playanimation` sites as
// general-animation commands, from the staged labs tools/battle-lab/wsh1-*.json (ROM windows tools/compare/traces/wsh1-*.json).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import {
  FOCUS_BAND_COMMAND_FRAMES,
  FUTURE_SIGHT_HIT_COMMAND_FRAMES,
  WISH_HEAL_COMMAND_FRAMES,
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
  const all: BattleResolutionPresentationCommand[] = [];
  const seen = new Set<number>();
  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
      for (const command of segment.commands) {
        if (command.type === "general-animation" && !seen.has(command.eventSequence)) {
          seen.add(command.eventSequence);
          all.push(command);
        }
      }
    }
  }
  return all;
}

function holdsOf(id: string): number[] {
  const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as {
    appRoute: "generated-orchestrator";
    oracleProfile: string;
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: "off" });
  state = APP_STAGES[id]!(state);
  const holds: number[] = [];
  const seen = new Set<number>();
  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
      segment.commands.forEach((command, index) => {
        if (command.type === "general-animation") throw new Error("Scene OFF presents no general animation");
        const next = segment.commands[index + 1];
        if (command.type !== "move-animation" || next === undefined || seen.has(command.eventSequence)) return;
        if (command.timing.minimumFrames >= 36 && command.timing.minimumFrames <= 42 && (next.type === "message" || next.type === "hit-animation")) {
          seen.add(command.eventSequence);
          holds.push(command.timing.minimumFrames);
        }
      });
    }
  }
  return holds;
}

describe("wsh1 Scene OFF Pausex20 holds", () => {
  // Wish: 36 executions (no lead); Future Sight: 42 before the hit; Focus Band: 38 executions + lead 2 (ROM windows wsh1-*-off).
  it.each([["wsh1-wish-off", 36], ["wsh1-fs-off", 42], ["wsh1-fb-off", 40]] as const)("%s presents a %i-frame hold", (id, frames) => {
    expect(holdsOf(id)).toContain(frames);
  });
});

describe("wsh1 general-animation commands (Scene ON)", () => {
  it("pins the constants", () => {
    expect([WISH_HEAL_COMMAND_FRAMES, FUTURE_SIGHT_HIT_COMMAND_FRAMES, FOCUS_BAND_COMMAND_FRAMES]).toEqual([201, 172, 129]);
  });

  for (const [id, animation, frames] of [
    ["wsh1-wish-on", "WISH_HEAL", 201],
    ["wsh1-fs-on", "FUTURE_SIGHT_HIT", 172],
    ["wsh1-fb-on", "FOCUS_BAND", 129],
  ] as const) {
    it(`${id}: one ${animation} command of ${frames} frames`, () => {
      const commands = commandsOf(id).filter((command) => command.type === "general-animation" && command.animation === animation);
      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({ timing: { minimumFrames: frames } });
    });
  }
});
