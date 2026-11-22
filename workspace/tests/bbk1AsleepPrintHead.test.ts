// bbk1 item 2: the Scene OFF asleep print head after a hit. ROM rows (labCompare.sh --scene off, .integration/evidence/bbk1/lab-wkl-a): the MoveEnd -> next mover's
// BattleScript_MoveUsedIsAsleep+0x3 print is 15 frames later than the engine had it; the sleep-counter write (attackcanceler) now carries the 1-frame OFF status into the
// action-transition pause. Rows matched: wkl1m-wakeup-player-off asleep print glyphs 929 / 1651, wkl1m-wakeup-foe-off 925 / 1647 (13 other print rows unchanged).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES, labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as any;

interface Row { frame: number; segment: number; index: number; type: string; hold: number | undefined; minimum: number | undefined }
function commandRows(name: string): Row[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state: any = createInitialState({ appRoute: "generated-orchestrator", battleScene: "off" });
  state = APP_STAGES[name] !== undefined ? APP_STAGES[name](state) : labBackedStage(`${name}.json`, state, undefined, "off");
  const frames = lab.trace.segments.reduce((n: number, s: any) => n + s.frames, 0);
  const rows: Row[] = [];
  let last = "";
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > frames) break;
    state = tick(state, advance.buttons);
    const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const cmd = res?.segments?.[res.segmentIndex]?.commands?.[res.commandIndex];
    const key = cmd === undefined || res.lifecycle?.phase !== "presenting" ? "" : `${res.segmentIndex}.${res.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (key !== "") rows.push({ frame: state.frame, segment: res.segmentIndex, index: res.commandIndex, type: cmd.type, hold: cmd.timing?.holdFrames, minimum: cmd.timing?.minimumFrames });
  }
  return rows;
}

describe("bbk1: Scene OFF asleep print head", () => {
  for (const [lab, first, second] of [["wkl1m-wakeup-player-off", 929, 1651], ["wkl1m-wakeup-foe-off", 925, 1647]] as const) {
    it(`${lab}: the first two asleep prints start on the ROM frames ${first} and ${second}`, () => {
      const rows = commandRows(lab);
      const asleep = rows.filter((r) => r.type === "message" && r.frame > 900 && r.frame < 1700 && [first, second].includes(r.frame));
      expect(asleep.map((r) => r.frame)).toEqual([first, second]);
    });
  }
});
