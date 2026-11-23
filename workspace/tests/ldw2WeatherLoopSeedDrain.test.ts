// ldw2: the Scene ON Leech Seed drain after the damaging-weather loop (Hail / Sandstorm). Its `playanimation` waits for the weather hit's effectiveness SE (13: 73 rows,
// IsBattleSEPlaying) and for the loop's undamaged iterations (6 rows each; 14 rows from the weather-continues animation when nobody is damaged). ROM rows (labCompare, SE 180 / 179):
// tools/battle-lab/etp3-{sand,hail}ls3 (both damaged), ...p (the seeding player immune), ...f (the seeded foe immune), ...b (both immune), etp3-sandls3fc.
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

function drainSeFrames(name: string): { first180: number; last179: number; all180: number[]; all179: number[] } {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on", true);
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  const f180: number[] = [];
  const f179: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se") (e.id === 180 ? f180 : e.id === 179 ? f179 : []).push(e.frame);
  }
  return { first180: f180[0]!, last179: f179[f179.length - 1]!, all180: f180, all179: f179 };
}


const ROM: Record<string, { se180: number[]; se179: number[] }> = {
  "etp3-haills3-on": { se180: [1216, 3224], se179: [1329, 3337] },
  "etp3-sandls3-on": { se180: [1260, 3258], se179: [1373] },
  "etp3-sandls3p-on": { se180: [1113, 3111], se179: [1226, 3224] },
  "etp3-sandls3f-on": { se180: [1105, 3103], se179: [1218, 3216] },
  "etp3-sandls3fc-on": { se180: [1105, 3103], se179: [1218, 3216] },
  "etp3-sandls3b-on": { se180: [944, 2942], se179: [1057, 3055] },
  "etp3-haills3p-on": { se180: [1078, 3086], se179: [1191, 3199] },
  "etp3-haills3f-on": { se180: [1068, 3076], se179: [1181, 3189] },
  "etp3-haills3b-on": { se180: [916, 2924], se179: [1029, 3037] },
};

describe("ldw2: Leech Seed drain after the damaging-weather loop (Scene ON)", () => {
  for (const [name, rom] of Object.entries(ROM)) {
    it(`${name}: SE 180 / 179 on the ROM rows ${rom.se180.join(" / ")} / ${rom.se179.join(" / ")}`, () => {
      const frames = drainSeFrames(name);
      expect(frames.all180.slice(0, rom.se180.length)).toEqual(rom.se180);
      expect(frames.all179.slice(0, rom.se179.length)).toEqual(rom.se179);
    });
  }
  it("the Sun context keeps lag 0 (etp3-sunls3-on: ROM SE 180 912 / 2915)", () => {
    expect(drainSeFrames("etp3-sunls3-on").all180.slice(0, 2)).toEqual([912, 2915]);
  });
});
