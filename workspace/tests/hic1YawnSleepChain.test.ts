// hic1 (ISSUES #219 / #220, t2k10 class 2; lab tools/battle-lab/hic1-yawn-leftovers-on.json, T2 ON s1415 / s2230 / s310): the end-turn BattleScript_YawnMakesAsleep
// SLP status animation starts 8 rows later than the preceding command ends, and the Leftovers animation after it restarts 6 rows earlier than the generic lead.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_LEAD_FRAMES,
  HELD_ITEM_EFFECT_COMMAND_FRAMES,
  HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES,
  YAWN_SLEEP_ANIMATION_LEAD_ROWS,
} from "../src/engine/battleResolutionPresentation.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, seed?: number, scene?: "on" | "off", generic?: boolean) => ReturnType<typeof createInitialState>;
};

function collect(scene: "on" | "off"): { sleepGates: number[]; heldItemFrames: number[] } {
  const lab = JSON.parse(readFileSync(new URL("../tools/battle-lab/hic1-yawn-leftovers-on.json", import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
  let state = labBackedStage("hic1-yawn-leftovers-on.json", createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
  const out = { sleepGates: [] as number[], heldItemFrames: [] as number[] };
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    for (const command of resolution?.segments[resolution.segmentIndex]?.commands ?? []) {
      const timing = command.timing as { minimumFrames: number; seGateFrames?: number };
      if (command.type === "status-animation" && command.animation === "SLP" && timing.seGateFrames !== undefined && !out.sleepGates.includes(timing.seGateFrames)) out.sleepGates.push(timing.seGateFrames);
      if (command.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT" && !out.heldItemFrames.includes(timing.minimumFrames)) out.heldItemFrames.push(timing.minimumFrames);
    }
  }
  return out;
}

describe("Yawn sleep chain (hic1)", () => {
  it("Scene ON: the SLP animation is gated 8 rows and the Leftovers command after it is 6 rows shorter than the generic restart lead", () => {
    expect(HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_LEAD_FRAMES).toBe(HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES - 6);
    const on = collect("on");
    expect(on.sleepGates).toContain(YAWN_SLEEP_ANIMATION_LEAD_ROWS);
    expect(on.heldItemFrames).toContain(HELD_ITEM_EFFECT_COMMAND_FRAMES + HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_LEAD_FRAMES);
  });
});
