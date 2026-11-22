// etp3 (docs/aud251-s11-scoreboard-refresh.md "etp3"): the Scene ON end-turn Hail and Sun sounds play on the weather body's own clock
// (as sst1's Sandstorm), not the move-body sound clock 8 rows later. ROM frames: tools/integration/labCompare.sh over etp1-{hail5,sun5}-on
// (soundEventProbe.py SEs): SE_M_HAIL (242) x10 per end-turn tick (stride 9) after the Hail move's own 10, SE_M_SUNNY_DAY (202) x1 per end turn.
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

const HAIL_TICK = (first: number) => Array.from({ length: 10 }, (_, i) => first + 9 * i);
const HAIL_MOVE_BODY = [87, 95, 104, 113, 122, 131, 140, 149, 158, 167];

const ROM_SE_FRAMES: Readonly<Record<string, { id: number; frames: number[] }>> = {
  "etp1-hail5-on": { id: 242, frames: [...HAIL_MOVE_BODY, ...[767, 2879, 4001, 5123].flatMap(HAIL_TICK)] },
  "etp1-sun5-on": { id: 202, frames: [78, 763, 1748, 2870, 3992] },
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

describe("etp3: Scene ON end-turn Hail / Sun sounds", () => {
  for (const [name, pin] of Object.entries(ROM_SE_FRAMES)) {
    it(`${name}: every weather SE is on the ROM's frame`, () => {
      expect(seFrames(name, pin.id)).toEqual(pin.frames);
    }, 60000);
  }
});

// etp3 item 2: BattleScript_SideStatusWoreOff's print (STRINGID_PKMNSXWOREOFF) starts its first glyph on the ROM's frame in both scenes: the end-turn head
// (printstring 10 rows after MoveEnd's first row, as the weather prints). ROM: labCompare.sh over etp3-lightscreenls6 / etp3-reflectls6 (the PRINTS row's ROM frame).
const ROM_WORE_OFF_GLYPHS: Readonly<Record<string, number>> = {
  "etp3-lightscreenls6-on": 4873,
  "etp3-lightscreenls6-off": 4873,
};

function woreOffGlyphFrames(name: string): number[] {
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
    const segment = resolution?.segments?.[resolution.segmentIndex];
    const command = segment?.commands?.[resolution.commandIndex];
    const key = command === undefined || resolution.lifecycle?.phase !== "presenting" ? "" : `${resolution.segmentIndex}.${resolution.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (key === "" || command.type !== "message") continue;
    const payload = segment.events.find((e: { sequence: number }) => e.sequence === command.eventSequence)?.payload as { messageId?: string } | undefined;
    if (payload?.messageId === "STRINGID_PKMNSXWOREOFF") frames.push(state.frame + (command.leadFrames ?? 0));
  }
  return frames;
}

describe("etp3: side-status wore-off print head", () => {
  for (const [name, rom] of Object.entries(ROM_WORE_OFF_GLYPHS)) {
    it(`${name}: the turn-5 wore-off print's first glyph is the ROM's`, () => {
      expect(woreOffGlyphFrames(name)).toEqual([rom]);
    }, 60000);
  }
});
