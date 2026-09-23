import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { curseSourceAtAge } from "../../src/animation/curse.ts";
const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/curseProduction.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 32 << 20 }));
describe("MOVE_CURSE production reducer and typed seam", () => {
  it("selects both source branches without absolute battle timing", () => {
    expect(curseSourceAtAge(296, "ghost")).toMatchObject({ offset: 90, active: true });
    expect(curseSourceAtAge(372, "ghost")).toMatchObject({ offset: 111, active: false });
    expect(curseSourceAtAge(77, "stats")).toMatchObject({ offset: 172, active: true });
    expect(curseSourceAtAge(175, "stats")).toMatchObject({ offset: 160, active: false });
  });
  it("replays all 1,098 rows twice through the reducer and seam", () => {
    const result = run();
    expect(result).toMatchObject({
      "ghost-player": { rows: 373, passes: 2, componentRows: 746, seamRows: 746, branch: "ghost" },
      "ghost-opponent": { rows: 373, passes: 2, componentRows: 746, seamRows: 746, branch: "ghost" },
      "stats-player": { rows: 176, passes: 2, componentRows: 352, seamRows: 352, branch: "stats" },
      "stats-opponent": { rows: 176, passes: 2, componentRows: 352, seamRows: 352, branch: "stats" },
    });
  });
});
