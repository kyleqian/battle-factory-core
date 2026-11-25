// opr1 (ISSUES #219; labs tools/battle-lab/{fpr1-rest-leftovers,hic1-yawn-leftovers}-off.json, ROM rows from tools/integration/labCompare.sh --rows --scene off):
// Scene OFF's print after an asleep turn + Leftovers, and after a Yawn sleep + Leftovers / berry, land on the ROM's row.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  HELD_ITEM_EFFECT_AFTER_ASLEEP_OFF_LEAD_FRAMES,
  HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_OFF_LEAD_FRAMES,
  HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES,
  HELD_ITEM_AFTER_MESSAGE_LEAD_DELTA,
  YAWN_SLEEP_OFF_PRINT_LEAD_FRAMES,
} from "../src/engine/battleResolutionPresentation.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, seed?: number, scene?: "on" | "off", generic?: boolean) => ReturnType<typeof createInitialState>;
};

function holds(file: string): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${file}`, import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
  let state = labBackedStage(file, createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" }), undefined, "off", true);
  const out: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    for (const command of resolution?.segments[resolution.segmentIndex]?.commands ?? []) {
      if (command.type !== "move-animation") continue;
      const frames = (command.timing as { minimumFrames: number }).minimumFrames;
      if (!out.includes(frames)) out.push(frames);
    }
  }
  return out;
}

describe("Scene OFF item / sleep print leads (opr1)", () => {
  it("asleep turn + Leftovers: the hold's lead is 7 (ROM MoveEnd+0x0 -> ItemHealHP_Ret+0xa print = 45 rows), 8 below the restart lead", () => {
    expect(HELD_ITEM_EFFECT_AFTER_ASLEEP_OFF_LEAD_FRAMES).toBe(HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES - 8);
    expect(holds("fpr1-rest-leftovers-on.json")).toContain(36 + HELD_ITEM_EFFECT_AFTER_ASLEEP_OFF_LEAD_FRAMES);
  });
  it("Yawn sleep: the print waits 11 rows (ROM MoveEnd + 12), the Leftovers hold lead is 9 below the restart lead, and a ButItFailed print keeps the miss-shape delta", () => {
    expect(YAWN_SLEEP_OFF_PRINT_LEAD_FRAMES).toBe(11);
    expect(HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_OFF_LEAD_FRAMES).toBe(HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES - 9);
    const out = holds("hic1-yawn-leftovers-on.json");
    expect(out).toContain(YAWN_SLEEP_OFF_PRINT_LEAD_FRAMES);
    expect(out).toContain(36 + HELD_ITEM_EFFECT_AFTER_YAWN_SLEEP_OFF_LEAD_FRAMES);
    expect(out).toContain(36 + HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES - HELD_ITEM_AFTER_MESSAGE_LEAD_DELTA);
  });
});
