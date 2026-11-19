// kno3 (ISSUES #219, docs/kno1-item-knockoff-plan.md "kno3"): BattleScript_KnockedOff's `playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF` as a
// general-animation command (Scene ON) / a Pausex20 hold (Scene OFF), from the staged labs tools/battle-lab/out2-knockoff*.json
// (ROM windows tools/compare/traces/out2-knockoff*.json).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import {
  ITEM_KNOCKOFF_ANIMATION_ROWS_OPPONENT_TARGET,
  ITEM_KNOCKOFF_ANIMATION_ROWS_PLAYER_TARGET,
  ITEM_KNOCKOFF_OFF_HOLD_FRAMES,
  ITEM_KNOCKOFF_PRINT_TAIL_ROWS,
  ITEM_KNOCKOFF_SCRIPT_TAIL_ROWS,
  ITEM_KNOCKOFF_SE_FIXED_ROWS,
  itemKnockoffCommandFrames,
  type BattleResolutionPresentationCommand,
} from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function commandsOf(id: string): BattleResolutionPresentationCommand[] {
  const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as {
    appRoute: "generated-orchestrator";
    oracleProfile: string;
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.oracleProfile === "battle-scene-on" ? "on" : "off" });
  state = APP_STAGES[id]!(state);
  const all: BattleResolutionPresentationCommand[] = [];
  const seen = new Set<string>();
  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
      segment.commands.forEach((command, index) => {
        const key = `${segment.events[0]?.sequence}:${index}`;
        if (seen.has(key)) return;
        seen.add(key);
        all.push(command);
      });
    }
  }
  return all;
}

const knockoffCommands = (id: string) =>
  commandsOf(id).filter((command) => command.type === "general-animation" && command.animation === "ITEM_KNOCKOFF");

function offHolds(id: string): number[] {
  const commands = commandsOf(id);
  const holds: number[] = [];
  commands.forEach((command, index) => {
    const next = commands[index + 1];
    if (command.type === "move-animation" && next?.type === "message" && JSON.stringify(next).includes("knocked off")) {
      holds.push(command.timing.minimumFrames);
    }
  });
  return holds;
}

describe("kno3 constants", () => {
  it("pins the ROM rows (kno2: W + A + 2; Pausex20 35 rows)", () => {
    expect([
      ITEM_KNOCKOFF_ANIMATION_ROWS_OPPONENT_TARGET, ITEM_KNOCKOFF_ANIMATION_ROWS_PLAYER_TARGET, ITEM_KNOCKOFF_SCRIPT_TAIL_ROWS,
      ITEM_KNOCKOFF_OFF_HOLD_FRAMES, ITEM_KNOCKOFF_SE_FIXED_ROWS, ITEM_KNOCKOFF_PRINT_TAIL_ROWS,
    ]).toEqual([43, 94, 3, 35, 44, 4]);
  });

  it("command length = SE gate + animation rows + script rows, per target side", () => {
    expect(itemKnockoffCommandFrames(1, 25)).toBe(25 + 43 + 3);
    expect(itemKnockoffCommandFrames(0, 4)).toBe(4 + 94 + 3);
    expect(itemKnockoffCommandFrames(1, 0)).toBe(46);
  });
});

describe("kno3 Scene ON", () => {
  it("foe target: one ITEM_KNOCKOFF command, 71 frames behind a 25-row SE gate", () => {
    const commands = knockoffCommands("out2-knockoff-on");
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ battler: 1, timing: { minimumFrames: 71, seGateFrames: 25 } });
  });

  it("player target: one ITEM_KNOCKOFF command, 101 frames behind a 4-row SE gate", () => {
    const commands = knockoffCommands("out2-knockoffrev-on");
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ battler: 0, timing: { minimumFrames: 101, seGateFrames: 4 } });
  });

  it("no held item: no animation command", () => {
    expect(knockoffCommands("out2-knockoffnoitem-on")).toHaveLength(0);
  });
});

describe("kno3 Scene OFF", () => {
  it.each(["out2-knockoff-off", "out2-knockoffrev-off"])("%s: a 35-row Pausex20 hold before the print, no general animation", (id) => {
    expect(commandsOf(id).some((command) => command.type === "general-animation")).toBe(false);
    expect(offHolds(id)).toEqual([35]);
  });

  it("no held item: no hold, no animation", () => {
    expect(commandsOf("out2-knockoffnoitem-off").some((command) => command.type === "general-animation")).toBe(false);
    expect(offHolds("out2-knockoffnoitem-off")).toEqual([]);
  });
});
