import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { iceBallSourceAtAge } from "../../src/animation/iceBall.ts";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/iceBallProduction.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_ICE_BALL source reducer and typed Scene-ON seam", () => {
  it("ports ordinary and strongest source cursors without absolute battle ticks", () => {
    expect(iceBallSourceAtAge(7, 0)).toMatchObject({ offset: 48, active: true });
    expect(iceBallSourceAtAge(37, 3)).toMatchObject({ offset: 118, active: true });
    expect(iceBallSourceAtAge(45, 4)).toMatchObject({ offset: 129, active: true });
    expect(iceBallSourceAtAge(131, 4)).toMatchObject({ offset: 118, active: false });
  });

  it("replays all 872 branch/orientation rows twice", () => {
    const result = run();
    expect(result).toMatchObject({ schema: "ice-ball-production-verdict/v1", rows: 872,
      componentMatched: 872, seamMatched: 872 });
    expect(result.windows).toHaveLength(10);
    expect(result.windows.map((entry: Record<string, any>) => entry.rows))
      .toEqual([76, 76, 76, 76, 132, 76, 76, 76, 76, 132]);
  });
});
