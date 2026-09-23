import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyOutrageReducer.ts"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
}));

describe("MOVE_OUTRAGE source-relative reducer and typed seam", () => {
  it("matches both retained orientations twice through first inactive cleanup", () => {
    const result = run();
    expect(result).toMatchObject({
      "player-back": { retainedRows: 120, reducerRows: 240, seamRows: 240, cleanup: 119 },
      "opponent-front": { retainedRows: 120, reducerRows: 240, seamRows: 240, cleanup: 119 },
      bilateral: { retainedRows: 240, passes: 2, reducerRows: 480, seamRows: 480 },
    });
  });
});
