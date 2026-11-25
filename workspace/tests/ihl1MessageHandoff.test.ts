// ihl1 (docs/aud251-s11-scoreboard-refresh.md "ihl1"): the message -> next print handoffs on the ROM rows (labCompare ROM print first glyphs, lab files in tools/battle-lab/):
//  - ihm1: Scene OFF Shell Bell heal after an effectiveness message (ihm1-sbell-nve-off: ROM 963 -> 1093 -> 1217, ENG start - ROM = +1 constant first-glyph convention);
//  - mem1 / crs1: the crit -> result message handoff is 81 rows in both scenes (ROM windows crs1-chop-s6 / crs1-slash-s4 / s1914 d2: Scene OFF 382 -> 463, ON 440 -> 521).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off", romTrainer: boolean) => any;
};

type Row = { type: string; start: number; minimumFrames: number; messageId?: string };

function commandRows(name: string, scene: "on" | "off"): Row[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
  const rows: Row[] = [];
  let last = "";
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    const res = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = res?.lifecycle?.phase === "presenting" ? res.segments[res.segmentIndex]?.commands[res.commandIndex] : undefined;
    const key = command === undefined ? "" : `${res.segmentIndex}.${res.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (command !== undefined) rows.push({ type: command.type, start: state.frame, minimumFrames: command.timing?.minimumFrames, messageId: command.lines?.join(" ") });
  }
  return rows;
}

describe("ihl1: ihm1 item heal after an effectiveness message (Scene OFF)", () => {
  it("ihm1-sbell-nve-off: effectiveness print -> Shell Bell print -> next print = ROM 130 / 124 rows", () => {
    const rows = commandRows("ihm1-sbell-nve-off", "off");
    const messages = rows.filter((r) => r.type === "message").map((r) => r.start);
    const effectiveness = messages.indexOf(964);
    expect(effectiveness).toBeGreaterThanOrEqual(0);
    expect(messages.slice(effectiveness, effectiveness + 3)).toEqual([964, 964 + (1093 - 963), 964 + (1217 - 963)]);
    const heal = rows.findIndex((r) => r.start === 964 + (1093 - 963));
    expect(rows[heal - 1]!.type).toBe("move-animation");
  });
});

describe("ihl1: mem1 / crs1 crit message -> result message is 81 rows", () => {
  it.each([["off", 383, 464], ["on", 440, 521]] as const)("crs1-chop-s5-off, Scene %s: crit print %i -> result print %i (ROM crit +0xb ex1 -> +0xf ex1 = 81)", (scene, crit, result) => {
    const messages = commandRows("crs1-chop-s5-off", scene).filter((r) => r.type === "message");
    const at = messages.findIndex((r) => r.start === crit);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(messages[at + 1]!.start).toBe(result);
    expect(result - crit).toBe(81);
  });
});
