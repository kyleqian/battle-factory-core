// hse2: the Scene OFF wake-up message / icon rule and the confusion head, pinned on the ROM labs (docs/aud251-s11-scoreboard-refresh.md "hse2").
// ROM rows (labCompare.sh --scene off, .integration/evidence/hse2/lab-base): wkl1m-wakeup-player-off wake print glyph 2374 -> updatestatusicon 2455 -> next used print glyph 2460
// (the engine, -15 on the print head, now matches the print -> next print gap 86 and the 4-frame icon -> print command interval); the confusion hold is 64 + 3 + 4 when the used print follows.
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

describe("hse2: Scene OFF wake-up and confusion heads", () => {
  // [lab, wake print -> icon, wake print -> next print]: the foe lab's wake print starts 4 frames earlier on both sides (ROM 2370 -> 2460 = 90; player lab 2374 -> 2460 = 86)
  for (const [lab, toIcon, toNext] of [["wkl1m-wakeup-player-off", 82, 86], ["wkl1m-wakeup-foe-off", 86, 90]] as const) {
    it(`${lab}: the wake-up message holds 64 + 2 rows and the icon lasts to the next print as in Scene ON`, () => {
      const rows = commandRows(lab);
      const icons = rows.map((r, i) => ({ r, i })).filter(({ r, i }) => r.type === "status-icon" && rows[i - 1]?.type === "message" && rows[i - 1]!.hold === 66);
      expect(icons.length).toBe(1);
      const { r: icon, i } = icons[0]!;
      const wake = rows[i - 1]!;
      expect(icon.frame - wake.frame).toBe(toIcon);
      expect(rows[i + 1]!.type).toBe("message");
      expect(rows[i + 1]!.frame - icon.frame).toBe(4);
      expect(rows[i + 1]!.frame - wake.frame).toBe(toNext);
    });
  }

  it("hpf4m-confuse-off: a confusion print followed by the used print holds 64 + 3 + 4; the self-hit turn keeps its 64 + 3", () => {
    const rows = commandRows("hpf4m-confuse-off");
    const holds = rows.filter((r) => r.type === "message" && [67, 71].includes(r.hold!)).map((r) => ({ frame: r.frame, hold: r.hold }));
    expect(holds).toContainEqual({ frame: 1323, hold: 67 });
    expect(holds).toContainEqual({ frame: 3396, hold: 71 });
  });
});
