// ldw1: the Scene ON Leech Seed drain right after a weather-continues animation (Sun) or the opponent's faint-replacement send-in launches on the script's exec
// row (ROM: no SE pending at IsBattleSEPlaying, the controller idle), not LEECH_SEED_DRAIN_SCRIPT_AGE + 2 rows after the command start. ROM: labCompare on
// tools/battle-lab/etp3-sunls3-on (SunlightContinues+0xd -> LeechSeedTurnDrain+0x7, SE 180 = exec + 27) and etp3-foesendls2-on (FaintedMonEnd -> drain).
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

describe("ldw1: Leech Seed drain after an idle controller (Scene ON)", () => {
  it("after the Sun tick (etp3-sunls3-on): SE 180 / 179 on the ROM rows 912 / 2915 and 1025 / 3028 (turns 1 / 2); was +9", () => {
    const frames = drainSeFrames("etp3-sunls3-on");
    expect(frames.all180.slice(0, 2)).toEqual([912, 2915]);
    expect(frames.all179.slice(0, 2)).toEqual([1025, 3028]);
  });
  it("after the opponent's send-in (etp3-foesendls2-on): SE 180 / 179 at 2629 / 2742 (ROM 2630 / 2743); was +8", () => {
    const frames = drainSeFrames("etp3-foesendls2-on");
    expect(frames.all180.slice(-1)).toEqual([2629]);
    expect(frames.last179).toBe(2742);
  });
  it("the Recover context keeps the legacy 7 + 2 lag (etp3-recoverls4-on: ROM SE 180 520 / 1708)", () => {
    expect(drainSeFrames("etp3-recoverls4-on").all180.slice(0, 2)).toEqual([520, 1708]);
  });
});
