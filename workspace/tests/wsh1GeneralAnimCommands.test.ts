// wsh1 (ISSUES #219, docs/wsh1-general-anim-commands.md): Wish heal / Future Sight hit / Focus Band `playanimation` sites as
// general-animation commands, from the staged labs tools/battle-lab/wsh1-*.json (ROM windows tools/compare/traces/wsh1-*.json).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
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

// Sounds (Scene ON): the table SEs at command age = script frame + the calibrated script age (docs/wsh1-general-anim-commands.md; the T2 seeds 3738 / 6079 / 4235 pin the ROM rows).
describe("wsh1 General_* SEs (Scene ON)", () => {
  function seRows(id: string, animation: string, seIds: number[]): { start: number; rows: Array<[number, number]> } {
    const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as {
      appRoute: "generated-orchestrator"; segments: Array<{ frames: number; buttons?: string[] }>;
    };
    let state = createInitialState({ appRoute: trace.appRoute, battleScene: "on" });
    state = APP_STAGES[id]!(state);
    let start = -1;
    const rows: Array<[number, number]> = [];
    for (const advance of traceAdvances(trace.segments)) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      const res = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
      if (start < 0 && command?.type === "general-animation" && command.animation === animation && res.lifecycle.phase === "presenting") start = advance.frame;
      if (start >= 0) for (const e of result.events) if (e.kind === "se" && e.id !== null && seIds.includes(e.id)) rows.push([e.id, advance.frame - start]);
    }
    return { start, rows };
  }

  it.each([
    ["wsh1-wish-on", "WISH_HEAL", [140, 179], [[140, 41], [179, 116]]],
    ["wsh1-fs-on", "FUTURE_SIGHT_HIT", [189, 184], [[189, 3], [184, 41], [184, 50]]],
    ["wsh1-fb-on", "FOCUS_BAND", [171], [[171, 0]]],
  ] as const)("%s: SE rows at command age", (id, animation, seIds, expected) => {
    const { start, rows } = seRows(id, animation, [...seIds]);
    expect(start).toBeGreaterThan(0);
    expect(rows.slice(0, expected.length)).toEqual(expected.map(([se, age]) => [se, age]));
  });
});

// wsh1b: Cmd_playanimation skips a STATUS3_SEMI_INVULNERABLE battler (battle_script_commands.c:4033-4038); Scene OFF's Pausex20 is unconditional.
// The Wisher's second move is DIG: turn 1 Wish, turn 2 Dig charge (the heal fires at the end of that turn with the wisher underground).
describe("wsh1b semi-invulnerable skip (Wish heal on a Dig user)", () => {
  function wishHeals(id: string, buttons: Array<{ frames: number; buttons?: string[] }>): { heals: number; wishCameTrue: boolean } {
    let state = createInitialState({ appRoute: "generated-orchestrator", battleScene: id.endsWith("-on") ? "on" : "off" });
    state = APP_STAGES[id]!(state);
    let heals = 0;
    let wishCameTrue = false;
    const seen = new Set<number>();
    for (const advance of traceAdvances(buttons)) {
      state = tick(state, advance.buttons);
      for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
        for (const command of segment.commands) {
          if (command.type === "message" && JSON.stringify(command).includes("came true")) wishCameTrue = true;
          if (command.type === "general-animation" && command.animation === "WISH_HEAL" && !seen.has(command.eventSequence)) {
            seen.add(command.eventSequence);
            heals += 1;
          }
        }
      }
    }
    return { heals, wishCameTrue };
  }
  const trace = (id: string): Array<{ frames: number; buttons?: string[] }> =>
    (JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as { segments: Array<{ frames: number; buttons?: string[] }> }).segments;

  it("control: Wish heal on a grounded wisher presents one WISH_HEAL command", () => {
    expect(wishHeals("wsh1-wish-on", trace("wsh1-wish-on"))).toEqual({ heals: 1, wishCameTrue: true });
  });

  it("Scene ON: the heal's playanimation on a Dig user presents no WISH_HEAL command", () => {
    expect(wishHeals("wsh1b-wishdig-on", trace("wsh1b-wishdig-on"))).toEqual({ heals: 0, wishCameTrue: true });
  });

  it("Scene ON: the heal behind a displayed Substitute doll presents no WISH_HEAL command", () => {
    expect(wishHeals("wsh1b-wishsub-on", trace("wsh1b-wishsub-on"))).toEqual({ heals: 0, wishCameTrue: true });
  });
});
