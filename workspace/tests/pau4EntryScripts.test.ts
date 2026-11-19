import { describe, expect, it } from "vitest";
import { APP_STAGES } from "../tools/compare/appTrace.ts";
import { createInitialState } from "../src/engine/core.ts";
import { advanceFactoryRoundBattleStartIntro } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { ENTRY_SCRIPT_END_BLANK_ROWS, ENTRY_SCRIPT_END_HELD_ROWS } from "../src/engine/factoryBattleStartEntry.ts";
import type { FactoryRoundBattleOrchestratorState } from "../src/engine/factoryRoundBattleOrchestrator.ts";

// pau4: the battle-start entry scripts (Intimidate / Trace) are presented between the player release and the first command menu.
function runIntro(stage: string): { entryFrames: number; entry: NonNullable<NonNullable<FactoryRoundBattleOrchestratorState["battleStartIntro"]>["entry"]> | null; after: FactoryRoundBattleOrchestratorState } {
  let o = APP_STAGES[stage]!(createInitialState()).factoryRoundBattleOrchestrator!;
  let entry = null as ReturnType<typeof runIntro>["entry"];
  let entryFrames = 0;
  for (let frame = 0; o.battleStartIntro !== null; frame += 1) {
    if (frame > 20000) throw new Error("intro never ended");
    o = advanceFactoryRoundBattleStartIntro(o, new Set(frame % 16 === 0 ? ["A" as const] : []));
    const current = o.battleStartIntro?.entry;
    if (current) {
      entry ??= current;
      entryFrames += 1;
    }
  }
  return { entryFrames, entry, after: o };
}

describe("pau4 battle-start entry scripts", () => {
  it("Trace lead: one message block timed from the kernel script rows, then the blank handoff and the menu", () => {
    const { entry, entryFrames, after } = runIntro("sta6m-intro-trace-off");
    expect(entry).not.toBeNull();
    const commands = entry!.base.segments[0]!.commands;
    expect(commands.map((command) => command.type)).toEqual(["message", "message"]);
    expect(commands[1]!.type === "message" && commands[1]!.lines.join(" ")).toContain("TRACED");
    expect(entry!.schedule.at(-1)).toEqual({ commandIndex: commands.length, length: ENTRY_SCRIPT_END_BLANK_ROWS });
    expect(entryFrames).toBe(entry!.total);
    expect(entry!.total).toBeGreaterThan(98 + ENTRY_SCRIPT_END_HELD_ROWS);
    expect(after.battleCommandPresentation).not.toBeNull();
  });

  it("Intimidate lead: stat row, STATS_CHANGE animation and message in kernel order", () => {
    const { entry, after } = runIntro("sta6m-intro-intimp-off");
    expect(entry).not.toBeNull();
    expect(entry!.base.segments[0]!.commands.map((command) => command.type)).toEqual(["message", "stat", "stats-change", "message"]);
    expect(after.battleCommandPresentation).not.toBeNull();
  });

  it("both leads: the Intimidate block then the Trace block, one blank handoff at the end", () => {
    const { entry } = runIntro("sta6m-intro-both-off");
    const types = entry!.base.segments[0]!.commands.map((command) => command.type);
    expect(types).toEqual(["message", "stat", "stats-change", "message", "message"]);
    expect(entry!.schedule.filter((item) => item.commandIndex === types.length)).toHaveLength(1);
  });

  it("Scene ON shares the entry schedule", () => {
    const off = runIntro("sta6m-intro-intimp-off").entry!;
    const on = runIntro("sta6m-intro-intimp-on").entry!;
    expect(on.schedule).toEqual(off.schedule);
  });
});
