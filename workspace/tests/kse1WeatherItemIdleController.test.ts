// kse1: the Scene ON held-item animation (Leftovers) right after a Rain / Sun tick launches on the script's exec row (the weather script's Cmd_end drained its SE, the controller is
// idle): the item's SE 152 x3 / 228 / 102 and the print after it. ROM: labCompare kse1-rainleftovers-on / kse1-sunleftovers-on (item SE 152 @903 / 914, 102 @1071 / 1082, turn 2 @2986 / 3021).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off", romTrainer: boolean) => any;
};

function itemSeFrames(name: string): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on", true);
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  const frames: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && (e.id === 152 || e.id === 228 || e.id === 102)) frames.push(e.frame);
  }
  return frames;
}

describe("kse1: held item after a Rain / Sun tick (Scene ON)", () => {
  it("Rain (kse1-rainleftovers-on): ROM 903 935 967 999 1071 and turn 2 2986 3018 3050 3082 3154; was +9", () => {
    expect(itemSeFrames("kse1-rainleftovers-on")).toEqual([903, 935, 967, 999, 1071, 2986, 3018, 3050, 3082, 3154]);
  });
  it("Sun (kse1-sunleftovers-on): ROM 914 946 978 (1010) 1082; was +14 with the Rain rows", () => {
    const f = itemSeFrames("kse1-sunleftovers-on");
    expect(f.slice(0, 3)).toEqual([914, 946, 978]);
    expect(f[4]).toBe(1082);
    expect(f[5]).toBe(3021);
  });
});
