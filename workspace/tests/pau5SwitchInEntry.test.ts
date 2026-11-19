import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { applyTraceStage } from "../tools/compare/appTrace.ts";
import { readFileSync } from "node:fs";

// pau5: mid-battle Intimidate / Trace switch-in scripts reuse pau4's block timing (docs/pau1-script-pauses.md "pau5").
type Command = { type: string; battler?: number; entryScriptHoldFrames?: number; minimumFrames?: number; timing?: { holdFrames?: number; minimumFrames?: number } };

function lastSegmentCommands(name: string): Command[] {
  const trace = JSON.parse(readFileSync(`tools/compare/traces/${name}.json`, "utf8"));
  let state: any = applyTraceStage(trace, createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene }));
  const seen = new Set<unknown>();
  const find = (o: any, depth = 0): any[] => {
    if (o === null || typeof o !== "object" || depth > 8 || seen.has(o)) return [];
    seen.add(o);
    if (Array.isArray(o.segments) && o.segments[0]?.commands) return [o];
    return Object.values(o).flatMap((v) => find(v, depth + 1));
  };
  let found: Command[] = [];
  for (const seg of trace.segments) {
    for (let i = 0; i < seg.frames; i += 1) {
      state = tick(state, new Set(seg.buttons ?? []));
      seen.clear();
      const run = find(state)[0];
      const withEntry = run?.segments.find((s: any) => s.commands.some((c: Command) => c.type === "switch-in"));
      if (withEntry) found = withEntry.commands;
    }
  }
  return found;
}

const timing = (c: Command) => c.timing?.minimumFrames ?? c.minimumFrames ?? 0;

describe("pau5 mid-battle switch-in entry scripts", () => {
  it("voluntary switch to an Intimidate mon: the send-in holds for the script lead (41 rows - 4 overlap), then stat / stats-change / message", () => {
    const commands = lastSegmentCommands("pau5-switch-intimidate-off");
    const at = commands.findIndex((c) => c.type === "switch-in");
    expect(commands[at]!.entryScriptHoldFrames).toBe(41 - 4);
    expect(commands.slice(at + 1, at + 4).map((c) => c.type)).toEqual(["stat", "stats-change", "message"]);
    expect(timing(commands[at + 1]!)).toBe(3);
    expect((commands[at + 2]!.timing?.holdFrames ?? 0) + timing(commands[at + 2]!)).toBe(77);
  });

  it("voluntary switch to a Trace mon: lead 33 rows - 4", () => {
    const commands = lastSegmentCommands("pau5-switch-trace-off");
    expect(commands.find((c) => c.type === "switch-in")!.entryScriptHoldFrames).toBe(33 - 4);
  });

  it("opponent replacement: the lead carries the 12-row release offset", () => {
    expect(lastSegmentCommands("pau5-opp-intimidate-off").find((c) => c.type === "switch-in")!.entryScriptHoldFrames).toBe(41 - 4 + 12);
    expect(lastSegmentCommands("pau5-opp-trace-off").find((c) => c.type === "switch-in")!.entryScriptHoldFrames).toBe(33 - 4 + 12);
  });

  it("forced player replacement shares the lead; the closing message holds 4 rows less than when a command follows", () => {
    const faint = lastSegmentCommands("pau5-faint-intimidate-off");
    const swap = lastSegmentCommands("pau5-switch-intimidate-off");
    expect(faint.find((c) => c.type === "switch-in")!.entryScriptHoldFrames).toBe(41 - 4);
    const closeOf = (cs: Command[]) => cs[cs.findIndex((c) => c.type === "stats-change") + 1]!.timing!.holdFrames!;
    expect(closeOf(swap) - closeOf(faint)).toBe(4);
  });

  it("Scene ON shares the entry timing", () => {
    for (const kind of ["faint", "switch", "opp"] as const) {
      for (const ability of ["intimidate", "trace"] as const) {
        const off = lastSegmentCommands(`pau5-${kind}-${ability}-off`).find((c) => c.type === "switch-in")!.entryScriptHoldFrames;
        const on = lastSegmentCommands(`pau5-${kind}-${ability}-on`).find((c) => c.type === "switch-in")!.entryScriptHoldFrames;
        expect(on).toBe(off);
        expect(off).toBeGreaterThan(0);
      }
    }
  });
});
