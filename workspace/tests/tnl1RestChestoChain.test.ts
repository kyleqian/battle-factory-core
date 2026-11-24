// tnl1 (docs/aud251-s11-scoreboard-refresh.md tnm1 2.B): the Rest -> Chesto Berry cure chain on the ROM rows (labCompare tnm1-rest-chesto-{player,opponent}-on, Scene ON):
// MoveEnd+0x0 1416 -> status 26 (opponent lab 1428 / 1646 / 1772) -> HELD_ITEM_EFFECT (A0 1420, SE 152 1428 ... 102 1596) -> berry print 1634 -> icon 12 rows -> next print 1756.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off", romTrainer: boolean) => any;
};

function berryCommands(name: string): Array<{ type: string; start: number; minimumFrames: number; holdFrames?: number }> {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on", true);
  const rows: Array<{ type: string; start: number; minimumFrames: number; holdFrames?: number }> = [];
  let last = "";
  for (const advance of traceAdvances(lab.trace.segments)) {
    state = tick(state, advance.buttons);
    const res = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = res?.lifecycle?.phase === "presenting" ? res.segments[res.segmentIndex]?.commands[res.commandIndex] : undefined;
    const key = command === undefined ? "" : `${res.segmentIndex}.${res.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (command !== undefined) rows.push({ type: command.type, start: state.frame, minimumFrames: command.timing?.minimumFrames, holdFrames: command.timing?.holdFrames });
  }
  return rows;
}

describe("tnl1: Rest -> Chesto Berry cure (BattleScript_BerryCureSlpRet), Scene ON", () => {
  it.each([["tnm1-rest-chesto-player-on", 1416, 1634, 1756], ["tnm1-rest-chesto-opponent-on", 1428, 1646, 1772]] as const)("%s: status 26 at ROM MoveEnd+0x0, the berry print and the next print on the ROM rows", (name, moveEnd, romPrint, romNext) => {
    const rows = berryCommands(name);
    const status = rows.findIndex((r) => r.type === "status" && r.minimumFrames === 26);
    expect(status).toBeGreaterThan(0);
    const [st, anim, print, icon, next] = rows.slice(status, status + 5);
    expect([st!.type, anim!.type, print!.type, icon!.type, next!.type]).toEqual(["status", "general-animation", "message", "status-icon", "message"]);
    expect(anim!.minimumFrames).toBe(192);
    expect(print!.holdFrames).toBe(65);
    expect(icon!.minimumFrames).toBe(12);
    expect(print!.start - st!.start).toBe(romPrint - moveEnd);
    expect(next!.start - st!.start).toBe(romNext - moveEnd);
  });
});
