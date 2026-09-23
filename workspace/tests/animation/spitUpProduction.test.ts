import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/spitUpProduction.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_SPIT_UP production reducer and typed seam", () => {
  it("replays every complete power/orientation window twice", () => {
    const result = run();
    for (const orientation of ["player-back", "opponent-front"] as const) {
      for (const stockpiles of [1, 2, 3] as const) {
        const rows = stockpiles === 3 ? 109 : 108;
        expect(result[`${orientation}-${stockpiles}`]).toMatchObject({ rows, passes: 2,
          componentRows: rows * 2, seamRows: rows * 2 });
      }
    }
  });
});
