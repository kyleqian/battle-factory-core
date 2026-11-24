// ttb1 (docs/aud251-s11-scoreboard-refresh.md "ttb1"; ttf1's reverted item 1, re-landed with bht1's predicate): a second-turn Solar Beam used print after another action
// already sits on its ROM row from the action transition, so the press lead (6 + exec) is not added again when the previous action's body is modelled (bht1: transition
// residual 0 after Karate Chop / Slash / a super-effective hit). A placeholder previous body (Tackle, no live adapter) is 21 rows short and keeps the lead as cover.
// ROM (tools/integration/labCompare.sh, Scene ON): ttf1-solarbeam-slowfoe-supereff-on SE 201 1404 / SE 13 1601 (engine 1414 / 1612 with the lead, 1402 / 1600 now);
// bht1-kc-solarbeam-slowfoe-on 1298 / 1495 (engine 1296 / 1494); bht1-slash-solarbeam-slowfoe-on 1311 / 1508 (engine 1308 / 1506);
// ttf1-solarbeam-slowfoe-tackle-on SE 201 1288, SE 13 1485 (engine 1283 / 1481, unchanged).
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

describe("ttb1: second-turn Solar Beam print after another action", () => {
  it("after a modelled body (super effective, Karate Chop, Slash) the press lead is dropped", () => {
    expect(seFrames("ttf1-solarbeam-slowfoe-supereff-on", "on", 201)).toEqual([1402]);
    expect(seFrames("ttf1-solarbeam-slowfoe-supereff-on", "on", 13).pop()).toEqual(1600);
    expect(seFrames("bht1-kc-solarbeam-slowfoe-on", "on", 201)).toEqual([1296]);
    expect(seFrames("bht1-slash-solarbeam-slowfoe-on", "on", 201)).toEqual([1308]);
  }, 120000);
  it("after a placeholder body (Tackle) the press lead is kept", () => {
    expect(seFrames("ttf1-solarbeam-slowfoe-tackle-on", "on", 201)).toEqual([1283]);
    expect(seFrames("ttf1-solarbeam-slowfoe-tackle-on", "on", 13).pop()).toEqual(1481);
  }, 60000);
});

