// fkt1 B: a foe's weather-KO faint returns into BattleScript_DamagingWeatherLoop before the faint script's tail, so the ball tray (SE 114) waits for the loop's Increment rows
// (checkteamslost + 3, then 6 per later battler's undamaged iteration). ROM labs: fkt1-kosand (foe last in the turn order, +4 rows) and fkt1-kosandfirst (foe first, Geodude immune: +10 rows).
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

function se114Frame(name: string, scene: "on" | "off"): number {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  const frames: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === 114) frames.push(e.frame);
  }
  return frames[0]!;
}

describe("fkt1: the weather-KO ball tray waits for the rest of the weather loop", () => {
  it("foe last in the turn order (fkt1-kosand): SE 114 on the ROM rows 1311 (ON) / 951 (OFF)", () => {
    expect(se114Frame("fkt1-kosand-on", "on")).toBe(1311);
    expect(se114Frame("fkt1-kosand-off", "off")).toBe(951);
  });
  it("foe first, the player's iteration undamaged (fkt1-kosandfirst): SE 114 on the ROM rows 1196 (ON) / 958 (OFF)", () => {
    expect(se114Frame("fkt1-kosandfirst-on", "on")).toBe(1196);
    expect(se114Frame("fkt1-kosandfirst-off", "off")).toBe(958);
  });
});
