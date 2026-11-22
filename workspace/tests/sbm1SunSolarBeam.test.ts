// sbm1 (docs/aud251-s11-scoreboard-refresh.md "sbm1"): in sun Solar Beam is a one-turn move, but SolarBeamOnFirstTurn's `ppreduce` (kernel u = 7) runs before
// the used print (USEDMOVE, u = 16), so the print is the first message, not the first event. The used-print lead and the action-transition rule both skipped it
// and fell back to the plain lead, so the whole Solar Beam body sat 33 rows early in Scene ON.
// ROM: tools/integration/labCompare.sh over sbm1-sun-same-player-on (Sunny Day, then Solar Beam the same turn): used print 347, SE_M_SOLAR_BEAM (201) 418,
// hit SE (12) 615. The engine was 314 / 384 / 582, now 347 / 417 (the lab's hcr2c tick lead residual, -1) / 615.
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

describe("sbm1: Solar Beam in sun (ppreduce before the used print)", () => {
  it("Scene ON, same turn as Sunny Day: Solar Beam SE and hit SE on the ROM's rows", () => {
    expect(seFrames("sbm1-sun-same-player-on", "on", 201)).toEqual([417]);
    expect(seFrames("sbm1-sun-same-player-on", "on", 12)).toEqual([615]);
  }, 60000);
  it("Scene OFF, same turn as Sunny Day: hit SE on the ROM's row (281)", () => {
    expect(seFrames("sbm1-sun-same-player-off", "off", 12)).toEqual([281]);
  }, 60000);
});
