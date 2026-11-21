// etp1 (docs/etp1-end-turn-prints.md): the end-turn weather prints reproduce the ROM's first-glyph frames in both scenes.
// ROM: tools/integration/hcr3mProbe.py over each lab (the exec flag rises on a print's waitmessage; first glyph = that row + 1), Scene OFF
// battle-scene-off :8014 / Scene ON :8012. The frames are the labs' message commands in order (every print of the lab: the weather's
// own move, the end-turn continue / end print and each damage print). Labs: tools/battle-lab/etp1-*.json (tools/integration/etp1MakeLabs.py).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

const ROM_FIRST_GLYPHS: Readonly<Record<string, readonly number[]>> = {
  "etp1-sandstorm-off": [30, 92, 196, 334, 425, 580],
  "etp1-sandstorm-on": [30, 229, 333, 661, 919, 1074],
  "etp1-hail-off": [30, 87, 191, 329, 423, 567],
  "etp1-hail-on": [30, 214, 318, 646, 897, 1041],
  "etp1-sun-off": [30, 92, 201, 339],
  "etp1-sun-on": [30, 219, 328, 656],
  "etp1-sandstorm5-off": [30, 92, 196, 334, 425, 580, 1152, 1214, 1313, 1451, 1542, 1697, 2274, 2336, 2435, 2573, 2664, 2819, 3396, 3458, 3557, 3695, 3786, 3941, 4518, 4580, 4679, 4817],
  "etp1-sandstorm5-on": [30, 229, 333, 661, 919, 1074, 2274, 2336, 2435, 2763, 3021, 3176, 3396, 3458, 3557, 3885, 4143, 4298, 4518, 4580, 4679, 5007, 5265, 5420],
  "etp1-sun5-off": [30, 92, 201, 339, 1152, 1214, 1313, 1451, 2274, 2336, 2435, 2573, 3396, 3458, 3557, 3695, 4518, 4580, 4679, 4817],
  "etp1-sun5-on": [30, 219, 328, 656, 1152, 1214, 1313, 1641, 2274, 2336, 2435, 2763, 3396, 3458, 3557, 3885, 4518, 4580, 4679, 5007],
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
  for (const [name, rom] of Object.entries(ROM_FIRST_GLYPHS)) {
    it(`${name} first glyphs equal the ROM's`, () => {
      expect(firstGlyphFrames(name)).toEqual(rom);
    });
  }
});
