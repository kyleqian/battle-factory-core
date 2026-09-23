import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { furyCutterSourceAtAge } from "../../src/animation/furyCutter.ts";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/furyCutterProduction.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_FURY_CUTTER production reducer and typed seam", () => {
  it("ports the counter branch without absolute-frame ownership", () => {
    expect(furyCutterSourceAtAge(7, 1)).toMatchObject({ offset: 70, power: 10,
      direction: "right", paletteBlendRepeats: 0, active: true });
    expect(furyCutterSourceAtAge(33, 2)).toMatchObject({ offset: 92, power: 20,
      direction: "left", paletteBlendRepeats: 1, active: true });
    expect(furyCutterSourceAtAge(42, 4)).toMatchObject({ offset: 92, power: 80,
      direction: "left", paletteBlendRepeats: 3, active: false });
  });

  it("replays all eight complete body/orientation windows twice", () => {
    const result = run();
    for (const orientation of ["player-back", "opponent-front"] as const) {
      for (const counter of [1, 2, 3, 4] as const) {
        expect(result[`${orientation}-${counter}`]).toMatchObject({ rows: 43, passes: 2,
          componentRows: 86, seamRows: 86, power: [10, 20, 40, 80][counter - 1],
          direction: counter % 2 ? "right" : "left" });
      }
    }
  });
});
