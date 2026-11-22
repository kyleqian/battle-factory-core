// fsc1: presentation timing of a hit on a semi-invulnerable (invisible) target and of the hit-all loop's EMPTYSTRING3 box.
// ROM windows: tools/compare/traces/fsc1-*.json (oracle compare labs, tools/integration/fsc1Labs.py); the Scene OFF hit completes at once
// (battle_controller_opponent.c:1804-1817) and the box clears on one row (BattleScript_DoHitAllWithUndergroundBonus). No emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { HIT_ANIMATION_INVISIBLE_FRAMES, type BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES, labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
  labBackedStage: (name: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => ReturnType<typeof createInitialState>;
};

function commandsOf(id: string): readonly BattleResolutionPresentationCommand[] {
  const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as {
    appRoute: "generated-orchestrator";
    oracleProfile: string;
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.oracleProfile === "battle-scene-on" ? "on" : "off" });
  state = APP_STAGES[id]!(state);
  for (const advance of traceAdvances(trace.segments)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (resolution !== undefined && resolution !== null && resolution.segments.length > 0) {
      return resolution.segments.flatMap((segment) => segment.commands);
    }
  }
  return [];
}

describe("fsc1: Scene OFF hit on an invisible target", () => {
  for (const id of ["fsc1-dig-eq-off", "fsc1-fly-gust-off", "fsc1-dive-surf-off"]) {
    it(`${id}: the hit-animation completes in ${HIT_ANIMATION_INVISIBLE_FRAMES} frames`, () => {
      const hits = commandsOf(id).filter((command) => command.type === "hit-animation");
      expect(hits.length).toBeGreaterThan(0);
      for (const hit of hits) {
        if (hit.type !== "hit-animation") continue;
        expect(hit.timing.invisibleTarget).toBe(true);
        expect(hit.timing.minimumFrames).toBe(HIT_ANIMATION_INVISIBLE_FRAMES);
      }
    });
  }
  it("Scene ON: the hit on a hidden target completes in the same 2 frames (ROM fsc1-fly-gust-on: datahpupdate 3 rows after SE 13, no blink)", () => {
    const hits = commandsOf("fsc1-fly-gust-on").filter((command) => command.type === "hit-animation");
    expect(hits.length).toBeGreaterThan(0);
    for (const command of hits) if (command.type === "hit-animation") expect(command.timing.minimumFrames).toBe(HIT_ANIMATION_INVISIBLE_FRAMES);
  });
});

describe("fsc1: the hit-all loop's EMPTYSTRING3 box", () => {
  const box = (id: string) => {
    const commands = commandsOf(id);
    const hp = commands.findIndex((command) => command.type === "hp");
    return commands.slice(hp + 1).find((command) => command.type === "message");
  };
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: an Earthquake KO clears the box on one row (the faint chain's lead presents the rest)`, () => {
      const command = box(`fsc1-eqko-${scene}`);
      expect(command).toBeDefined();
      expect(command!.type === "message" && command!.timing.minimumFrames).toBe(1);
    });
  }
  it("Scene OFF: a surviving hit holds the box one frame per interpreter row to the next receipt + 1", () => {
    const command = box("fsc1-dig-eq-off");
    expect(command).toBeDefined();
    expect(command!.type === "message" && command!.timing.minimumFrames).toBe(5);
  });
});

// ekd1: the hit that KOs a Dig user (status3 cleared at the faint, so the segment's end state no longer says "hidden") is still a hidden-target hit.
// Lab ekd1-dig-eqko-on: ROM SE 13 592 -> datahpupdate +3, faint SE 762; engine hit-animation 593 -> hp 595, faint SE 764 (ON; the hit blink was 35 rows, SE 797).
describe("ekd1: Earthquake KO of a Dig user", () => {
  for (const scene of ["on", "off"] as const) {
    it(`Scene ${scene.toUpperCase()}: the KO hit-animation completes in ${HIT_ANIMATION_INVISIBLE_FRAMES} frames`, () => {
      const request = JSON.parse(readFileSync(new URL("../tools/battle-lab/ekd1-dig-eqko-on.json", import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
      let state = labBackedStage("ekd1-dig-eqko-on.json", createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
      let commands: readonly BattleResolutionPresentationCommand[] = [];
      for (const advance of traceAdvances(request.trace.segments as never)) {
        state = tick(state, advance.buttons);
        const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
        if (resolution !== undefined && resolution !== null && resolution.segments.length > 0) { commands = resolution.segments.flatMap((segment) => segment.commands); break; }
      }
      const hit = commands.find((command) => command.type === "hit-animation");
      expect(hit?.type === "hit-animation" && hit.timing.minimumFrames).toBe(HIT_ANIMATION_INVISIBLE_FRAMES);
      expect(commands.some((command) => command.type === "faint")).toBe(true);
    });
  }
});
