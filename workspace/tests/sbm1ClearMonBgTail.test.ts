// sbm1 item 2 (docs/aud251-s11-scoreboard-refresh.md "sbm1"): Water Gun, Acid, Dizzy Punch and Pay Day end `waitforvisualfinish; clearmonbg; end`, so the ROM's
// gAnimScriptActive falls 5 rows after the row the visual count reads 0 (Task_ClearMonBg, battle_anim.c:852-883). Their windows ended on the last picture, so the
// effectiveness SE / hit blink / hp rows after the body were 5 or 6 rows early. ROM effectiveness SE rows (tools/integration/labCompare.sh, Scene ON):
// Water Gun lab SE 14 at 202 (ours 196 -> 201), Acid SE 12 at 214 (209 -> 214), Dizzy Punch SE 12 at 166 (161 -> 166), Pay Day SE 13 at 151 (145 -> 150).
// Water Gun and Pay Day stay 1 row early: their windows already ended 1 row before Acid's / Dizzy Punch's relative to the ROM's count-0 row (not fitted).
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

function firstSeFrame(name: string, id: number): number | undefined {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on");
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === id) return e.frame;
  }
  return undefined;
}

describe("sbm1: Task_ClearMonBg tail rows after the last picture", () => {
  const cases: [string, string, number, number][] = [
    ["Water Gun", "mechanic-water-gun-player-horsea-opponent-onix", 14, 201],
    ["Acid", "mechanic-acid-player-ekans-opponent-onix", 12, 214],
    ["Dizzy Punch", "mechanic-dizzy-punch-player-spinda-opponent-onix", 12, 166],
    ["Pay Day", "aud262-payday-player-on", 13, 150],
  ];
  for (const [label, lab, se, frame] of cases) {
    it(`${label}: the effectiveness SE after the body is on frame ${frame}`, () => {
      expect(firstSeFrame(lab, se)).toBe(frame);
    }, 60000);
  }
});
