// ohs1: Scene OFF pre-move status prints without a launch hold before the used print (docs/aud251-s11-scoreboard-refresh.md "ohs1").
// ROM rows (T2 OFF): ConfusedNoMore s7295 d8 wait release 53 -> HitFromAtkCanceler 118 -> used print 121 (hold 64 + 5); InLove s6568 d29 print 9 -> 46 -> used print 115 (64 + 3 + 3; no battle lab has an in-love print followed by a used print, so that hold is T2-pinned only).
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

describe("ohs1: Scene OFF ConfusedNoMore pre-move print hold", () => {
  it("hpf4m-confuse-off: the confusion-ended print holds 64 + 5 before the used print (the self-hit 67 / used-print 71 holds are unchanged)", () => {
    const holds = commandRows("hpf4m-confuse-off").filter((r) => r.type === "message").map((r) => r.hold);
    expect(holds).toContain(69);
    expect(holds).toContain(67);
    expect(holds).toContain(71);
  });
});
