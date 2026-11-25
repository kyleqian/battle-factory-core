// mlb1 (ISSUES #219; labs tools/battle-lab/species-audit-golbat-prep4-mean-look-player.json and mlb1-block-golbat-player-on.json, T2 s165 d17):
// BattleScript_EffectMeanLook's body (Mean Look 212 / Block 335): the "can't escape" print starts 7 rows after the animation's rows in the ROM
// (print first glyph 247 for the command at 64 / 213 for the command at 60), and the body SEs of both sit on the ROM's rows.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, seed?: number, scene?: "on" | "off", generic?: boolean) => ReturnType<typeof createInitialState>;
};

function bodyToPrintRows(file: string, moveId: number): { rows: number; soundLead: number | undefined } {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${file}`, import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number; buttons?: string[] }> } };
  let state = labBackedStage(file, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on", true);
  let bodyStart: number | null = null;
  let soundLead: number | undefined;
  let frame = 0;
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    frame += 1;
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex] as any;
    if (command === undefined) continue;
    if (bodyStart === null && command.type === "move-animation" && command.animation?.moveId === moveId) {
      bodyStart = frame;
      soundLead = command.timing.soundAgeLeadFrames;
    } else if (bodyStart !== null && command.type === "message") return { rows: frame - bodyStart, soundLead };
  }
  throw new Error(`${file}: no print after the body`);
}

describe("Mean Look / Block body (mlb1)", () => {
  it("Mean Look: body start -> 'can't escape' print is the ROM's 183 rows (64 -> 247), SE lead 3", () => {
    expect(bodyToPrintRows("species-audit-golbat-prep4-mean-look-player.json", 212)).toEqual({ rows: 183, soundLead: 3 });
  });
  it("Block: body start -> print is the ROM's 153 rows (60 -> 213), SE lead 3", () => {
    expect(bodyToPrintRows("mlb1-block-golbat-player-on.json", 335)).toEqual({ rows: 153, soundLead: 3 });
  });
});
