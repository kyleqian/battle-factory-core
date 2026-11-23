// ttf1 (docs/aud251-s11-scoreboard-refresh.md "ttf1"): a foe's second-turn Solar Beam used print after another action whose hit script ended on its result message
// (super effective) already sits on its ROM row from the action transition, so the press lead (6 + exec) must not be added again; after a neutral hit it is still owed.
// ROM (tools/integration/labCompare.sh, Scene ON): ttf1-solarbeam-slowfoe-supereff-on Solar Beam SE 201 at 1404, hit SE 13 at 1601 (engine 1414 / 1612 before the change,
// 1396 / 1594 after); ttf1-solarbeam-slowfoe-tackle-on SE 201 at 1288, SE 13 at 1485 (engine 1283 / 1481, unchanged).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

function seFrames(name: string, scene: "on" | "off", id: number): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
  const out: number[] = [];
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === id) out.push(e.frame);
  }
  return out;
}


describe("ttf1: second-turn Solar Beam print after another action", () => {
  it("after a super-effective hit the press lead is dropped (SEs 8 / 7 rows early, were 10 / 11 late)", () => {
    expect(seFrames("ttf1-solarbeam-slowfoe-supereff-on", "on", 201)).toEqual([1396]);
    expect(seFrames("ttf1-solarbeam-slowfoe-supereff-on", "on", 13)).toEqual([1594]);
  }, 60000);
  it("after a neutral hit the press lead is kept", () => {
    expect(seFrames("ttf1-solarbeam-slowfoe-tackle-on", "on", 201)).toEqual([1283]);
    expect(seFrames("ttf1-solarbeam-slowfoe-tackle-on", "on", 13).pop()).toEqual(1481);
  }, 60000);
});
