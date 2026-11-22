// cfs1 (docs/aud251-s11-scoreboard-refresh.md "cfs1"): a damaging move whose print is Levitate's / Wonder Guard's miss ("X makes Ground moves miss with
// LEVITATE!") takes Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch (Pausex20) like "It doesn't affect", so Scene ON holds the used print 32 rows longer
// before it. ROM: tools/integration/labCompare.sh over cfs1-digconf-levitate-on (a Dig unleash on a Lunatone, then its Confusion): used print 1061 -> miss
// print 1130 (69 rows) -> Confusion print 1257 -> SE_M_SUPERSONIC (184) 1358. The engine was -48 (T2 s8108 d41 / d44 / d50), now +1 (the lab's lead residual).
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

describe("cfs1: Dig unleash on a Levitate target, Scene ON", () => {
  it("the next mover's Confusion SE is on the ROM's frame (+1), not 48 rows early", () => {
    expect(seFrames("cfs1-digconf-levitate-on", 184)).toEqual([1359]);
  }, 60000);
});
