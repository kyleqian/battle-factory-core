// etp1 (docs/etp1-end-turn-prints.md): the end-turn weather prints reproduce the ROM's first-glyph frames in both scenes.
// ROM: tools/integration/hcr3mProbe.py over each lab (the exec flag rises on a print's waitmessage; first glyph = that row + 1), Scene OFF
// battle-scene-off :8014 / Scene ON :8012. Each pin is [index of the lab's message command in presentation order]: ROM first-glyph frame, for
// the end-turn prints only (the move bodies' own prints keep their own pins; the residuals are in the doc). Labs: tools/battle-lab/etp1-*.json
// (tools/integration/etp1MakeLabs.py).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

const ROM_FIRST_GLYPHS: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  "etp1-sandstorm-off": {3: 334, 4: 425, 5: 580},
  "etp1-sandstorm-on": {3: 661, 4: 919, 5: 1074},
  "etp1-hail-off": {3: 329, 4: 423, 5: 567},
  "etp1-hail-on": {3: 646, 4: 897, 5: 1041},
  "etp1-sun-off": {3: 339},
  "etp1-sun-on": {3: 656},
  "etp1-sandstorm5-off": {3: 334, 4: 425, 5: 580, 9: 1451, 10: 1542, 11: 1697, 15: 2573, 16: 2664, 17: 2819, 21: 3695, 22: 3786, 23: 3941, 27: 4817},
  "etp1-sandstorm5-on": {3: 661, 4: 919, 5: 1074, 9: 2763, 10: 3021, 11: 3176, 15: 3885, 16: 4143, 17: 4298, 21: 5007, 22: 5265, 23: 5420},
  "etp1-sun5-off": {3: 339, 7: 1451, 11: 2573, 15: 3695, 19: 4817},
  "etp1-sun5-on": {3: 656, 7: 1641, 11: 2763, 15: 3885, 19: 5007},
  "etp1-toxic3-off": {7: 1488, 11: 2610},
  "etp1-toxic3-on": {7: 1678, 11: 2800},
  "etp1-willowisp3-off": {7: 1459, 11: 2581},
  "etp1-willowisp3-on": {7: 1649, 11: 2771},
  "etp1-perish-off": {3: 360, 4: 461, 8: 1441, 9: 1542, 13: 2563, 14: 2664},
  "etp1-perish-on": {3: 778, 4: 879, 8: 1631, 9: 1732, 13: 2753, 14: 2854},
  "etp1-futuresight-off": {9: 2565},
  "etp1-futuresight-on": {9: 2755},
  "etp1-wish-off": {5: 1469, 6: 1587},
  "etp1-wish-on": {5: 1824, 6: 1942},
  "etp1-ingrain-off": {3: 363},
  "etp1-ingrain-on": {3: 849},


};

function firstGlyphFrames(name: string): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  const scene: "on" | "off" = name.endsWith("-on") ? "on" : "off";
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
  const frames: number[] = [];
  let last = "";
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = resolution?.segments?.[resolution.segmentIndex]?.commands?.[resolution.commandIndex];
    const key = command === undefined || resolution.lifecycle?.phase !== "presenting" ? "" : `${resolution.segmentIndex}.${resolution.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (key !== "" && command.type === "message") frames.push(state.frame + (command.leadFrames ?? 0));
  }
  return frames;
}

describe("etp1: end-turn prints", () => {
  for (const [name, pins] of Object.entries(ROM_FIRST_GLYPHS)) {
    it(`${name} end-turn first glyphs equal the ROM's`, () => {
      const frames = firstGlyphFrames(name);
      expect(Object.keys(pins).length).toBeGreaterThan(0);
      for (const [index, rom] of Object.entries(pins)) expect([index, frames[Number(index)]]).toEqual([index, rom]);
    });
  }
});
