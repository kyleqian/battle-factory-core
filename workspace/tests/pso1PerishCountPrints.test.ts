// pso1 (docs/aud251-s11-scoreboard-refresh.md, pso1 section): Perish Song's count prints reproduce the ROM's first-glyph frames (labs etk1-perish-*, Scene OFF battle-scene-off :8014,
// tools/integration/labCompare.sh PRINTS rows, ROM sTextPrinters[0] active + 1). Each pin is [index of the lab's message command in presentation order]: ROM first-glyph frame.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off", romTrainer: boolean) => any;
};

function firstGlyphFrames(name: string): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  const scene: "on" | "off" = name.endsWith("-on") ? "on" : "off";
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
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


// Count prints only: after Splash's print (10 rows), after the cast's print (17), the second battler (5). Lab turns: Splash, "But it failed!" + Splash, the cast.
const OFF_COUNTS: Readonly<Record<number, number>> = { 4: 379, 5: 480, 10: 1460, 11: 1561, 16: 2582, 17: 2683, 22: 3875 };
// Scene ON: the lab's Splash body is three animation loops the engine does not present (ENG has no live body adapter for mv150), so the count prints sit a constant 92 frames
// early; the pins are the ROM gaps (count 1 -> count 2 101; the cast's second print -> takes-life 128) the rule gets right.
const ON_GAPS: ReadonlyArray<readonly [number, number, number]> = [[4, 5, 101], [10, 11, 101], [16, 17, 101], [21, 22, 128]];

describe("pso1: Perish Song count prints", () => {
  for (const name of ["etk1-perish-hold-off", "etk1-perish-spam-off"]) {
    it(`${name} count first glyphs equal the ROM's`, () => {
      const frames = firstGlyphFrames(name);
      for (const [index, rom] of Object.entries(OFF_COUNTS)) expect([index, frames[Number(index)]]).toEqual([index, rom]);
    });
  }
  for (const name of ["etk1-perish-hold-on", "etk1-perish-spam-on"]) {
    it(`${name} count 1 -> count 2 gap equals the ROM's`, () => {
      const frames = firstGlyphFrames(name);
      for (const [a, b, gap] of ON_GAPS) expect([a, frames[b]! - frames[a]!]).toEqual([a, gap]);
    });
  }
});
