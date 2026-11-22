// cfs1 item 10b (docs/aud251-s11-scoreboard-refresh.md "cfs1"): Sweet Kiss (186) joins the c-lead body class (window adjust 2): its Confusion status animation was 2 rows early
// (labs mechanic-sweet-kiss-{player,opponent}-luvdisc-*: Confusion SE 176 at ROM 240 / 254 / 268 / 282 / 296 / 310, engine 238 .. 308 before).
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

function seFrames(name: string, id: number): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on");
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

describe("cfs1: Sweet Kiss then Confusion, Scene ON", () => {
  it("the Confusion status animation's SEs are on the ROM's frames", () => {
    expect(seFrames("mechanic-sweet-kiss-player-luvdisc-opponent-onix", 176).slice(0, 6)).toEqual([240, 254, 268, 282, 296, 310]);
  }, 60000);
});
