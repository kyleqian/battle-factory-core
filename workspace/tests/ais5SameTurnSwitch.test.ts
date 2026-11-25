// ais5 (docs/ais1-ai-switch-withdraw.md "ais5"): the player's voluntary send-in ball-open SE (ROM: "Go! X!" print start + 54 + nickname length) and the AI's recall / tray / send-in
// in the same turn, Perish Song sentinel labs (ais5-*, mechanic-factory-ai-switch-receipt-c2 setup). ROM frames = labCompare.sh ROM SE rows (frame k = the lab's k-th advance = engine state.frame k).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

type Engine = ReturnType<typeof createInitialState>;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES, labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: Engine) => Engine>;
  labBackedStage: (file: string, state: Engine) => Engine;
};

function ballOpenFrames(lab: string, scene: "on" | "off"): number[] {
  const request = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${lab}.json`, import.meta.url), "utf8")) as { trace: { segments: Array<{ frames: number }> } };
  let state: Engine = createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
  state = APP_STAGES[lab] !== undefined ? APP_STAGES[lab]!(state) : labBackedStage(`${lab}.json`, state);
  const total = request.trace.segments.reduce((n, s) => n + s.frames, 0);
  const frames: number[] = [];
  for (const advance of traceAdvances(request.trace.segments as never)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === 15) frames.push(e.frame);
  }
  return frames;
}

describe("same-turn player + AI switch (ais5)", () => {
  // [lab, scene, ROM SE 15 rows: player recall, player send-in (turn 3), player recall, player send-in (turn 4)]. Player send-ins are exact for nickname lengths 4..10 (the "Go! X!" print
  // length drives the ball-open SE); the turn-4 AI withdraw / send-in rows run on the AI's own clock (the ais2 / aud253 pins).
  const labs: Array<[string, "on" | "off", number[]]> = [
    ["ais5-both-switch-off", "off", [1499, 1597, 2578, 2676]],
    ["ais5-sp19-6-off", "off", [1499, 1598, 2579, 2680]],
    ["ais5-sp75-40-off", "off", [1499, 1599, 2580, 2682]],
    ["ais5-sp1-52-off", "off", [1499, 1600, 2581, 2679]],
    ["ais5-both-switch-on", "on", [2349, 2447, 3628, 3726]],
    ["ais5-sp19-6-on", "on", [2349, 2448, 3629, 3730]],
    ["ais5-sp75-40-on", "on", [2349, 2449, 3630, 3732]],
  ];
  for (const [lab, scene, rom] of labs) {
    it(`${lab}: player recall / send-in ball-open SE rows equal the ROM's`, { timeout: 180_000 }, () => {
      expect(ballOpenFrames(lab, scene).slice(0, 4)).toEqual(rom);
    });
  }
});
