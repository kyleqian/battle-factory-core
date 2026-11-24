// fpr1 (ISSUES #219; lab tools/battle-lab/fpr1-rest-leftovers-on.json, T2 s310 d4 / d5, s1415, s2230): the Leftovers animation that restarts after
// BattleScript_MoveUsedIsAsleep's SLP status animation starts 5 rows earlier than the generic 15-row restart lead.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { HELD_ITEM_EFFECT_AFTER_ASLEEP_LEAD_FRAMES, HELD_ITEM_EFFECT_COMMAND_FRAMES, HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES } from "../src/engine/battleResolutionPresentation.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, seed?: number, scene?: "on" | "off", generic?: boolean) => ReturnType<typeof createInitialState>;
};

function heldItemFrames(scene: "on" | "off"): number[] {
  const lab = JSON.parse(readFileSync(new URL("../tools/battle-lab/fpr1-rest-leftovers-on.json", import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
  let state = labBackedStage("fpr1-rest-leftovers-on.json", createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
  const frames: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    for (const command of resolution?.segments[resolution.segmentIndex]?.commands ?? []) {
      if (command.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT") {
        const minimum = (command.timing as { minimumFrames: number }).minimumFrames;
        if (!frames.includes(minimum)) frames.push(minimum);
      }
    }
  }
  return frames;
}

describe("held-item animation after the asleep SLP status animation (fpr1)", () => {
  it("Scene ON: the Leftovers command is 5 rows shorter than the generic restart lead gives", () => {
    expect(HELD_ITEM_EFFECT_AFTER_ASLEEP_LEAD_FRAMES).toBe(HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES - 5);
    expect(heldItemFrames("on")).toContain(HELD_ITEM_EFFECT_COMMAND_FRAMES + HELD_ITEM_EFFECT_AFTER_ASLEEP_LEAD_FRAMES);
  });
});
